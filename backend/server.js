import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import recaptchaRoutes from "./routes/recaptcha.js"
import { adminSupabase } from './lib/supabaseSuperAdmin.js';
import cloudinary from './lib/cloudinary.js';

dotenv.config();

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

// for react to connect
app.use(cors({
  origin: 
  process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // allow cookies
  methods: ['GET', 'POST'], // only http methods allowed
  allowedHeaders: ['Content-Type', 'Authorization'] // allowed headers
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
  });
});

app.listen(PORT, () =>  console.log(`Custom Server is running on http://localhost:${PORT}`));

app.use('/api/recaptcha', recaptchaRoutes);

// Add error handling middleware
app.use((error, req, res, next) => {
  console.error('Server Error:', {
    message: error.message,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    ip: req.ip
  });

  res.status(error.status || 500).json({
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