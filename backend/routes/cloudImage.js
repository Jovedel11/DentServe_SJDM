import express from "express"
import authenticateToken from "../middlewares/auth.js";
import { uploadLimiter, upload } from "../lib/upload.js"
import cloudinary from "../lib/cloudinary.js";
import streamifier from "streamifier"
import { supabase } from "../lib/supabaseSuperAdmin.js";

const router = express.Router();

// Store active uploads for cancellation
const activeUploads = new Map();

// Enhanced profile image upload endpoint with better error handling
router.post('/profile-image', 
  uploadLimiter, 
  authenticateToken, 
  upload.single('profileImage'), 
  async (req, res, next) => {
    const uploadId = req.headers['x-upload-id'] || `upload_${Date.now()}`;
    let isCleanedUp = false;
    
    try {
      // Store this upload as active
      const abortController = new AbortController();
      activeUploads.set(uploadId, abortController);

      // Enhanced cleanup function with flag
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        activeUploads.delete(uploadId);
      };

      // Handle client disconnect with timeout
      const clientDisconnectHandler = () => {
        console.log(`Client disconnected for upload: ${uploadId}`);
        if (!isCleanedUp) {
          abortController.abort();
          cleanup();
        }
      };

      req.on('close', clientDisconnectHandler);
      req.on('aborted', clientDisconnectHandler);

      // Validate file upload first
      if (!req.file) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }
      
      console.log(`Processing upload for user: ${req.user.userId}`);
      console.log(`File info: ${req.file.originalname}, ${req.file.size} bytes, ${req.file.mimetype}`);
      
      // Additional server-side validation
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
        });
      }

      // Check file size again
      if (req.file.size > 5 * 1024 * 1024) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5MB.'
        });
      }

      // Check if upload was cancelled before processing
      if (abortController.signal.aborted) {
        cleanup();
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      // Upload to Cloudinary with enhanced error handling
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'profiles',
            public_id: `user_${req.user.userId}_${Date.now()}`,
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' }
            ],
            overwrite: true,
            resource_type: 'image',
            timeout: 60000, // 60 second timeout
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else {
              console.log('Cloudinary upload successful:', result.secure_url);
              resolve(result);
            }
          }
        );
        
        // Handle abortion with proper cleanup
        const abortHandler = () => {
          console.log(`Upload aborted for: ${uploadId}`);
          if (uploadStream && uploadStream.destroy) {
            uploadStream.destroy();
          }
          reject(new Error('Upload cancelled'));
        };

        if (abortController.signal.aborted) {
          abortHandler();
          return;
        }

        abortController.signal.addEventListener('abort', abortHandler, { once: true });
        
        // Create stream with error handling
        try {
          const readStream = streamifier.createReadStream(req.file.buffer);
          
          readStream.on('error', (streamError) => {
            console.error('Stream error:', streamError);
            reject(new Error(`Stream error: ${streamError.message}`));
          });
          
          uploadStream.on('error', (uploadError) => {
            console.error('Upload stream error:', uploadError);
            reject(new Error(`Upload stream error: ${uploadError.message}`));
          });
          
          readStream.pipe(uploadStream);
        } catch (streamError) {
          console.error('Stream creation error:', streamError);
          reject(new Error(`Stream creation failed: ${streamError.message}`));
        }
      });

      // Check if upload was cancelled after Cloudinary upload
      if (abortController.signal.aborted || isCleanedUp) {
        // Clean up uploaded image
        try {
          await cloudinary.uploader.destroy(uploadResult.public_id);
          console.log('Cleaned up Cloudinary image after cancellation');
        } catch (cleanupError) {
          console.error('Failed to cleanup Cloudinary image:', cleanupError);
        }
        cleanup();
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      // Update profile_image_url in supabase with retry logic
      let updateAttempts = 0;
      const maxUpdateAttempts = 5;
      let updateData, updateError;

      while (updateAttempts < maxUpdateAttempts) {
        try {
          const result = await supabase
            .from('user_profiles')
            .update({ 
              profile_image_url: uploadResult.secure_url,
              updated_at: new Date().toISOString()
            })
            .eq('id', req.user.userProfileId)
            .select();

          updateData = result.data;
          updateError = result.error;
          break;
        } catch (retryError) {
          updateAttempts++;
          updateError = retryError;
          if (updateAttempts < maxUpdateAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // 1s delay
          }
        }
      }
      
      if (updateError) {
        console.error('Supabase update error after retries:', updateError);
        
        // Clean up Cloudinary image
        try {
          await cloudinary.uploader.destroy(uploadResult.public_id);
          console.log('Cleaned up Cloudinary image due to database error');
        } catch (cleanupError) {
          console.error('Failed to cleanup Cloudinary image:', cleanupError);
        }
        
        cleanup();
        return res.status(500).json({
          success: false,
          error: 'Failed to update profile in database after multiple attempts'
        });
      }
      
      console.log('Profile updated successfully in database');
      
      // Remove event listeners before responding
      req.removeListener('close', clientDisconnectHandler);
      req.removeListener('aborted', clientDisconnectHandler);
      
      cleanup();
      
      // Return success response
      res.json({
        success: true,
        imageUrl: uploadResult.secure_url,
        message: 'Profile image updated successfully',
        user: {
          id: req.user.userId,
          name: `${req.user.firstName} ${req.user.lastName}`
        }
      });
      
    } catch (error) {
      console.error('Upload route error:', error);
      
      // Ensure cleanup happens
      if (!isCleanedUp) {
        activeUploads.delete(uploadId);
      }
      
      if (error.message === 'Upload cancelled') {
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      // Handle different error types
      if (error.message.includes('Cloudinary')) {
        return res.status(503).json({
          success: false,
          error: 'Image processing service temporarily unavailable'
        });
      }
      
      if (error.message.includes('Stream')) {
        return res.status(400).json({
          success: false,
          error: 'File processing error. Please try again.'
        });
      }
      
      next(error);
    }
  }
);

