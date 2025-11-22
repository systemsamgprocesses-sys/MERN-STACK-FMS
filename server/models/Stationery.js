import mongoose from 'mongoose';

const stationerySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  category: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true,
    default: 'pieces'
  },
  minStock: {
    type: Number,
    default: 0,
    min: 0
  },
  maxStock: {
    type: Number,
    default: 1000,
    min: 0
  },
  unitPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  supplier: {
    type: String,
    trim: true
  },
  location: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
stationerySchema.index({ name: 1 });
stationerySchema.index({ category: 1 });
stationerySchema.index({ isActive: 1 });

export default mongoose.model('Stationery', stationerySchema);