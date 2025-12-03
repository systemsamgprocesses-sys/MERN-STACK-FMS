
import mongoose from 'mongoose';

const scoreLogSchema = new mongoose.Schema({
  // Entity type and reference (supports Tasks, FMS/Projects, Checklists)
  entityType: {
    type: String,
    enum: ['task', 'fms', 'checklist'],
    required: true
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  },
  checklistId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Checklist'
  },
  // For FMS projects, store project and task step info
  projectTaskIndex: Number,
  
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  entityTitle: {
    type: String,
    required: true
  },
  taskType: {
    type: String,
    required: true
  },
  taskCategory: {
    type: String,
    enum: ['regular', 'multi-level', 'date-range'],
    default: 'regular'
  },
  // Calculated score (will be calculated on demand)
  score: {
    type: Number,
    min: 0,
    max: 1
  },
  scorePercentage: {
    type: Number
  },
  // Planned and actual dates for calculation
  plannedDate: {
    type: Date,
    required: true
  },
  completedDate: {
    type: Date,
    required: true
  },
  plannedDays: Number,
  actualDays: Number,
  startDate: Date,  // For date-range tasks
  endDate: Date,    // For date-range tasks
  completedAt: {
    type: Date,
    required: true
  },
  wasOnTime: {
    type: Boolean,
    required: true
  },
  scoreImpacted: {
    type: Boolean,
    default: false
  },
  impactReason: String,
  // Flag to indicate if this is calculated (not submitted)
  isCalculated: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

scoreLogSchema.index({ userId: 1, completedAt: -1 });
scoreLogSchema.index({ taskId: 1 });
scoreLogSchema.index({ projectId: 1 });
scoreLogSchema.index({ checklistId: 1 });
scoreLogSchema.index({ entityType: 1 });
scoreLogSchema.index({ completedAt: -1 });
scoreLogSchema.index({ userId: 1, entityType: 1 });

export default mongoose.model('ScoreLog', scoreLogSchema);
