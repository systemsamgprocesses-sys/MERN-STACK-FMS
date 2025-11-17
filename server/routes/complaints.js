import express from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import Complaint from '../models/Complaint.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images and documents are allowed.'));
    }
  }
});

// Middleware to verify authentication
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    // Simple token verification - in production, use proper JWT verification
    const userData = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    req.user = userData;
    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
};

// Middleware to verify admin access
const requireAdmin = (req, res, next) => {
  if (!req.user || !['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// GET /api/complaints - Get user's complaints with optional scope
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { scope = 'raised' } = req.query;
    let query = {};

    switch (scope) {
      case 'raised':
        query = { submittedBy: req.user.id };
        break;
      case 'assigned':
        // Include complaints where user is tagged or against them
        query = {
          $or: [
            { assignedTo: req.user.id },
            { againstUser: req.user.id },
            { taggedUsers: req.user.id }
          ]
        };
        break;
      case 'all':
        // Only admins can see all complaints
        if (!['admin', 'superadmin'].includes(req.user.role)) {
          return res.status(403).json({ message: 'Admin access required for all complaints' });
        }
        query = {};
        break;
      default:
        // Default to user's own complaints (both raised and assigned)
        query = {
          $or: [
            { submittedBy: req.user.id },
            { assignedTo: req.user.id },
            { againstUser: req.user.id },
            { taggedUsers: req.user.id }
          ]
        };
    }

    const complaints = await Complaint.find(query)
      .populate('submittedBy', 'username email')
      .populate('raisedBy', 'username email')
      .populate('againstUser', 'username email')
      .populate('taggedUsers', 'username email')
      .populate('assignedTo', 'username email')
      .populate('resolvedBy', 'username email')
      .sort({ createdAt: -1 });

    // Return complaints array directly for backward compatibility
    res.json(complaints);
  } catch (error) {
    console.error('Error fetching complaints:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/complaints/dashboard - Dashboard statistics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Only admins can access dashboard
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const { assignedTo, category } = req.query;
    let query = {};

    if (assignedTo) query.assignedTo = assignedTo;
    if (category) query.category = category;

    const complaints = await Complaint.find(query)
      .populate('submittedBy', 'username email')
      .populate('assignedTo', 'username email');

    // Compute stats
    const total = complaints.length;
    const open = complaints.filter(c => c.status === 'open').length;
    const in_progress = complaints.filter(c => c.status === 'in_progress').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const closed = complaints.filter(c => c.status === 'closed').length;

    // Group by category
    const byCategory = complaints.reduce((acc, complaint) => {
      const category = complaint.category || 'uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    // Group by priority
    const byPriority = complaints.reduce((acc, complaint) => {
      const priority = complaint.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {});

    // Recent complaints
    const recentComplaints = complaints
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10)
      .map(complaint => ({
        _id: complaint._id,
        title: complaint.title,
        description: complaint.description,
        category: complaint.category,
        priority: complaint.priority,
        status: complaint.status,
        raisedBy: {
          username: complaint.submittedBy?.username || 'Unknown'
        },
        createdAt: complaint.createdAt
      }));

    // Monthly trends
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthComplaints = complaints.filter(c => {
        const complaintDate = new Date(c.createdAt);
        return complaintDate >= monthStart && complaintDate <= monthEnd;
      });
      
      monthlyTrends.push({
        month: date.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        total: monthComplaints.length,
        resolved: monthComplaints.filter(c => c.status === 'resolved').length,
        open: monthComplaints.filter(c => c.status === 'open').length,
      });
    }

    res.json({
      total,
      open,
      in_progress,
      resolved,
      closed,
      byCategory,
      byPriority,
      recentComplaints,
      monthlyTrends
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/complaints/categories - Get complaint categories
router.get('/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await Complaint.distinct('category');
    res.json(categories.filter(Boolean)); // Filter out null/empty values
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/complaints/admin/all - Get all complaints (admin only)
router.get('/admin/all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate('submittedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('resolvedBy', 'username email')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (error) {
    console.error('Error fetching all complaints:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/complaints/:id - Get specific complaint
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('submittedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('resolvedBy', 'username email');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check if user has access to this complaint
    const hasAccess = complaint.submittedBy._id.toString() === req.user.id ||
                     complaint.assignedTo?._id.toString() === req.user.id ||
                     ['admin', 'superadmin'].includes(req.user.role);

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied' });
    }

    res.json(complaint);
  } catch (error) {
    console.error('Error fetching complaint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Middleware wrapper for optional file upload
const optionalUpload = (req, res, next) => {
  upload.array('attachments', 5)(req, res, (err) => {
    // If there's an error and it's not about missing files, pass it along
    if (err && err.code !== 'LIMIT_UNEXPECTED_FILE') {
      console.error('Upload error:', err);
      // Don't fail the request if files are just not present
      if (!err.message.includes('Unexpected field')) {
        return next(err);
      }
    }
    // Continue regardless - files are optional
    next();
  });
};

// POST /api/complaints - Create new complaint
router.post('/', authenticateToken, optionalUpload, async (req, res) => {
  try {
    const { title, description, category, priority, againstUserId, taggedUserIds } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Title, description, and category are required' });
    }

    // Parse taggedUserIds if it's a string
    let parsedTaggedUserIds = [];
    if (taggedUserIds) {
      try {
        parsedTaggedUserIds = typeof taggedUserIds === 'string' ? JSON.parse(taggedUserIds) : taggedUserIds;
      } catch (e) {
        parsedTaggedUserIds = [];
      }
    }

    // Handle file attachments if any
    const attachments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        attachments.push({
          filename: file.filename,
          originalName: file.originalname,
          path: `/uploads/${file.filename}`,
          size: file.size
        });
      }
    }

    const complaintData = {
      title,
      description,
      category,
      priority: priority || 'medium',
      submittedBy: req.user.id,
      raisedBy: req.user.id,
      attachments
    };

    if (againstUserId) {
      complaintData.againstUser = againstUserId;
    }

    if (parsedTaggedUserIds && parsedTaggedUserIds.length > 0) {
      complaintData.taggedUsers = parsedTaggedUserIds;
    }

    const complaint = new Complaint(complaintData);

    await complaint.save();
    await complaint.populate('submittedBy', 'username email');
    await complaint.populate('againstUser', 'username email');
    await complaint.populate('taggedUsers', 'username email');

    res.status(201).json(complaint);
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// PUT /api/complaints/:id - Update complaint
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check permissions
    const canEdit = ['admin', 'superadmin'].includes(req.user.role) ||
                   complaint.submittedBy.toString() === req.user.id ||
                   complaint.assignedTo?.toString() === req.user.id;

    if (!canEdit) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { title, description, category, priority, status, assignedTo, resolution } = req.body;

    // Update fields
    if (title) complaint.title = title;
    if (description) complaint.description = description;
    if (category) complaint.category = category;
    if (priority) complaint.priority = priority;
    if (status) complaint.status = status;
    if (assignedTo) complaint.assignedTo = assignedTo;

    // Handle resolution
    if (resolution) {
      complaint.resolution = resolution;
      complaint.resolvedBy = req.user.id;
      complaint.resolvedAt = new Date();
    }

    await complaint.save();
    await complaint.populate('submittedBy', 'username email');
    await complaint.populate('assignedTo', 'username email');
    await complaint.populate('resolvedBy', 'username email');

    res.json(complaint);
  } catch (error) {
    console.error('Error updating complaint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/complaints/:id - Delete complaint
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Only admin or owner can delete
    const canDelete = ['admin', 'superadmin'].includes(req.user.role) ||
                     complaint.submittedBy.toString() === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    await Complaint.findByIdAndDelete(req.params.id);
    res.json({ message: 'Complaint deleted successfully' });
  } catch (error) {
    console.error('Error deleting complaint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PATCH /api/complaints/:id/status - Update complaint status
router.patch('/:id/status', authenticateToken, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('submittedBy', 'username email')
      .populate('againstUser', 'username email')
      .populate('taggedUsers', 'username email')
      .populate('assignedTo', 'username email');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Check permissions - admin, tagged user, or against user can update
    const isAdmin = ['admin', 'superadmin'].includes(req.user.role);
    const isAgainstUser = complaint.againstUser && complaint.againstUser._id.toString() === req.user.id;
    const isTaggedUser = complaint.taggedUsers && complaint.taggedUsers.some(user => user._id.toString() === req.user.id);
    const isAssigned = complaint.assignedTo && complaint.assignedTo._id.toString() === req.user.id;
    
    const canUpdate = isAdmin || isAgainstUser || isTaggedUser || isAssigned;

    if (!canUpdate) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { status, resolutionRemarks } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    complaint.status = status;
    
    if (resolutionRemarks) {
      complaint.resolution = resolutionRemarks;
    }

    if (status === 'resolved' || status === 'closed' || status === 'rejected') {
      complaint.resolvedBy = req.user.id;
      complaint.resolvedAt = new Date();
    }

    await complaint.save();
    
    // Re-populate after save
    await complaint.populate('resolvedBy', 'username email');

    res.json(complaint);
  } catch (error) {
    console.error('Error updating complaint status:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// POST /api/complaints/:id/resolve - Resolve complaint
router.post('/:id/resolve', authenticateToken, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    // Only admin or assigned user can resolve
    const canResolve = ['admin', 'superadmin'].includes(req.user.role) ||
                      complaint.assignedTo?.toString() === req.user.id;

    if (!canResolve) {
      return res.status(403).json({ message: 'Permission denied' });
    }

    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({ message: 'Resolution is required' });
    }

    complaint.resolution = resolution;
    complaint.resolvedBy = req.user.id;
    complaint.resolvedAt = new Date();
    complaint.status = 'resolved';

    await complaint.save();
    await complaint.populate('resolvedBy', 'username email');

    res.json(complaint);
  } catch (error) {
    console.error('Error resolving complaint:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;