router.post('/clinic-image', 
  uploadLimiter, 
  authenticateToken, 
  upload.single('clinicImage'), 
  async (req, res, next) => {
    const uploadId = req.headers['x-upload-id'] || `upload_${Date.now()}`;
    const { clinicId } = req.body; // ✅ Get clinicId from form data
    let isCleanedUp = false;
    
    try {
      console.log('🔍 Clinic Upload Request:', {
        clinicId,
        hasFile: !!req.file,
        fileSize: req.file?.size,
        userId: req.user?.userId
      });

      // Store this upload as active
      const abortController = new AbortController();
      activeUploads.set(uploadId, abortController);

      // Enhanced cleanup function with flag
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        activeUploads.delete(uploadId);
      };

      // Handle client disconnect
      const clientDisconnectHandler = () => {
        console.log(`Client disconnected for clinic upload: ${uploadId}`);
        if (!isCleanedUp) {
          abortController.abort();
          cleanup();
        }
      };

      req.on('close', clientDisconnectHandler);
      req.on('aborted', clientDisconnectHandler);

      // ✅ FIXED: Better validation
      if (!req.file) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'No clinic image file uploaded'
        });
      }

      if (!clinicId) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'Clinic ID is required'
        });
      }

      // ✅ FIXED: Verify clinic exists and user has access
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('id', clinicId)
        .single();

      if (clinicError || !clinicData) {
        cleanup();
        return res.status(404).json({
          success: false,
          error: 'Clinic not found or access denied'
        });
      }
      
      console.log(`Processing clinic image upload for clinic: ${clinicData.name} (${clinicId})`);
      
      // Additional server-side validation
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
        });
      }

      // Check file size again
      if (req.file.size > 5 * 1024 * 1024) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5MB.'
        });
      }

      // Check if upload was cancelled before processing
      if (abortController.signal.aborted) {
        cleanup();
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'clinics',
            public_id: `clinic_${clinicId}_${Date.now()}`,
            transformation: [
              { width: 800, height: 600, crop: 'fill' },
              { quality: 'auto', fetch_format: 'auto' }
            ],
            overwrite: true,
            resource_type: 'image',
            timeout: 60000,
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else {
              console.log('Cloudinary upload successful:', result.secure_url);
              resolve(result);
            }
          }
        );
        
        // Handle abortion
        const abortHandler = () => {
          console.log(`Clinic upload aborted for: ${uploadId}`);
          if (uploadStream && uploadStream.destroy) {
            uploadStream.destroy();
          }
          reject(new Error('Upload cancelled'));
        };

        if (abortController.signal.aborted) {
          abortHandler();
          return;
        }

        abortController.signal.addEventListener('abort', abortHandler, { once: true });
        
        // Create stream
        try {
          const readStream = streamifier.createReadStream(req.file.buffer);
          
          readStream.on('error', (streamError) => {
            console.error('Stream error:', streamError);
            reject(new Error(`Stream error: ${streamError.message}`));
          });
          
          uploadStream.on('error', (uploadError) => {
            console.error('Upload stream error:', uploadError);
            reject(new Error(`Upload stream error: ${uploadError.message}`));
          });
          
          readStream.pipe(uploadStream);
        } catch (streamError) {
          console.error('Stream creation error:', streamError);
          reject(new Error(`Stream creation failed: ${streamError.message}`));
        }
      });

      // Check if upload was cancelled after Cloudinary upload
      if (abortController.signal.aborted || isCleanedUp) {
        // Clean up uploaded image
        try {
          await cloudinary.uploader.destroy(uploadResult.public_id);
          console.log('Cleaned up Cloudinary image after cancellation');
        } catch (cleanupError) {
          console.error('Failed to cleanup Cloudinary image:', cleanupError);
        }
        cleanup();
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }

      // ✅ FIXED: Update clinic image_url in database with better error handling
      let updateAttempts = 0;
      const maxUpdateAttempts = 3;
      let updateData, updateError;

      while (updateAttempts < maxUpdateAttempts) {
        try {
          const result = await supabase
            .from('clinics')
            .update({ 
              image_url: uploadResult.secure_url,
              updated_at: new Date().toISOString()
            })
            .eq('id', clinicId)
            .select();

          updateData = result.data;
          updateError = result.error;
          
          if (!updateError && updateData && updateData.length > 0) {
            break; // Success!
          }
          
        } catch (retryError) {
          updateAttempts++;
          updateError = retryError;
          if (updateAttempts < maxUpdateAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (updateError || !updateData || updateData.length === 0) {
        console.error('Clinic image update error after retries:', updateError);
        
        // Clean up Cloudinary image
        try {
          await cloudinary.uploader.destroy(uploadResult.public_id);
          console.log('Cleaned up Cloudinary image due to database error');
        } catch (cleanupError) {
          console.error('Failed to cleanup Cloudinary image:', cleanupError);
        }
        
        cleanup();
        return res.status(500).json({
          success: false,
          error: 'Failed to update clinic image in database'
        });
      }
      
      console.log('✅ Clinic image updated successfully in database');
      
      // Remove event listeners before responding
      req.removeListener('close', clientDisconnectHandler);
      req.removeListener('aborted', clientDisconnectHandler);
      
      cleanup();
      
      // Return success response
      res.json({
        success: true,
        imageUrl: uploadResult.secure_url,
        message: 'Clinic image updated successfully',
        clinic: {
          id: clinicId,
          name: clinicData.name
        }
      });
      
    } catch (error) {
      console.error('❌ Clinic image upload error:', error);
      
      // Ensure cleanup happens
      if (!isCleanedUp) {
        activeUploads.delete(uploadId);
      }
      
      if (error.message === 'Upload cancelled') {
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      // Handle different error types
      if (error.message.includes('Cloudinary')) {
        return res.status(503).json({
          success: false,
          error: 'Image processing service temporarily unavailable'
        });
      }
      
      if (error.message.includes('Stream')) {
        return res.status(400).json({
          success: false,
          error: 'File processing error. Please try again.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error during clinic image upload'
      });
    }
  }
);

// 🔥 **NEW: Doctor Image Upload Endpoint**
router.post('/doctor-image', 
  uploadLimiter, 
  authenticateToken, 
  upload.single('doctorImage'), 
  async (req, res, next) => {
    const uploadId = req.headers['x-upload-id'] || `upload_${Date.now()}`;
    const { doctorId } = req.body; // ✅ Get doctorId from form data
    let isCleanedUp = false;
    
    try {
      console.log('🔍 Doctor Upload Request:', {
        doctorId,
        hasFile: !!req.file,
        fileSize: req.file?.size,
        userId: req.user?.userId
      });

      // Store this upload as active
      const abortController = new AbortController();
      activeUploads.set(uploadId, abortController);

      // Enhanced cleanup function with flag
      const cleanup = () => {
        if (isCleanedUp) return;
        isCleanedUp = true;
        activeUploads.delete(uploadId);
      };

      // Handle client disconnect
      const clientDisconnectHandler = () => {
        console.log(`Client disconnected for doctor upload: ${uploadId}`);
        if (!isCleanedUp) {
          abortController.abort();
          cleanup();
        }
      };

      req.on('close', clientDisconnectHandler);
      req.on('aborted', clientDisconnectHandler);

      // ✅ FIXED: Better validation
      if (!req.file) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'No doctor image file uploaded'
        });
      }

      if (!doctorId) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'Doctor ID is required'
        });
      }

      // ✅ FIXED: Verify doctor exists
      const { data: doctorData, error: doctorError } = await supabase
        .from('doctors')
        .select('id, name')
        .eq('id', doctorId)
        .single();

      if (doctorError || !doctorData) {
        cleanup();
        return res.status(404).json({
          success: false,
          error: 'Doctor not found or access denied'
        });
      }
      
      console.log(`Processing doctor image upload for doctor: ${doctorData.name} (${doctorId})`);
      
      // Additional server-side validation
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
        });
      }

      // Check file size again
      if (req.file.size > 5 * 1024 * 1024) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 5MB.'
        });
      }

      // Check if upload was cancelled before processing
      if (abortController.signal.aborted) {
        cleanup();
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'doctors',
            public_id: `doctor_${doctorId}_${Date.now()}`,
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' },
              { quality: 'auto', fetch_format: 'auto' }
            ],
            overwrite: true,
            resource_type: 'image',
            timeout: 60000,
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(new Error(`Cloudinary upload failed: ${error.message}`));
            } else {
              console.log('Cloudinary upload successful:', result.secure_url);
              resolve(result);
            }
          }
        );
        
        // Handle abortion
        const abortHandler = () => {
          console.log(`Doctor upload aborted for: ${uploadId}`);
          if (uploadStream && uploadStream.destroy) {
            uploadStream.destroy();
          }
          reject(new Error('Upload cancelled'));
        };

        if (abortController.signal.aborted) {
          abortHandler();
          return;
        }

        abortController.signal.addEventListener('abort', abortHandler, { once: true });
        
        // Create stream
        try {
          const readStream = streamifier.createReadStream(req.file.buffer);
          
          readStream.on('error', (streamError) => {
            console.error('Stream error:', streamError);
            reject(new Error(`Stream error: ${streamError.message}`));
          });
          
          uploadStream.on('error', (uploadError) => {
            console.error('Upload stream error:', uploadError);
            reject(new Error(`Upload stream error: ${uploadError.message}`));
          });
          
          readStream.pipe(uploadStream);
        } catch (streamError) {
          console.error('Stream creation error:', streamError);
          reject(new Error(`Stream creation failed: ${streamError.message}`));
        }
      });

      // Check if upload was cancelled after Cloudinary upload
      if (abortController.signal.aborted || isCleanedUp) {
        // Clean up uploaded image
        try {
          await cloudinary.uploader.destroy(uploadResult.public_id);
          console.log('Cleaned up Cloudinary image after cancellation');
        } catch (cleanupError) {
          console.error('Failed to cleanup Cloudinary image:', cleanupError);
        }
        cleanup();
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }

      // ✅ FIXED: Update doctor image_url in database
      let updateAttempts = 0;
      const maxUpdateAttempts = 3;
      let updateData, updateError;

      while (updateAttempts < maxUpdateAttempts) {
        try {
          const result = await supabase
            .from('doctors')
            .update({ 
              image_url: uploadResult.secure_url,
              updated_at: new Date().toISOString()
            })
            .eq('id', doctorId)
            .select();

          updateData = result.data;
          updateError = result.error;
          
          if (!updateError && updateData && updateData.length > 0) {
            break; // Success!
          }
          
        } catch (retryError) {
          updateAttempts++;
          updateError = retryError;
          if (updateAttempts < maxUpdateAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (updateError || !updateData || updateData.length === 0) {
        console.error('Doctor image update error after retries:', updateError);
        
        // Clean up Cloudinary image
        try {
          await cloudinary.uploader.destroy(uploadResult.public_id);
          console.log('Cleaned up Cloudinary image due to database error');
        } catch (cleanupError) {
          console.error('Failed to cleanup Cloudinary image:', cleanupError);
        }
        
        cleanup();
        return res.status(500).json({
          success: false,
          error: 'Failed to update doctor image in database'
        });
      }
      
      console.log('✅ Doctor image updated successfully in database');
      
      // Remove event listeners before responding
      req.removeListener('close', clientDisconnectHandler);
      req.removeListener('aborted', clientDisconnectHandler);
      
      cleanup();
      
      // Return success response
      res.json({
        success: true,
        imageUrl: uploadResult.secure_url,
        message: 'Doctor image updated successfully',
        doctor: {
          id: doctorId,
          name: doctorData.name
        }
      });
      
    } catch (error) {
      console.error('❌ Doctor image upload error:', error);
      
      // Ensure cleanup happens
      if (!isCleanedUp) {
        activeUploads.delete(uploadId);
      }
      
      if (error.message === 'Upload cancelled') {
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      // Handle different error types
      if (error.message.includes('Cloudinary')) {
        return res.status(503).json({
          success: false,
          error: 'Image processing service temporarily unavailable'
        });
      }
      
      if (error.message.includes('Stream')) {
        return res.status(400).json({
          success: false,
          error: 'File processing error. Please try again.'
        });
      }
      
      return res.status(500).json({
        success: false,
        error: 'Internal server error during doctor image upload'
      });
    }
  }
);

// Cancel upload endpoint with better error handling
router.delete('/profile-image/:uploadId', authenticateToken, (req, res) => {
  const { uploadId } = req.params;
  const abortController = activeUploads.get(uploadId);
  
  if (abortController) {
    try {
      abortController.abort();
      activeUploads.delete(uploadId);
      console.log(`Upload cancelled: ${uploadId}`);
      res.json({ success: true, message: 'Upload cancelled' });
    } catch (error) {
      console.error('Error cancelling upload:', error);
      res.status(500).json({ success: false, error: 'Failed to cancel upload' });
    }
  } else {
    res.status(404).json({ success: false, error: 'Upload not found' });
  }
});

export default router