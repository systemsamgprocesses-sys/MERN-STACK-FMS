import express from 'express';
import Task from '../models/Task.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
// Import Project model for FMS metrics
import Project from '../models/Project.js';
// Import ScoreLog model
import ScoreLog from '../models/ScoreLog.js';

const router = express.Router();

// Get dashboard analytics
router.get('/analytics', async (req, res) => {
  try {
    const { userId, isAdmin, startDate, endDate, includeTeam, includeAllTimeMetrics } = req.query;

    // Convert userId to ObjectId for proper MongoDB queries
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;
    const now = new Date();
    
    // For team-wide metrics when user is admin/superadmin
    const isAdminOrSuperAdmin = isAdmin === 'true';
    const shouldIncludeTeam = includeTeam === 'true' && isAdminOrSuperAdmin;

    let baseQuery = {};
    // If userId is provided (even for admins), filter by that user
    // If userId is not provided and user is not admin, filter by their own ID
    if (userObjectId) {
      baseQuery.assignedTo = userObjectId;
    } else if (isAdmin !== 'true') {
      // Non-admin without userId - this shouldn't happen, but handle it
      // In this case, we'd need the actual user's ID from the session
      // For now, return empty results
    }

    let dateRangeQueryForStats = {};
    if (startDate && endDate) {
      dateRangeQueryForStats = {
        $or: [
          { dueDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
          { nextDueDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
          { completedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
        ]
      };
    }

    // Get FMS metrics
    const fmsMetrics = await Project.aggregate([
      {
        $match: {
          ...(userObjectId ? { assignedTo: userObjectId } : {}),
          ...dateRangeQueryForStats
        }
      },
      {
        $group: {
          _id: null,
          activeProjects: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
          },
          completedProjects: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          totalProjects: { $sum: 1 },
          totalFMSTasks: { $sum: { $size: "$tasks" } },
          pendingFMSTasks: {
            $sum: {
              $size: {
                $filter: {
                  input: "$tasks",
                  as: "task",
                  cond: { $eq: ["$$task.status", "pending"] }
                }
              }
            }
          },
          completedFMSTasks: {
            $sum: {
              $size: {
                $filter: {
                  input: "$tasks",
                  as: "task",
                  cond: { $eq: ["$$task.status", "completed"] }
                }
              }
            }
          },
          avgProgress: { $avg: "$progress" }
        }
      }
    ]);

    // Get team performance metrics if admin/superadmin
    const overallTeamPerformance = shouldIncludeTeam ? await Task.aggregate([
      {
        $match: {
          ...dateRangeQueryForStats
        }
      },
      {
        $group: {
          _id: "$assignedTo",
          totalTasks: { $sum: 1 },
          completedTasks: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] }
          },
          pendingTasks: {
            $sum: { $cond: [{ $in: ["$status", ["pending", "in-progress"]] }, 1, 0] }
          },
          oneTimeCompleted: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$status", "completed"] },
                  { $eq: ["$taskType", "one-time"] }
                ]},
                1,
                0
              ]
            }
          },
          recurringCompleted: {
            $sum: {
              $cond: [
                { $and: [
                  { $eq: ["$status", "completed"] },
                  { $ne: ["$taskType", "one-time"] }
                ]},
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "userInfo"
        }
      },
      {
        $project: {
          username: { $arrayElemAt: ["$userInfo.username", 0] },
          totalTasks: 1,
          completedTasks: 1,
          pendingTasks: 1,
          oneTimeCompleted: 1,
          recurringCompleted: 1,
          completionRate: {
            $multiply: [
              { $divide: ["$completedTasks", { $max: ["$totalTasks", 1] }] },
              100
            ]
          }
        }
      },
      { $sort: { completionRate: -1 } }
    ]) : [];

    // Status stats - filtered by user if not admin
    const statusStats = await Task.aggregate([
      { $match: { ...baseQuery, ...dateRangeQueryForStats } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Type stats - filtered by user if not admin
    const typeStats = await Task.aggregate([
      { $match: { ...baseQuery, ...dateRangeQueryForStats } },
      { $group: { _id: '$taskType', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Priority stats - filtered by user if not admin
    const priorityStats = await Task.aggregate([
      { $match: { ...baseQuery, ...dateRangeQueryForStats } },
      { $group: { _id: '$priority', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Completion trend should always show last 6 months + current month data
    // but filtered by user if not admin
    const currentDate = new Date();
    const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    const completionTrend = await Task.aggregate([
      {
        $match: {
          ...baseQuery,
          status: 'completed',
          completedAt: {
            $ne: null,
            $gte: sixMonthsAgo,
            $lte: endOfCurrentMonth
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$completedAt' },
            year: { $year: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Planned trend should also show last 6 months + current month data
    // but filtered by user if not admin
    const plannedTrend = await Task.aggregate([
      {
        $match: {
          ...baseQuery,
          isActive: true,
          $or: [
            { dueDate: { $ne: null } },
            { nextDueDate: { $ne: null } }
          ]
        }
      },
      {
        $addFields: {
          relevantDate: { $ifNull: ['$nextDueDate', '$dueDate'] }
        }
      },
      {
        $match: {
          relevantDate: {
            $gte: sixMonthsAgo,
            $lte: endOfCurrentMonth
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$relevantDate' },
            year: { $year: '$relevantDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    const userTeamPerformance = [];
    let userPerformanceData = null; // Renamed from userPerformance to userPerformanceData for clarity

    if (isAdmin === 'true') {
      // Admin: Get team performance
      const users = await User.find({ isActive: true }).select('_id username');
      for (const user of users) {
        let dateQueryForTeam = {};
        if (startDate && endDate) {
          dateQueryForTeam = {
            $or: [
              { dueDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
              { nextDueDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
              { completedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
            ]
          };
        }
        const userBaseQuery = {
          isActive: true,
          assignedTo: user._id,
          ...dateQueryForTeam
        };
        const totalTasks = await Task.countDocuments(userBaseQuery);

        let completedTasksForRateQuery = {
          isActive: true,
          assignedTo: user._id,
          status: 'completed',
          completedAt: { $ne: null },
          ...dateQueryForTeam
        };
        const completedTasksForRate = await Task.countDocuments(completedTasksForRateQuery);

        const completedTasks = await Task.countDocuments({
          isActive: true,
          assignedTo: user._id,
          status: 'completed',
          ...dateQueryForTeam,
          completedAt: { $ne: null }
        });

        const pendingTasks = await Task.countDocuments({ ...userBaseQuery, status: 'pending' });

        const oneTimeTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'one-time' });
        const oneTimePending = await Task.countDocuments({ ...userBaseQuery, taskType: 'one-time', status: 'pending' });
        const oneTimeCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'one-time', status: 'completed' });

        const dailyTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'daily' });
        const dailyPending = await Task.countDocuments({ ...userBaseQuery, taskType: 'daily', status: 'pending' });
        const dailyCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'daily', status: 'completed' });

        const weeklyTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'weekly' });
        const weeklyPending = await Task.countDocuments({ ...userBaseQuery, taskType: 'weekly', status: 'pending' });
        const weeklyCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'weekly', status: 'completed' });

        const monthlyTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'monthly' });
        const monthlyPending = await Task.countDocuments({ ...userBaseQuery, taskType: 'monthly', status: 'pending' });
        const monthlyCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'monthly', status: 'completed' });

        const quarterlyTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'quarterly' });
        const quarterlyPending = await Task.countDocuments({ ...userBaseQuery, taskType: 'quarterly', status: 'pending' });
        const quarterlyCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'quarterly', status: 'completed' });

        const yearlyTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'yearly' });
        const yearlyPending = await Task.countDocuments({ ...userBaseQuery, taskType: 'yearly', status: 'pending' });
        const yearlyCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'yearly', status: 'completed' });

        const recurringTasks = dailyTasks + weeklyTasks + monthlyTasks + quarterlyTasks + yearlyTasks;
        const recurringPending = dailyPending + weeklyPending + monthlyPending + quarterlyPending + yearlyPending;
        const recurringCompleted = dailyCompleted + weeklyCompleted + monthlyCompleted + quarterlyCompleted + yearlyCompleted;

        // Calculate on-time completion for one-time tasks
        let onTimeQuery = {
          isActive: true,
          assignedTo: user._id,
          status: 'completed',
          completedAt: { $ne: null },
          ...dateQueryForTeam,
          $expr: {
            $lte: ['$completedAt', { $add: ['$dueDate', 24 * 60 * 60 * 1000] }]
          },
          taskType: 'one-time'
        };
        const onTimeCompletedTasks = await Task.countDocuments(onTimeQuery);

        // Calculate on-time for recurring tasks
        let recurringOnTimeQuery = {
          isActive: true,
          assignedTo: user._id,
          status: 'completed',
          completedAt: { $ne: null },
          ...dateQueryForTeam,
          $expr: {
            $lte: ['$completedAt', { $ifNull: ['$nextDueDate', { $add: ['$dueDate', 24 * 60 * 60 * 1000] }] }]
          },
          taskType: { $in: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] }
        };
        const onTimeRecurringTasks = await Task.find(recurringOnTimeQuery).select('_id title taskType completedAt nextDueDate dueDate');
        const onTimeCompletedRecurringTasks = onTimeRecurringTasks.length;

        const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        const onTimeRate = completedTasksForRate > 0 ? Math.min((onTimeCompletedTasks + onTimeCompletedRecurringTasks) / completedTasksForRate * 100, 100) : 0;

        if (totalTasks > 0 || completedTasks > 0 || pendingTasks > 0) {
          userTeamPerformance.push({
            username: user.username,
            totalTasks,
            completedTasks,
            pendingTasks,
            oneTimeTasks,
            oneTimePending,
            oneTimeCompleted,
            dailyTasks,
            dailyPending,
            dailyCompleted,
            weeklyTasks,
            weeklyPending,
            weeklyCompleted,
            monthlyTasks,
            monthlyPending,
            monthlyCompleted,
            quarterlyTasks,
            quarterlyPending,
            quarterlyCompleted,
            yearlyTasks,
            yearlyPending,
            yearlyCompleted,
            recurringTasks,
            recurringPending,
            recurringCompleted,
            completionRate: Math.round(completionRate * 10) / 10,
            onTimeRate: Math.round(onTimeRate * 10) / 10,
            onTimeCompletedTasks,
            onTimeRecurringCompleted: onTimeCompletedRecurringTasks
          });
        }
      }
      userTeamPerformance.sort((a, b) => b.completionRate - a.completionRate);
    } else {
      // Non-admin: Get individual user performance
      if (userObjectId) {
        const userData = await User.findById(userObjectId).select('username');
        if (userData) {
          let dateQueryForUser = {};
          if (startDate && endDate) {
            dateQueryForUser = {
              $or: [
                { dueDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
                { nextDueDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
                { completedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
              ]
            };
          }

          const userBaseQuery = {
            isActive: true,
            assignedTo: userObjectId,
            ...dateQueryForUser
          };

          const totalTasks = await Task.countDocuments(userBaseQuery);

          let completedTasksForRateQuery = {
            isActive: true,
            assignedTo: userObjectId,
            status: 'completed',
            completedAt: { $ne: null },
            ...dateQueryForUser
          };
          const completedTasksForRate = await Task.countDocuments(completedTasksForRateQuery);

          const completedTasks = await Task.countDocuments({
            isActive: true,
            assignedTo: userObjectId,
            status: 'completed',
            ...dateQueryForUser,
            completedAt: { $ne: null }
          });

          const pendingTasks = await Task.countDocuments({ ...userBaseQuery, status: 'pending' });

          const oneTimeTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'one-time' });
          const oneTimePending = await Task.countDocuments({ ...userBaseQuery, taskType: 'one-time', status: 'pending' });
          const oneTimeCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'one-time', status: 'completed' });

          const dailyTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'daily' });
          const dailyPending = await Task.countDocuments({ ...userBaseQuery, taskType: 'daily', status: 'pending' });
          const dailyCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'daily', status: 'completed' });

          const weeklyTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'weekly' });
          const weeklyPending = await Task.countDocuments({ ...userBaseQuery, taskType: 'weekly', status: 'pending' });
          const weeklyCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'weekly', status: 'completed' });

          const monthlyTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'monthly' });
          const monthlyPending = await Task.countDocuments({ ...userBaseQuery, taskType: 'monthly', status: 'pending' });
          const monthlyCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'monthly', status: 'completed' });

          const quarterlyTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'quarterly' });
          const quarterlyPending = await Task.countDocuments({ ...userBaseQuery, taskType: 'quarterly', status: 'pending' });
          const quarterlyCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'quarterly', status: 'completed' });

          const yearlyTasks = await Task.countDocuments({ ...userBaseQuery, taskType: 'yearly' });
          const yearlyPending = await Task.countDocuments({ ...userBaseQuery, taskType: 'yearly', status: 'pending' });
          const yearlyCompleted = await Task.countDocuments({ ...userBaseQuery, taskType: 'yearly', status: 'completed' });

          const recurringTasks = dailyTasks + weeklyTasks + monthlyTasks + quarterlyTasks + yearlyTasks;
          const recurringPending = dailyPending + weeklyPending + monthlyPending + quarterlyPending + yearlyPending;
          const recurringCompleted = dailyCompleted + weeklyCompleted + monthlyCompleted + quarterlyCompleted + yearlyCompleted;

          // Calculate on-time completion for one-time tasks
          let onTimeQuery = {
            isActive: true,
            assignedTo: userObjectId,
            status: 'completed',
            completedAt: { $ne: null },
            ...dateQueryForUser,
            $expr: {
              $lte: ['$completedAt', { $add: ['$dueDate', 24 * 60 * 60 * 1000] }]
            },
            taskType: 'one-time'
          };
          const onTimeCompletedTasks = await Task.countDocuments(onTimeQuery);

          // Calculate on-time for recurring tasks
          let recurringOnTimeQuery = {
            isActive: true,
            assignedTo: userObjectId,
            status: 'completed',
            completedAt: { $ne: null },
            ...dateQueryForUser,
            $expr: {
              $lte: ['$completedAt', { $ifNull: ['$nextDueDate', { $add: ['$dueDate', 24 * 60 * 60 * 1000] }] }]
            },
            taskType: { $in: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] }
          };
          const onTimeRecurringTasks = await Task.find(recurringOnTimeQuery).select('_id title taskType completedAt nextDueDate dueDate');
          const onTimeCompletedRecurringTasks = onTimeRecurringTasks.length;

          const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
          const onTimeRate = completedTasksForRate > 0 ? Math.min((onTimeCompletedTasks + onTimeCompletedRecurringTasks) / completedTasksForRate * 100, 100) : 0;

          userPerformanceData = {
            username: userData.username,
            totalTasks,
            completedTasks,
            pendingTasks,
            oneTimeTasks,
            oneTimePending,
            oneTimeCompleted,
            dailyTasks,
            dailyPending,
            dailyCompleted,
            weeklyTasks,
            weeklyPending,
            weeklyCompleted,
            monthlyTasks,
            monthlyPending,
            monthlyCompleted,
            quarterlyTasks,
            quarterlyPending,
            quarterlyCompleted,
            yearlyTasks,
            yearlyPending,
            yearlyCompleted,
            recurringTasks,
            recurringPending,
            recurringCompleted,
            completionRate: Math.round(completionRate * 10) / 10,
            onTimeRate: Math.round(onTimeRate * 10) / 10,
            onTimeCompletedTasks,
            onTimeRecurringCompleted: onTimeCompletedRecurringTasks
          };
        }
      }
    }

    // Recent activity - filtered by user if not admin
    let recentActivityQuery = {
      isActive: true,
      ...(isAdmin !== 'true' && userObjectId ? { assignedTo: userObjectId } : {})
    };
    if (startDate && endDate) {
      recentActivityQuery = {
        ...recentActivityQuery,
        $or: [
          { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } },
          { completedAt: { $gte: new Date(startDate), $lte: new Date(endDate) }, status: 'completed' },
          { dueDate: { $gte: new Date(startDate), $lte: new Date(endDate) }, status: 'overdue' }
        ]
      };
    }
    const recentActivity = await Task.aggregate([
      { $match: recentActivityQuery },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedTo',
          foreignField: '_id',
          as: 'assignedUser'
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedBy',
          foreignField: '_id',
          as: 'assignedByUser'
        }
      },
      {
        $addFields: {
          activityType: {
            $cond: {
              if: { $eq: ['$status', 'completed'] },
              then: 'completed',
              else: {
                $cond: {
                  if: { $eq: ['$status', 'overdue'] },
                  then: 'overdue',
                  else: 'assigned'
                }
              }
            }
          },
          activityDate: {
            $cond: {
              if: { $eq: ['$status', 'completed'] },
              then: '$completedAt',
              else: '$createdAt'
            }
          }
        }
      },
      {
        $project: {
          title: 1,
          taskType: 1,
          type: '$activityType',
          username: { $arrayElemAt: ['$assignedUser.username', 0] },
          assignedBy: { $arrayElemAt: ['$assignedByUser.username', 0] },
          date: '$activityDate'
        }
      },
      { $sort: { date: -1 } },
      { $limit: 20 }
    ]);

    const totalActiveTasks = await Task.countDocuments({ ...baseQuery, ...dateRangeQueryForStats });

    // Calculate pending/completed/overdue/upcoming according to definitions:
    // pending = tasks not completed and dueDate/nextDueDate <= today
    // completed = status = completed
    // overdues = not completed and dueDate/nextDueDate < today
    // upcoming = dueDate/nextDueDate > today
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const pendingQuery = {
      ...baseQuery,
      status: { $nin: ['completed'] },
      $or: [
        { dueDate: { $lte: todayEnd } },
        { nextDueDate: { $lte: todayEnd } }
      ],
      ...(startDate && endDate ? dateRangeQueryForStats : {})
    };

    const overdueQuery = {
      ...baseQuery,
      status: { $nin: ['completed'] },
      $or: [
        { dueDate: { $lt: todayStart } },
        { nextDueDate: { $lt: todayStart } }
      ],
      ...(startDate && endDate ? dateRangeQueryForStats : {})
    };

    const upcomingQuery = {
      ...baseQuery,
      status: { $nin: ['completed'] },
      $or: [
        { dueDate: { $gt: todayEnd } },
        { nextDueDate: { $gt: todayEnd } }
      ],
      ...(startDate && endDate ? dateRangeQueryForStats : {})
    };

    const pendingTasksCount = await Task.countDocuments(pendingQuery);
    const overdueTasksCount = await Task.countDocuments(overdueQuery);
    const upcomingTasksCount = await Task.countDocuments(upcomingQuery);

    let completedTasksCountQuery = {
      ...baseQuery,
      status: 'completed',
      completedAt: { $ne: null }
    };
    if (startDate && endDate) {
      completedTasksCountQuery = {
        ...completedTasksCountQuery,
        ...dateRangeQueryForStats
      };
    }
    const completedTasksCount = await Task.countDocuments(completedTasksCountQuery);

    // On-time completion rate (overall) for one-time tasks
    let onTimeQueryOverall = {
      ...baseQuery,
      status: 'completed',
      completedAt: { $ne: null },
      $expr: {
        $lte: ['$completedAt', { $add: ['$dueDate', 24 * 60 * 60 * 1000] }]
      },
      taskType: 'one-time'
    };
    if (startDate && endDate) {
      onTimeQueryOverall = {
        ...onTimeQueryOverall,
        ...dateRangeQueryForStats
      };
    }
    const onTimeCompletedOneTimeOverall = await Task.countDocuments(onTimeQueryOverall);

    const completedOneTimeTasksOverallForRate = await Task.countDocuments({
      ...baseQuery,
      taskType: 'one-time',
      status: 'completed',
      completedAt: { $ne: null },
      ...(startDate && endDate ? dateRangeQueryForStats : {})
    });
    const oneTimeOnTimeRateOverall = completedOneTimeTasksOverallForRate > 0 ? (onTimeCompletedOneTimeOverall / completedOneTimeTasksOverallForRate) * 100 : 0;

    // On-time completion rate (overall) for recurring tasks
    let recurringOnTimeQueryOverall = {
      ...baseQuery,
      status: 'completed',
      completedAt: { $ne: null },
      $expr: {
        $lte: ['$completedAt', { $ifNull: ['$nextDueDate', { $add: ['$dueDate', 24 * 60 * 60 * 1000] }] }]
      },
      taskType: { $in: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] }
    };
    if (startDate && endDate) {
      recurringOnTimeQueryOverall = {
        ...recurringOnTimeQueryOverall,
        ...dateRangeQueryForStats
      };
    }
    const onTimeRecurringTasksOverall = await Task.find(recurringOnTimeQueryOverall).select('_id title taskType completedAt nextDueDate dueDate');
    const onTimeCompletedRecurringOverall = onTimeRecurringTasksOverall.length;

    const completedRecurringTasksOverallForRate = await Task.countDocuments({
      ...baseQuery,
      taskType: { $in: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] },
      status: 'completed',
      completedAt: { $ne: null },
      ...(startDate && endDate ? dateRangeQueryForStats : {})
    });
    const recurringOnTimeRateOverall = completedRecurringTasksOverallForRate > 0 ? (onTimeCompletedRecurringOverall / completedRecurringTasksOverallForRate) * 100 : 0;

    const completionTimes = await Task.aggregate([
      {
        $match: {
          ...baseQuery,
          ...dateRangeQueryForStats,
          status: 'completed',
          completedAt: { $ne: null }
        }
      },
      {
        $addFields: {
          targetDate: { $ifNull: ['$nextDueDate', '$dueDate'] },
          daysTaken: {
            $divide: [
              { $subtract: ['$completedAt', '$createdAt'] },
              1000 * 60 * 60 * 24
            ]
          }
        }
      },
      {
        $group: {
          _id: null,
          avgDays: { $avg: '$daysTaken' }
        }
      }
    ]);

    // Calculate overall score
    let overallScore = 0;
    if (isAdmin === 'true') {
      const allScoreLogs = await ScoreLog.find({
        ...(userObjectId ? { userId: userObjectId } : {})
      });
      if (allScoreLogs.length > 0) {
        overallScore = allScoreLogs.reduce((sum, log) => sum + log.scorePercentage, 0) / allScoreLogs.length;
      }
    }

    // Calculate current month score
    let currentMonthScore = 0;
    if (isAdmin === 'true') {
      const currentMonth = new Date();
      const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59, 999);

      const currentMonthScoreLogs = await ScoreLog.find({
        completedAt: { $gte: startOfMonth, $lte: endOfMonth },
        ...(userObjectId ? { userId: userObjectId } : {})
      });
      if (currentMonthScoreLogs.length > 0) {
        currentMonthScore = currentMonthScoreLogs.reduce((sum, log) => sum + log.scorePercentage, 0) / currentMonthScoreLogs.length;
      }
    }

    const performanceMetrics = {
      onTimeCompletion: completedTasksCount > 0 ? Math.round(((onTimeCompletedOneTimeOverall + onTimeCompletedRecurringOverall) / completedTasksCount) * 100) : 0,
      averageCompletionTime: completionTimes.length > 0 ? Math.round(completionTimes[0].avgDays) : 0,
      taskDistribution: typeStats.map(item => ({
        type: item._id,
        count: item.count,
        percentage: totalActiveTasks > 0 ? Math.round((item.count / totalActiveTasks) * 100) : 0
      })),
      oneTimeOnTimeRate: Math.round(oneTimeOnTimeRateOverall * 10) / 10,
      recurringOnTimeRate: Math.round(recurringOnTimeRateOverall * 10) / 10
    };

    // FMS Metrics (for admin/manager only)
    // Define dateFilter for Project.find
    let dateFilter = {};
    if (startDate && endDate) {
      dateFilter = {
        $or: [
          { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } },
          { updatedAt: { $gte: new Date(startDate), $lte: new Date(endDate) } }
        ]
      };
    }

    if (isAdmin === 'true') {
      const allProjects = await Project.find(dateFilter);
      const activeProjects = allProjects.filter(p => p.status === 'In Progress').length;
      const completedProjects = allProjects.filter(p => p.status === 'Completed').length;

      let totalFMSTasks = 0;
      let pendingFMSTasks = 0;
      let completedFMSTasks = 0;
      let totalProgress = 0;

      allProjects.forEach(project => {
        if (project.tasks && project.tasks.length > 0) {
          totalFMSTasks += project.tasks.length;
          pendingFMSTasks += project.tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length;
          completedFMSTasks += project.tasks.filter(t => t.status === 'Done').length;

          const projectProgress = (project.tasks.filter(t => t.status === 'Done').length / project.tasks.length) * 100;
          totalProgress += projectProgress;
        }
      });

      // Re-assign fmsMetrics with updated values
      const updatedFmsMetrics = {
        activeProjects,
        completedProjects,
        totalProjects: allProjects.length,
        totalFMSTasks,
        pendingFMSTasks,
        completedFMSTasks,
        avgProgress: allProjects.length > 0 ? totalProgress / allProjects.length : 0
      };
    }

    // Get upcoming tasks - filter by assignedTo for non-admin users
    const upcomingTasksQuery = {
      isActive: true,
      status: { $in: ['pending', 'in-progress'] },
      $or: [
        { dueDate: { $gt: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } },
        { nextDueDate: { $gt: now, $lte: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) } }
      ]
    };
    
    // Filter by assignedTo for non-admin users
    if (isAdmin !== 'true' && userObjectId) {
      upcomingTasksQuery.assignedTo = userObjectId;
    }
    
    const upcomingTasks = await Task.find(upcomingTasksQuery)
    .populate('assignedBy', 'username email phoneNumber')
    .populate('assignedTo', 'username email phoneNumber')
    .sort({ dueDate: 1, nextDueDate: 1 })
    .limit(20);

    res.json({
      statusStats,
      typeStats,
      priorityStats,
      completionTrend,
      plannedTrend,
      teamPerformance: userTeamPerformance,
      recentActivity,
      performanceMetrics,
      userPerformance: isAdmin ? null : userPerformanceData,
      fmsMetrics,
      overallScore: Math.round(overallScore * 10) / 10,
      currentMonthScore: Math.round(currentMonthScore * 10) / 10,
      upcomingTasks,
      // expose simplified counts for widgets
      totalTasks: totalActiveTasks,
      pendingTasks: pendingTasksCount,
      completedTasks: completedTasksCount,
      overdueTasks: overdueTasksCount,
      upcomingTasksCount
    });
  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get individual team member trend data
