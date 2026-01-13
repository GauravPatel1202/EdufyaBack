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

import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler';
import { metricsMiddleware, getMetrics } from './middleware/metrics';
import { mongooseMetricsPlugin } from './middleware/dbMetrics';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = process.env.MONGODB_URI;

// In Vercel, we can't process.exit during module load as it breaks the function
if (!MONGODB_URI) {
  console.warn('⚠️ MONGODB_URI is not defined in environment variables');
}

// Security Headers
app.use(helmet());

// Compression
app.use(compression());

// Logging
app.use(morgan('dev'));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs (relaxed for dev)
  message: 'Too many requests from this IP, please try again after 15 minutes'
});
app.use('/api/', limiter);

// CORS configuration

app.use(cors({
  origin: (origin, callback) => {
    // Reflecting the incoming origin allows "all" while supporting credentials: true
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());

// Metrics Middleware - Disable on Vercel to avoid system access issues
if (!process.env.VERCEL) {
  app.use(metricsMiddleware);
}

// Health check and root verification
app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Welcome to Edufya AI API',
    version: '1.0.0'
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
console.log('Connecting to MongoDB...');
if (!process.env.VERCEL) {
  mongoose.plugin(mongooseMetricsPlugin);
}

const connectDB = async () => {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is missing. Database connection skipped.');
      return;
    }
    await mongoose.connect(MONGODB_URI as string);
    console.log('✅ Connected to MongoDB');
    
    // Only start the server if we're not on Vercel
    if (!process.env.VERCEL) {
      app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
    }
  } catch (err: any) {
    console.error('❌ MongoDB connection error:', err.message);
    // In serverless, we don't want to process.exit(1) as it kills the instance
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};

connectDB();

export default app;
