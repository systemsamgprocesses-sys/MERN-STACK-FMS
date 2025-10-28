import mongoose from 'mongoose';

const objectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['date_change', 'terminate', 'hold'],
    required: true
  },
  requestedDate: Date,
  extraDaysRequested: Number,
  remarks: {
    type: String,
    required: true
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: Date,
  approvalRemarks: String,
  impactScore: {
    type: Boolean,
    default: true
  }
});

const projectTaskSchema = new mongoose.Schema({
  stepNo: { type: Number, required: true },
  what: { type: String, required: true },
  who: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  how: { type: String, required: true },
  plannedDueDate: { type: Date },
  actualDueDate: { type: Date },
  status: { 
    type: String, 
    enum: ['Not Started', 'Pending', 'In Progress', 'Done', 'Awaiting Date'],
    default: 'Not Started'
  },
  notes: { type: String },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  completedAt: { type: Date },
  requiresChecklist: { type: Boolean, default: false },
  checklistItems: [{
    id: String,
    text: String,
    completed: Boolean,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now }
  }],
  whenType: { type: String, enum: ['fixed', 'dependent'] },
  objections: [objectionSchema],
  creationDate: { type: Date, default: Date.now },
  originalPlannedDate: Date,
  plannedDaysCount: Number,
  actualCompletionDays: Number,
  completionScore: Number,
  scoreImpacted: { type: Boolean, default: false },
  isOnHold: { type: Boolean, default: false },
  isTerminated: { type: Boolean, default: false }
});

const projectSchema = new mongoose.Schema({
  projectId: { type: String, required: true, unique: true },
  fmsId: { type: mongoose.Schema.Types.ObjectId, ref: 'FMS', required: true },
  projectName: { type: String, required: true },
  startDate: { type: Date, required: true },
  tasks: [projectTaskSchema],
  status: { type: String, enum: ['Active', 'Completed', 'On Hold'], default: 'Active' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  totalScore: { type: Number, default: 0 },
  tasksOnTime: { type: Number, default: 0 },
  tasksLate: { type: Number, default: 0 },
  averageCompletionTime: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

projectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('Project', projectSchema);