
import express from 'express';
import Checklist from '../models/Checklist.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

const router = express.Router();

// Get all checklists with filters
router.get('/', async (req, res) => {
  try {
    const { assignedTo, status, recurrence, dateFrom, dateTo, userId, role } = req.query;
    
    let query = {};
    
    // RBAC: employees see only their checklists
    if (role === 'employee' && userId) {
      query.assignedTo = userId;
    }
    
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;
    if (recurrence) query['recurrence.type'] = recurrence;
    if (dateFrom || dateTo) {
      query.startDate = {};
      if (dateFrom) query.startDate.$gte = new Date(dateFrom);
      if (dateTo) query.startDate.$lte = new Date(dateTo);
    }
    
    const checklists = await Checklist.find(query)
      .populate('createdBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('parentTaskId', 'title')
      .populate('parentChecklistId', 'title')
      .sort({ createdAt: -1 });
    
    res.json(checklists);
  } catch (error) {
    console.error('Error fetching checklists:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get checklist dashboard metrics
router.get('/dashboard', async (req, res) => {
  try {
    const { assignedTo, role, userId } = req.query;
    
    let query = {};
    
    // Filter based on role
    if (role === 'employee' && userId) {
      query.assignedTo = userId;
    } else if (assignedTo) {
      query.assignedTo = assignedTo;
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
    
    // Get recurrence breakdown
    const allChecklists = await Checklist.find(query);
    const byRecurrence = allChecklists.reduce((acc, cl) => {
      const type = cl.recurrence.type;
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    
    // Get category breakdown
    const byCategory = allChecklists.reduce((acc, cl) => {
      const cat = cl.category || 'General';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    // Get department breakdown
    const byDepartment = allChecklists.reduce((acc, cl) => {
      const dept = cl.department || 'General';
      acc[dept] = (acc[dept] || 0) + 1;
      return acc;
    }, {});

    // Get submissions by category and frequency (daily basis)
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(23, 59, 59, 999);

    const todaySubmissions = await Checklist.find({
      ...query,
      status: 'Submitted',
      submittedAt: { $gte: todayStart, $lte: todayEnd }
    });

    const todayByCategory = todaySubmissions.reduce((acc, cl) => {
      const cat = cl.category || 'General';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    const todayByFrequency = todaySubmissions.reduce((acc, cl) => {
      const freq = cl.recurrence.type;
      acc[freq] = (acc[freq] || 0) + 1;
      return acc;
    }, {});
    
    const recentSubmissions = await Checklist.find({ ...query, status: 'Submitted' })
      .populate('createdBy assignedTo')
      .sort({ submittedAt: -1 })
      .limit(10);
    
    res.json({
      total,
      completed,
      pending,
      overdue,
      byRecurrence,
      byCategory,
      byDepartment,
      todayByCategory,
      todayByFrequency,
      recentSubmissions
    });
  } catch (error) {
    console.error('Error fetching dashboard metrics:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get checklist calendar data
router.get('/calendar', async (req, res) => {
  try {
    const { year, month, userId } = req.query;
    const targetYear = parseInt(year) || new Date().getFullYear();
    const targetMonth = parseInt(month) || new Date().getMonth();
    
    let query = {
      startDate: {
        $gte: new Date(targetYear, targetMonth, 1),
        $lte: new Date(targetYear, targetMonth + 1, 0, 23, 59, 59)
      }
    };
    
    if (userId) {
      query.assignedTo = userId;
    }
    
    const checklists = await Checklist.find(query)
      .populate('assignedTo', 'username')
      .sort({ startDate: 1 });
    
    // Generate calendar structure
    const firstDay = new Date(targetYear, targetMonth, 1).getDay();
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const calendar = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const dayChecklists = checklists.filter(cl => {
        const clDate = new Date(cl.startDate);
        return clDate.getDate() === day &&
               clDate.getMonth() === targetMonth &&
               clDate.getFullYear() === targetYear;
      });
      
      const completedCount = dayChecklists.filter(cl => cl.status === 'Submitted').length;
      const totalCount = dayChecklists.length;
      
      // Calculate activity level (0-4 scale)
      let level = 0;
      if (totalCount > 0) {
        const completionRate = completedCount / totalCount;
        level = completionRate >= 1 ? 4 : completionRate >= 0.75 ? 3 : completionRate >= 0.5 ? 2 : completionRate > 0 ? 1 : 0;
      }
      
      calendar.push({
        date: date.toISOString().split('T')[0],
        checklists: dayChecklists,
        completed: completedCount,
        total: totalCount,
        level: level
      });
    }
    
    res.json({
      year: targetYear,
      month: targetMonth,
      calendar: calendar
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ error: 'Server error' });
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
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    res.json(checklist);
  } catch (error) {
    console.error('Error fetching checklist:', error);
    res.status(500).json({ error: 'Server error' });
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
    
    res.json(checklist);
  } catch (error) {
    console.error('Error creating checklist:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update checklist
router.patch('/:id', async (req, res) => {
  try {
    const checklist = await Checklist.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true }
    ).populate('createdBy assignedTo parentTaskId parentChecklistId');
    
    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    res.json(checklist);
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Submit checklist (partial completion allowed)
router.post('/:id/submit', async (req, res) => {
  try {
    const checklist = await Checklist.findById(req.params.id);
    
    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    checklist.status = 'Submitted';
    checklist.submittedAt = new Date();
    await checklist.save();
    
    // If recurring, create next instance
    if (checklist.recurrence.type !== 'one-time') {
      await createNextChecklistInstance(checklist);
    }
    
    await checklist.populate('createdBy assignedTo parentTaskId parentChecklistId');
    
    res.json(checklist);
  } catch (error) {
    console.error('Error submitting checklist:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update checklist item
router.patch('/:id/items/:itemId', async (req, res) => {
  try {
    const { isDone, remarks } = req.body;
    
    const checklist = await Checklist.findById(req.params.id);
    if (!checklist) {
      return res.status(404).json({ error: 'Checklist not found' });
    }
    
    const item = checklist.items.id(req.params.itemId);
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    if (isDone !== undefined) {
      item.isDone = isDone;
      item.doneAt = isDone ? new Date() : null;
    }
    if (remarks !== undefined) item.remarks = remarks;
    
    await checklist.save();
    await checklist.populate('createdBy assignedTo parentTaskId parentChecklistId');
    
    res.json(checklist);
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ error: 'Server error' });
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
