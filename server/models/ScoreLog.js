
import mongoose from 'mongoose';

const scoreLogSchema = new mongoose.Schema({
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  taskTitle: {
    type: String,
    required: true
  },
  taskType: {
    type: String,
    required: true
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  scorePercentage: {
    type: Number,
    required: true
  },
  plannedDays: Number,
  actualDays: Number,
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
  impactReason: String
}, {
  timestamps: true
});

scoreLogSchema.index({ userId: 1, completedAt: -1 });
scoreLogSchema.index({ taskId: 1 });
scoreLogSchema.index({ completedAt: -1 });

export default mongoose.model('ScoreLog', scoreLogSchema);
