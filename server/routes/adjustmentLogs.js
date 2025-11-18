import express from 'express';
import AdjustmentLog from '../models/AdjustmentLog.js';
import User from '../models/User.js';

const router = express.Router();

// Helper function to create an adjustment log
export const createAdjustmentLog = async ({
  adjustedBy,
  affectedUser,
  adjustmentType,
  description,
  oldValue = null,
  newValue = null,
  metadata = null,
  ipAddress = null
}) => {
  try {
    const log = new AdjustmentLog({
      adjustedBy,
      affectedUser,
      adjustmentType,
      description,
      oldValue,
      newValue,
      metadata,
      ipAddress
    });
    await log.save();
    return log;
  } catch (error) {
    console.error('Error creating adjustment log:', error);
    throw error;
  }
};

// Get all adjustment logs with filtering and pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      adjustmentType,
      affectedUser,
      adjustedBy,
      startDate,
      endDate,
      search
    } = req.query;

    const query = {};

    // Filter by adjustment type
    if (adjustmentType) {
      query.adjustmentType = adjustmentType;
    }

    // Filter by affected user
    if (affectedUser) {
      query.affectedUser = affectedUser;
    }

    // Filter by who made the adjustment
    if (adjustedBy) {
      query.adjustedBy = adjustedBy;
    }

    // Filter by date range
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDateTime;
      }
    }

    // Search in description
    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AdjustmentLog.find(query)
        .populate('adjustedBy', 'username email role')
        .populate('affectedUser', 'username email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AdjustmentLog.countDocuments(query)
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching adjustment logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get adjustment logs for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [logs, total] = await Promise.all([
      AdjustmentLog.find({ affectedUser: userId })
        .populate('adjustedBy', 'username email role')
        .populate('affectedUser', 'username email role')
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      AdjustmentLog.countDocuments({ affectedUser: userId })
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching user adjustment logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get adjustment statistics
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {};

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDateTime;
      }
    }

    const [
      totalAdjustments,
      adjustmentsByType,
      topAdjusters,
      recentActivity
    ] = await Promise.all([
      AdjustmentLog.countDocuments(query),
      AdjustmentLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$adjustmentType',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } }
      ]),
      AdjustmentLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$adjustedBy',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $project: {
            username: '$user.username',
            email: '$user.email',
            count: 1
          }
        }
      ]),
      AdjustmentLog.find(query)
        .populate('adjustedBy', 'username email')
        .populate('affectedUser', 'username email')
        .sort({ timestamp: -1 })
        .limit(10)
    ]);

    res.json({
      success: true,
      stats: {
        totalAdjustments,
        adjustmentsByType,
        topAdjusters,
        recentActivity
      }
    });
  } catch (error) {
    console.error('Error fetching adjustment stats:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Export logs to CSV (returns data that can be converted to CSV on frontend)
router.get('/export', async (req, res) => {
  try {
    const { startDate, endDate, adjustmentType } = req.query;
    const query = {};

    if (adjustmentType) {
      query.adjustmentType = adjustmentType;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        query.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        const endDateTime = new Date(endDate);
        endDateTime.setHours(23, 59, 59, 999);
        query.timestamp.$lte = endDateTime;
      }
    }

    const logs = await AdjustmentLog.find(query)
      .populate('adjustedBy', 'username email role')
      .populate('affectedUser', 'username email role')
      .sort({ timestamp: -1 })
      .limit(5000); // Limit to prevent memory issues

    const exportData = logs.map(log => ({
      timestamp: log.timestamp,
      adjustmentType: log.adjustmentType,
      description: log.description,
      adjustedBy: log.adjustedBy?.username || 'Unknown',
      adjustedByEmail: log.adjustedBy?.email || '',
      affectedUser: log.affectedUser?.username || 'Unknown',
      affectedUserEmail: log.affectedUser?.email || '',
      oldValue: typeof log.oldValue === 'object' ? JSON.stringify(log.oldValue) : log.oldValue,
      newValue: typeof log.newValue === 'object' ? JSON.stringify(log.newValue) : log.newValue,
      ipAddress: log.ipAddress || 'N/A'
    }));

    res.json({
      success: true,
      data: exportData
    });
  } catch (error) {
    console.error('Error exporting logs:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

export default router;

