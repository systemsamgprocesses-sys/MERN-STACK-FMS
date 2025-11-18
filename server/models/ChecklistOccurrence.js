import mongoose from 'mongoose';

const checklistItemResponseSchema = new mongoose.Schema({
  label: { type: String, required: true },
  description: { type: String },
  checked: { type: Boolean, default: false },
  checkedAt: { type: Date },
  remarks: { type: String }
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
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Compound index for efficient querying
checklistOccurrenceSchema.index({ assignedTo: 1, dueDate: 1 });
checklistOccurrenceSchema.index({ templateId: 1, dueDate: 1 });

checklistOccurrenceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Calculate progress percentage
  if (this.items && this.items.length > 0) {
    const checkedCount = this.items.filter(item => item.checked).length;
    this.progressPercentage = Math.round((checkedCount / this.items.length) * 100);
    
    // Auto-complete if all items are checked
    if (this.progressPercentage === 100 && this.status !== 'completed') {
      this.status = 'completed';
      this.completedAt = new Date();
    }
  }
  
  next();
});

export default mongoose.model('ChecklistOccurrence', checklistOccurrenceSchema);

