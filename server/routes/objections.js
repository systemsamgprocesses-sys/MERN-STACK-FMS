
import express from 'express';
import Task from '../models/Task.js';
import Project from '../models/Project.js';

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

    await task.save();

    const populatedTask = await Task.findById(taskId)
      .populate('assignedTo', 'username email phoneNumber')
      .populate('assignedBy', 'username email phoneNumber')
      .populate('objections.requestedBy', 'username email phoneNumber');

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

    // Mark objections array as modified to ensure Mongoose saves the nested changes
    task.markModified('objections');

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
      .populate('assignedBy', 'username email phoneNumber')
      .populate('assignedTo', 'username email phoneNumber')
      .populate('objections.requestedBy', 'username email phoneNumber')
      .populate('objections.approvedBy', 'username email phoneNumber');

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
      .populate('tasks.who', 'username email phoneNumber')
      .populate('tasks.objections.requestedBy', 'username email phoneNumber');

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

    // Get regular tasks where user is the assigner and has at least one pending objection
    const tasks = await Task.find({
      assignedBy: userId,
      'objections.status': 'pending',
      isActive: true
    })
      .populate('assignedTo', 'username email phoneNumber')
      .populate('assignedBy', 'username email phoneNumber')
      .populate('objections.requestedBy', 'username email phoneNumber');

    // Filter tasks to only include those with at least one pending objection
    // and filter objections array to only include pending ones
    const filteredTasks = tasks
      .map(task => {
        const pendingObjections = task.objections.filter(obj => obj.status === 'pending');
        if (pendingObjections.length === 0) {
          return null;
        }
        return {
          ...task.toObject(),
          objections: pendingObjections
        };
      })
      .filter(task => task !== null);

    // Get FMS projects where user is the first step assignee
    const fmsProjects = await Project.find({
      'tasks.objections.status': 'pending'
    })
      .populate('tasks.who', 'username email phoneNumber')
      .populate('tasks.objections.requestedBy', 'username email phoneNumber');

    const fmsObjections = fmsProjects
      .filter(project => {
        // Check if user is in the first step's 'who' array
        return project.tasks[0]?.who.some(person => person._id.toString() === userId);
      })
      .map(project => {
        // Filter tasks to only include those with pending objections
        const filteredTasks = project.tasks
          .map(task => {
            const pendingObjections = task.objections?.filter(obj => obj.status === 'pending') || [];
            if (pendingObjections.length === 0) {
              return null;
            }
            return {
              ...task.toObject(),
              objections: pendingObjections
            };
          })
          .filter(task => task !== null);
        
        if (filteredTasks.length === 0) {
          return null;
        }
        
        return {
          ...project.toObject(),
          tasks: filteredTasks
        };
      })
      .filter(project => project !== null);

    res.json({
      success: true,
      regularTasks: filteredTasks,
      fmsTasks: fmsObjections
    });
  } catch (error) {
    console.error('Error fetching pending objections:', error);
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

    // Mark tasks array as modified to ensure Mongoose saves the nested changes
    project.markModified('tasks');

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
      .populate('tasks.who', 'username email phoneNumber')
      .populate('tasks.objections.requestedBy', 'username email phoneNumber')
      .populate('tasks.objections.approvedBy', 'username email phoneNumber');

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
