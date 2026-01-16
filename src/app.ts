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
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
// CORS configuration - Must be FIRST
const corsOptions = {
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  optionsSuccessStatus: 200
};
app.set('etag', false); 
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Security: Rate Limiting (Used after CORS so OPTIONS aren't limited if needed)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests from this IP, please try again after 15 minutes' },
  skip: (req) => req.method === 'OPTIONS', // Don't rate limit preflight
});

// Apply rate limiter to all routes
app.use('/api/', limiter);

// Performance & Security Middlewares
app.use(helmet({
  contentSecurityPolicy: false,
}));
app.use(compression());

// DB Connection Import
import connectDB from './config/db';

app.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    message: 'Welcome to Edufya AI API',
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

// Database connection middleware (Lazy connect for requests)
// For local we connect at startup, but this safety net helps
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
     try {
       await connectDB();
     } catch(e) {
       console.error("DB Connect Middleware Error:", e);
     }
  }
  next();
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

// Only start the server if we're not on Vercel
if (!process.env.VERCEL) {
  console.log('Starting in LOCAL mode...');
  
  // Connect to DB first to keep process alive and ensure readiness
  connectDB().then(() => {
      console.log('✅ Local DB Connected');
      const server = app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
      });
      
      // Handle server errors
      server.on('error', (err) => {
          console.error('SERVER ERROR:', err);
      });

  }).catch(err => {
      console.error('❌ Failed to connect to DB locally:', err);
  });
} else {
    console.log('Starting in SERVERLESS (Vercel) mode...');
}

export default app;
