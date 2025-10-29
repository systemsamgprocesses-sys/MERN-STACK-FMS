
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
      
      // Calculate score
      if (task.plannedDueDate) {
        const completedDate = new Date();
        const dueDate = new Date(task.plannedDueDate);
        const isOnTime = completedDate <= dueDate;
        
        if (isOnTime) {
          project.tasksOnTime = (project.tasksOnTime || 0) + 1;
        } else {
          project.tasksLate = (project.tasksLate || 0) + 1;
        }
        
        // Recalculate total score
        const completedTasks = project.tasks.filter(t => t.status === 'Done').length;
        project.totalScore = Math.round((project.tasksOnTime / completedTasks) * 100);
      }
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
        
        // Calculate plannedDueDate based on completion time
        const fms = await FMS.findById(project.fmsId);
        if (fms) {
          const nextFMSStep = fms.steps.find(s => s.stepNo === nextTask.stepNo);
          if (nextFMSStep) {
            let totalHours = 0;
            if (nextFMSStep.whenUnit === 'days') {
              totalHours = nextFMSStep.when * 24;
            } else if (nextFMSStep.whenUnit === 'hours') {
              totalHours = nextFMSStep.when;
            } else if (nextFMSStep.whenUnit === 'days+hours') {
              totalHours = (nextFMSStep.whenDays || 0) * 24 + (nextFMSStep.whenHours || 0);
            }
            nextTask.plannedDueDate = new Date(Date.now() + totalHours * 60 * 60 * 1000);
          }
        }
      }
    }
    
    // Check if task has FMS trigger and auto-create project
    if (status === 'Done') {
      const fms = await FMS.findById(project.fmsId);
      if (fms) {
        const currentStep = fms.steps.find(s => s.stepNo === task.stepNo);
        if (currentStep && currentStep.triggersFMSId) {
          const triggeredFMS = await FMS.findById(currentStep.triggersFMSId);
          if (triggeredFMS) {
            // Auto-create new project from triggered FMS
            const count = await Project.countDocuments();
            const newProjectId = `PRJ-${(count + 1).toString().padStart(4, '0')}`;
            
            const triggerDate = new Date();
            const newTasks = triggeredFMS.steps.map((step, idx) => {
              let plannedDueDate = null;
              let taskStatus = 'Not Started';
              
              if (idx === 0) {
                taskStatus = 'Pending';
                if (step.whenUnit === 'days') {
                  plannedDueDate = new Date(triggerDate.getTime() + step.when * 24 * 60 * 60 * 1000);
                } else if (step.whenUnit === 'hours') {
                  plannedDueDate = new Date(triggerDate.getTime() + step.when * 60 * 60 * 1000);
                } else if (step.whenUnit === 'days+hours') {
                  const totalHours = (step.whenDays || 0) * 24 + (step.whenHours || 0);
                  plannedDueDate = new Date(triggerDate.getTime() + totalHours * 60 * 60 * 1000);
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
                plannedDueDate = new Date(triggerDate.getTime() + totalHours * 60 * 60 * 1000);
              } else {
                taskStatus = 'Awaiting Date';
              }
              
              return {
                stepNo: step.stepNo,
                what: step.what,
                who: step.who,
                how: step.how,
                plannedDueDate,
                status: taskStatus,
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
            
            const newProject = new Project({
              projectId: newProjectId,
              fmsId: triggeredFMS._id,
              projectName: `Auto-triggered: ${triggeredFMS.fmsName} (from ${project.projectName})`,
              startDate: triggerDate,
              tasks: newTasks,
              status: 'Active',
              createdBy: completedBy
            });
            
            await newProject.save();
          }
        }
      }
    }
    
    await project.save();
    
    res.json({ success: true, message: 'Task updated successfully' });
  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get FMS pending tasks for a user
router.get('/pending-fms-tasks/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const projects = await Project.find({ status: { $in: ['Active', 'In Progress'] } })
      .populate('tasks.who', 'username email phoneNumber')
      .populate('fmsId', 'fmsName');
    
    const userPendingTasks = [];
    
    projects.forEach(project => {
      project.tasks.forEach((task, index) => {
        // Check if user is assigned to this task
        const isAssigned = task.who.some(person => person._id.toString() === userId);
        
        if (isAssigned && (task.status === 'Pending' || task.status === 'In Progress')) {
          // Check if previous task is completed (for step visibility)
          let canComplete = true;
          if (index > 0) {
            const previousTask = project.tasks[index - 1];
            canComplete = previousTask.status === 'Done';
          }
          
          userPendingTasks.push({
            projectId: project._id,
            projectName: project.projectName,
            fmsName: project.fmsId?.fmsName,
            taskIndex: index,
            task: task,
            canComplete: canComplete
          });
        }
      });
    });
    
    res.json({ success: true, tasks: userPendingTasks });
  } catch (error) {
    console.error('Error fetching FMS pending tasks:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;
