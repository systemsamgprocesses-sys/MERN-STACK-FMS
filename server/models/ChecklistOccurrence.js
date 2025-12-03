import mongoose from 'mongoose';

const checklistItemResponseSchema = new mongoose.Schema({
  label: { type: String, required: true },
  description: { type: String },
  checked: { type: Boolean, default: false },
  checkedAt: { type: Date },
  remarks: { type: String },
  // New fields for "Not Done" option
  status: {
    type: String,
    enum: ['done', 'not-done', 'pending'],
    default: 'pending'
  },
  notDoneReason: { type: String },
  actionTaken: {
    type: { type: String, enum: ['complaint', 'task', 'none'] },
    complaintId: { type: mongoose.Schema.Types.ObjectId, ref: 'HelpTicket' },
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
    description: { type: String }
  }
});

const checklistOccurrenceSchema = new mongoose.Schema({
  templateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChecklistTemplate',
    required: true
  },
  templateName: { type: String, required: true }, // Denormalized for quick access
  category: { type: String, default: 'General' }, // Denormalized from template
  dueDate: {
    type: Date,
    required: true,
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  items: [checklistItemResponseSchema],
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
    index: true
  },
  completedAt: { type: Date },
  completedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  progressPercentage: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  // Track if FMS was triggered from this checklist
  triggeredFMS: {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
    projectName: { type: String },
    triggeredAt: { type: Date }
  },
  submittedAt: { type: Date },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for efficient querying
checklistOccurrenceSchema.index({ assignedTo: 1, dueDate: 1 });
checklistOccurrenceSchema.index({ templateId: 1, dueDate: 1 });

checklistOccurrenceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate progress percentage based on done items
  if (this.items && this.items.length > 0) {
    const doneCount = this.items.filter(item => item.status === 'done' || item.checked).length;
    this.progressPercentage = Math.round((doneCount / this.items.length) * 100);
    
    // Auto-complete if all items are done (not considering not-done items)
    if (this.progressPercentage === 100 && this.status !== 'completed') {
      // Only auto-complete if all items are actually done (not not-done)
      const allDone = this.items.every(item => item.status === 'done' || (item.checked && item.status !== 'not-done'));
      if (allDone) {
        this.status = 'completed';
        this.completedAt = new Date();
      }
    }
  }
  
  next();
});

export default mongoose.model('ChecklistOccurrence', checklistOccurrenceSchema);

