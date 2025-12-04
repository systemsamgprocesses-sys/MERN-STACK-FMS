import mongoose from 'mongoose';

const revisionSchema = new mongoose.Schema({
  oldDate: Date,
  newDate: Date,
  remarks: String,
  revisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  revisedAt: {
    type: Date,
    default: Date.now
  }
});

// Objection schema was already present in the original code,
// but the provided changes snippet also includes an objection schema definition.
// I will use the one provided in the changes snippet for consistency with the user's request to add objection fields.
// If the intention was to merge or update the existing objection schema, the changes snippet would be more specific.
const objectionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['date_change', 'hold', 'terminate'],
    required: true
  },
  requestedDate: Date, // For date_change type
  extraDaysRequested: Number, // For scoring calculation
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


// Checklist schema for tasks
const checklistItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  completedAt: Date,
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  taskType: {
    type: String,
    enum: ['one-time', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    required: true
  },
  originalTaskType: {
    type: String,
    enum: ['one-time', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly']
  },
  // New field for task category
  taskCategory: {
    type: String,
    enum: ['regular', 'multi-level', 'date-range'],
    default: 'regular'
  },
  // Multi-level task fields
  canBeForwarded: {
    type: Boolean,
    default: false
  },
  forwardedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  forwardedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  forwardedAt: Date,
  forwardingHistory: [{
    from: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    to: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    forwardedAt: { type: Date, default: Date.now },
    remarks: String
  }],
  // Date-range task fields
  startDate: Date,
  endDate: Date,
  // Checklist support for all tasks
  requiresChecklist: {
    type: Boolean,
    default: false
  },
  checklistItems: [checklistItemSchema],
  checklistProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  dueDate: {
    type: Date,
    required: true
  },
  originalStartDate: Date, // For tracking original date range
  originalEndDate: Date,   // For tracking original date range
  weeklyDays: [Number],    // For weekly tasks - which days of week
  monthlyDay: {            // For monthly tasks - which day of month (1-31)
    type: Number,
    min: 1,
    max: 31
  },
  priority: {
    type: String,
    enum: ['normal', 'high'],
    default: 'normal'
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'overdue'],
    default: 'pending'
  },
  completedAt: Date,
  completionRemarks: String,
  inProgressRemarks: String,
  completionAttachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  completedOnBehalfBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  pcConfirmationAttachment: {
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: Date
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  requireAttachments: {
    type: Boolean,
    default: false
  },
  mandatoryAttachments: {
    type: Boolean,
    default: false
  },
  revisions: [revisionSchema],
  revisionCount: {
    type: Number,
    default: 0
  },
  // The following section is modified based on the provided changes snippet
  objections: [objectionSchema],
  originalDueDate: Date,
  scoreImpacted: {
    type: Boolean,
    default: false
  },
  isOnHold: {
    type: Boolean,
    default: false
  },
  isTerminated: {
    type: Boolean,
    default: false
  },
  // End of modified section

  isActive: {
    type: Boolean,
    default: true
  },
  // New scoring fields
  creationDate: {
    type: Date,
    default: Date.now
  },
  originalPlannedDate: Date,
  plannedDaysCount: Number,
  actualCompletionDays: Number,
  completionScore: Number,
  // scoreImpacted: { type: Boolean, default: false }, // This field is now duplicated, removing the original one.
  // isOnHold: { type: Boolean, default: false },     // This field is now duplicated, removing the original one.
  // isTerminated: { type: Boolean, default: false }, // This field is now duplicated, removing the original one.

  // Group related tasks together
  taskGroupId: String,
  sequenceNumber: Number, // For ordering tasks in a group
  scheduledDate: Date,    // When this task was originally scheduled for
  parentTaskInfo: {       // Information about the original recurring task
    originalStartDate: Date,
    originalEndDate: Date,
    isForever: Boolean,
    includeSunday: Boolean,
    weeklyDays: [Number],
    monthlyDay: Number,
    yearlyDuration: Number
  },
  // Additional metadata from CSV import
  phoneNumber: String,    // Mobile number of assigned user
  department: String,     // Department from CSV
  whatsappNotified: {     // WhatsApp notification status
    type: Boolean,
    default: false
  },
  whatsappNotifiedAt: Date // When WhatsApp was sent
}, {
  timestamps: true
});

// ============================================
// PERFORMANCE INDEXES - Critical for query optimization
// ============================================
// Index for finding tasks by assignee and status (most common query)
taskSchema.index({ assignedTo: 1, status: 1 });

// Index for finding tasks assigned by someone, sorted by creation date
taskSchema.index({ assignedBy: 1, createdAt: -1 });

// Index for filtering by task type and active status
taskSchema.index({ taskType: 1, isActive: 1 });

// Index for due date queries and overdue task detection
taskSchema.index({ dueDate: 1, status: 1 });

// Index for status filtering (pending, completed, etc.)
taskSchema.index({ status: 1 });

// Index for general sorting by creation date
taskSchema.index({ createdAt: -1 });

// Compound index for complex queries (assigned tasks by type and status)
taskSchema.index({ assignedTo: 1, taskType: 1, status: 1 });

// Index for group ID lookups (recurring tasks)
taskSchema.index({ groupId: 1 });

// Index for finding tasks by title (for duplicate detection)
taskSchema.index({ title: 1 });

// Pre-save hook to calculate checklist progress
taskSchema.pre('save', function(next) {
  if (this.requiresChecklist && this.checklistItems && this.checklistItems.length > 0) {
    const completedCount = this.checklistItems.filter(item => item.completed).length;
    this.checklistProgress = Math.round((completedCount / this.checklistItems.length) * 100);
  }
  next();
});

// Index for better query performance
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ taskType: 1, status: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ taskGroupId: 1 });
taskSchema.index({ originalTaskType: 1 });
taskSchema.index({ taskCategory: 1 });
taskSchema.index({ forwardedTo: 1 });

export default mongoose.model('Task', taskSchema);