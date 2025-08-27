import express from "express"
import authenticateToken from "../middleware/auth.js";
import { uploadLimiter, upload } from "../lib/upload.js"
import cloudinary from "../lib/cloudinary.js";
import streamifier from "streamifier"
import { adminSupabase } from "../lib/supabaseSuperAdmin.js";

const router = express.Router();

// profile image upload endpoint
router.post('/profile-image', 
  uploadLimiter, 
  authenticateToken, 
  upload.single('profileImage'), 
  async (req, res, next) => {
    try {
      // validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file uploaded'
        });
      }
      
      console.log(`Processing upload for user: ${req.user.userId}`);
      console.log(`File info: ${req.file.originalname}, ${req.file.size} bytes`);
      
      // additional server-side validation
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(req.file.mimetype)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.'
        });
      }
      
      // upload to Cloudinary using stream
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'profiles', // organize uploads in a folder
            public_id: `user_${req.user.userId}_${Date.now()}`, // unique filename
            transformation: [
              { width: 400, height: 400, crop: 'fill', gravity: 'face' }, // square crop focused on face
              { quality: 'auto', fetch_format: 'auto' } // optimize quality and format
            ],
            overwrite: true, // allow overwriting existing image
            resource_type: 'image'
          },
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );
        
        // convert buffer to stream and pipe to cloudinary
        streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
      });
      
      console.log('Cloudinary upload successful:', uploadResult.secure_url);
      
      // update profile_image_url in supabase
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
        
        // if database update fails, optionally delete the uploaded image from Cloudinary
        try {
          await cloudinary.uploader.destroy(uploadResult.public_id);
          console.log('Cleaned up Cloudinary image due to database error');
        } catch (cleanupError) {
          console.error('Failed to cleanup Cloudinary image:', cleanupError);
        }
        
        return res.status(500).json({
          success: false,
          error: 'Failed to update profile in database'
        });
      }
      
      console.log('Profile updated successfully in database');
      
      // return success response
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
      next(error)
    }
  }
);

export default router