import express from "express"
import authenticateToken from "../middlewares/auth.js";
import { uploadLimiter, upload } from "../lib/upload.js"
import cloudinary from "../lib/cloudinary.js";
import streamifier from "streamifier"
import { supabase } from "../lib/supabaseSuperAdmin.js";

const router = express.Router();

// Store active uploads for cancellation
const activeUploads = new Map();

// Generic upload handler
const createUploadHandler = (config) => {
  return async (req, res, next) => {
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

      // Handle client disconnect
      const clientDisconnectHandler = () => {
        console.log(`Client disconnected for ${config.type} upload: ${uploadId}`);
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
          error: `No ${config.type} image file uploaded`
        });
      }

      // Extract entity ID and validate if required
      let entityId = null;
      if (config.requiresEntityId) {
        entityId = req.body[config.entityIdField];
        if (!entityId) {
          cleanup();
          return res.status(400).json({
            success: false,
            error: `${config.entityIdField} is required`
          });
        }

        // Verify entity exists
        if (config.validateEntity) {
          const entityData = await config.validateEntity(entityId);
          if (!entityData) {
            cleanup();
            return res.status(404).json({
              success: false,
              error: `${config.type} not found or access denied`
            });
          }
        }
      }
      
      console.log(`Processing ${config.type} image upload${entityId ? ` for ID: ${entityId}` : ''}`);
      
      // 🔥 **IMPROVED: Server-side validation with higher limits for clinic**
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
        });
      }

      // 🔥 **DYNAMIC FILE SIZE LIMITS**
      const maxSizes = {
        clinic: 50 * 1024 * 1024, // 50MB for clinic images
        profile: 5 * 1024 * 1024,  // 5MB for profile images
        doctor: 5 * 1024 * 1024,   // 5MB for doctor images
        general: 10 * 1024 * 1024  // 10MB for general images
      };

      const maxSize = maxSizes[config.type] || maxSizes.general;
      
      if (req.file.size > maxSize) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: `File too large. Maximum size for ${config.type} images is ${Math.round(maxSize / 1024 / 1024)}MB.`
        });
      }

      if (abortController.signal.aborted) {
        cleanup();
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      // Get custom options from form data
      const customFolder = req.body.folder;
      const customTransformations = req.body.transformations;
      
      // Prepare Cloudinary options
      const cloudinaryOptions = {
        folder: customFolder || config.folder,
        public_id: `${config.publicIdPrefix}_${entityId || req.user.userId}_${Date.now()}`,
        transformation: customTransformations ? JSON.parse(customTransformations) : config.transformations,
        overwrite: true,
        resource_type: 'image',
        timeout: 120000, // 🔥 Increased timeout for large files
      };

      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          cloudinaryOptions,
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
          console.log(`${config.type} upload aborted for: ${uploadId}`);
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

      // Update database if required
      if (config.updateDatabase) {
        const updateResult = await config.updateDatabase(uploadResult.secure_url, entityId, req.user);
        if (!updateResult.success) {
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
            error: `Failed to update ${config.type} image in database`
          });
        }
      }
      
      console.log(`✅ ${config.type} image updated successfully`);
      
      // Remove event listeners before responding
      req.removeListener('close', clientDisconnectHandler);
      req.removeListener('aborted', clientDisconnectHandler);
      
      cleanup();
      
      // Return success response
      res.json({
        success: true,
        imageUrl: uploadResult.secure_url,
        message: `${config.type} image updated successfully`,
        ...config.responseData(entityId, req.user)
      });
      
    } catch (error) {
      console.error(`❌ ${config.type} image upload error:`, error);
      
      if (!isCleanedUp) {
        activeUploads.delete(uploadId);
      }
      
      if (error.message === 'Upload cancelled') {
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
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
        error: `Internal server error during ${config.type} image upload`
      });
    }
  };
};

// Profile image upload
router.post('/profile-image', 
  uploadLimiter, 
  authenticateToken, 
  upload.single('profileImage'), 
  createUploadHandler({
    type: 'profile',
    folder: 'profiles',
    publicIdPrefix: 'user',
    transformations: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' }
    ],
    requiresEntityId: false,
    updateDatabase: async (imageUrl, entityId, user) => {
      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .update({ 
            profile_image_url: imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.userProfileId);
        
        return { success: !error, data, error };
      } catch (err) {
        return { success: false, error: err };
      }
    },
    responseData: (entityId, user) => ({
      user: {
        id: user.userId,
        name: `${user.firstName} ${user.lastName}`
      }
    })
  })
);

// 🔥 **IMPROVED: Clinic image upload with higher limits**
router.post('/clinic-image', 
  uploadLimiter, 
  authenticateToken, 
  upload.single('clinicImage'), 
  createUploadHandler({
    type: 'clinic',
    folder: 'clinics',
    publicIdPrefix: 'clinic',
    entityIdField: 'clinicId',
    requiresEntityId: true,
    transformations: [
      { width: 1200, height: 800, crop: 'fill' },
      { quality: 'auto:good', fetch_format: 'auto' } // Better quality for clinic images
    ],
    validateEntity: async (clinicId) => {
      const { data } = await supabase
        .from('clinics')
        .select('id, name')
        .eq('id', clinicId)
        .single();
      return data;
    },
    updateDatabase: async (imageUrl, clinicId) => {
      try {
        const { data, error } = await supabase
          .from('clinics')
          .update({ 
            image_url: imageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', clinicId);
        
        return { success: !error, data, error };
      } catch (err) {
        return { success: false, error: err };
      }
    },
    responseData: (clinicId) => ({
      clinic: { id: clinicId }
    })
  })
);

// 🔥 **FIXED: Doctor image upload with correct field selection**
router.post('/doctor-image', 
  uploadLimiter, 
  authenticateToken, 
  upload.single('doctorImage'), 
  createUploadHandler({
    type: 'doctor',
    folder: 'doctors',
    publicIdPrefix: 'doctor',
    entityIdField: 'doctorId',
    requiresEntityId: true,
    transformations: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto', fetch_format: 'auto' }
    ],
    validateEntity: async (doctorId) => {
      // 🔥 **FIXED: Use correct field names from doctors table**
      const { data } = await supabase
        .from('doctors')
        .select('id, first_name, last_name') // Use actual field names
        .eq('id', doctorId)
        .single();
      return data;
    },
    updateDatabase: async (imageUrl, doctorId) => {
      try {
        // 🔥 **FIXED: Update the correct image field**
        const { data, error } = await supabase
          .from('doctors')
          .update({ 
            image_url: imageUrl, // Use image_url field as per schema
            updated_at: new Date().toISOString()
          })
          .eq('id', doctorId);
        
        return { success: !error, data, error };
      } catch (err) {
        return { success: false, error: err };
      }
    },
    responseData: (doctorId) => ({
      doctor: { id: doctorId }
    })
  })
);

// General image upload endpoint
router.post('/general-image', 
  uploadLimiter, 
  authenticateToken, 
  upload.single('image'), 
  createUploadHandler({
    type: 'general',
    folder: 'general',
    publicIdPrefix: 'img',
    requiresEntityId: false,
    transformations: [
      { width: 1200, height: 800, crop: 'limit' },
      { quality: 'auto', fetch_format: 'auto' }
    ],
    updateDatabase: null, // No database update for general images
    responseData: () => ({})
  })
);

// Universal cancel upload endpoint
router.delete('/cancel/:uploadId', authenticateToken, (req, res) => {
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