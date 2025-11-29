import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';
import { config, mongoOptions } from './config.js';
import { authenticateToken } from './middleware/auth.js';

// Import routes
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import dashboardOptimizedRoutes from './routes/dashboardOptimized.js';
import settingsRoutes from './routes/settings.js';
import fmsRoutes from './routes/fms.js';
import fmsCategoryRoutes from './routes/fmsCategories.js';
import projectRoutes from './routes/projects.js';
import leadsRoutes from './routes/leads.js';
import objectionRoutes from './routes/objections.js';
import auditLogRoutes from './routes/auditLogs.js';
import scoreLogRoutes from './routes/scoreLogs.js';
import checklistRoutes from './routes/checklists.js';
import checklistCategoryRoutes from './routes/checklistCategories.js';
import checklistTemplateRoutes from './routes/checklistTemplates.js';
import checklistOccurrenceRoutes from './routes/checklistOccurrences.js';
import helpTicketRoutes from './routes/helpTickets.js';
import complaintRoutes from './routes/complaints.js';
import stationeryRoutes from './routes/stationery.js';
import adjustmentLogRoutes from './routes/adjustmentLogs.js';
import fmsDashboardRoutes from './routes/fmsDashboard.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;

// Middleware
const replitDomain = process.env.REPLIT_DEV_DOMAIN;
const normalizeOrigin = (origin) => origin?.replace(/\/$/, '');
const allowedOrigins = [
  'http://localhost:5173', // Employee App (Dev)
  'http://localhost:5174', // HR Portal (Dev)
  'http://localhost:5000', // Legacy local server
  'https://hub.amgrealty.in', // Main App (Production)
  'https://task.amgrealty.in', // Legacy/alternate
  'https://tasks.amgrealty.in', // Legacy/alternate
  'http://human-resource.amgrealty.in', // HR Portal (Production HTTP)
  'https://human-resource.amgrealty.in', // HR Portal (Production HTTPS)
  process.env.HR_PORTAL_URL,
  process.env.EMPLOYEE_PORTAL_URL,
  replitDomain ? `https://${replitDomain}` : null,
  config.corsOrigin
]
  .filter(Boolean)
  .map(normalizeOrigin);

// Log allowed origins on startup
console.log('✅ CORS Allowed Origins:', allowedOrigins);

// CORS middleware - must be before other middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) {
      return callback(null, true);
    }

    const normalizedOrigin = normalizeOrigin(origin);
    
    // Debug logging for all CORS requests
    console.log(`[CORS] Request from origin: ${origin} | Normalized: ${normalizedOrigin}`);
    
    // Check if the origin is in the allowed list
    if (allowedOrigins.includes(normalizedOrigin)) {
      // Return the actual origin (not just true) to set the Access-Control-Allow-Origin header correctly
      console.log(`[CORS] ✅ Allowed: ${normalizedOrigin}`);
      return callback(null, normalizedOrigin);
    }

    console.log('❌ [CORS] Blocked:', origin, '| Normalized:', normalizedOrigin);
    console.log('   Allowed origins:', allowedOrigins);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 204,
  preflightContinue: false
}));

// ============================================
// PERFORMANCE OPTIMIZATIONS
// ============================================

// Enable gzip compression for all responses (reduces bandwidth by 70-90%)
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6 // Compression level (0-9, 6 is good balance)
}));

// Rate limiting to prevent API abuse and CPU spikes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Skip rate limiting for certain routes if needed
  skip: (req) => {
    // Don't rate limit OPTIONS requests (CORS preflight), health checks, or static files
    return req.method === 'OPTIONS' || req.path === '/health' || req.path.startsWith('/uploads/');
  }
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Stricter rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Only 20 login attempts per 15 minutes
  message: 'Too many login attempts, please try again later.',
  // Skip rate limiting for OPTIONS requests (CORS preflight)
  skip: (req) => req.method === 'OPTIONS'
});
app.use('/api/auth/login', authLimiter);

