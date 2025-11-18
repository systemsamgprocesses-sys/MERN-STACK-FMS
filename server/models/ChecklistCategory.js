import mongoose from 'mongoose';

const ChecklistCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
}, {
  timestamps: true
});

const ChecklistCategory = mongoose.models.ChecklistCategory || mongoose.model('ChecklistCategory', ChecklistCategorySchema);

export default ChecklistCategory;

