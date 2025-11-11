
import mongoose from 'mongoose';

const adminRemarkSchema = new mongoose.Schema({
  by: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  remark: { type: String, required: true },
  at: { type: Date, default: Date.now }
});

const helpTicketSchema = new mongoose.Schema({
  raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  subject: { type: String, required: true },
  description: { type: String, required: true },
  relatedTaskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  status: { 
    type: String, 
    enum: ['Open', 'In Progress', 'Closed'],
    default: 'Open'
  },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adminRemarks: [adminRemarkSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

helpTicketSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model('HelpTicket', helpTicketSchema);
