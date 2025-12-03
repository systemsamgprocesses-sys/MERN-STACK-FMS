
import express from 'express';
import ScoreLog from '../models/ScoreLog.js';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import Checklist from '../models/Checklist.js';
import User from '../models/User.js';
import { calculateTaskScore, calculateFMSTaskScore, calculateChecklistScore } from '../utils/calculateScore.js';

const router = express.Router();

// Helper function to fetch and calculate all score logs
async function fetchAllScoreLogs(filters = {}) {
  const { userId, entityType, startDate, endDate } = filters;
  const allLogs = [];
  const entityTypes = entityType ? [entityType] : ['task', 'fms', 'checklist'];

  // Fetch and calculate scores for Tasks
  if (entityTypes.includes('task')) {
    const taskQuery = { status: 'completed', completedAt: { $exists: true, $ne: null } };
    if (userId) taskQuery.assignedTo = userId;
    if (startDate && endDate) {
      taskQuery.completedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const tasks = await Task.find(taskQuery).sort({ completedAt: -1 });

    for (const task of tasks) {
      const scoreData = await calculateTaskScore(task);
      if (scoreData) {
        allLogs.push({
          _id: `task_${task._id}`,
          entityType: 'task',
          taskId: task._id,
          userId: scoreData.userId,
          entityTitle: scoreData.entityTitle,
          taskType: scoreData.taskType,
          taskCategory: scoreData.taskCategory,
          score: scoreData.score,
          scorePercentage: scoreData.scorePercentage,
          plannedDate: scoreData.plannedDate,
          completedDate: scoreData.completedDate,
          plannedDays: scoreData.plannedDays,
          actualDays: scoreData.actualDays,
          completedAt: scoreData.completedDate,
          wasOnTime: scoreData.wasOnTime,
          scoreImpacted: scoreData.scoreImpacted,
          impactReason: scoreData.impactReason,
          isCalculated: true
        });
      }
    }
  }

  // Fetch and calculate scores for FMS/Projects
  if (entityTypes.includes('fms')) {
    const projects = await Project.find({ status: { $ne: 'Deleted' } })
      .populate('fmsId')
      .sort({ updatedAt: -1 });

      for (const project of projects) {
        for (let i = 0; i < project.tasks.length; i++) {
          const task = project.tasks[i];
          if (task.status === 'Done' && task.completedAt) {
            // Filter by date range if specified
            if (startDate && endDate) {
              const completedDate = new Date(task.completedAt);
              const start = new Date(startDate);
              const end = new Date(endDate);
              if (completedDate < start || completedDate > end) {
                continue;
              }
            }

            const scoreData = await calculateFMSTaskScore(project, i);
            if (scoreData) {
              // Get all users assigned to this task
              const assignedUsers = Array.isArray(task.who) && task.who.length > 0 
                ? task.who 
                : (task.completedBy ? [task.completedBy] : []);
              
              // Create a score log entry for each assigned user
              assignedUsers.forEach((assignedUserId, userIndex) => {
                // Filter by userId if specified
                if (userId && assignedUserId?.toString() !== userId.toString()) {
                  return;
                }

                allLogs.push({
                  _id: `fms_${project._id}_${i}_${assignedUserId || userIndex}`,
                  entityType: 'fms',
                  projectId: project._id,
                  projectTaskIndex: i,
                  userId: assignedUserId,
                  entityTitle: scoreData.entityTitle,
                  taskType: scoreData.taskType,
                  taskCategory: scoreData.taskCategory,
                  score: scoreData.score,
                  scorePercentage: scoreData.scorePercentage,
                  plannedDate: scoreData.plannedDate,
                  completedDate: scoreData.completedDate,
                  plannedDays: scoreData.plannedDays,
                  actualDays: scoreData.actualDays,
                  completedAt: scoreData.completedDate,
                  wasOnTime: scoreData.wasOnTime,
                  scoreImpacted: scoreData.scoreImpacted,
                  impactReason: scoreData.impactReason,
                  isCalculated: true
                });
              });
            }
          }
        }
      }
  }

  // Fetch and calculate scores for Checklists
  if (entityTypes.includes('checklist')) {
    const checklistQuery = { status: 'Submitted', submittedAt: { $exists: true, $ne: null } };
    if (userId) checklistQuery.assignedTo = userId;
    if (startDate && endDate) {
      checklistQuery.submittedAt = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const checklists = await Checklist.find(checklistQuery).sort({ submittedAt: -1 });

    for (const checklist of checklists) {
      const scoreData = await calculateChecklistScore(checklist);
      if (scoreData) {
        allLogs.push({
          _id: `checklist_${checklist._id}`,
          entityType: 'checklist',
          checklistId: checklist._id,
          userId: scoreData.userId,
          entityTitle: scoreData.entityTitle,
          taskType: scoreData.taskType,
          taskCategory: scoreData.taskCategory,
          score: scoreData.score,
          scorePercentage: scoreData.scorePercentage,
          plannedDate: scoreData.plannedDate,
          completedDate: scoreData.completedDate,
          plannedDays: scoreData.plannedDays,
          actualDays: scoreData.actualDays,
          completedAt: scoreData.completedDate,
          wasOnTime: scoreData.wasOnTime,
          scoreImpacted: scoreData.scoreImpacted,
          impactReason: scoreData.impactReason,
          isCalculated: true
        });
      }
    }
  }

  // Populate user information
  for (const log of allLogs) {
    if (log.userId) {
      try {
        const user = await User.findById(log.userId).select('username email');
        if (user) {
          log.userId = user;
        }
      } catch (err) {
        console.error('Error populating user:', err);
      }
    }
  }

  // Sort by completed date (newest first)
  allLogs.sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));

  return allLogs;
}

// Get score logs - Calculated dynamically from Tasks, FMS/Projects, and Checklists
router.get('/', async (req, res) => {
  try {
    const { userId, entityType, page = 1, limit = 50, startDate, endDate } = req.query;
    
    const allLogs = await fetchAllScoreLogs({ userId, entityType, startDate, endDate });

    // Pagination
    const total = allLogs.length;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedLogs = allLogs.slice(startIndex, endIndex);

    res.json({
      logs: paginatedLogs,
      totalPages: Math.ceil(total / limit),
      currentPage: parseInt(page),
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
    const { startDate, endDate, entityType } = req.query;

    const logs = await fetchAllScoreLogs({ userId, entityType, startDate, endDate });

    const summary = {
      totalTasks: logs.length,
      averageScore: logs.length > 0 ? logs.reduce((sum, log) => sum + (log.scorePercentage || 0), 0) / logs.length : 0,
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
