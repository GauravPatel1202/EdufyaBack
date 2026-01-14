import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import careerRoutes from './routes/careerRoutes';
import authRoutes from './routes/authRoutes';
import courseRoutes from './routes/courseRoutes';
import profileRoutes from './routes/profileRoutes';
import learningPathRoutes from './routes/learningPathRoutes';
import dashboardRoutes from './routes/dashboardRoutes';
import subscriptionRoutes from './routes/subscriptionRoutes';
import adminRoutes from './routes/adminRoutes';
import { errorHandler } from './middleware/errorHandler';
import helmet from 'helmet';
import compression from 'compression';

dotenv.config();

// Polyfill for pdf-parse (Vercel/Serverless safety)
if (typeof (global as any).DOMMatrix === 'undefined') {
  (global as any).DOMMatrix = class {};
}
if (typeof (global as any).ImageData === 'undefined') {
  (global as any).ImageData = class {};
}
if (typeof (global as any).Path2D === 'undefined') {
  (global as any).Path2D = class {};
}
if (typeof (global as any).CanvasRenderingContext2D === 'undefined') {
  (global as any).CanvasRenderingContext2D = class {};
}

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;

// CORS configuration - Simplified for debugging
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};

// Performance & Security Middlewares (Standard for express on Vercel)
app.use(helmet());
app.use(compression());

// Enable pre-flight for all routes
app.use(cors(corsOptions));
app.use(express.json());

// Health check and root verification
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Welcome to Edufya AI API (Simplified for Debugging)',
    version: '1.0.1',
    env: process.env.VERCEL ? 'vercel' : 'local'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Routes
app.use('/api/career', careerRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/learning-paths', learningPathRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/subscription', subscriptionRoutes);
app.use('/api/admin', adminRoutes);

// Error Handling
app.use(errorHandler);

// Database connection
const connectDB = async () => {
  if (!MONGODB_URI) {
    console.warn('⚠️ MONGODB_URI is not defined');
    return;
  }

  try {
    // Avoid re-connecting if already connected
    if (mongoose.connection.readyState === 1) return;
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');
  } catch (err: any) {
    console.error('❌ MongoDB connection error:', err.message);
  }
};

// Initiate connection but don't block
connectDB();

// Only start the server if we're not on Vercel
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
}

export default app;
