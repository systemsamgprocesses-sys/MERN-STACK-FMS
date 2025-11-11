
import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema({
  title: { type: String, required: true },
  isDone: { type: Boolean, default: false },
  remarks: { type: String },
  doneAt: { type: Date }
});

const checklistSchema = new mongoose.Schema({
  title: { type: String, required: true },
  parentTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  parentChecklistId: { type: mongoose.Schema.Types.ObjectId, ref: 'Checklist' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recurrence: {
    type: { 
      type: String, 
      enum: ['one-time', 'daily', 'weekly', 'fortnightly', 'monthly', 'custom'],
      default: 'one-time'
    },
    customInterval: {
      unit: { type: String, enum: ['days', 'weeks', 'months'] },
      n: { type: Number }
    }
  },
  startDate: { type: Date, required: true },
  nextRunDate: { type: Date },
  status: { 
    type: String, 
    enum: ['Draft', 'Active', 'Submitted', 'Archived'],
    default: 'Draft'
  },
  items: [checklistItemSchema],
  submittedAt: { type: Date },
  progressPercentage: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

checklistSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate progress
  if (this.items && this.items.length > 0) {
    const completedCount = this.items.filter(item => item.isDone).length;
    this.progressPercentage = Math.round((completedCount / this.items.length) * 100);
  }
  
  next();
});

export default mongoose.model('Checklist', checklistSchema);
