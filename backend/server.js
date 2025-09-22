import './config.js'
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import recaptchaRoutes from "./routes/recaptcha.js"
import multer from 'multer';
import uploadRoutes from "./routes/cloudImage.js"
import emailRoutes from "./routes/email.js"

const app = express();
const PORT = process.env.PORT || 3001;

// middlewares
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

try {
  new URL(process.env.FRONTEND_URL);
  console.log("FRONTEND_URL is valid");
} catch (err) {
  console.error("Invalid FRONTEND_URL:", process.env.FRONTEND_URL);
}

const allowedOrigins = [
  process.env.FRONTEND2,  // incase other import
  process.env.FRONTEND3,  // last fallback
  process.env.FRONTEND_URL, // deployed frontend || production
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization',
    'X-Upload-Id',
    'X-Requested-With',
    'Accept',
    'Origin'
  ],
  exposedHeaders: ['X-Upload-Id'],
  optionsSuccessStatus: 200
}));

// parse data
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// log all queries/ to debug
app.use(morgan('combined'));

app.get('/health', (_req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    message: 'Backend server is running',
    port: PORT,
  });
});

// Routes
app.use('/api/recaptcha', recaptchaRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/email', emailRoutes);

app.listen(PORT, () =>  console.log(`Custom Server is running on http://localhost:${PORT}`));

// Add error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Handle client disconnect during upload
  if (req.aborted || req.destroyed) {
    console.log('Client disconnected during request processing');
    return; // Don't send response to disconnected client
  }

  // multer specific error
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File too large. Maximum size is 5MB',
        timestamp: new Date().toISOString(),
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field',
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Custom validation errors
  if (error.message === 'Only image files are allowed!') {
    return res.status(400).json({
      success: false,
      error: 'Only image files are allowed',
      timestamp: new Date().toISOString(),
    });
  }

  // Rate limit errors
  if (error.statusCode === 429) {
    return res.status(429).json({
      success: false,
      error: 'Too many requests. Please try again later.',
      timestamp: new Date().toISOString(),
    });
  }

  // Authentication errors
  if (error.message.includes('token') || error.message.includes('auth')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication failed',
      timestamp: new Date().toISOString(),
    });
  }

  // Network/timeout errors
  if (error.code === 'ENOTFOUND' || error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT') {
    return res.status(503).json({
      success: false,
      error: 'Service temporarily unavailable',
      timestamp: new Date().toISOString(),
    });
  }

  // Default error response
  const statusCode = error.status || error.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: process.env.NODE_ENV === 'development' 
      ? error.message 
      : 'Internal server error',
    timestamp: new Date().toISOString()
  });
});


// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    path: req.originalUrl,
    method: req.method
  });
});