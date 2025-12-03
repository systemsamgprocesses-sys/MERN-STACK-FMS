/**
 * Calculate score based on planned vs actual dates
 * @param {Date} plannedDate - The planned/completion date
 * @param {Date} completedDate - The actual completion date
 * @param {Date} startDate - Optional start date for calculating days
 * @returns {Object} Score calculation result
 */
export function calculateScore(plannedDate, completedDate, startDate = null) {
  if (!plannedDate || !completedDate) {
    return {
      score: 1.0,
      scorePercentage: 100,
      plannedDays: 0,
      actualDays: 0,
      wasOnTime: true
    };
  }

  const planned = new Date(plannedDate);
  const completed = new Date(completedDate);
  const start = startDate ? new Date(startDate) : null;

  // Normalize dates to start of day for accurate day comparison (ignore time)
  const plannedDay = new Date(planned.getFullYear(), planned.getMonth(), planned.getDate());
  const completedDay = new Date(completed.getFullYear(), completed.getMonth(), completed.getDate());
  const startDay = start ? new Date(start.getFullYear(), start.getMonth(), start.getDate()) : null;

  // Determine if on time (completed on or before planned date)
  const wasOnTime = completedDay <= plannedDay;

  // Calculate planned days from start to planned date
  let plannedDays = 0;
  if (startDay) {
    // Use Math.round for more accurate day calculation
    const diffMs = plannedDay - startDay;
    plannedDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  } else {
    // If no start date, planned days is 0
    plannedDays = 0;
  }

  // Calculate actual days from start to completed date
  let actualDays = 0;
  if (startDay) {
    // Use Math.round for more accurate day calculation
    const diffMs = completedDay - startDay;
    actualDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  } else {
    // If no start date, actual days is the difference between completed and planned
    const diffMs = completedDay - plannedDay;
    actualDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  }

  // If planned and completed are on the same day, ensure they're treated as equal
  if (plannedDay.getTime() === completedDay.getTime()) {
    // Same day - ensure actualDays equals plannedDays if both are calculated from start
    if (startDay) {
      actualDays = plannedDays;
    } else {
      actualDays = 0;
    }
  }

  // Calculate score based on whether task was completed on time
  let score = 1.0;
  let scorePercentage = 100;

  if (wasOnTime) {
    // Completed on or before planned date - full score
    score = 1.0;
    scorePercentage = 100;
  } else {
    // Late - calculate proportional score
    if (plannedDays > 0 && actualDays > plannedDays) {
      // Late: score = plannedDays / actualDays
      score = plannedDays / actualDays;
      scorePercentage = Math.min(100, Math.round((plannedDays / actualDays) * 100 * 10) / 10);
    } else if (plannedDays === 0) {
      // Calculate penalty based on days late
      const daysLate = actualDays;
      score = Math.max(0, 1 - (daysLate / 30)); // Cap at 30 days penalty
      scorePercentage = Math.max(0, Math.round(score * 100 * 10) / 10);
    }
  }

  return {
    score: Math.max(0, Math.min(1, score)),
    scorePercentage: Math.max(0, Math.min(100, scorePercentage)),
    plannedDays: Math.max(0, plannedDays),
    actualDays: Math.max(0, actualDays),
    wasOnTime
  };
}

/**
 * Calculate score for a Task
 */
export async function calculateTaskScore(task) {
  if (!task || task.status !== 'completed' || !task.completedAt) {
    return null;
  }

  let plannedDate = null;
  let startDate = null;

  // Determine planned date and start date based on task type
  if (task.taskCategory === 'date-range' && task.startDate && task.endDate) {
    plannedDate = new Date(task.endDate);
    startDate = new Date(task.startDate);
  } else {
    plannedDate = task.originalPlannedDate || task.dueDate;
    startDate = task.creationDate || task.createdAt;
  }

  if (!plannedDate) {
    return null;
  }

  const completedDate = new Date(task.completedAt);
  const result = calculateScore(plannedDate, completedDate, startDate);

  return {
    entityType: 'task',
    taskId: task._id,
    userId: task.assignedTo,
    entityTitle: task.title,
    taskType: task.taskType,
    taskCategory: task.taskCategory || 'regular',
    plannedDate,
    completedDate,
    startDate,
    ...result,
    scoreImpacted: task.scoreImpacted || false,
    impactReason: task.scoreImpacted ? 'Score impacted by date extension' : null
  };
}

/**
 * Calculate score for a FMS Project Task
 */
export async function calculateFMSTaskScore(project, taskIndex) {
  const task = project.tasks[taskIndex];
  if (!task || task.status !== 'Done' || !task.completedAt) {
    return null;
  }

  const plannedDate = task.plannedDueDate || task.originalPlannedDate;
  if (!plannedDate) {
    return null;
  }

  const startDate = task.creationDate || project.startDate;
  const completedDate = new Date(task.completedAt || task.actualCompletedOn);
  const result = calculateScore(plannedDate, completedDate, startDate);

  // Get task title from FMS step
  let taskTitle = `Step ${task.stepNo}: ${task.what}`;
  if (project.fmsId && typeof project.fmsId === 'object') {
    const step = project.fmsId.steps?.[taskIndex];
    if (step) {
      taskTitle = `Step ${step.stepNo}: ${step.what}`;
    }
  }

  return {
    entityType: 'fms',
    projectId: project._id,
    projectTaskIndex: taskIndex,
    userId: task.completedBy || (task.who && task.who[0]),
    entityTitle: `${project.projectName} - ${taskTitle}`,
    taskType: project.frequency || 'one-time',
    taskCategory: 'regular',
    plannedDate,
    completedDate,
    startDate,
    ...result,
    scoreImpacted: task.scoreImpacted || false,
    impactReason: task.scoreImpacted ? 'Score impacted by date extension' : null
  };
}

/**
 * Calculate score for a Checklist
 */
export async function calculateChecklistScore(checklist) {
  if (!checklist || checklist.status !== 'Submitted' || !checklist.submittedAt) {
    return null;
  }

  const plannedDate = checklist.nextRunDate || checklist.startDate;
  if (!plannedDate) {
    return null;
  }

  const startDate = checklist.startDate || checklist.createdAt;
  const completedDate = new Date(checklist.submittedAt);
  const result = calculateScore(plannedDate, completedDate, startDate);

  return {
    entityType: 'checklist',
    checklistId: checklist._id,
    userId: checklist.assignedTo,
    entityTitle: checklist.title,
    taskType: checklist.recurrence?.type || 'one-time',
    taskCategory: 'regular',
    plannedDate,
    completedDate,
    startDate,
    ...result,
    scoreImpacted: false,
    impactReason: null
  };
}

