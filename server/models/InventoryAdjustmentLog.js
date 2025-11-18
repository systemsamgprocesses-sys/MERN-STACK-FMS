import mongoose from 'mongoose';

const inventoryAdjustmentLogSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stationery',
    required: true
  },
  itemName: {
    type: String,
    required: true
  },
  itemCategory: {
    type: String,
    required: true
  },
  oldQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  newQuantity: {
    type: Number,
    required: true,
    min: 0
  },
  difference: {
    type: Number,
    required: true
  },
  unit: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  adjustedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  adjustedByUsername: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
inventoryAdjustmentLogSchema.index({ item: 1, createdAt: -1 });
inventoryAdjustmentLogSchema.index({ adjustedBy: 1, createdAt: -1 });
inventoryAdjustmentLogSchema.index({ createdAt: -1 });

export default mongoose.model('InventoryAdjustmentLog', inventoryAdjustmentLogSchema);

