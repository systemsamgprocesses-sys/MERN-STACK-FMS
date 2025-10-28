
import mongoose from 'mongoose';

const projectTaskSchema = new mongoose.Schema({
  stepNo: { type: Number, required: true },
  what: { type: String, required: true },
  who: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  how: { type: String, required: true },
  plannedDueDate: { type: Date },
  actualCompletedOn: { type: Date },
  status: { 
    type: String, 
    enum: ['Pending', 'In Progress', 'Done', 'Awaiting Date', 'Not Started'], 
    default: 'Not Started' 
  },
  completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
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
  notes: { type: String }
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
