import multer from "multer";
import rateLimit from "express-rate-limit";

// rate-limit to upload 
export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5, // limit each ip to upload request per window
  message: { error: 'Too many upload attempts, please try again' },
  standardHeaders: true,
  legacyHeaders: false,
});

// multer for memory storage (cloudinary)
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5mb
  fileFilter: (req, file, cb) => {
    // only image file
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else cb (new Error('Only image files are allowed!'), false)
  }
})