router.get('/member-trend', async (req, res) => {
  try {
    const { memberUsername, isAdmin, startDate, endDate } = req.query;

    if (isAdmin !== 'true') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!memberUsername) {
      return res.status(400).json({ message: 'Member username is required' });
    }

    // Find the user by username
    const user = await User.findOne({ username: memberUsername, isActive: true }).select('_id username');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const baseQuery = {
      isActive: true,
      assignedTo: user._id
    };

    // Set up date range for trend calculation
    const currentDate = new Date();
    const sixMonthsAgo = new Date(currentDate.getFullYear(), currentDate.getMonth() - 5, 1);
    const endOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59, 999);

    // Get completion trend for this specific member
    const completionTrend = await Task.aggregate([
      {
        $match: {
          ...baseQuery,
          status: 'completed',
          completedAt: {
            $ne: null,
            $gte: sixMonthsAgo,
            $lte: endOfCurrentMonth
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$completedAt' },
            year: { $year: '$completedAt' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
    ]);

    // Get planned trend for this specific member
    const plannedTrend = await Task.aggregate([
      {
        $match: {
          ...baseQuery,
          isActive: true,
          $or: [
            { dueDate: { $ne: null } },
            { nextDueDate: { $ne: null } }
          ]
        }
      },
      {
        $addFields: {
          relevantDate: { $ifNull: ['$nextDueDate', '$dueDate'] }
        }
      },
      {
        $match: {
          relevantDate: {
            $gte: sixMonthsAgo,
            $lte: endOfCurrentMonth
          }
        }
      },
      {
        $group: {
          _id: {
            month: { $month: '$relevantDate' },
            year: { $year: '$relevantDate' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Generate trend data for the last 6 months including current month
    const trendMonths = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = date.toLocaleString('default', { month: 'short' });
      const monthNum = date.getMonth() + 1;
      const yearNum = date.getFullYear();

      const matchingCompletedData = completionTrend.find(item =>
        item._id.month === monthNum && item._id.year === yearNum
      );

      const matchingPlannedData = plannedTrend.find(item =>
        item._id.month === monthNum && item._id.year === yearNum
      );

      trendMonths.push({
        month: monthName,
        completed: matchingCompletedData?.count || 0,
        planned: matchingPlannedData?.count || 0,
      });
    }

    res.json(trendMonths);
  } catch (error) {
    console.error('Member trend data error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get task counts with trends
router.get('/counts', async (req, res) => {
  try {
    const { userId, isAdmin, startDate, endDate, assignedById } = req.query;

    // Convert userId to ObjectId for proper MongoDB queries
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;
    const assignedByObjectId = assignedById ? new mongoose.Types.ObjectId(assignedById) : null;

    const statusVariants = {
      pending: ['pending', 'Pending'],
      completed: ['completed', 'Completed'],
      inProgress: ['in-progress', 'in progress', 'In Progress'],
    };

    let baseQuery = {};
    // If userId is provided (even for admins), filter by that user
    // If userId is not provided and user is not admin, filter by their own ID
    if (userObjectId) {
      baseQuery.assignedTo = userObjectId;
    } else if (isAdmin !== 'true') {
      // Non-admin without userId - this shouldn't happen, but handle it
      // In this case, we'd need the actual user's ID from the session
      // For now, return empty results
    }

    let dateRangeQuery = {};

    // For all-time view (no startDate/endDate), get all data
    if (startDate && endDate) {
      dateRangeQuery = {
        $or: [
          { dueDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
          { nextDueDate: { $gte: new Date(startDate), $lte: new Date(endDate) } }
        ]
      };
    }

    // Calculate previous period for trend comparison
    let previousDateRangeQuery = {};

    if (startDate && endDate) {
      // For current month view, compare with previous month
      const currentStart = new Date(startDate);
      const currentEnd = new Date(endDate);
      const periodDuration = currentEnd.getTime() - currentStart.getTime();

      const previousEnd = new Date(currentStart.getTime() - 1);
      const previousStart = new Date(previousEnd.getTime() - periodDuration);

      previousDateRangeQuery = {
        $or: [
          { dueDate: { $gte: previousStart, $lte: previousEnd } },
          { nextDueDate: { $gte: previousStart, $lte: previousEnd } }
        ]
      };
    } else {
      // For all-time view, compare this year with last year
      const currentDate = new Date();
      const currentYear = currentDate.getFullYear();
      const previousYear = currentYear - 1;
  
      const currentYearStart = new Date(currentYear, 0, 1);
      const currentYearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999);
  
      const previousYearStart = new Date(previousYear, 0, 1);
      const previousYearEnd = new Date(previousYear, 11, 31, 23, 59, 59, 999);
  
      // Set dateRangeQuery for this year's data for trend comparison
      const thisYearDateRangeQuery = {
        $or: [
          { dueDate: { $gte: currentYearStart, $lte: currentYearEnd } },
          { nextDueDate: { $gte: currentYearStart, $lte: currentYearEnd } }
        ]
      };
  
      // But we compare this year vs last year for trends
      previousDateRangeQuery = {
        $or: [
          { dueDate: { $gte: previousYearStart, $lte: previousYearEnd } },
          { nextDueDate: { $gte: previousYearStart, $lte: previousYearEnd } }
        ]
      };
  
      // Get this year's data for trend comparison
      const [
        thisYearTotalTasks,
        thisYearPendingTasks,
        thisYearCompletedTasks,
        thisYearOverdueTasks
      ] = await Promise.all([
        Task.countDocuments({ ...baseQuery, ...thisYearDateRangeQuery }),
        Task.countDocuments({ ...baseQuery, ...thisYearDateRangeQuery, status: { $in: statusVariants.pending } }),
        Task.countDocuments({ ...baseQuery, ...thisYearDateRangeQuery, status: { $in: statusVariants.completed } }),
        Task.countDocuments({
          ...baseQuery,
          ...thisYearDateRangeQuery,
          status: { $nin: statusVariants.completed },
          $or: [
            { dueDate: { $lt: currentDate } },
            { nextDueDate: { $lt: currentDate } }
          ]
        })
      ]);
  
      // Get previous year's data for trend comparison
      const [
        prevYearTotalTasks,
        prevYearPendingTasks,
        prevYearCompletedTasks,
        prevYearOverdueTasks
      ] = await Promise.all([
        Task.countDocuments({ ...baseQuery, ...previousDateRangeQuery }),
        Task.countDocuments({ ...baseQuery, ...previousDateRangeQuery, status: { $in: statusVariants.pending } }),
        Task.countDocuments({ ...baseQuery, ...previousDateRangeQuery, status: { $in: statusVariants.completed } }),
        Task.countDocuments({
          ...baseQuery,
          ...previousDateRangeQuery,
          status: { $nin: statusVariants.completed },
          $or: [
            { dueDate: { $lt: currentDate } },
            { nextDueDate: { $lt: currentDate } }
          ]
        })
      ]);
  
      // Calculate trends for all-time view
      const calculateTrend = (current, previous) => {
        if (previous === 0 && current === 0) return { value: 0, direction: 'up' };
        if (previous === 0) return { value: 100, direction: 'up' };
        const change = ((current - previous) / previous) * 100;
        return {
          value: Math.abs(Math.round(change * 10) / 10),
          direction: change >= 0 ? 'up' : 'down'
        };
      };
  
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const isAdminOrSuperAdmin = isAdmin === 'true';

      // Get all-time data (no date filters) - including quarterly and new metrics
      const [
        totalTasks,
        pendingTasks, // <= Today
        upcomingTasks, // > Today
        overdueTasks, // < Today and not completed
        completedTasks,
        inProgressTasks,
        oneTimeTasks,
        oneTimePending,
        oneTimeCompleted,
        dailyTasks,
        dailyPending,
        dailyCompleted,
        weeklyTasks,
        weeklyPending,
        weeklyCompleted,
        monthlyTasks,
        monthlyPending,
        monthlyCompleted,
        quarterlyTasks,
        quarterlyPending,
        quarterlyCompleted,
        yearlyTasks,
        yearlyPending,
        yearlyCompleted
      ] = await Promise.all([
        Task.countDocuments(baseQuery),
        // Pending: tasks with dueDate <= Today
        Task.countDocuments({
          ...baseQuery,
          $or: [
            { dueDate: { $lte: today } },
            { nextDueDate: { $lte: today } }
          ]
        }),
        // Upcoming: tasks with dueDate > Today
        Task.countDocuments({
          ...baseQuery,
          $or: [
            { dueDate: { $gt: today } },
            { nextDueDate: { $gt: today } }
          ]
        }),
        // Overdue: tasks with dueDate < Today and status != completed
        Task.countDocuments({
          ...baseQuery,
          status: { $nin: statusVariants.completed },
          $or: [
            { dueDate: { $lt: today } },
            { nextDueDate: { $lt: today } }
          ]
        }),
        Task.countDocuments({ ...baseQuery, status: { $in: statusVariants.completed } }),
        Task.countDocuments({ ...baseQuery, status: { $in: statusVariants.inProgress } }),
        Task.countDocuments({ ...baseQuery, taskType: 'one-time' }),
        Task.countDocuments({ ...baseQuery, taskType: 'one-time', status: { $in: statusVariants.pending } }),
        Task.countDocuments({ ...baseQuery, taskType: 'one-time', status: { $in: statusVariants.completed } }),
        Task.countDocuments({ ...baseQuery, taskType: 'daily' }),
        Task.countDocuments({ ...baseQuery, taskType: 'daily', status: { $in: statusVariants.pending } }),
        Task.countDocuments({ ...baseQuery, taskType: 'daily', status: { $in: statusVariants.completed } }),
        Task.countDocuments({ ...baseQuery, taskType: 'weekly' }),
        Task.countDocuments({ ...baseQuery, taskType: 'weekly', status: { $in: statusVariants.pending } }),
        Task.countDocuments({ ...baseQuery, taskType: 'weekly', status: { $in: statusVariants.completed } }),
        Task.countDocuments({ ...baseQuery, taskType: 'monthly' }),
        Task.countDocuments({ ...baseQuery, taskType: 'monthly', status: { $in: statusVariants.pending } }),
        Task.countDocuments({ ...baseQuery, taskType: 'monthly', status: { $in: statusVariants.completed } }),
        Task.countDocuments({ ...baseQuery, taskType: 'quarterly' }),
        Task.countDocuments({ ...baseQuery, taskType: 'quarterly', status: { $in: statusVariants.pending } }),
        Task.countDocuments({ ...baseQuery, taskType: 'quarterly', status: { $in: statusVariants.completed } }),
        Task.countDocuments({ ...baseQuery, taskType: 'yearly' }),
        Task.countDocuments({ ...baseQuery, taskType: 'yearly', status: { $in: statusVariants.pending } }),
        Task.countDocuments({ ...baseQuery, taskType: 'yearly', status: { $in: statusVariants.completed } })
      ]);

      const recurringTasks = dailyTasks + weeklyTasks + monthlyTasks + quarterlyTasks + yearlyTasks;
      const recurringPending = dailyPending + weeklyPending + monthlyPending + quarterlyPending + yearlyPending;
      const recurringCompleted = dailyCompleted + weeklyCompleted + monthlyCompleted + quarterlyCompleted + yearlyCompleted;
      const overduePercentage = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;

      // Get FMS task counts for all-time view
      const fmsTasks = await Project.aggregate([
        {
          $match: {
            ...(userObjectId ? { assignedTo: userObjectId } : {})
          }
        },
        {
          $group: {
            _id: null,
            totalFMSTasks: { $sum: { $size: "$tasks" } },
            pendingFMSTasks: {
              $sum: {
                $size: {
                  $filter: {
                    input: "$tasks",
                    as: "task",
                    cond: { $eq: ["$$task.status", "Pending"] }
                  }
                }
              }
            },
            completedFMSTasks: {
              $sum: {
                $size: {
                  $filter: {
                    input: "$tasks",
                    as: "task",
                    cond: { $eq: ["$$task.status", "Done"] }
                  }
                }
              }
            },
            inProgressFMSTasks: {
              $sum: {
                $size: {
                  $filter: {
                    input: "$tasks",
                    as: "task",
                    cond: { $eq: ["$$task.status", "In Progress"] }
                  }
                }
              }
            }
          }
        }
      ]);

      const fmsMetrics = fmsTasks.length > 0 ? fmsTasks[0] : {
        totalFMSTasks: 0,
        pendingFMSTasks: 0,
        completedFMSTasks: 0,
        inProgressFMSTasks: 0
      };

      let assignedByMeCounts = {
        total: 0,
        pending: 0,
        inProgress: 0,
        completed: 0,
        overdue: 0
      };

      if (assignedByObjectId) {
        const [
          assignedByTotal,
          assignedByPending,
          assignedByInProgress,
          assignedByCompleted,
          assignedByOverdue
        ] = await Promise.all([
          Task.countDocuments({ assignedBy: assignedByObjectId }),
          Task.countDocuments({ assignedBy: assignedByObjectId, status: { $in: statusVariants.pending } }),
          Task.countDocuments({ assignedBy: assignedByObjectId, status: { $in: statusVariants.inProgress } }),
          Task.countDocuments({ assignedBy: assignedByObjectId, status: { $in: statusVariants.completed } }),
          Task.countDocuments({
            assignedBy: assignedByObjectId,
            status: { $nin: statusVariants.completed },
            $or: [
              { dueDate: { $lt: today } },
              { nextDueDate: { $lt: today } }
            ]
          })
        ]);

        assignedByMeCounts = {
          total: assignedByTotal,
          pending: assignedByPending,
          inProgress: assignedByInProgress,
          completed: assignedByCompleted,
          overdue: assignedByOverdue
        };
      }

      return res.json({
        totalTasks,
        pendingTasks,
        upcomingTasks,
        overdueTasks,
        completedTasks,
        inProgressTasks,
        overduePercentage,
        oneTimeTasks,
        oneTimePending,
        oneTimeCompleted,
        recurringTasks,
        recurringPending,
        recurringCompleted,
        dailyTasks,
        dailyPending,
        dailyCompleted,
        weeklyTasks,
        weeklyPending,
        weeklyCompleted,
        monthlyTasks,
        monthlyPending,
        monthlyCompleted,
        quarterlyTasks,
        quarterlyPending,
        quarterlyCompleted,
        yearlyTasks,
        yearlyPending,
        yearlyCompleted,
        fmsTasks: fmsMetrics.totalFMSTasks,
        fmsPendingTasks: fmsMetrics.pendingFMSTasks,
        fmsCompletedTasks: fmsMetrics.completedFMSTasks,
        fmsInProgressTasks: fmsMetrics.inProgressFMSTasks,
        pendingRepetitive: recurringPending,
        assignedByMe: assignedByMeCounts,
        trends: {
          totalTasks: calculateTrend(thisYearTotalTasks, prevYearTotalTasks),
          pendingTasks: calculateTrend(thisYearPendingTasks, prevYearPendingTasks),
          completedTasks: calculateTrend(thisYearCompletedTasks, prevYearCompletedTasks),
          overdueTasks: calculateTrend(thisYearOverdueTasks, prevYearOverdueTasks)
        }
      });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get current period data - including quarterly and new metrics
    const [
      totalTasks,
      pendingTasks, // <= Today
      upcomingTasks, // > Today
      overdueTasks, // < Today and not completed
      completedTasks,
      inProgressTasks,
      oneTimeTasks,
      oneTimePending,
      oneTimeCompleted,
      dailyTasks,
      dailyPending,
      dailyCompleted,
      weeklyTasks,
      weeklyPending,
      weeklyCompleted,
      monthlyTasks,
      monthlyPending,
      monthlyCompleted,
      quarterlyTasks,
      quarterlyPending,
      quarterlyCompleted,
      yearlyTasks,
      yearlyPending,
      yearlyCompleted
    ] = await Promise.all([
      Task.countDocuments({ ...baseQuery }),
      // Pending: tasks with dueDate <= Today and status is pending or in-progress (not completed)
      Task.countDocuments({
        ...baseQuery,
        status: { $nin: statusVariants.completed },
        $or: [
          { dueDate: { $lte: today } },
          { nextDueDate: { $lte: today } }
        ]
      }),
      // Upcoming: tasks with dueDate > Today
      Task.countDocuments({
        ...baseQuery,
        $or: [
          { dueDate: { $gt: today } },
          { nextDueDate: { $gt: today } }
        ]
      }),
      // Overdue: tasks with dueDate < Today and status != completed
      Task.countDocuments({
        ...baseQuery,
        status: { $nin: statusVariants.completed },
        $or: [
          { dueDate: { $lt: today } },
          { nextDueDate: { $lt: today } }
        ]
      }),
      Task.countDocuments({ ...baseQuery, status: { $in: statusVariants.completed } }),
      Task.countDocuments({ ...baseQuery, status: { $in: statusVariants.inProgress } }),
      Task.countDocuments({ ...baseQuery, taskType: 'one-time' }),
      Task.countDocuments({ ...baseQuery, taskType: 'one-time', status: { $in: statusVariants.pending } }),
      Task.countDocuments({ ...baseQuery, taskType: 'one-time', status: { $in: statusVariants.completed } }),
      Task.countDocuments({ ...baseQuery, taskType: 'daily' }),
      Task.countDocuments({ ...baseQuery, taskType: 'daily', status: { $in: statusVariants.pending } }),
      Task.countDocuments({ ...baseQuery, taskType: 'daily', status: { $in: statusVariants.completed } }),
      Task.countDocuments({ ...baseQuery, taskType: 'weekly' }),
      Task.countDocuments({ ...baseQuery, taskType: 'weekly', status: { $in: statusVariants.pending } }),
      Task.countDocuments({ ...baseQuery, taskType: 'weekly', status: { $in: statusVariants.completed } }),
      Task.countDocuments({ ...baseQuery, taskType: 'monthly' }),
      Task.countDocuments({ ...baseQuery, taskType: 'monthly', status: { $in: statusVariants.pending } }),
      Task.countDocuments({ ...baseQuery, taskType: 'monthly', status: { $in: statusVariants.completed } }),
      Task.countDocuments({ ...baseQuery, taskType: 'quarterly' }),
      Task.countDocuments({ ...baseQuery, taskType: 'quarterly', status: { $in: statusVariants.pending } }),
      Task.countDocuments({ ...baseQuery, taskType: 'quarterly', status: { $in: statusVariants.completed } }),
      Task.countDocuments({ ...baseQuery, taskType: 'yearly' }),
      Task.countDocuments({ ...baseQuery, taskType: 'yearly', status: { $in: statusVariants.pending } }),
      Task.countDocuments({ ...baseQuery, taskType: 'yearly', status: { $in: statusVariants.completed } })
    ]);

    // Get previous period data for trend calculation
    const [
      prevTotalTasks,
      prevPendingTasks,
      prevCompletedTasks,
      prevOverdueTasks
    ] = await Promise.all([
      Task.countDocuments({ ...baseQuery, ...previousDateRangeQuery }),
    Task.countDocuments({ ...baseQuery, ...previousDateRangeQuery, status: { $in: statusVariants.pending } }),
    Task.countDocuments({ ...baseQuery, ...previousDateRangeQuery, status: { $in: statusVariants.completed } }),
      Task.countDocuments({
        ...baseQuery,
        ...previousDateRangeQuery,
      status: { $nin: statusVariants.completed },
        $or: [
          { dueDate: { $lt: new Date() } },
          { nextDueDate: { $lt: new Date() } }
        ]
      })
    ]);

    // Calculate trends
    const calculateTrend = (current, previous) => {
      if (previous === 0 && current === 0) return { value: 0, direction: 'up' };
      if (previous === 0) return { value: 100, direction: 'up' };
      const change = ((current - previous) / previous) * 100;
      return {
        value: Math.abs(Math.round(change * 10) / 10),
        direction: change >= 0 ? 'up' : 'down'
      };
    };

    const recurringTasks = dailyTasks + weeklyTasks + monthlyTasks + quarterlyTasks + yearlyTasks;
    const recurringPending = dailyPending + weeklyPending + monthlyPending + quarterlyPending + yearlyPending;
    const recurringCompleted = dailyCompleted + weeklyCompleted + monthlyCompleted + quarterlyCompleted + yearlyCompleted;
    const overduePercentage = totalTasks > 0 ? (overdueTasks / totalTasks) * 100 : 0;

    // Get FMS task counts
    const fmsTasks = await Project.aggregate([
      {
        $match: {
          ...(isAdminOrSuperAdmin ? {} : { assignedTo: userObjectId }),
          ...dateRangeQuery
        }
      },
      {
        $group: {
          _id: null,
          totalFMSTasks: { $sum: { $size: "$tasks" } },
          pendingFMSTasks: {
            $sum: {
              $size: {
                $filter: {
                  input: "$tasks",
                  as: "task",
                  cond: { $eq: ["$$task.status", "Pending"] }
                }
              }
            }
          },
          completedFMSTasks: {
            $sum: {
              $size: {
                $filter: {
                  input: "$tasks",
                  as: "task",
                  cond: { $eq: ["$$task.status", "Done"] }
                }
              }
            }
          },
          inProgressFMSTasks: {
            $sum: {
              $size: {
                $filter: {
                  input: "$tasks",
                  as: "task",
                  cond: { $eq: ["$$task.status", "In Progress"] }
                }
              }
            }
          }
        }
      }
    ]);

    const fmsMetrics = fmsTasks.length > 0 ? fmsTasks[0] : {
      totalFMSTasks: 0,
      pendingFMSTasks: 0,
      completedFMSTasks: 0,
      inProgressFMSTasks: 0
    };

    let assignedByMeCounts = {
      total: 0,
      pending: 0,
      inProgress: 0,
      completed: 0,
      overdue: 0
    };

    if (assignedByObjectId) {
      const [
        assignedByTotal,
        assignedByPending,
        assignedByInProgress,
        assignedByCompleted,
        assignedByOverdue
      ] = await Promise.all([
        Task.countDocuments({ assignedBy: assignedByObjectId }),
      Task.countDocuments({ assignedBy: assignedByObjectId, status: { $in: statusVariants.pending } }),
      Task.countDocuments({ assignedBy: assignedByObjectId, status: { $in: statusVariants.inProgress } }),
      Task.countDocuments({ assignedBy: assignedByObjectId, status: { $in: statusVariants.completed } }),
        Task.countDocuments({
          assignedBy: assignedByObjectId,
        status: { $nin: statusVariants.completed },
          $or: [
            { dueDate: { $lt: new Date() } },
            { nextDueDate: { $lt: new Date() } }
          ]
        })
      ]);

      assignedByMeCounts = {
        total: assignedByTotal,
        pending: assignedByPending,
        inProgress: assignedByInProgress,
        completed: assignedByCompleted,
        overdue: assignedByOverdue
      };
    }

    res.json({
      totalTasks,
      pendingTasks,
      upcomingTasks,
      overdueTasks,
      completedTasks,
      inProgressTasks,
      overduePercentage,
      oneTimeTasks,
      oneTimePending,
      oneTimeCompleted,
      recurringTasks,
      recurringPending,
      recurringCompleted,
      dailyTasks,
      dailyPending,
      dailyCompleted,
      weeklyTasks,
      weeklyPending,
      weeklyCompleted,
      monthlyTasks,
      monthlyPending,
      monthlyCompleted,
      quarterlyTasks,
      quarterlyPending,
      quarterlyCompleted,
      yearlyTasks,
      yearlyPending,
      yearlyCompleted,
      fmsTasks: fmsMetrics.totalFMSTasks,
      fmsPendingTasks: fmsMetrics.pendingFMSTasks,
      fmsCompletedTasks: fmsMetrics.completedFMSTasks,
      fmsInProgressTasks: fmsMetrics.inProgressFMSTasks,
      pendingRepetitive: recurringPending,
      assignedByMe: assignedByMeCounts,
      trends: {
        totalTasks: calculateTrend(totalTasks, prevTotalTasks),
        pendingTasks: calculateTrend(pendingTasks, prevPendingTasks),
        completedTasks: calculateTrend(completedTasks, prevCompletedTasks),
        overdueTasks: calculateTrend(overdueTasks, prevOverdueTasks)
      }
    });
  } catch (error) {
    console.error('Dashboard counts error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get upcoming tasks (next 7 days)
router.get('/upcoming-tasks', async (req, res) => {
  try {
    const { userId, isAdmin } = req.query;
    const userObjectId = userId ? new mongoose.Types.ObjectId(userId) : null;

    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

    let baseQuery = {
      isActive: true,
      status: 'pending',
      $or: [
        { dueDate: { $gt: now, $lte: sevenDaysFromNow } },
        { nextDueDate: { $gt: now, $lte: sevenDaysFromNow } }
      ]
    };

    if (isAdmin !== 'true' && userObjectId) {
      baseQuery.assignedTo = userObjectId;
    }

    const upcomingTasks = await Task.find(baseQuery)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber')
      .sort({ dueDate: 1, nextDueDate: 1 })
      .limit(20);

    res.json({ upcomingTasks });
  } catch (error) {
    console.error('Upcoming tasks error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;