app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, config.uploadsDir);
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

const allowedUploadMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]);

const upload = multer({
  storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: function (req, file, cb) {
    if (allowedUploadMimeTypes.has(file.mimetype)) {
      return cb(null, true);
    }
    cb(new Error('Unsupported file type'));
  }
});

// File upload endpoint (authenticated + limited mime types)
app.post('/api/upload', authenticateToken, upload.array('files', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
    const fileInfo = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      uploadedAt: new Date()
    }));
    res.json({ message: 'Files uploaded successfully', files: fileInfo });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Server error during file upload' });
  }
});

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// Serve static assets (prioritize built files in production)
const brandAssetsDir = path.join(__dirname, '..', 'assets');
if (config.nodeEnv === 'production') {
  const distAssetsDir = path.join(__dirname, '..', 'dist', 'assets');
  if (fs.existsSync(distAssetsDir)) {
    app.use('/assets', express.static(distAssetsDir));
  }
}
app.use('/assets', express.static(brandAssetsDir));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || '1.0.0'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dashboard', dashboardOptimizedRoutes); // Optimized dashboard endpoints
app.use('/api/settings', settingsRoutes);
app.use('/api/fms', fmsRoutes);
app.use('/api/fms-categories', fmsCategoryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/objections', objectionRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/score-logs', scoreLogRoutes);
app.use('/api/checklists', checklistRoutes);
app.use('/api/checklist-categories', checklistCategoryRoutes);
app.use('/api/checklist-templates', checklistTemplateRoutes);
app.use('/api/checklist-occurrences', checklistOccurrenceRoutes);
app.use('/api/help-tickets', helpTicketRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/stationery', stationeryRoutes);
app.use('/api/adjustment-logs', adjustmentLogRoutes);
app.use('/api/fms-dashboard', fmsDashboardRoutes);

// Serve frontend in production
if (config.nodeEnv === 'production') {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// MongoDB connection
mongoose.connect(config.mongoURI, mongoOptions)
  .then(() => {
    console.log('✅ Connected to MongoDB');

    if (config.nodeEnv !== 'production') {
      // Create default admin if not exists (development only)
      const User = mongoose.model('User');
      User.findOne({ email: 'admin@taskmanagement.com' })
        .then(existingAdmin => {
          if (!existingAdmin) {
            const admin = new User({
              username: 'Admin',
              email: 'admin@taskmanagement.com',
              password: '123456',
              role: 'admin',
              permissions: {
                canViewTasks: true,
                canViewAllTeamTasks: true,
                canAssignTasks: true,
                canDeleteTasks: true,
                canEditTasks: true,
                canManageUsers: true,
                canEditRecurringTaskSchedules: true
              }
            });
            admin.save()
              .then(() => console.log('✅ Admin user created with default credentials'))
              .catch(err => console.error('Error creating admin user:', err));
          } else {
            console.log('ℹ️ Admin user already exists');
          }
        })
        .catch(err => console.error('Error checking for admin user:', err));

      User.findOne({ role: 'superadmin' })
        .then(existingSuperAdmin => {
          if (!existingSuperAdmin) {
            const superAdmin = new User({
              username: 'Super Admin',
              email: 'superadmin@taskmanagement.com',
              password: 'Super123!',
              role: 'superadmin',
              permissions: {
                canViewTasks: true,
                canViewAllTeamTasks: true,
                canAssignTasks: true,
                canDeleteTasks: true,
                canEditTasks: true,
                canManageUsers: true,
                canEditRecurringTaskSchedules: true,
                canCompleteTasksOnBehalf: true
              }
            });
            superAdmin.save()
              .then(() => console.log('✅ Super admin user created with default credentials'))
              .catch(err => console.error('Error creating super admin user:', err));
          }
        })
        .catch(err => console.error('Error checking for super admin user:', err));
    } else {
      console.log('⚠️ Skipping default admin creation in production');
    }

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });