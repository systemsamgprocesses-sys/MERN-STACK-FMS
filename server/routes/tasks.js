import express from 'express';
import Task from '../models/Task.js';
import User from '../models/User.js';
import ScoreLog from '../models/ScoreLog.js';
import AuditLog from '../models/AuditLog.js';
import { checkPermission } from '../middleware/permissions.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendTaskAssignmentNotification } from '../services/whatsappService.js';

const router = express.Router();

// Middleware to check if user is superadmin
const isSuperAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  if (req.user.role === 'superadmin') {
    return next();
  }
  return res.status(403).json({ message: 'Access denied. Only Super Admin can perform this action.' });
};

// --- Helper Functions for Date Calculations ---

// Helper function to get all dates for daily tasks within a range
const getDailyTaskDates = (startDate, endDate, includeSunday) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();

    // Skip Sunday if not included and it's a Sunday
    if (includeSunday || dayOfWeek !== 0) { // 0 is Sunday
      dates.push(new Date(current));
    }

    current.setDate(current.getDate() + 1); // Move to the next day
  }

  return dates;
};

// Helper function to get all dates for weekly tasks within a range based on selected days
const getWeeklyTaskDates = (startDate, endDate, selectedDays) => {
  const dates = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dayOfWeek = current.getDay();

    // If the current day of the week is among the selected days
    if (selectedDays.includes(dayOfWeek)) {
      dates.push(new Date(current));
    }

    current.setDate(current.getDate() + 1); // Move to the next day
  }

  return dates;
};

// Helper function to get all dates for monthly tasks with specific day within a range
const getMonthlyTaskDates = (startDate, endDate, monthlyDay, includeSunday) => {
  const dates = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Start from the first day of the start month
  const current = new Date(start.getFullYear(), start.getMonth(), 1);

  while (current <= end) {
    // Set to the target day of month
    let targetDate = new Date(current.getFullYear(), current.getMonth(), monthlyDay);

    // Handle case where monthlyDay doesn't exist in this month (e.g., Feb 30th)
    if (targetDate.getMonth() !== current.getMonth()) {
      // If the day is out of bounds for the current month, set to the last day of the month
      targetDate = new Date(current.getFullYear(), current.getMonth() + 1, 0);
    }

    // Check if the target date is within our overall date range
    if (targetDate >= start && targetDate <= end) {
      // Handle Sunday exclusion
      if (!includeSunday && targetDate.getDay() === 0) { // 0 is Sunday
        // If it's Sunday and Sundays are excluded, move to the next day (Monday)
        targetDate.setDate(targetDate.getDate() - 1);

        // Make sure we didn't accidentally go to the next month by moving to Monday
        // and that it's still within the overall end date
        if (targetDate.getMonth() === current.getMonth() && targetDate <= end) {
          dates.push(new Date(targetDate));
        }
      } else {
        dates.push(new Date(targetDate));
      }
    }

    current.setMonth(current.getMonth() + 1); // Move to the next month
  }

  return dates;
};

// Helper function to get all dates for quarterly tasks (4 tasks for one year)
const getQuarterlyTaskDates = (startDate, includeSunday = true) => {
  const dates = [];
  const start = new Date(startDate);

  // Create 4 quarterly tasks (every 3 months)
  for (let i = 0; i < 4; i++) {
    const quarterlyDate = new Date(start);
    quarterlyDate.setMonth(start.getMonth() + (i * 3)); // Add 3 months for each quarter

    // Handle Sunday exclusion for quarterly tasks
    if (!includeSunday && quarterlyDate.getDay() === 0) { // 0 is Sunday
      quarterlyDate.setDate(quarterlyDate.getDate() - 1); // Move to Saturday
    }

    dates.push(quarterlyDate);
  }

  return dates;
};

// Helper function to get all dates for yearly tasks based on duration
const getYearlyTaskDates = (startDate, yearlyDuration, includeSunday = true) => {
  const dates = [];
  const start = new Date(startDate);

  for (let i = 0; i < yearlyDuration; i++) {
    const yearlyDate = new Date(start);
    yearlyDate.setFullYear(start.getFullYear() + i); // Increment year

    // Handle Sunday exclusion for yearly tasks
    if (!includeSunday && yearlyDate.getDay() === 0) { // 0 is Sunday
      yearlyDate.setDate(yearlyDate.getDate() - 1); // Move to Saturday
    }

    dates.push(yearlyDate);
  }

  return dates;
};

// --- New Helper for Calculating Next Due Date for Recurring Tasks ---

/**
 * Calculates the next due date for a recurring task based on its type and current due date.
 * @param {Object} task - The task object from the database.
 * @returns {Date | null} The calculated next due date, or null if it's a one-time task.
 */
const calculateNextDueDate = (task) => {
  // Start calculation from the current due date of the task
  const currentDueDate = new Date(task.dueDate);
  let nextDueDate = new Date(currentDueDate); // Create a mutable copy

  switch (task.taskType) {
    case 'daily':
      // Advance by one day
      nextDueDate.setDate(nextDueDate.getDate() + 1);
      // If parentTaskInfo exists and Sundays are excluded, skip Sunday
      if (task.parentTaskInfo && task.parentTaskInfo.includeSunday === false) {
        if (nextDueDate.getDay() === 0) { // 0 is Sunday
          nextDueDate.setDate(nextDueDate.getDate() + 1); // Move to Monday
        }
      }
      break;
    case 'weekly':
      // Advance by one week (7 days)
      nextDueDate.setDate(nextDueDate.getDate() + 7);
      // For weekly tasks, the specific days of the week are handled during initial scheduling.
      // Simply advancing by a week should maintain the day of the week.
      break;
    case 'monthly':
      // Advance by one month
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);
      // If a specific monthly day is set in parentTaskInfo, try to set the date to that day.
      if (task.parentTaskInfo && task.parentTaskInfo.monthlyDay) {
        const targetDay = task.parentTaskInfo.monthlyDay;
        // Check if the target day is valid for the new month. If not, set to the last day of the month.
        const lastDayOfNextMonth = new Date(nextDueDate.getFullYear(), nextDueDate.getMonth() + 1, 0).getDate();
        nextDueDate.setDate(Math.min(targetDay, lastDayOfNextMonth));
      }
      // If parentTaskInfo exists and Sundays are excluded, skip Sunday
      if (task.parentTaskInfo && task.parentTaskInfo.includeSunday === false) {
        if (nextDueDate.getDay() === 0) { // 0 is Sunday
          nextDueDate.setDate(nextDueDate.getDate() + 1); // Move to Monday
        }
      }
      break;
    case 'quarterly':
      // Advance by 3 months (one quarter)
      nextDueDate.setMonth(nextDueDate.getMonth() + 3);
      // If parentTaskInfo exists and Sundays are excluded, skip Sunday
      if (task.parentTaskInfo && task.parentTaskInfo.includeSunday === false) {
        if (nextDueDate.getDay() === 0) { // 0 is Sunday
          nextDueDate.setDate(nextDueDate.getDate() - 1); // Move to Saturday
        }
      }
      break;
    case 'yearly':
      // Advance by one year
      nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
      break;
    default:
      // For 'one-time' tasks or unknown types, there is no next due date to calculate.
      return null;
  }

  return nextDueDate;
};

// --- API Endpoints ---

// Get all tasks with filters
router.get('/', async (req, res) => {
  try {
    const {
      taskType,
      status,
      assignedTo,
      assignedBy,
      priority,
      page = 1,
      limit = 10,
      startDate,
      endDate
    } = req.query;

    const query = {};

    // Handle multiple task types (comma-separated)
    if (taskType) {
      if (taskType.includes(',')) {
        query.taskType = { $in: taskType.split(',') };
      } else {
        query.taskType = taskType;
      }
    }

    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }

    if (assignedTo) query.assignedTo = assignedTo;
    if (assignedBy) query.assignedBy = assignedBy;
    if (priority) query.priority = priority;

    if (startDate && endDate) {
      query.dueDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    // Only fetch active tasks (exclude soft-deleted tasks)
    query.isActive = true;

    const tasks = await Task.find(query)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber')
      .sort({ dueDate: 1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending tasks (including one-time and recurring that are overdue or due)
router.get('/pending', async (req, res) => {
  try {
    const { userId, taskType, role } = req.query;
    const query = {
      isActive: true,
      status: { $in: ['pending', 'in-progress', 'overdue'] } // Include pending, in-progress, and overdue
    };

    // Super admin should see all tasks, no userId filter
    if (userId && role !== 'superadmin') {
      query.assignedTo = userId; // Filter by assigned user if provided
    }
    if (taskType) query.taskType = taskType; // Filter by task type if provided

    const tasks = await Task.find(query)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber')
      .sort({ dueDate: 1 }); // Sort by due date ascending

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching pending tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get tasks assigned by me
router.get('/assigned-by-me', async (req, res) => {
  try {
    const { userId, page = 1, limit = 50, status } = req.query;

    if (!userId) {
      return res.status(400).json({ message: 'User ID is required' });
    }

    const query = {
      isActive: true,
      assignedBy: userId
    };

    if (status) {
      query.status = status;
    }

    const tasks = await Task.find(query)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber')
      .populate('completedBy', 'username email')
      .populate('completedOnBehalfBy', 'username email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(query);

    res.json({
      tasks,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Error fetching assigned by me tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending recurring tasks (for the specific "PendingRecurringTasks" frontend component)
router.get('/pending-recurring', async (req, res) => {
  try {
    const { userId, role } = req.query;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today to start of day for comparison
    const fiveDaysFromNow = new Date(today);
    fiveDaysFromNow.setDate(fiveDaysFromNow.getDate() + 5);

    const query = {
      isActive: true,
      taskType: { $in: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] }, // Include quarterly
      status: { $in: ['pending', 'overdue'] }, // Only pending or overdue
      dueDate: { $lte: fiveDaysFromNow } // Due today or within the next 5 days (or overdue)
    };

    // Super admin should see all tasks, no userId filter
    if (userId && role !== 'superadmin') {
      query.assignedTo = userId;
    } // Filter by assigned user if provided

    const tasks = await Task.find(query)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber')
      .sort({ dueDate: 1 }); // Sort by due date ascending

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching pending recurring tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create scheduled tasks (new endpoint for advanced scheduling)
router.post('/create-scheduled', async (req, res) => {
  try {
    const taskData = req.body;
    const createdTasks = [];
    const requiresAttachments = taskData.requireAttachments === true || taskData.requireAttachments === 'true';
    const mandatoryAttachments = taskData.mandatoryAttachments === true || taskData.mandatoryAttachments === 'true';
    let taskDates = [];

    if (taskData.taskType === 'one-time') {
      // For one-time tasks, just use the provided due date
      taskDates = [new Date(taskData.dueDate)];
    } else {
      // Handle recurring tasks based on start/end dates or forever
      const startDate = new Date(taskData.startDate);
      let endDate;

      if (taskData.isForever) {
        // If forever, set end date based on task type
        endDate = new Date(startDate);
        if (taskData.taskType === 'yearly') {
          // For yearly tasks, use the configured duration
          endDate.setFullYear(endDate.getFullYear() + (taskData.yearlyDuration || 3));
        } else {
          // For daily, weekly, monthly tasks, always use 1 year
          endDate.setFullYear(endDate.getFullYear() + 1);
        }
      } else {
        endDate = new Date(taskData.endDate);
      }

      // Generate task dates based on task type
      switch (taskData.taskType) {
        case 'daily':
          taskDates = getDailyTaskDates(startDate, endDate, taskData.includeSunday);
          break;
        case 'weekly':
          taskDates = getWeeklyTaskDates(startDate, endDate, taskData.weeklyDays);
          break;
        case 'monthly':
          taskDates = getMonthlyTaskDates(startDate, endDate, taskData.monthlyDay || 1, taskData.includeSunday);
          break;
        case 'quarterly':
          // For quarterly tasks, create 4 tasks for one year (no forever option)
          taskDates = getQuarterlyTaskDates(startDate, taskData.includeSunday);
          break;
        case 'yearly':
          // For yearly tasks, use the exact yearlyDuration specified
          if (taskData.isForever) {
            // Use the specified yearlyDuration (3, 5, or 10 years)
            taskDates = getYearlyTaskDates(startDate, taskData.yearlyDuration, taskData.includeSunday);
          } else {
            // Single yearly task
            taskDates = getYearlyTaskDates(startDate, 1, taskData.includeSunday);
          }
          break;
      }
    }

    // Generate a unique task group ID for all related tasks in this series
    const taskGroupId = new Date().getTime().toString() + '-' + Math.random().toString(12).substr(2, 9);

    // Create individual task documents for each generated date
    for (let i = 0; i < taskDates.length; i++) {
      const taskDate = taskDates[i];
      const individualTaskData = {
        title: taskData.title,
        description: taskData.description,
        taskType: taskData.taskType, // Store the original recurring type
        taskCategory: taskData.taskCategory || 'regular', // Include task category
        assignedBy: taskData.assignedBy,
        assignedTo: taskData.assignedTo,
        priority: taskData.priority,
        dueDate: taskDate, // Set the specific due date for this instance
        attachments: taskData.attachments || [], // Pass attachments here
        isActive: true,
        status: 'pending', // New tasks are always pending
        taskGroupId: taskGroupId, // Link to the recurring task series
        sequenceNumber: i + 1, // Order within the series
        requireAttachments: requiresAttachments,
        mandatoryAttachments: requiresAttachments ? mandatoryAttachments : false,
        // Store the full parent task info for calculating subsequent occurrences
        parentTaskInfo: {
          originalStartDate: taskData.startDate,
          originalEndDate: taskData.endDate,
          isForever: taskData.isForever,
          includeSunday: taskData.includeSunday,
          weeklyDays: taskData.weeklyDays,
          monthlyDay: taskData.monthlyDay,
          yearlyDuration: taskData.yearlyDuration
        }
      };
      
      // Add date-range specific fields if applicable
      if (taskData.taskCategory === 'date-range') {
        individualTaskData.startDate = taskData.startDate ? new Date(taskData.startDate) : undefined;
        individualTaskData.endDate = taskData.endDate ? new Date(taskData.endDate) : undefined;
      }
      
      // Add multi-level specific fields if applicable
      if (taskData.taskCategory === 'multi-level') {
        individualTaskData.canBeForwarded = true;
      }

      const task = new Task(individualTaskData);
      await task.save();
      createdTasks.push(task);
    }

    // Send WhatsApp notification for the first task only (to avoid spam)
    if (createdTasks.length > 0) {
      try {
        const firstTask = createdTasks[0];
        const assignedToUser = await User.findById(firstTask.assignedTo).select('username email phoneNumber');
        const assignedByUser = await User.findById(firstTask.assignedBy).select('username email phoneNumber');
        
        if (assignedToUser && assignedByUser) {
          console.log('📱 [Scheduled Task Route] Attempting to send WhatsApp notification for task group:', taskGroupId);
          const whatsappResult = await sendTaskAssignmentNotification(
            firstTask,
            assignedToUser,
            assignedByUser
          );
          
          console.log('📱 [Scheduled Task Route] WhatsApp result:', whatsappResult);
          
          // Update notification status for all tasks in the group
          if (whatsappResult.success) {
            await Task.updateMany(
              { taskGroupId: taskGroupId },
              { 
                whatsappNotified: true,
                whatsappNotifiedAt: new Date()
              }
            );
            console.log('📱 [Scheduled Task Route] ✅ WhatsApp notification sent and tasks updated');
          } else {
            console.log('📱 [Scheduled Task Route] ❌ WhatsApp notification failed:', whatsappResult.error);
          }
        } else {
          console.log('📱 [Scheduled Task Route] ⚠️ Cannot send WhatsApp - missing assignedTo or assignedBy');
        }
      } catch (whatsappError) {
        console.error('📱 [Scheduled Task Route] ❌ Exception sending WhatsApp notification:', whatsappError);
        console.error('📱 [Scheduled Task Route] Error stack:', whatsappError.stack);
        // Don't fail the task creation if WhatsApp fails
      }
    }

    res.status(201).json({
      message: `Successfully created ${createdTasks.length} tasks`,
      tasksCreated: createdTasks.length,
      taskGroupId: taskGroupId,
      tasks: createdTasks.slice(0, 5) // Return first 5 tasks as a sample
    });
  } catch (error) {
    console.error('Error creating scheduled tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create task (original endpoint - kept for backward compatibility for single task creation)
router.post('/', async (req, res) => {
  try {
    const taskData = req.body;
    const requiresAttachments = taskData.requireAttachments === true || taskData.requireAttachments === 'true';
    const mandatoryAttachments = taskData.mandatoryAttachments === true || taskData.mandatoryAttachments === 'true';

    // If 'isForever' is true for a non-scheduled endpoint, set an arbitrary end date
    // This part might need re-evaluation if this endpoint is only for one-time tasks
    // or if scheduled tasks are exclusively created via /create-scheduled
    if (taskData.isForever && taskData.startDate) {
      const oneYearLater = new Date(taskData.startDate);
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      taskData.endDate = oneYearLater;
    }

    const task = new Task({
      ...taskData,
      attachments: taskData.attachments || [], // Pass attachments here
      requireAttachments: requiresAttachments,
      mandatoryAttachments: requiresAttachments ? mandatoryAttachments : false
    });
    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber');

    // Send WhatsApp notification
    try {
      if (populatedTask.assignedTo && populatedTask.assignedBy) {
        console.log('📱 [Task Route] Attempting to send WhatsApp notification for task:', populatedTask._id);
        const whatsappResult = await sendTaskAssignmentNotification(
          populatedTask,
          populatedTask.assignedTo,
          populatedTask.assignedBy
        );
        
        console.log('📱 [Task Route] WhatsApp result:', whatsappResult);
        
        if (whatsappResult.success) {
          task.whatsappNotified = true;
          task.whatsappNotifiedAt = new Date();
          await task.save();
          
          // Update populated task
          populatedTask.whatsappNotified = true;
          populatedTask.whatsappNotifiedAt = task.whatsappNotifiedAt;
          console.log('📱 [Task Route] ✅ WhatsApp notification sent and task updated');
        } else {
          console.log('📱 [Task Route] ❌ WhatsApp notification failed:', whatsappResult.error);
        }
      } else {
        console.log('📱 [Task Route] ⚠️ Cannot send WhatsApp - missing assignedTo or assignedBy');
      }
    } catch (whatsappError) {
      console.error('📱 [Task Route] ❌ Exception sending WhatsApp notification:', whatsappError);
      console.error('📱 [Task Route] Error stack:', whatsappError.stack);
      // Don't fail the task creation if WhatsApp fails
    }

    res.status(201).json(populatedTask);
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update task - Only Super Admin can edit tasks
router.put('/:id', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { status, inProgressRemarks, isOnHold, ...updateData } = req.body;

    // Super admin can change status from any status to any status
    // If status is being changed to 'in-progress', require remarks
    if (status === 'in-progress') {
      if (!inProgressRemarks || !inProgressRemarks.trim()) {
        return res.status(400).json({ message: 'Remarks are required when marking task as In Progress' });
      }
      updateData.inProgressRemarks = inProgressRemarks.trim();
    }

    // Super admin can set status to any value including changing completed to pending
    if (status !== undefined) {
      updateData.status = status;

      // If changing from completed to pending, clear completedAt
      if (status === 'pending' || status === 'in-progress') {
        const currentTask = await Task.findById(req.params.id);
        if (currentTask && currentTask.status === 'completed') {
          updateData.completedAt = null;
          updateData.completionRemarks = null;
          updateData.completionScore = null;
        }
      }
    }

    // Super admin can hold/unhold tasks
    if (isOnHold !== undefined) {
      updateData.isOnHold = isOnHold;
      // If putting on hold, set status to pending
      if (isOnHold === true && !status) {
        updateData.status = 'pending';
      }
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true } // Return the updated document
    ).populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Mark task as In Progress - Available to all users
router.put('/:id/in-progress', async (req, res) => {
  try {
    const { inProgressRemarks } = req.body;

    if (!inProgressRemarks || !inProgressRemarks.trim()) {
      return res.status(400).json({ message: 'Remarks are required when marking task as In Progress' });
    }

    const task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        status: 'in-progress',
        inProgressRemarks: inProgressRemarks.trim()
      },
      { new: true }
    ).populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber');

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json(task);
  } catch (error) {
    console.error('Error marking task as in progress:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Complete task - UPDATED TO HANDLE COMPLETION ATTACHMENTS, SCORING, AND PC ROLE
router.post('/:id/complete', async (req, res) => {
  try {
    const { completionRemarks, completionAttachments, completedBy, completedOnBehalfBy, pcConfirmationAttachment } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Don't complete if on hold or terminated
    if (task.isOnHold) {
      return res.status(400).json({ message: 'Cannot complete task that is on hold' });
    }
    if (task.isTerminated) {
      return res.status(400).json({ message: 'Task is already terminated' });
    }

    // 1. Mark the current task instance as completed
    task.status = 'completed';
    task.completedAt = new Date();

    if (completionRemarks && completionRemarks.trim()) {
      task.completionRemarks = completionRemarks.trim();
    }

    if (completionAttachments && completionAttachments.length > 0) {
      task.completionAttachments = completionAttachments;
    }

    // Handle PC role completion
    if (completedOnBehalfBy) {
      task.completedOnBehalfBy = completedOnBehalfBy;
      task.completedBy = completedBy;
      if (pcConfirmationAttachment) {
        task.pcConfirmationAttachment = pcConfirmationAttachment;
      }
    } else if (completedBy) {
      task.completedBy = completedBy;
    }

    task.lastCompletedDate = new Date();

    // 2. Calculate scoring
    // For date-range tasks, use startDate as creation and endDate as due date
    let creationDate;
    let targetDate;

    if (task.taskCategory === 'date-range' && task.startDate && task.endDate) {
      creationDate = new Date(task.startDate);
      targetDate = new Date(task.endDate);
      console.log(`Date-range task: Using startDate ${task.startDate} to endDate ${task.endDate} for scoring`);
    } else {
      creationDate = new Date(task.creationDate || task.createdAt);
      targetDate = new Date(task.originalPlannedDate || task.dueDate);
    }

    const completionDate = new Date(task.completedAt);
    
    // Normalize dates to start of day for accurate comparison
    const completionDay = new Date(completionDate.getFullYear(), completionDate.getMonth(), completionDate.getDate());
    const targetDay = targetDate ? new Date(new Date(targetDate).getFullYear(), new Date(targetDate).getMonth(), new Date(targetDate).getDate()) : null;
    const creationDay = creationDate ? new Date(creationDate.getFullYear(), creationDate.getMonth(), creationDate.getDate()) : null;
    
    // Determine if on time by comparing dates directly (not score)
    const wasOnTime = targetDay ? completionDay <= targetDay : true;
    
    // Calculate actual days from creation to completion
    let actualDays = 0;
    if (creationDay) {
      const diffMs = completionDay - creationDay;
      const days = diffMs / (1000 * 60 * 60 * 24);
      // Ensure at least 1 day if dates are same or very close
      actualDays = days <= 0 ? 1 : Math.ceil(days);
    } else {
      // If no creation date, use 1 as default
      actualDays = 1;
    }
    task.actualCompletionDays = actualDays;

    // Calculate score based on planned days
    let plannedDays = 0;
    if (targetDate && creationDay) {
      const diffMs = targetDay - creationDay;
      const days = diffMs / (1000 * 60 * 60 * 24);
      // Ensure at least 1 day if dates are same or very close
      plannedDays = days <= 0 ? 1 : Math.ceil(days);
    } else {
      // If no target date or creation date, use 1 as default
      plannedDays = 1;
    }

    // Check if there are approved objections that don't impact score
    const approvedObjections = task.objections?.filter(obj =>
      ['approved', 'resolved'].includes(obj.status) && obj.type === 'date_change'
    ) || [];

    const scoreImpactingObjection = approvedObjections.find(obj => obj.impactScore);

    if (scoreImpactingObjection) {
      // Use extended date for scoring
      const extendedDate = new Date(task.dueDate);
      const extendedDay = new Date(extendedDate.getFullYear(), extendedDate.getMonth(), extendedDate.getDate());
      if (creationDay) {
        const diffMs = extendedDay - creationDay;
        const days = diffMs / (1000 * 60 * 60 * 24);
        const extendedDays = days <= 0 ? 1 : Math.ceil(days);
        task.completionScore = plannedDays / extendedDays;
      } else {
        task.completionScore = 1.0;
      }
      task.scoreImpacted = true;
    } else {
      // Full marks if completed on or before target date
      if (wasOnTime) {
        task.completionScore = 1.0;
      } else {
        // Late: score = plannedDays / actualDays
        task.completionScore = plannedDays / actualDays;
      }
      task.scoreImpacted = false;
    }

    console.log(`Task ${task._id} completed with score: ${task.completionScore}, wasOnTime: ${wasOnTime}`);

    await task.save();

    // Log the score
    try {
      const scoreLog = new ScoreLog({
        entityType: 'task',
        taskId: task._id,
        userId: task.assignedTo,
        entityTitle: task.title,
        taskType: task.taskType,
        taskCategory: task.taskCategory || 'regular',
        score: task.completionScore,
        scorePercentage: task.completionScore * 100,
        plannedDate: targetDate || task.dueDate,
        completedDate: task.completedAt,
        plannedDays: plannedDays,
        actualDays: actualDays,
        startDate: task.taskCategory === 'date-range' ? task.startDate : (creationDate || undefined),
        endDate: task.taskCategory === 'date-range' ? task.endDate : undefined,
        completedAt: task.completedAt,
        wasOnTime: wasOnTime, // Use date comparison, not score
        scoreImpacted: task.scoreImpacted,
        impactReason: task.scoreImpacted ? 'Date extension with score impact' : null
      });
      await scoreLog.save();
      console.log(`Score log created for task ${task._id} with ${plannedDays} planned days and ${actualDays} actual days`);
    } catch (logError) {
      console.error('Error saving score log:', logError);
      // Don't fail the completion if logging fails
    }

    const populatedTask = await Task.findById(task._id)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber');

    res.json(populatedTask);
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Revise task
router.post('/:id/revise', async (req, res) => {
  try {
    const { newDate, remarks, revisedBy } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const oldDate = task.dueDate;

    // Add revision to history
    task.revisions.push({
      oldDate,
      newDate: new Date(newDate),
      remarks,
      revisedBy
    });

    task.revisionCount += 1;
    task.dueDate = new Date(newDate); // Update the task's due date

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber')
      .populate('revisions.revisedBy', 'username email');

    res.json(populatedTask);
  } catch (error) {
    console.error('Error revising task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete task (soft delete by setting isActive to false)
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true } // Return the updated document
    );

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Forward multi-level task to another user
router.post('/:id/forward', async (req, res) => {
  try {
    const { forwardTo, remarks, dueDate, checklistItems } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (task.taskCategory !== 'multi-level') {
      return res.status(400).json({ message: 'Only multi-level tasks can be forwarded' });
    }

    // Add to forwarding history
    task.forwardingHistory.push({
      from: task.assignedTo,
      to: forwardTo,
      forwardedAt: new Date(),
      remarks: remarks || ''
    });

    // Update current assignment
    task.forwardedBy = task.assignedTo;
    task.assignedTo = forwardTo;
    task.forwardedTo = forwardTo;
    task.forwardedAt = new Date();

    // Update due date if provided
    if (dueDate) {
      task.dueDate = new Date(dueDate);
    }

    // Update checklist if provided
    if (checklistItems && task.requiresChecklist) {
      task.checklistItems = checklistItems;
    }

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber')
      .populate('forwardedBy', 'username email phoneNumber')
      .populate('forwardingHistory.from forwardingHistory.to', 'username email');

    res.json({
      message: 'Task forwarded successfully',
      task: populatedTask
    });
  } catch (error) {
    console.error('Error forwarding task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get multi-level tasks (for FMS Progress section)
router.get('/multi-level', async (req, res) => {
  try {
    const { userId, role } = req.query;

    let query = { taskCategory: 'multi-level', isActive: true };

    // If not admin, show only tasks assigned to the user
    if (role !== 'admin' && role !== 'superadmin' && role !== 'manager') {
      query.assignedTo = userId;
    }

    const tasks = await Task.find(query)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber')
      .populate('forwardedBy', 'username email phoneNumber')
      .populate('forwardingHistory.from forwardingHistory.to', 'username email')
      .sort({ createdAt: -1 });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching multi-level tasks:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update task checklist items
router.put('/:id/checklist', async (req, res) => {
  try {
    const { checklistItems } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    task.checklistItems = checklistItems;
    await task.save(); // This will trigger the pre-save hook to calculate progress

    const populatedTask = await Task.findById(task._id)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber');

    res.json({
      message: 'Checklist updated successfully',
      task: populatedTask
    });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ SUPER ADMIN ENDPOINTS ============

// Helper function to log Super Admin actions
const logAdminAction = async (userId, username, action, resourceType, resourceId, changes, reason = '', req) => {
  try {
    await AuditLog.create({
      performedBy: userId,
      actionType: action,
      targetType: resourceType,
      targetId: resourceId,
      oldValue: changes.oldValue,
      newValue: changes.newValue,
      reason,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('user-agent')
      }
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
};

// Super Admin: Comprehensive Task Edit
router.put('/:id/admin-edit', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const {
      title,
      description,
      assignedTo,
      assignedBy,
      dueDate,
      priority,
      taskType,
      taskCategory,
      startDate,
      endDate,
      checklistItems,
      reason
    } = req.body;

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Store old values for audit
    const oldValues = {
      title: task.title,
      description: task.description,
      assignedTo: task.assignedTo,
      assignedBy: task.assignedBy,
      dueDate: task.dueDate,
      priority: task.priority,
      taskType: task.taskType,
      taskCategory: task.taskCategory,
      startDate: task.startDate,
      endDate: task.endDate
    };

    // Update fields
    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (assignedTo !== undefined) task.assignedTo = assignedTo;
    if (assignedBy !== undefined) task.assignedBy = assignedBy;
    if (dueDate !== undefined) task.dueDate = dueDate;
    if (priority !== undefined) task.priority = priority;
    if (taskType !== undefined) task.taskType = taskType;
    if (taskCategory !== undefined) task.taskCategory = taskCategory;
    if (startDate !== undefined) task.startDate = startDate;
    if (endDate !== undefined) task.endDate = endDate;
    if (checklistItems !== undefined) task.checklistItems = checklistItems;

    await task.save();

    // Log the action
    await logAdminAction(
      req.user.id,
      req.user.username,
      'task_edit',
      'task',
      task._id.toString(),
      { oldValue: oldValues, newValue: req.body },
      reason || 'Task edited by Super Admin',
      req
    );

    const populatedTask = await Task.findById(task._id)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber');

    res.json({
      message: 'Task updated successfully',
      task: populatedTask
    });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Super Admin: Delete Checklist
router.delete('/:id/checklist', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { reason } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const oldChecklist = task.checklistItems;
    task.checklistItems = [];
    task.requiresChecklist = false;
    await task.save();

    // Log the action
    await logAdminAction(
      req.user.id,
      req.user.username,
      'checklist_delete',
      'checklist',
      task._id.toString(),
      { oldValue: oldChecklist, newValue: [] },
      reason || 'Checklist deleted by Super Admin',
      req
    );

    res.json({
      message: 'Checklist deleted successfully',
      task
    });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Super Admin: Edit Checklist Item
router.put('/:id/checklist-item/:itemIndex', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { itemIndex } = req.params;
    const { text, completed, reason } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.checklistItems || itemIndex >= task.checklistItems.length) {
      return res.status(404).json({ message: 'Checklist item not found' });
    }

    const oldItem = { ...task.checklistItems[itemIndex] };

    if (text !== undefined) task.checklistItems[itemIndex].text = text;
    if (completed !== undefined) task.checklistItems[itemIndex].completed = completed;

    await task.save();

    // Log the action
    await logAdminAction(
      req.user.id,
      req.user.username,
      'checklist_edit',
      'checklist',
      task._id.toString(),
      { oldValue: oldItem, newValue: task.checklistItems[itemIndex] },
      reason || 'Checklist item edited by Super Admin',
      req
    );

    res.json({
      message: 'Checklist item updated successfully',
      task
    });
  } catch (error) {
    console.error('Error updating checklist item:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Super Admin: Delete Attachment
router.delete('/:id/attachments/:attachmentIndex', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { attachmentIndex } = req.params;
    const { reason } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    if (!task.attachments || attachmentIndex >= task.attachments.length) {
      return res.status(404).json({ message: 'Attachment not found' });
    }

    const deletedAttachment = task.attachments[attachmentIndex];
    task.attachments.splice(attachmentIndex, 1);
    await task.save();

    // Log the action
    await logAdminAction(
      req.user.id,
      req.user.username,
      'attachment_delete',
      'attachment',
      task._id.toString(),
      { oldValue: deletedAttachment, newValue: null },
      reason || 'Attachment deleted by Super Admin',
      req
    );

    res.json({
      message: 'Attachment deleted successfully',
      task
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Super Admin: Reassign Task
router.put('/:id/reassign', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { newAssignee, reason } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const oldAssignee = task.assignedTo;
    task.assignedTo = newAssignee;
    await task.save();

    // Log the action
    await logAdminAction(
      req.user.id,
      req.user.username,
      'task_reassign',
      'task',
      task._id.toString(),
      { oldValue: oldAssignee, newValue: newAssignee },
      reason || 'Task reassigned by Super Admin',
      req
    );

    const populatedTask = await Task.findById(task._id)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber');

    res.json({
      message: 'Task reassigned successfully',
      task: populatedTask
    });
  } catch (error) {
    console.error('Error reassigning task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Super Admin: Get Audit Logs
router.get('/admin/audit-logs', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const { resourceType, resourceId, action, limit = 100, skip = 0 } = req.query;

    let query = {};
    if (resourceType) query.targetType = resourceType;
    if (resourceId) query.targetId = resourceId;
    if (action) query.actionType = action;

    const logs = await AuditLog.find(query)
      .populate('performedBy', 'username email')
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));

    const total = await AuditLog.countDocuments(query);

    res.json({
      logs,
      total,
      limit: parseInt(limit),
      skip: parseInt(skip)
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Reassign task - Available to assigned user
router.post('/:id/reassign', authenticateToken, async (req, res) => {
  try {
    const { reassignedTo, reason } = req.body;
    const userId = req.user._id || req.user.id;

    if (!reassignedTo) {
      return res.status(400).json({ message: 'New assignee is required' });
    }
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: 'Reason for reassignment is required' });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check if current user is assigned to this task
    const currentAssigneeId = task.assignedTo?.toString() || task.assignedTo?._id?.toString();
    const userIdStr = userId.toString();
    
    if (currentAssigneeId !== userIdStr) {
      return res.status(403).json({ message: 'Only the assigned user can reassign this task' });
    }

    // Check if task is already completed
    if (task.status === 'completed') {
      return res.status(400).json({ message: 'Cannot reassign a completed task' });
    }

    // Add to reassignment history
    const reassignmentEntry = {
      from: task.assignedTo,
      to: reassignedTo,
      reassignedAt: new Date(),
      reason: reason.trim()
    };

    // Update task
    task.reassignedTo = reassignedTo;
    task.reassignedBy = userId;
    task.reassignedAt = new Date();
    task.reassignmentReason = reason.trim();
    task.assignedTo = reassignedTo;
    
    // Add to history
    if (!task.reassignmentHistory) {
      task.reassignmentHistory = [];
    }
    task.reassignmentHistory.push(reassignmentEntry);

    await task.save();

    const populatedTask = await Task.findById(task._id)
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber')
      .populate('reassignedBy', 'username email phoneNumber')
      .populate('reassignedTo', 'username email phoneNumber');

    res.json({ 
      message: 'Task reassigned successfully',
      task: populatedTask 
    });
  } catch (error) {
    console.error('Error reassigning task:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;