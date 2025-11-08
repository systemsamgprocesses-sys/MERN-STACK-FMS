
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
    const { fmsName, steps, createdBy, frequency, frequencySettings } = req.body;
    
    // Validate required fields
    if (!fmsName || !fmsName.trim()) {
      return res.status(400).json({ success: false, message: 'FMS name is required' });
    }
    if (!createdBy) {
      return res.status(400).json({ success: false, message: 'Creator ID is required' });
    }
    
    // Parse steps if sent as string
    let parsedSteps = typeof steps === 'string' ? JSON.parse(steps) : steps;
    
    if (!Array.isArray(parsedSteps) || parsedSteps.length === 0) {
      return res.status(400).json({ success: false, message: 'At least one step is required' });
    }
    
    // Validate and convert step data
    parsedSteps = parsedSteps.map((step, index) => {
      // Validate required fields
      if (!step.what || !step.how) {
        throw new Error(`Step ${index + 1}: Missing required fields (what/how)`);
      }
      if (!step.who || !Array.isArray(step.who) || step.who.length === 0) {
        throw new Error(`Step ${index + 1}: At least one assignee is required`);
      }
      
      // Ensure who array contains valid ObjectIds
      step.who = step.who.map(id => {
        if (typeof id === 'string' && id.length === 24) {
          return id; // MongoDB will handle string to ObjectId conversion
        }
        throw new Error(`Step ${index + 1}: Invalid user ID format`);
      });
      
      // Handle triggersFMSId if provided
      if (step.triggersFMSId && typeof step.triggersFMSId === 'string' && step.triggersFMSId.length === 24) {
        // Keep as string, MongoDB will convert
      } else if (step.triggersFMSId) {
        delete step.triggersFMSId; // Remove invalid triggersFMSId
      }
      
      return step;
    });
    
    // Generate unique FMS ID
    const count = await FMS.countDocuments();
    const fmsId = `FMS-${(count + 1).toString().padStart(4, '0')}`;
    
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
    
    // Helper function to shift Sunday to Monday
    const shiftSundayToMonday = (date) => {
      if (date.getDay() === 0) { // 0 is Sunday
        date.setDate(date.getDate() + 1);
      }
      return date;
    };

    const fms = new FMS({
      fmsId,
      fmsName,
      steps: parsedSteps,
      createdBy,
      status: 'Active',
      frequency: frequency || 'one-time',
      frequencySettings: frequencySettings || {}
    });
    
    await fms.save();
    
    res.json({ success: true, message: 'FMS template created successfully', fmsId });
  } catch (error) {
    console.error('Create FMS error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get all FMS templates with access control
router.get('/', async (req, res) => {
  try {
    const { userId, isAdmin } = req.query;
    
    let query = {};
    
    // If not admin, only show FMS where user is part of at least one step
    if (!isAdmin || isAdmin === 'false') {
      if (userId) {
        query = {
          'steps.who': userId
        };
      } else {
        return res.json({ success: true, fmsList: [] });
      }
    }
    
    const fmsList = await FMS.find(query)
      .populate('createdBy', 'username');
    
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
