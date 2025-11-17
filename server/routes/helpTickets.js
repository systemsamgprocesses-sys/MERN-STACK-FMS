import express from 'express';
import HelpTicket from '../models/HelpTicket.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Get all help tickets for employee (their own)
router.get('/', async (req, res) => {
  try {
    const { userId, role } = req.query;

    let query = {};

    // Employees see only their own tickets
    if (role !== 'superadmin' && role !== 'admin') {
      query.raisedBy = userId;
    }

    const tickets = await HelpTicket.find(query)
      .populate('raisedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('relatedTaskId', 'title')
      .populate('adminRemarks.by', 'username')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching help tickets:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all tickets for admin/superadmin
router.get('/admin', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status, priority } = req.query;

    let query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tickets = await HelpTicket.find(query)
      .populate('raisedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('relatedTaskId', 'title')
      .populate('adminRemarks.by', 'username')
      .sort({ createdAt: -1 });

    res.json(tickets);
  } catch (error) {
    console.error('Error fetching admin tickets:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create help ticket
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, relatedTaskId, raisedBy } = req.body;

    const ticket = new HelpTicket({
      raisedBy,
      title,
      // keep subject for backward compatibility
      subject: title,
      description,
      priority,
      relatedTaskId: relatedTaskId || undefined,
      status: 'Open',
      adminRemarks: []
    });

    await ticket.save();
    await ticket.populate('raisedBy assignedTo relatedTaskId');

    res.json(ticket);
  } catch (error) {
    console.error('Error creating help ticket:', error);
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

// Add admin remark
router.post('/:id/remark', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { remark, by } = req.body;

    const ticket = await HelpTicket.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    ticket.adminRemarks.push({ by, remark, at: new Date() });
    await ticket.save();

    await ticket.populate('raisedBy assignedTo relatedTaskId adminRemarks.by');

    res.json(ticket);
  } catch (error) {
    console.error('Error adding remark:', error);
    res.status(500).json({ error: 'Failed to add remark' });
  }
});

// Update ticket status (both endpoints for compatibility)
router.patch('/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const ticket = await HelpTicket.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('raisedBy assignedTo relatedTaskId adminRemarks.by');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Update ticket (general update endpoint)
router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    const ticket = await HelpTicket.findByIdAndUpdate(
      req.params.id,
      { status, updatedAt: new Date() },
      { new: true }
    ).populate('raisedBy assignedTo relatedTaskId adminRemarks.by');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json(ticket);
  } catch (error) {
    console.error('Error updating ticket status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

export default router;