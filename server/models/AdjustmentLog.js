import mongoose from 'mongoose';

const adjustmentLogSchema = new mongoose.Schema({
  // Who made the adjustment
  adjustedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Who was affected by the adjustment
  affectedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Type of adjustment
  adjustmentType: {
    type: String,
    enum: [
      'user_created',
      'user_updated',
      'user_deleted',
      'role_changed',
      'permission_changed',
      'status_changed',
      'password_reset',
      'profile_updated',
      'phone_updated',
      'email_updated'
    ],
    required: true
  },
  
  // Detailed description of what changed
  description: {
    type: String,
    required: true
  },
  
  // Old value (for tracking what was changed)
  oldValue: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // New value
  newValue: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // Additional metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },
  
  // IP address of the person making the change
  ipAddress: {
    type: String
  },
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
adjustmentLogSchema.index({ adjustedBy: 1, timestamp: -1 });
adjustmentLogSchema.index({ affectedUser: 1, timestamp: -1 });
adjustmentLogSchema.index({ adjustmentType: 1, timestamp: -1 });
adjustmentLogSchema.index({ timestamp: -1 });

export default mongoose.model('AdjustmentLog', adjustmentLogSchema);

