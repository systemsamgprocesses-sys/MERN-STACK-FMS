
import express from 'express';
import Project from '../models/Project.js';
import FMS from '../models/FMS.js';
import User from '../models/User.js';

const router = express.Router();

// Create project from FMS template
router.post('/', async (req, res) => {
  try {
    const { fmsId, projectName, startDate, createdBy } = req.body;
    
    // Get FMS template
    const fms = await FMS.findById(fmsId).populate('steps.who');
    if (!fms) {
      return res.status(404).json({ success: false, message: 'FMS template not found' });
    }
    
    // Generate unique Project ID
    const count = await Project.countDocuments();
    const projectId = `PRJ-${(count + 1).toString().padStart(4, '0')}`;
    
    const start = new Date(startDate);
    const tasks = fms.steps.map((step, index) => {
      let plannedDueDate = null;
      let status = 'Not Started';
      
      // Step 1 is always Pending and has fixed date
      if (index === 0) {
        status = 'Pending';
        if (step.whenUnit === 'days') {
          plannedDueDate = new Date(start.getTime() + step.when * 24 * 60 * 60 * 1000);
        } else if (step.whenUnit === 'hours') {
          plannedDueDate = new Date(start.getTime() + step.when * 60 * 60 * 1000);
        } else if (step.whenUnit === 'days+hours') {
          const totalHours = (step.whenDays || 0) * 24 + (step.whenHours || 0);
          plannedDueDate = new Date(start.getTime() + totalHours * 60 * 60 * 1000);
        }
      } else if (step.whenType === 'fixed') {
        let totalHours = 0;
        if (step.whenUnit === 'days') {
          totalHours = step.when * 24;
        } else if (step.whenUnit === 'hours') {
          totalHours = step.when;
        } else if (step.whenUnit === 'days+hours') {
          totalHours = (step.whenDays || 0) * 24 + (step.whenHours || 0);
        }
        plannedDueDate = new Date(start.getTime() + totalHours * 60 * 60 * 1000);
      } else {
        status = 'Awaiting Date';
      }
      
      return {
        stepNo: step.stepNo,
        what: step.what,
        who: step.who.map(u => u._id),
        how: step.how,
        plannedDueDate,
        status,
        requiresChecklist: step.requiresChecklist,
        checklistItems: step.checklistItems.map(item => ({
          id: item.id,
          text: item.text,
          completed: false
        })),
        attachments: [],
        whenType: step.whenType
      };
    });
    
    const project = new Project({
      projectId,
      fmsId: fms._id,
      projectName,
      startDate: start,
      tasks,
      status: 'Active',
      createdBy
    });
    
    await project.save();
    
    res.json({ success: true, message: 'Project created successfully', projectId });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get all projects
router.get('/', async (req, res) => {
  try {
    const { userId, role } = req.query;
    
    let query = { status: { $ne: 'Deleted' } };
    
    // Role-based filtering
    if (role !== 'admin' && userId) {
      query['tasks.who'] = userId;
    }
    
    const projects = await Project.find(query)
      .populate('fmsId', 'fmsName')
      .populate('tasks.who', 'username')
      .populate('tasks.completedBy', 'username')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update task status
router.put('/:projectId/tasks/:taskIndex', async (req, res) => {
  try {
    const { projectId, taskIndex } = req.params;
    const { status, completedBy, attachments, checklistItems, notes, plannedDueDate } = req.body;
    
    const project = await Project.findOne({ projectId });
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    
    const task = project.tasks[taskIndex];
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }
    
    // Update task
    if (status) task.status = status;
    if (status === 'Done') {
      task.actualCompletedOn = new Date();
      task.completedBy = completedBy;
    }
    if (attachments) task.attachments = attachments;
    if (checklistItems) task.checklistItems = checklistItems;
    if (notes) task.notes = notes;
    if (plannedDueDate) task.plannedDueDate = new Date(plannedDueDate);
    
    // If task is completed, activate next task if dependent
    if (status === 'Done' && parseInt(taskIndex) < project.tasks.length - 1) {
      const nextTask = project.tasks[parseInt(taskIndex) + 1];
      if (nextTask.whenType === 'dependent' && nextTask.status === 'Awaiting Date') {
        nextTask.status = 'Pending';
      }
    }
    
    await project.save();
    
    res.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;
