
import express from 'express';
import Checklist from '../models/Checklist.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

const router = express.Router();

// Get all checklists with filters
router.get('/', async (req, res) => {
  try {
    const { assignedTo, status, recurrenceType, startDate, endDate, userId, role } = req.query;
    
    let query = {};
    
    // RBAC: employees see only their checklists
    if (role === 'employee' && userId) {
      query.assignedTo = userId;
    }
    
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;
    if (recurrenceType) query['recurrence.type'] = recurrenceType;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }
    
    const checklists = await Checklist.find(query)
      .populate('createdBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('parentTaskId', 'title')
      .populate('parentChecklistId', 'title')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, checklists });
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get checklist by ID
router.get('/:id', async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id)
      .populate('createdBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('parentTaskId', 'title')
      .populate('parentChecklistId', 'title');
    
    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Checklist not found' });
    }
    
    res.json({ success: true, checklist });
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Create checklist
router.post('/', async (req, res) => {
  try {
    const checklistData = req.body;
    
    // Set nextRunDate based on recurrence
    if (checklistData.recurrence.type !== 'one-time') {
      checklistData.nextRunDate = calculateNextRunDate(
        checklistData.startDate,
        checklistData.recurrence
      );
    }
    
    const checklist = new Checklist(checklistData);
    await checklist.save();
    
    await checklist.populate('createdBy assignedTo parentTaskId parentChecklistId');
    
    res.json({ success: true, checklist });
  } catch (error) {
    console.error('Error creating checklist:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update checklist
router.put('/:id', async (req, res) => {
  try {
    const checklist = await Checklist.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('createdBy assignedTo parentTaskId parentChecklistId');
    
    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Checklist not found' });
    }
    
    res.json({ success: true, checklist });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Submit checklist (partial completion allowed)
router.post('/:id/submit', async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id);
    
    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Checklist not found' });
    }
    
    checklist.status = 'Submitted';
    checklist.submittedAt = new Date();
    await checklist.save();
    
    // If recurring, create next instance
    if (checklist.recurrence.type !== 'one-time') {
      await createNextChecklistInstance(checklist);
    }
    
    await checklist.populate('createdBy assignedTo parentTaskId parentChecklistId');
    
    res.json({ success: true, checklist });
  } catch (error) {
    console.error('Error submitting checklist:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update checklist item
router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const { isDone, remarks } = req.body;
    
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Checklist not found' });
    }
    
    const item = checklist.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Item not found' });
    }
    
    if (isDone !== undefined) {
      item.isDone = isDone;
      item.doneAt = isDone ? new Date() : null;
    }
    if (remarks !== undefined) item.remarks = remarks;
    
    await checklist.save();
    await checklist.populate('createdBy assignedTo parentTaskId parentChecklistId');
    
    res.json({ success: true, checklist });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get checklist dashboard metrics
router.get('/dashboard/metrics', async (req, res) => {
  try {
    const { userId, role } = req.query;
    
    let query = {};
    if (role === 'employee' && userId) {
      query.assignedTo = userId;
    }
    
    const now = new Date();
    
    const [total, completed, pending, overdue] = await Promise.all([
      Checklist.countDocuments(query),
      Checklist.countDocuments({ ...query, status: 'Submitted' }),
      Checklist.countDocuments({ ...query, status: { $in: ['Active', 'Draft'] } }),
      Checklist.countDocuments({ 
        ...query, 
        status: { $in: ['Active', 'Draft'] },
        nextRunDate: { $lt: now }
      })
    ]);
    
    const recentSubmissions = await Checklist.find({ ...query, status: 'Submitted' })
      .populate('createdBy assignedTo')
      .sort({ submittedAt: -1 })
      .limit(10);
    
    res.json({
      success: true,
      metrics: { total, completed, pending, overdue },
      recentSubmissions
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Helper function to calculate next run date
function calculateNextRunDate(startDate, recurrence) {
  const date = new Date(startDate);
  
  switch (recurrence.type) {
    case 'daily':
      date.setDate(date.getDate() + 1);
      break;
    case 'weekly':
      date.setDate(date.getDate() + 7);
      break;
    case 'fortnightly':
      date.setDate(date.getDate() + 14);
      break;
    case 'monthly':
      date.setMonth(date.getMonth() + 1);
      break;
    case 'custom':
      if (recurrence.customInterval.unit === 'days') {
        date.setDate(date.getDate() + recurrence.customInterval.n);
      } else if (recurrence.customInterval.unit === 'weeks') {
        date.setDate(date.getDate() + (recurrence.customInterval.n * 7));
      } else if (recurrence.customInterval.unit === 'months') {
        date.setMonth(date.getMonth() + recurrence.customInterval.n);
      }
      break;
  }
  
  return date;
}

// Helper function to create next checklist instance
async function createNextChecklistInstance(checklist) {
  const nextChecklist = new Checklist({
    title: checklist.title,
    parentTaskId: checklist.parentTaskId,
    parentChecklistId: checklist.parentChecklistId,
    createdBy: checklist.createdBy,
    assignedTo: checklist.assignedTo,
    recurrence: checklist.recurrence,
    startDate: checklist.nextRunDate,
    nextRunDate: calculateNextRunDate(checklist.nextRunDate, checklist.recurrence),
    status: 'Active',
    items: checklist.items.map(item => ({
      title: item.title,
      isDone: false,
      remarks: '',
      doneAt: null
    }))
  });
  
  await nextChecklist.save();
  return nextChecklist;
}

// Delete checklist
router.delete('/:id', async (req, res) => {
  try {
    const checklist = await Checklist.findByIdAndDelete(req.params.id);
    
    if (!checklist) {
      return res.status(404).json({ success: false, message: 'Checklist not found' });
    }
    
    res.json({ success: true, message: 'Checklist deleted' });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;
