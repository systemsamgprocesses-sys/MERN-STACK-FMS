
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Eye, FileText, Check, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Step {
  stepNo: number;
  what: string;
  who: string[];
  how: string;
  when: number;
  whenUnit: 'days' | 'hours' | 'days+hours';
  whenDays?: number;
  whenHours?: number;
  whenType: 'fixed' | 'dependent';
  requiresChecklist: boolean;
  checklistItems: ChecklistItem[];
  attachments: File[];
  triggersFMSId?: string;
}

const CreateFMS: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [fmsName, setFmsName] = useState('');
  const [steps, setSteps] = useState<Step[]>([{
    stepNo: 1,
    what: '',
    who: [],
    how: '',
    when: 1,
    whenUnit: 'days',
    whenType: 'fixed',
    requiresChecklist: false,
    checklistItems: [],
    attachments: []
  }]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      setUsers(response.data.filter((u: any) => u.isActive));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const addStep = () => {
    setSteps([...steps, {
      stepNo: steps.length + 1,
      what: '',
      who: [],
      how: '',
      when: 1,
      whenUnit: 'days',
      whenType: 'fixed',
      requiresChecklist: false,
      checklistItems: [],
      attachments: []
    }]);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    newSteps.forEach((step, i) => {
      step.stepNo = i + 1;
    });
    setSteps(newSteps);
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps];
    (newSteps[index] as any)[field] = value;
    setSteps(newSteps);
  };

  const addChecklistItem = (stepIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].checklistItems.push({
      id: Date.now().toString(),
      text: '',
      completed: false
    });
    setSteps(newSteps);
  };

  const updateChecklistItem = (stepIndex: number, itemIndex: number, text: string) => {
    const newSteps = [...steps];
    newSteps[stepIndex].checklistItems[itemIndex].text = text;
    setSteps(newSteps);
  };

  const removeChecklistItem = (stepIndex: number, itemIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].checklistItems.splice(itemIndex, 1);
    setSteps(newSteps);
  };

  const handleFileChange = (stepIndex: number, files: FileList | null) => {
    if (files) {
      const newSteps = [...steps];
      newSteps[stepIndex].attachments = Array.from(files).slice(0, 10);
      setSteps(newSteps);
    }
  };

  const validateForm = () => {
    const newErrors: any = {};
    
    if (!fmsName.trim()) {
      newErrors.fmsName = 'FMS name is required';
    }
    
    steps.forEach((step, index) => {
      if (!step.what.trim()) {
        newErrors[`step${index}_what`] = 'Task description is required';
      }
      if (step.who.length === 0) {
        newErrors[`step${index}_who`] = 'At least one assignee is required';
      }
      if (!step.how.trim()) {
        newErrors[`step${index}_how`] = 'Process/method is required';
      }
      if (step.requiresChecklist && step.checklistItems.length === 0) {
        newErrors[`step${index}_checklist`] = 'At least one checklist item is required';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      alert('Please fill all required fields');
      return;
    }
    
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('fmsName', fmsName);
      formData.append('createdBy', user?.id || '');
      
      // Prepare steps for submission
      const stepsData = steps.map(step => ({
        ...step,
        attachments: [] // Will be populated by backend
      }));
      formData.append('steps', JSON.stringify(stepsData));
      
      // Append files with step index
      steps.forEach((step, index) => {
        step.attachments.forEach((file) => {
          formData.append(`files-${index}`, file);
        });
      });
      
      const response = await axios.post(`${address}/api/fms`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.success) {
        alert('FMS template created successfully!');
        navigate('/fms-templates');
      }
    } catch (error) {
      console.error('Error creating FMS:', error);
      alert('Failed to create FMS template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">Create FMS Template</h1>
          <p className="text-[var(--color-textSecondary)]">Define workflow steps for repeatable processes</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
            FMS Template Name *
          </label>
          <input
            type="text"
            value={fmsName}
            onChange={(e) => setFmsName(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
            placeholder="Enter template name"
          />
          {errors.fmsName && <p className="text-[var(--color-error)] text-sm mt-1">{errors.fmsName}</p>}
        </div>

        {steps.map((step, index) => (
          <div key={index} className="mb-6 p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[var(--color-text)]">Step {step.stepNo}</h3>
              {steps.length > 1 && (
                <button
                  onClick={() => removeStep(index)}
                  className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-lg"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">What (Task Description) *</label>
                <textarea
                  value={step.what}
                  onChange={(e) => updateStep(index, 'what', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  rows={2}
                  placeholder="Describe the task"
                />
                {errors[`step${index}_what`] && <p className="text-[var(--color-error)] text-sm mt-1">{errors[`step${index}_what`]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Who (Assignees) *</label>
                <select
                  multiple
                  value={step.who}
                  onChange={(e) => updateStep(index, 'who', Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  size={4}
                >
                  {users.map(u => (
                    <option key={u._id} value={u._id}>{u.username}</option>
                  ))}
                </select>
                {errors[`step${index}_who`] && <p className="text-[var(--color-error)] text-sm mt-1">{errors[`step${index}_who`]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">How (Method) *</label>
                <textarea
                  value={step.how}
                  onChange={(e) => updateStep(index, 'how', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  rows={4}
                  placeholder="Describe the method or process"
                />
                {errors[`step${index}_how`] && <p className="text-[var(--color-error)] text-sm mt-1">{errors[`step${index}_how`]}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">When Type</label>
                <select
                  value={step.whenType}
                  onChange={(e) => updateStep(index, 'whenType', e.target.value)}
                  disabled={index === 0 || (index > 0 && steps[index - 1].who.length > 1)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value="fixed">Fixed (from start date)</option>
                  <option value="dependent">Dependent (after previous step)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Duration Unit</label>
                <select
                  value={step.whenUnit}
                  onChange={(e) => updateStep(index, 'whenUnit', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value="days">Days</option>
                  <option value="hours">Hours</option>
                  <option value="days+hours">Days + Hours</option>
                </select>
              </div>

              {step.whenUnit === 'days' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Days</label>
                  <input
                    type="number"
                    value={step.when}
                    onChange={(e) => updateStep(index, 'when', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                    min="0"
                  />
                </div>
              )}

              {step.whenUnit === 'hours' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Hours</label>
                  <input
                    type="number"
                    value={step.when}
                    onChange={(e) => updateStep(index, 'when', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                    min="0"
                  />
                </div>
              )}

              {step.whenUnit === 'days+hours' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Days</label>
                    <input
                      type="number"
                      value={step.whenDays || 0}
                      onChange={(e) => updateStep(index, 'whenDays', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                      min="0"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Hours</label>
                    <input
                      type="number"
                      value={step.whenHours || 0}
                      onChange={(e) => updateStep(index, 'whenHours', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                      min="0"
                    />
                  </div>
                </>
              )}

              <div className="md:col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={step.requiresChecklist}
                    onChange={(e) => updateStep(index, 'requiresChecklist', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-[var(--color-text)]">Requires Checklist</span>
                </label>
              </div>

              {step.requiresChecklist && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Checklist Items</label>
                  {step.checklistItems.map((item, itemIndex) => (
                    <div key={item.id} className="flex items-center space-x-2 mb-2">
                      <input
                        type="text"
                        value={item.text}
                        onChange={(e) => updateChecklistItem(index, itemIndex, e.target.value)}
                        className="flex-1 px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                        placeholder="Checklist item"
                      />
                      <button
                        onClick={() => removeChecklistItem(index, itemIndex)}
                        className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-lg"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => addChecklistItem(index)}
                    className="mt-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
                  >
                    + Add Item
                  </button>
                  {errors[`step${index}_checklist`] && <p className="text-[var(--color-error)] text-sm mt-1">{errors[`step${index}_checklist`]}</p>}
                </div>
              )}

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Attachments (Max 10 files, 10MB each)</label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => handleFileChange(index, e.target.files)}
                  className="w-full"
                  accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.webm,.mp3,.wav"
                />
                {step.attachments.length > 0 && (
                  <p className="text-sm text-[var(--color-textSecondary)] mt-2">
                    {step.attachments.length} file(s) selected
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between mt-8">
          <button
            onClick={addStep}
            className="px-6 py-3 bg-[var(--color-secondary)] text-white rounded-lg hover:opacity-90 flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Step</span>
          </button>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-3 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 flex items-center space-x-2 disabled:opacity-50"
          >
            <Save size={20} />
            <span>{loading ? 'Saving...' : 'Save FMS Template'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateFMS;
