
import express from 'express';
import HelpTicket from '../models/HelpTicket.js';

const router = express.Router();

// Get all help tickets (Super Admin only)
router.get('/', async (req, res) => {
  try {
    const { status, priority, role, userId } = req.query;
    
    // Only super admins can view all tickets
    if (role !== 'superadmin') {
      // Employees can only see their own tickets
      const query = { raisedBy: userId };
      if (status) query.status = status;
      
      const tickets = await HelpTicket.find(query)
        .populate('raisedBy', 'username email')
        .populate('assignedTo', 'username email')
        .populate('relatedTaskId', 'title')
        .populate('adminRemarks.by', 'username')
        .sort({ createdAt: -1 });
      
      return res.json({ success: true, tickets });
    }
    
    let query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    
    const tickets = await HelpTicket.find(query)
      .populate('raisedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('relatedTaskId', 'title')
      .populate('adminRemarks.by', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, tickets });
  } catch (error) {
    console.error('Error fetching help tickets:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get ticket by ID
router.get('/:id', async (req, res) => {
  try {
    const ticket = await HelpTicket.findById(req.params.id)
      .populate('raisedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('relatedTaskId', 'title')
      .populate('adminRemarks.by', 'username');
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Create help ticket
router.post('/', async (req, res) => {
  try {
    const ticket = new HelpTicket(req.body);
    await ticket.save();
    
    await ticket.populate('raisedBy assignedTo relatedTaskId adminRemarks.by');
    
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error creating help ticket:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Add admin remark
router.post('/:id/remarks', async (req, res) => {
  try {
    const { by, remark } = req.body;
    
    const ticket = await HelpTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    ticket.adminRemarks.push({ by, remark, at: new Date() });
    await ticket.save();
    
    await ticket.populate('raisedBy assignedTo relatedTaskId adminRemarks.by');
    
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error adding remark:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Close ticket
router.put('/:id/close', async (req, res) => {
  try {
    const { by, finalRemark } = req.body;
    
    const ticket = await HelpTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    if (finalRemark) {
      ticket.adminRemarks.push({ by, remark: finalRemark, at: new Date() });
    }
    ticket.status = 'Closed';
    await ticket.save();
    
    await ticket.populate('raisedBy assignedTo relatedTaskId adminRemarks.by');
    
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error closing ticket:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update ticket status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    
    const ticket = await HelpTicket.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('raisedBy assignedTo relatedTaskId adminRemarks.by');
    
    if (!ticket) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    
    res.json({ success: true, ticket });
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;
