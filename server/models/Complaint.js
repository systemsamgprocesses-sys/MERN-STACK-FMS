import mongoose from 'mongoose';

const complaintSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'in-progress', 'resolved', 'closed', 'rejected'],
    default: 'open'
  },
  submittedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  againstUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  taggedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolution: {
    type: String,
    trim: true
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolvedAt: {
    type: Date
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
  tags: [String],
  isInternal: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for better query performance
complaintSchema.index({ status: 1, createdAt: -1 });
complaintSchema.index({ submittedBy: 1, createdAt: -1 });
complaintSchema.index({ assignedTo: 1, status: 1 });

export default mongoose.model('Complaint', complaintSchema);