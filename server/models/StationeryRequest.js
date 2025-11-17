import mongoose from 'mongoose';

// Helper to generate unique request numbers
const generateRequestNumber = () => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `REQ-${timestamp}-${random}`;
};

const requestItemSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stationery',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
}, { _id: false });

const stationeryRequestSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    required: true,
    unique: true,
    default: generateRequestNumber
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  demandType: {
    type: String,
    required: true,
    enum: ['Normal', 'Urgent'],
    default: 'Normal'
  },
  items: [requestItemSchema],
  purpose: {
    type: String,
    trim: true
  },
  status: {
    type: String,
    enum: ['Pending', 'Approved', 'Rejected', 'Received'],
    default: 'Pending'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  hrRemarks: {
    type: String,
    trim: true
  },
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: {
    type: Date
  },
  receivedAt: {
    type: Date
  },
  userRemarks: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Index for better query performance
stationeryRequestSchema.index({ status: 1, createdAt: -1 });
stationeryRequestSchema.index({ requestedBy: 1, createdAt: -1 });
stationeryRequestSchema.index({ item: 1, status: 1 });

export default mongoose.model('StationeryRequest', stationeryRequestSchema);