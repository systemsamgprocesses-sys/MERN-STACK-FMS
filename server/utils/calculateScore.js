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

  // Calculate planned days
  let plannedDays = 0;
  if (start) {
    plannedDays = Math.ceil((planned - start) / (1000 * 60 * 60 * 24));
  } else {
    // If no start date, use planned date as reference (0 days)
    plannedDays = 0;
  }

  // Calculate actual days
  let actualDays = 0;
  if (start) {
    actualDays = Math.ceil((completed - start) / (1000 * 60 * 60 * 24));
  } else {
    // If no start date, compare planned vs completed directly
    actualDays = Math.ceil((completed - planned) / (1000 * 60 * 60 * 24));
    plannedDays = 0;
  }

  // Determine if on time
  const wasOnTime = completed <= planned;

  // Calculate score
  let score = 1.0;
  let scorePercentage = 100;

  if (plannedDays > 0 && actualDays > 0) {
    if (actualDays <= plannedDays) {
      // Completed on time or early - full score
      score = 1.0;
      scorePercentage = 100;
    } else {
      // Late - proportional score
      score = plannedDays / actualDays;
      scorePercentage = Math.min(100, Math.round((plannedDays / actualDays) * 100 * 10) / 10);
    }
  } else if (plannedDays === 0 && actualDays !== undefined) {
    // Simple comparison: on time = 100%, late = calculated penalty
    if (wasOnTime) {
      score = 1.0;
      scorePercentage = 100;
    } else {
      // Calculate penalty based on days late
      const daysLate = Math.abs(actualDays);
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

