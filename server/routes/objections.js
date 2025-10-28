
import express from 'express';
import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

const router = express.Router();

// Raise objection for regular task
router.post('/task/:taskId', async (req, res) => {
  try {
    const { taskId } = req.params;
    const { type, requestedDate, remarks, requestedBy } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Calculate extra days if type is date_change
    let extraDaysRequested = 0;
    if (type === 'date_change' && requestedDate) {
      const originalDate = new Date(task.dueDate);
      const newDate = new Date(requestedDate);
      extraDaysRequested = Math.ceil((newDate - originalDate) / (1000 * 60 * 60 * 24));
    }

    const objection = {
      type,
      requestedDate: type === 'date_change' ? requestedDate : undefined,
      extraDaysRequested,
      remarks,
      requestedBy,
      status: 'pending'
    };

    task.objections.push(objection);
    await task.save();

    const populatedTask = await Task.findById(taskId)
      .populate('assignedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('objections.requestedBy', 'username email');

    res.json({ 
      success: true, 
      message: 'Objection raised successfully',
      task: populatedTask 
    });
  } catch (error) {
    console.error('Error raising objection:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Raise objection for FMS task
router.post('/fms/:projectId/task/:taskIndex', async (req, res) => {
  try {
    const { projectId, taskIndex } = req.params;
    const { type, requestedDate, remarks, requestedBy } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const task = project.tasks[parseInt(taskIndex)];
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Calculate extra days if type is date_change
    let extraDaysRequested = 0;
    if (type === 'date_change' && requestedDate) {
      const originalDate = new Date(task.plannedDueDate);
      const newDate = new Date(requestedDate);
      extraDaysRequested = Math.ceil((newDate - originalDate) / (1000 * 60 * 60 * 24));
    }

    if (!task.objections) {
      task.objections = [];
    }

    task.objections.push({
      type,
      requestedDate: type === 'date_change' ? requestedDate : undefined,
      extraDaysRequested,
      remarks,
      requestedBy,
      status: 'pending'
    });

    await project.save();

    const populatedProject = await Project.findById(projectId)
      .populate('tasks.who', 'username email')
      .populate('tasks.objections.requestedBy', 'username email');

    res.json({ 
      success: true, 
      message: 'Objection raised successfully',
      project: populatedProject 
    });
  } catch (error) {
    console.error('Error raising FMS objection:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get pending objections for approver
router.get('/pending/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get regular tasks where user is the assigner
    const tasks = await Task.find({
      assignedBy: userId,
      'objections.status': 'pending',
      isActive: true
    })
      .populate('assignedTo', 'username email')
      .populate('assignedBy', 'username email')
      .populate('objections.requestedBy', 'username email');

    // Get FMS projects where user is the first step assignee
    const fmsProjects = await Project.find({
      'tasks.objections.status': 'pending'
    })
      .populate('tasks.who', 'username email')
      .populate('tasks.objections.requestedBy', 'username email');

    const fmsObjections = fmsProjects.filter(project => {
      // Check if user is in the first step's 'who' array
      return project.tasks[0]?.who.some(person => person._id.toString() === userId);
    });

    res.json({
      success: true,
      regularTasks: tasks,
      fmsTasks: fmsObjections
    });
  } catch (error) {
    console.error('Error fetching pending objections:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve/reject objection for regular task
router.post('/task/:taskId/objection/:objectionIndex/respond', async (req, res) => {
  try {
    const { taskId, objectionIndex } = req.params;
    const { status, approvalRemarks, impactScore, approvedBy } = req.body;

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const objection = task.objections[parseInt(objectionIndex)];
    if (!objection) {
      return res.status(404).json({ message: 'Objection not found' });
    }

    objection.status = status;
    objection.approvedBy = approvedBy;
    objection.approvedAt = new Date();
    objection.approvalRemarks = approvalRemarks;
    objection.impactScore = impactScore !== undefined ? impactScore : true;

    if (status === 'approved') {
      if (objection.type === 'date_change') {
        task.dueDate = objection.requestedDate;
        
        // Store original planned date for scoring
        if (!task.originalPlannedDate) {
          task.originalPlannedDate = task.dueDate;
        }
        
        // Calculate planned days
        const creationDate = new Date(task.creationDate || task.createdAt);
        const plannedDate = new Date(task.dueDate);
        task.plannedDaysCount = Math.ceil((plannedDate - creationDate) / (1000 * 60 * 60 * 24));
        
        task.scoreImpacted = impactScore;
      } else if (objection.type === 'hold') {
        task.isOnHold = true;
        task.status = 'pending';
      } else if (objection.type === 'terminate') {
        task.isTerminated = true;
        task.status = 'completed';
      }
    }

    await task.save();

    const populatedTask = await Task.findById(taskId)
      .populate('assignedBy', 'username email')
      .populate('assignedTo', 'username email')
      .populate('objections.requestedBy', 'username email')
      .populate('objections.approvedBy', 'username email');

    res.json({ 
      success: true, 
      message: `Objection ${status}`,
      task: populatedTask 
    });
  } catch (error) {
    console.error('Error responding to objection:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Approve/reject objection for FMS task
router.post('/fms/:projectId/task/:taskIndex/objection/:objectionIndex/respond', async (req, res) => {
  try {
    const { projectId, taskIndex, objectionIndex } = req.params;
    const { status, approvalRemarks, impactScore, approvedBy } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const task = project.tasks[parseInt(taskIndex)];
    const objection = task.objections[parseInt(objectionIndex)];

    objection.status = status;
    objection.approvedBy = approvedBy;
    objection.approvedAt = new Date();
    objection.approvalRemarks = approvalRemarks;
    objection.impactScore = impactScore !== undefined ? impactScore : true;

    if (status === 'approved') {
      if (objection.type === 'date_change') {
        task.plannedDueDate = objection.requestedDate;
        
        if (!task.originalPlannedDate) {
          task.originalPlannedDate = task.plannedDueDate;
        }
        
        const creationDate = new Date(task.creationDate || project.startDate);
        const plannedDate = new Date(task.plannedDueDate);
        task.plannedDaysCount = Math.ceil((plannedDate - creationDate) / (1000 * 60 * 60 * 24));
        
        task.scoreImpacted = impactScore;
      } else if (objection.type === 'hold') {
        task.isOnHold = true;
      } else if (objection.type === 'terminate') {
        task.isTerminated = true;
        task.status = 'Done';
      }
    }

    await project.save();

    const populatedProject = await Project.findById(projectId)
      .populate('tasks.who', 'username email')
      .populate('tasks.objections.requestedBy', 'username email')
      .populate('tasks.objections.approvedBy', 'username email');

    res.json({ 
      success: true, 
      message: `Objection ${status}`,
      project: populatedProject 
    });
  } catch (error) {
    console.error('Error responding to FMS objection:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
