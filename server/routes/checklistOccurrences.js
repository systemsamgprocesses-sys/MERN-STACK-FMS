import express from 'express';
import ChecklistOccurrence from '../models/ChecklistOccurrence.js';
import ChecklistTemplate from '../models/ChecklistTemplate.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get all occurrences with filters
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { assignedTo, status, templateId, dateFrom, dateTo } = req.query;
    
    let query = {};
    
    if (assignedTo) query.assignedTo = assignedTo;
    if (status) query.status = status;
    if (templateId) query.templateId = templateId;
    
    if (dateFrom || dateTo) {
      query.dueDate = {};
      if (dateFrom) query.dueDate.$gte = new Date(dateFrom);
      if (dateTo) query.dueDate.$lte = new Date(dateTo);
    }
    
    const occurrences = await ChecklistOccurrence.find(query)
      .populate('assignedTo', 'username email')
      .populate('templateId', 'name frequency')
      .populate('completedBy', 'username email')
      .sort({ dueDate: 1 });
    
    res.json(occurrences);
  } catch (error) {
    console.error('Error fetching occurrences:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get calendar data for a specific month
router.get('/calendar', authenticateToken, async (req, res) => {
  try {
    const { year, month, userId } = req.query;
    const requestingUser = req.user;
    const requestingUserId = requestingUser?._id?.toString();
    const isAdmin = ['admin', 'superadmin'].includes(requestingUser?.role);

    if (!year || !month) {
      return res.status(400).json({
        error: 'year and month are required'
      });
    }

    const targetYear = parseInt(year);
    const targetMonth = parseInt(month); // 0-based (0 = January)

    if (Number.isNaN(targetYear) || Number.isNaN(targetMonth)) {
      return res.status(400).json({
        error: 'Invalid year or month'
      });
    }

    const requestedUserId = userId ? userId.toString() : undefined;

    if (!isAdmin && !requestedUserId) {
      return res.status(400).json({
        error: 'userId is required for non-admin users'
      });
    }

    if (!isAdmin && requestedUserId && requestedUserId !== requestingUserId) {
      return res.status(403).json({
        error: 'Access denied'
      });
    }

    // Get first and last day of the month
    const firstDay = new Date(targetYear, targetMonth, 1);
    const lastDay = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);
    
    const query = {
      dueDate: {
        $gte: firstDay,
        $lte: lastDay
      }
    };

    if (requestedUserId) {
      query.assignedTo = requestedUserId;
    } else if (!isAdmin && requestingUserId) {
      query.assignedTo = requestingUserId;
    }

    // Fetch all occurrences for this user/role in this month
    const occurrences = await ChecklistOccurrence.find(query)
      .populate('templateId', 'name')
      .sort({ dueDate: 1 });
    
    // Group occurrences by date
    const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
    const calendarData = [];
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(targetYear, targetMonth, day);
      const dateString = date.toISOString().split('T')[0];
      
      // Find all occurrences for this day
      const dayOccurrences = occurrences.filter(occ => {
        const occDate = new Date(occ.dueDate);
        return occDate.getDate() === day &&
               occDate.getMonth() === targetMonth &&
               occDate.getFullYear() === targetYear;
      });
      
      const totalCount = dayOccurrences.length;
      const completedCount = dayOccurrences.filter(occ => occ.status === 'completed').length;
      const isFullyCompleted = totalCount > 0 && completedCount === totalCount;
      
      calendarData.push({
        date: dateString,
        day: day,
        occurrences: dayOccurrences,
        total: totalCount,
        completed: completedCount,
        isFullyCompleted: isFullyCompleted
      });
    }
    
    res.json({
      year: targetYear,
      month: targetMonth,
      calendarData: calendarData
    });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get occurrences for a specific date
router.get('/by-date', authenticateToken, async (req, res) => {
  try {
    const { date, userId } = req.query;
    
    if (!date || !userId) {
      return res.status(400).json({ 
        error: 'date and userId are required' 
      });
    }
    
    const targetDate = new Date(date);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    const occurrences = await ChecklistOccurrence.find({
      assignedTo: userId,
      dueDate: {
        $gte: startOfDay,
        $lte: endOfDay
      }
    })
      .populate('assignedTo', 'username email')
      .populate('templateId', 'name frequency')
      .populate('completedBy', 'username email')
      .sort({ templateName: 1 });
    
    res.json(occurrences);
  } catch (error) {
    console.error('Error fetching occurrences by date:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get occurrence by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const occurrence = await ChecklistOccurrence.findById(req.params.id)
      .populate('assignedTo', 'username email')
      .populate('templateId', 'name frequency')
      .populate('completedBy', 'username email');
    
    if (!occurrence) {
      return res.status(404).json({ error: 'Occurrence not found' });
    }
    
    res.json(occurrence);
  } catch (error) {
    console.error('Error fetching occurrence:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Update occurrence (tick items)
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { items } = req.body;
    
    const occurrence = await ChecklistOccurrence.findById(req.params.id);
    
    if (!occurrence) {
      return res.status(404).json({ error: 'Occurrence not found' });
    }
    
    // Update items
    if (items) {
      occurrence.items = items;
    }
    
    await occurrence.save();
    await occurrence.populate('assignedTo templateId completedBy');
    
    res.json(occurrence);
  } catch (error) {
    console.error('Error updating occurrence:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Update a specific item in an occurrence
router.patch('/:id/items/:itemIndex', authenticateToken, async (req, res) => {
  try {
    const { checked, remarks } = req.body;
    const itemIndex = parseInt(req.params.itemIndex);
    
    const occurrence = await ChecklistOccurrence.findById(req.params.id);
    
    if (!occurrence) {
      return res.status(404).json({ error: 'Occurrence not found' });
    }
    
    if (itemIndex < 0 || itemIndex >= occurrence.items.length) {
      return res.status(400).json({ error: 'Invalid item index' });
    }
    
    if (checked !== undefined) {
      occurrence.items[itemIndex].checked = checked;
      occurrence.items[itemIndex].checkedAt = checked ? new Date() : null;
    }
    
    if (remarks !== undefined) {
      occurrence.items[itemIndex].remarks = remarks;
    }
    
    await occurrence.save();
    await occurrence.populate('assignedTo templateId completedBy');
    
    res.json(occurrence);
  } catch (error) {
    console.error('Error updating item:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Complete occurrence (mark as done)
router.post('/:id/complete', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.body;
    
    const occurrence = await ChecklistOccurrence.findById(req.params.id);
    
    if (!occurrence) {
      return res.status(404).json({ error: 'Occurrence not found' });
    }
    
    occurrence.status = 'completed';
    occurrence.completedAt = new Date();
    occurrence.completedBy = userId;
    
    await occurrence.save();
    await occurrence.populate('assignedTo templateId completedBy');
    
    res.json(occurrence);
  } catch (error) {
    console.error('Error completing occurrence:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get dashboard statistics
router.get('/stats/dashboard', authenticateToken, async (req, res) => {
  try {
    const { userId } = req.query;
    const requestingUser = req.user;
    const requestingUserId = requestingUser?._id?.toString();
    const isAdmin = ['admin', 'superadmin'].includes(requestingUser?.role);
    const requestedUserId = userId ? userId.toString() : undefined;

    if (!isAdmin && !requestedUserId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!isAdmin && requestedUserId && requestedUserId !== requestingUserId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const assignedToFilter = requestedUserId || (!isAdmin ? requestingUserId : undefined);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const baseQuery = assignedToFilter ? { assignedTo: assignedToFilter } : {};

    const [totalPending, totalCompleted, todayPending, todayCompleted] = await Promise.all([
      ChecklistOccurrence.countDocuments({ 
        ...baseQuery,
        status: 'pending' 
      }),
      ChecklistOccurrence.countDocuments({ 
        ...baseQuery,
        status: 'completed' 
      }),
      ChecklistOccurrence.countDocuments({ 
        ...baseQuery,
        status: 'pending',
        dueDate: { $gte: today, $lt: tomorrow }
      }),
      ChecklistOccurrence.countDocuments({ 
        ...baseQuery,
        status: 'completed',
        dueDate: { $gte: today, $lt: tomorrow }
      })
    ]);
    
    res.json({
      totalPending,
      totalCompleted,
      todayPending,
      todayCompleted,
      total: totalPending + totalCompleted
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

export default router;

