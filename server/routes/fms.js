
import express from 'express';
import FMS from '../models/FMS.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf|docx|xlsx|webm|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Invalid file type'));
  }
});

// Create FMS Template
router.post('/', upload.array('files', 10), async (req, res) => {
  try {
    const { fmsName, steps, createdBy } = req.body;
    
    // Generate unique FMS ID
    const count = await FMS.countDocuments();
    const fmsId = `FMS-${(count + 1).toString().padStart(4, '0')}`;
    
    // Parse steps if sent as string
    const parsedSteps = typeof steps === 'string' ? JSON.parse(steps) : steps;
    
    // Process file uploads
    if (req.files && req.files.length > 0) {
      const fileMap = {};
      req.files.forEach(file => {
        const stepIndex = parseInt(file.fieldname.split('-')[1]);
        if (!fileMap[stepIndex]) fileMap[stepIndex] = [];
        fileMap[stepIndex].push({
          filename: file.filename,
          originalName: file.originalname,
          path: file.path,
          size: file.size,
          uploadedBy: createdBy,
          uploadedAt: new Date()
        });
      });
      
      parsedSteps.forEach((step, index) => {
        if (fileMap[index]) {
          step.attachments = fileMap[index];
        }
      });
    }
    
    const fms = new FMS({
      fmsId,
      fmsName,
      steps: parsedSteps,
      createdBy,
      status: 'Active'
    });
    
    await fms.save();
    
    res.json({ success: true, message: 'FMS template created successfully', fmsId });
  } catch (error) {
    console.error('Create FMS error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get all FMS templates
router.get('/', async (req, res) => {
  try {
    const fmsList = await FMS.find({ status: 'Active' })
      .populate('createdBy', 'username')
      .populate('steps.who', 'username')
      .sort({ createdAt: -1 });
    
    const formattedList = fmsList.map(fms => {
      let totalHours = 0;
      fms.steps.forEach(step => {
        if (step.whenUnit === 'days') {
          totalHours += step.when * 24;
        } else if (step.whenUnit === 'hours') {
          totalHours += step.when;
        } else if (step.whenUnit === 'days+hours') {
          totalHours += (step.whenDays || 0) * 24 + (step.whenHours || 0);
        }
      });
      
      const days = Math.floor(totalHours / 24);
      const hours = totalHours % 24;
      const totalTimeFormatted = days > 0 ? `${days} days ${hours} hours` : `${hours} hours`;
      
      return {
        _id: fms._id,
        fmsId: fms.fmsId,
        fmsName: fms.fmsName,
        stepCount: fms.steps.length,
        createdBy: fms.createdBy.username,
        createdOn: fms.createdAt,
        totalTimeFormatted,
        steps: fms.steps
      };
    });
    
    res.json({ success: true, fmsList: formattedList });
  } catch (error) {
    console.error('Get FMS error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get single FMS template
router.get('/:fmsId', async (req, res) => {
  try {
    const fms = await FMS.findOne({ fmsId: req.params.fmsId })
      .populate('createdBy', 'username')
      .populate('steps.who', 'username');
    
    if (!fms) {
      return res.status(404).json({ success: false, message: 'FMS template not found' });
    }
    
    res.json({ success: true, fms });
  } catch (error) {
    console.error('Get FMS error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;
