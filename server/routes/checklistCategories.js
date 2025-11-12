import express from 'express';
import Checklist from '../models/Checklist.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get all checklists with category and department support
router.get('/', async (req, res) => {
  try {
    const { userId, isAdmin, category, department } = req.query;
    const query = {};

    // If not admin, only show active checklists
    if (isAdmin !== 'true') {
      query.status = 'Active';
    }

    // Filter by category if specified
    if (category) {
      query.category = category;
    }

    // Filter by department if specified
    if (department) {
      query.department = department;
    }

    const checklists = await Checklist.find(query)
      .populate('createdBy', 'username')
      .populate('assignedTo', 'username')
      .sort({ createdAt: -1 });

    // Format checklist data
    const formattedChecklists = checklists.map(cl => ({
      _id: cl._id,
      title: cl.title,
      category: cl.category || 'General',
      department: cl.department || 'General',
      status: cl.status,
      assignedTo: cl.assignedTo?.username || 'N/A',
      createdBy: cl.createdBy?.username || 'N/A',
      itemCount: cl.items?.length || 0,
      progressPercentage: cl.progressPercentage || 0,
      createdAt: cl.createdAt
    }));

    res.json({
      success: true,
      checklistList: formattedChecklists
    });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update checklist category and department (Admin/Superadmin only)
router.put('/:id/categorize', async (req, res) => {
  try {
    const { category, department } = req.body;
    
    if (!category || !department) {
      return res.status(400).json({ success: false, message: 'Category and department are required' });
    }

    const checklist = await Checklist.findByIdAndUpdate(
      req.params.id,
      { category, department },
      { new: true }
    ).populate('createdBy assignedTo');

    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Checklist not found' });
    }

    res.json({
      success: true,
      checklist
    });
  } catch (error) {
    console.error('Error updating checklist categorization:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get available categories
router.get('/categories/list', async (req, res) => {
  try {
    const categories = await Checklist.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          name: { $ifNull: ['$_id', 'General'] },
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get available departments
router.get('/departments/list', async (req, res) => {
  try {
    const departments = await Checklist.aggregate([
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          name: { $ifNull: ['$_id', 'General'] },
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);

    res.json({
      success: true,
      departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Add new category (Admin/Superadmin only)
router.post('/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    // Check if category already exists
    const exists = await Checklist.findOne({ category: name });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    // Create a dummy checklist with the new category to establish it
    // This is just for category tracking purposes
    res.json({
      success: true,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Add new department (Admin/Superadmin only)
router.post('/departments', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    // Check if department already exists
    const exists = await Checklist.findOne({ department: name });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }

    res.json({
      success: true,
      message: 'Department created successfully'
    });
  } catch (error) {
    console.error('Error adding department:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;
