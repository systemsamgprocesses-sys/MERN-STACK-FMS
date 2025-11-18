import express from 'express';
import Checklist from '../models/Checklist.js';
import mongoose from 'mongoose';
import ChecklistCategory from '../models/ChecklistCategory.js';
import ChecklistDepartment from '../models/ChecklistDepartment.js';

const router = express.Router();

// Middleware to check if user is superadmin
const isSuperAdmin = (req, res, next) => {
  const { role } = req.query;
  const roleFromBody = req.body?.role;
  if (role === 'superadmin' || roleFromBody === 'superadmin') {
    return next();
  }
  return res.status(403).json({ success: false, message: 'Access denied. Only Super Admin can manage categories.' });
};

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

// Update checklist category and department (Superadmin only)
router.put('/:id/categorize', isSuperAdmin, async (req, res) => {
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
router.get('/categories', async (req, res) => {
  try {
    const [categoryDocs, counts] = await Promise.all([
      ChecklistCategory.find().sort({ name: 1 }),
      Checklist.aggregate([
        {
          $group: {
            _id: '$category',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const countMap = counts.reduce((acc, item) => {
      const key = item._id || 'General';
      acc[key] = item.count;
      return acc;
    }, {});

    let categories = [];

    if (categoryDocs.length > 0) {
      categories = categoryDocs.map(doc => ({
        name: doc.name,
        count: countMap[doc.name] || 0
      }));
    } else {
      categories = Object.entries(countMap).map(([name, count]) => ({
        name,
        count
      }));
    }

    if (!categories.some(cat => cat.name === 'General')) {
      categories.unshift({ name: 'General', count: countMap['General'] || 0 });
    }

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
router.get('/departments', async (req, res) => {
  try {
    const [departmentDocs, counts] = await Promise.all([
      ChecklistDepartment.find().sort({ name: 1 }),
      Checklist.aggregate([
        {
          $group: {
            _id: '$department',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const countMap = counts.reduce((acc, item) => {
      const key = item._id || 'General';
      acc[key] = item.count;
      return acc;
    }, {});

    let departments = [];

    if (departmentDocs.length > 0) {
      departments = departmentDocs.map(doc => ({
        name: doc.name,
        count: countMap[doc.name] || 0
      }));
    } else {
      departments = Object.entries(countMap).map(([name, count]) => ({
        name,
        count
      }));
    }

    if (!departments.some(dep => dep.name === 'General')) {
      departments.unshift({ name: 'General', count: countMap['General'] || 0 });
    }

    res.json({
      success: true,
      departments
    });
  } catch (error) {
    console.error('Error fetching departments:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Add new category (Superadmin only)
router.post('/categories', isSuperAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const trimmedName = name.trim();

    // Check if category already exists
    const exists = await ChecklistCategory.findOne({ name: trimmedName });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Category already exists' });
    }

    await ChecklistCategory.create({ name: trimmedName });

    res.json({
      success: true,
      message: 'Category created successfully'
    });
  } catch (error) {
    console.error('Error adding category:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Add new department (Superadmin only)
router.post('/departments', isSuperAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Department name is required' });
    }

    const trimmedName = name.trim();

    // Check if department already exists
    const exists = await ChecklistDepartment.findOne({ name: trimmedName });
    if (exists) {
      return res.status(400).json({ success: false, message: 'Department already exists' });
    }

    await ChecklistDepartment.create({ name: trimmedName });

    res.json({
      success: true,
      message: 'Department created successfully'
    });
  } catch (error) {
    console.error('Error adding department:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update category name (Superadmin only)
router.put('/categories/update', isSuperAdmin, async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ success: false, message: 'Both old and new category names are required' });
    }

    const trimmedNewName = newName.trim();

    await ChecklistCategory.findOneAndUpdate(
      { name: oldName },
      { name: trimmedNewName },
      { upsert: true, new: true }
    );

    // Update all checklists with the old category name
    const result = await Checklist.updateMany(
      { category: oldName },
      { $set: { category: trimmedNewName } }
    );

    res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} checklist(s)`
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update department name (Superadmin only)
router.put('/departments/update', isSuperAdmin, async (req, res) => {
  try {
    const { oldName, newName } = req.body;
    if (!oldName || !newName) {
      return res.status(400).json({ success: false, message: 'Both old and new department names are required' });
    }

    const trimmedNewName = newName.trim();

    await ChecklistDepartment.findOneAndUpdate(
      { name: oldName },
      { name: trimmedNewName },
      { upsert: true, new: true }
    );

    // Update all checklists with the old department name
    const result = await Checklist.updateMany(
      { department: oldName },
      { $set: { department: trimmedNewName } }
    );

    res.json({
      success: true,
      message: `Successfully updated ${result.modifiedCount} checklist(s)`
    });
  } catch (error) {
    console.error('Error updating department:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;
