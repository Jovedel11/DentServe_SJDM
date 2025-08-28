import express from "express"
import authenticateToken from "../middleware/auth.js";
import { uploadLimiter, upload } from "../lib/upload.js"
import cloudinary from "../lib/cloudinary.js";
import streamifier from "streamifier"
import { adminSupabase } from "../lib/supabaseSuperAdmin.js";

const router = express.Router();

// Store active uploads for cancellation
const activeUploads = new Map();

// Enhanced profile image upload endpoint with progress tracking
router.post('/profile-image', 
  uploadLimiter, 
  authenticateToken, 
  upload.single('profileImage'), 
  async (req, res, next) => {
    const uploadId = req.headers['x-upload-id'] || `upload_${Date.now()}`;
    
    try {
      // Store this upload as active
      const abortController = new AbortController();
      activeUploads.set(uploadId, abortController);

      // Clean up function
      const cleanup = () => {
        activeUploads.delete(uploadId);
      };

      // Handle client disconnect
      req.on('close', () => {
        abortController.abort();
        cleanup();
      });

      // Validate file upload
      if (!req.file) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }
      
      console.log(`Processing upload for user: ${req.user.userId}`);
      console.log(`File info: ${req.file.originalname}, ${req.file.size} bytes`);
      
      // Additional server-side validation
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        cleanup();
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
        });
      }

      // Check if upload was cancelled
      if (abortController.signal.aborted) {
        cleanup();
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      // Upload to Cloudinary using stream with progress callbacks
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
            // Add progress callback if supported
            progress: (bytesUploaded, bytesTotal) => {
              const progress = Math.round((bytesUploaded / bytesTotal) * 100);
              console.log(`Upload progress: ${progress}%`);
            }
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              cleanup();
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        
        // Handle abortion
        abortController.signal.addEventListener('abort', () => {
          uploadStream.destroy();
          cleanup();
          reject(new Error('Upload cancelled'));
        });
        
        // Convert buffer to stream and pipe to cloudinary
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });

      // Check if upload was cancelled after Cloudinary upload
      if (abortController.signal.aborted) {
        // Clean up uploaded image
        try {
          await cloudinary.uploader.destroy(uploadResult.public_id);
        } catch (cleanupError) {
          console.error('Failed to cleanup Cloudinary image:', cleanupError);
        }
        cleanup();
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      console.log('Cloudinary upload successful:', uploadResult.secure_url);
      
      // Update profile_image_url in supabase
      const { data: updateData, error: updateError } = await adminSupabase
        .from('user_profiles')
        .update({ 
          profile_image_url: uploadResult.secure_url,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.user.userProfileId)
        .select();
      
      if (updateError) {
        console.error('Supabase update error:', updateError);
        
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
          error: 'Failed to update profile in database'
        });
      }
      
      console.log('Profile updated successfully in database');
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
      activeUploads.delete(uploadId);
      
      if (error.message === 'Upload cancelled') {
        return res.status(499).json({
          success: false,
          error: 'Upload cancelled'
        });
      }
      
      next(error);
    }
  }
);

// Cancel upload endpoint
router.delete('/profile-image/:uploadId', authenticateToken, (req, res) => {
  const { uploadId } = req.params;
  const abortController = activeUploads.get(uploadId);
  
  if (abortController) {
    abortController.abort();
    activeUploads.delete(uploadId);
    res.json({ success: true, message: 'Upload cancelled' });
  } else {
    res.status(404).json({ success: false, error: 'Upload not found' });
  }
});

export default router