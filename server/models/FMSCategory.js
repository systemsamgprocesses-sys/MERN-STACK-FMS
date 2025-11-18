import mongoose from 'mongoose';

const FMSCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
}, {
  timestamps: true
});

const FMSCategory = mongoose.models.FMSCategory || mongoose.model('FMSCategory', FMSCategorySchema);

export default FMSCategory;

