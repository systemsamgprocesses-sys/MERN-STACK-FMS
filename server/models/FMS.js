
import mongoose from 'mongoose';

const checklistItemSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false }
});

const attachmentSchema = new mongoose.Schema({
  filename: { type: String, required: true },
  originalName: { type: String, required: true },
  path: { type: String, required: true },
  size: { type: Number, required: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  uploadedAt: { type: Date, default: Date.now }
});

const stepSchema = new mongoose.Schema({
  stepNo: { type: Number, required: true },
  what: { type: String, required: true },
  who: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  how: { type: String, required: true },
  when: { type: Number, required: true },
  whenUnit: { type: String, enum: ['days', 'hours', 'days+hours'], required: true },
  whenDays: { type: Number },
  whenHours: { type: Number },
  whenType: { type: String, enum: ['fixed', 'dependent'], required: true },
  requiresChecklist: { type: Boolean, default: false },
  checklistItems: [checklistItemSchema],
  attachments: [attachmentSchema],
  triggersFMSId: { type: mongoose.Schema.Types.ObjectId, ref: 'FMS' }
});

const fmsSchema = new mongoose.Schema({
  fmsId: { type: String, required: true, unique: true },
  fmsName: { type: String, required: true },
  steps: [stepSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Active', 'Inactive'], default: 'Active' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

fmsSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('FMS', fmsSchema);
