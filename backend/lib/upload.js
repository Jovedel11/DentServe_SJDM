import multer from "multer";
import rateLimit from "express-rate-limit";

// rate-limit to upload 
export const uploadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10, // 🔥 Increased from 5 to 10 for clinic images
  message: { error: 'Too many upload attempts, please try again' },
  standardHeaders: true,
  legacyHeaders: false,
});


export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024, // 🔥 10MB max (Cloudinary free tier)
    fieldSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

export const getUploadConfig = (uploadType) => {
  const configs = {
    profile: {
      maxSize: 5 * 1024 * 1024, // 5MB
      compression: { quality: 0.8, maxWidth: 400, maxHeight: 400 }
    },
    clinic: {
      maxSize: 10 * 1024 * 1024, // 10MB (free tier limit)
      compression: { quality: 0.85, maxWidth: 1200, maxHeight: 800 }
    },
    doctor: {
      maxSize: 5 * 1024 * 1024, // 5MB
      compression: { quality: 0.8, maxWidth: 400, maxHeight: 400 }
    },
    general: {
      maxSize: 10 * 1024 * 1024, // 10MB
      compression: { quality: 0.8, maxWidth: 800, maxHeight: 600 }
    }
  };

  return configs[uploadType] || configs.general;
};
