import mongoose from 'mongoose';

const ChecklistDepartmentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  }
}, {
  timestamps: true
});

const ChecklistDepartment = mongoose.models.ChecklistDepartment || mongoose.model('ChecklistDepartment', ChecklistDepartmentSchema);

export default ChecklistDepartment;

