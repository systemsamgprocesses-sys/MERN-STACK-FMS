import mongoose from 'mongoose';

const checklistTemplateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    default: 'General'
  },
  items: [{
    label: { type: String, required: true }, // e.g., "A", "B", "C"
    description: { type: String }
  }],
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly'],
    required: true
  },
  // For weekly frequency - which days of week (0=Sunday, 6=Saturday)
  weeklyDays: [{
    type: Number,
    min: 0,
    max: 6
  }],
  // For monthly frequency - which dates (1-31)
  monthlyDates: [{
    type: Number,
    min: 1,
    max: 31
  }],
  dateRange: {
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true }
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

checklistTemplateSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('ChecklistTemplate', checklistTemplateSchema);

