
import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  actionType: {
    type: String,
    required: true,
    enum: [
      'task_edit',
      'task_delete',
      'fms_edit',
      'fms_delete',
      'fms_progress_delete',
      'fms_task_edit',
      'date_change',
      'score_change',
      'score_override',
      'score_delete',
      'user_edit',
      'user_delete',
      'frequency_change',
      'checklist_delete',
      'checklist_edit',
      'attachment_delete',
      'bulk_operation',
      'task_reassign',
      'other'
    ]
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    required: true,
    enum: ['task', 'fms', 'user', 'project', 'score']
  },
  targetId: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true
  },
  oldValue: mongoose.Schema.Types.Mixed,
  newValue: mongoose.Schema.Types.Mixed,
  metadata: mongoose.Schema.Types.Mixed,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

auditLogSchema.index({ performedBy: 1, timestamp: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ timestamp: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
