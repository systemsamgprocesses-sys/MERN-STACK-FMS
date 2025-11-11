import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';
import fs from 'fs';
import dotenv from 'dotenv';
import { config, mongoOptions } from './config.js';

// Import routes
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import dashboardRoutes from './routes/dashboard.js';
import settingsRoutes from './routes/settings.js';
import fmsRoutes from './routes/fms.js';
import fmsCategoryRoutes from './routes/fmsCategories.js';
import projectRoutes from './routes/projects.js';
import leadsRoutes from './routes/leads.js';
import objectionRoutes from './routes/objections.js';
import auditLogRoutes from './routes/auditLogs.js';
import scoreLogRoutes from './routes/scoreLogs.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = config.port;

// Middleware
const replitDomain = process.env.REPLIT_DEV_DOMAIN;
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'http://localhost:3000',
  'https://hub.amgrealty.in',
  'https://task.amgrealty.in',
  'https://tasks.amgrealty.in',
  replitDomain ? `https://${replitDomain}` : null,
  config.corsOrigin
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.log('Blocked by CORS:', origin);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
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

const upload = multer({
  storage: storage,
  limits: { fileSize: config.maxFileSize },
  fileFilter: function (req, file, cb) {
    cb(null, true);
  }
});

// File upload endpoint
app.post('/api/upload', upload.array('files', 10), (req, res) => {
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

// Serve assets folder for branding (logo, favicon)
const assetsDir = path.join(__dirname, '..', 'assets');
app.use('/assets', express.static(assetsDir));

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
app.use('/api/settings', settingsRoutes);
app.use('/api/fms', fmsRoutes);
app.use('/api/fms/categories', fmsCategoryRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/leads', leadsRoutes);
app.use('/api/objections', objectionRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/score-logs', scoreLogRoutes);

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

    // Create default admin if not exists
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

    // Start server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('❌ MongoDB connection error:', error);
  });