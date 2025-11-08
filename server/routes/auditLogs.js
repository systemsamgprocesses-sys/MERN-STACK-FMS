
import express from 'express';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// Create audit log entry
router.post('/', async (req, res) => {
  try {
    const auditLog = new AuditLog(req.body);
    await auditLog.save();
    res.status(201).json({ success: true, auditLog });
  } catch (error) {
    console.error('Error creating audit log:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all audit logs (super admin only)
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, targetType, performedBy, startDate, endDate } = req.query;
    
    const query = {};
    if (targetType) query.targetType = targetType;
    if (performedBy) query.performedBy = performedBy;
    if (startDate && endDate) {
      query.timestamp = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'username email role')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
