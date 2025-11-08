
import express from 'express';
import ScoreLog from '../models/ScoreLog.js';

const router = express.Router();

// Get score logs (super admin only)
router.get('/', async (req, res) => {
  try {
    const { userId, page = 1, limit = 50, startDate, endDate } = req.query;
    
    const query = {};
    if (userId) query.userId = userId;
    if (startDate && endDate) {
      query.completedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const logs = await ScoreLog.find(query)
      .populate('userId', 'username email')
      .populate('taskId', 'title')
      .sort({ completedAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await ScoreLog.countDocuments(query);

    res.json({
      logs,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching score logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user score summary
router.get('/user/:userId/summary', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const query = { userId };
    if (startDate && endDate) {
      query.completedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const logs = await ScoreLog.find(query);

    const summary = {
      totalTasks: logs.length,
      averageScore: logs.length > 0 ? logs.reduce((sum, log) => sum + log.scorePercentage, 0) / logs.length : 0,
      onTimeTasks: logs.filter(log => log.wasOnTime).length,
      lateTasks: logs.filter(log => !log.wasOnTime).length,
      impactedTasks: logs.filter(log => log.scoreImpacted).length
    };

    res.json({ summary, logs });
  } catch (error) {
    console.error('Error fetching user score summary:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
