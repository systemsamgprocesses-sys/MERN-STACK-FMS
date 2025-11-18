import express from 'express';
import HelpTicket from '../models/HelpTicket.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Helper function to generate 6-digit OTP
const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

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

// Create help ticket - OTP is generated immediately
router.post('/', async (req, res) => {
  try {
    const { title, description, priority, relatedTaskId, raisedBy } = req.body;

    // Generate OTP for this ticket
    const otp = generateOTP();
    const otpGeneratedAt = new Date();
    const otpExpiresAt = new Date(otpGeneratedAt.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days validity

    const ticket = new HelpTicket({
      raisedBy,
      title,
      // keep subject for backward compatibility
      subject: title,
      description,
      priority,
      relatedTaskId: relatedTaskId || undefined,
      status: 'Open',
      adminRemarks: [],
      // Add OTP details
      otp: otp,
      otpGeneratedAt: otpGeneratedAt,
      otpExpiresAt: otpExpiresAt,
      otpVerified: false
    });

    await ticket.save();
    await ticket.populate('raisedBy assignedTo relatedTaskId');

    res.json({
      ticket,
      otp: otp,
      message: '⚠️ IMPORTANT: Save this code - you will need it to close this ticket after resolution. Do not share this code with anyone unless the issue is resolved.',
      expiresAt: otpExpiresAt
    });
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

    // Prevent direct closure - must use OTP flow
    if (status === 'Closed' || status === 'Verified & Closed') {
      return res.status(400).json({ 
        error: 'Tickets cannot be closed directly. Please use the "Resolve & Generate OTP" option. The ticket will be closed after user verification.'
      });
    }

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

    // Prevent direct closure - must use OTP flow
    if (status === 'Closed' || status === 'Verified & Closed') {
      return res.status(400).json({ 
        error: 'Tickets cannot be closed directly. Please use the "Resolve & Generate OTP" option. The ticket will be closed after user verification.'
      });
    }

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

// Admin marks ticket as resolved - now waiting for user OTP verification
router.post('/:id/mark-resolved', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const ticket = await HelpTicket.findById(req.params.id).populate('raisedBy assignedTo relatedTaskId adminRemarks.by');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Don't allow marking resolved if already closed
    if (ticket.status === 'Verified & Closed') {
      return res.status(400).json({ error: 'Ticket is already closed and verified' });
    }

    // Check if OTP exists (it should from ticket creation)
    if (!ticket.otp) {
      return res.status(400).json({ error: 'No OTP found for this ticket. This is an old ticket created before the OTP system.' });
    }

    // Mark as resolved - waiting for user to enter OTP
    ticket.status = 'Resolved - Pending Verification';
    ticket.updatedAt = new Date();
    await ticket.save();

    res.json({
      message: `Ticket marked as resolved. User ${ticket.raisedBy.username} needs to enter their closure code to close the ticket.`,
      ticket
    });
  } catch (error) {
    console.error('Error marking ticket as resolved:', error);
    res.status(500).json({ error: 'Failed to mark ticket as resolved' });
  }
});

// Admin enters user's closure code to close the ticket
router.post('/:id/verify-otp', authenticateToken, async (req, res) => {
  try {
    const { otp } = req.body;
    const ticket = await HelpTicket.findById(req.params.id).populate('raisedBy assignedTo relatedTaskId adminRemarks.by');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check if OTP exists
    if (!ticket.otp) {
      return res.status(400).json({ error: 'No closure code found for this ticket' });
    }

    // Check if OTP is expired
    if (new Date() > ticket.otpExpiresAt) {
      return res.status(400).json({ error: 'Closure code has expired. Please contact support.' });
    }

    // Verify OTP
    if (ticket.otp !== otp.trim()) {
      return res.status(400).json({ error: 'Invalid closure code. Please ask the user ('+ticket.raisedBy.username+') for their correct closing code.' });
    }

    // Mark ticket as verified and closed
    ticket.otpVerified = true;
    ticket.verifiedAt = new Date();
    ticket.status = 'Verified & Closed';
    ticket.updatedAt = new Date();

    await ticket.save();

    res.json({
      message: 'Ticket verified and closed successfully. User confirmed resolution.',
      ticket
    });
  } catch (error) {
    console.error('Error verifying closure code:', error);
    res.status(500).json({ error: 'Failed to verify closure code' });
  }
});

// Get closure code for a ticket (in case user lost it)
router.get('/:id/get-closure-code', authenticateToken, async (req, res) => {
  try {
    const ticket = await HelpTicket.findById(req.params.id).populate('raisedBy');

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    // Check if user is the ticket creator
    if (ticket.raisedBy._id.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if ticket is already closed
    if (ticket.status === 'Verified & Closed') {
      return res.status(400).json({ error: 'This ticket is already closed' });
    }

    // Return the OTP
    res.json({
      otp: ticket.otp,
      message: '⚠️ IMPORTANT: Do not share this code unless your issue is resolved.',
      createdAt: ticket.createdAt,
      expiresAt: ticket.otpExpiresAt
    });
  } catch (error) {
    console.error('Error getting closure code:', error);
    res.status(500).json({ error: 'Failed to get closure code' });
  }
});

export default router;