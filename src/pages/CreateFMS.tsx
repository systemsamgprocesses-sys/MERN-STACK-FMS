import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Save, Eye, X, Calendar, Filter } from 'lucide-react';
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
  whenType: 'fixed' | 'dependent' | 'ask-on-completion';
  requiresChecklist: boolean;
  checklistItems: ChecklistItem[];
  attachments: File[];
  triggersFMSId?: string;
  requireAttachments: boolean;
  mandatoryAttachments: boolean;
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
    attachments: [],
    requireAttachments: false,
    mandatoryAttachments: false
  }]);
  const [users, setUsers] = useState<any[]>([]);
  const [fmsList, setFmsList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<any>({});
  const [userSearchTerms, setUserSearchTerms] = useState<string[]>(['']);
  const [frequency, setFrequency] = useState<'one-time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'>('one-time');
  const [frequencySettings, setFrequencySettings] = useState({
    includeSunday: true,
    shiftSundayToMonday: true,
    weeklyDays: [] as number[],
    monthlyDay: 1,
    yearlyDuration: 3
  });

  useEffect(() => {
    fetchUsers();
    fetchFmsList();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      setUsers(response.data.filter((u: any) => u.isActive));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchFmsList = async () => {
    try {
      const response = await axios.get(`${address}/api/fms`);
      setFmsList(response.data.fmsList || []);
    } catch (error) {
      console.error('Error fetching FMS list:', error);
      setFmsList([]);
    }
  };

  const addStep = () => {
    const updatedSteps = [...steps, {
      stepNo: steps.length + 1,
      what: '',
      who: [],
      how: '',
      when: 1,
      whenUnit: 'days',
      whenType: 'fixed',
      requiresChecklist: false,
      checklistItems: [],
      attachments: [],
      requireAttachments: false,
      mandatoryAttachments: false
    }];
    setSteps(updatedSteps);
    setUserSearchTerms(prev => [...prev, '']);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    newSteps.forEach((step, i) => {
      step.stepNo = i + 1;
    });
    setSteps(newSteps);
    setUserSearchTerms(prev => prev.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps];
    (newSteps[index] as any)[field] = value;

    if (field === 'whenType') {
      if (value === 'ask-on-completion') {
        newSteps[index].when = 0;
        newSteps[index].whenDays = 0;
        newSteps[index].whenHours = 0;
      } else if (value === 'fixed' && index === 0) {
        newSteps[index].whenUnit = 'days';
        newSteps[index].when = 1;
      }
    }

    setSteps(newSteps);
  };

  const updateUserSearchTerm = (index: number, value: string) => {
    const updated = [...userSearchTerms];
    updated[index] = value;
    setUserSearchTerms(updated);
  };

  const toggleWeeklyDay = (day: number) => {
    setFrequencySettings(prev => ({
      ...prev,
      weeklyDays: prev.weeklyDays.includes(day)
        ? prev.weeklyDays.filter(d => d !== day)
        : [...prev.weeklyDays, day]
    }));
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
      if (step.whenType !== 'ask-on-completion') {
        if (step.whenUnit === 'days' || step.whenUnit === 'hours') {
          if (!Number.isFinite(step.when) || step.when < 0) {
            newErrors[`step${index}_when`] = 'Please provide a valid duration';
          }
        }
        if (step.whenUnit === 'days+hours') {
          if (!Number.isFinite(step.whenDays) || (step.whenDays ?? 0) < 0) {
            newErrors[`step${index}_whenDays`] = 'Enter valid number of days';
          }
          if (!Number.isFinite(step.whenHours) || (step.whenHours ?? 0) < 0) {
            newErrors[`step${index}_whenHours`] = 'Enter valid number of hours';
          }
        }
      }
    });

    if (frequency === 'weekly' && frequencySettings.weeklyDays.length === 0) {
      newErrors.frequency = 'Select at least one weekday for weekly frequency';
    }

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
      formData.append('frequency', frequency);
      formData.append('frequencySettings', JSON.stringify(frequencySettings));

      // Prepare steps for submission
      const stepsData = steps.map(step => ({
        ...step,
        attachments: [], // Will be populated by backend
        when: step.whenType === 'ask-on-completion' ? 0 : step.when,
        whenDays: step.whenType === 'ask-on-completion' ? 0 : step.whenDays,
        whenHours: step.whenType === 'ask-on-completion' ? 0 : step.whenHours
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
      } else {
        alert(response.data.message || 'Failed to create FMS template');
      }
    } catch (error) {
      console.error('Error creating FMS:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.error || 'Failed to create FMS template';
      alert(errorMessage);
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

        <div className="mb-6 p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary)12' }}>
              <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text)]">FMS Frequency</h2>
              <p className="text-xs text-[var(--color-textSecondary)]">Configure how often this FMS should run</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as typeof frequency)}
                className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
              >
                <option value="one-time">One Time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              {errors.frequency && <p className="text-[var(--color-error)] text-sm mt-1">{errors.frequency}</p>}
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                <input
                  type="checkbox"
                  checked={frequencySettings.shiftSundayToMonday}
                  onChange={(e) => setFrequencySettings(prev => ({ ...prev, shiftSundayToMonday: e.target.checked }))}
                  className="rounded"
                />
                Shift Sunday planned dates to Monday
              </label>
              <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                When enabled, any step that lands on Sunday automatically moves to Monday.
              </p>
            </div>
          </div>

          {(frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') && (
            <div className="mt-4 space-y-4">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
                <input
                  type="checkbox"
                  checked={frequencySettings.includeSunday}
                  onChange={(e) => setFrequencySettings(prev => ({ ...prev, includeSunday: e.target.checked }))}
                  className="rounded"
                />
                Include Sundays in scheduling
              </label>

              {frequency === 'weekly' && (
                <div>
                  <p className="text-sm font-medium text-[var(--color-text)] mb-2">Select days of the week</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                    {[{ value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 0, label: 'Sun' }].map(day => (
                      <button
                        type="button"
                        key={day.value}
                        onClick={() => toggleWeeklyDay(day.value)}
                        className={`px-3 py-2 rounded-lg border text-sm font-semibold ${
                          frequencySettings.weeklyDays.includes(day.value)
                            ? 'bg-[var(--color-primary)] text-white border-transparent'
                            : 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)]'
                        }`}
                      >
                        {day.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {frequency === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Day of the month</label>
                  <select
                    value={frequencySettings.monthlyDay}
                    onChange={(e) => setFrequencySettings(prev => ({ ...prev, monthlyDay: parseInt(e.target.value, 10) }))}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  >
                    {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {frequency === 'yearly' && (
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Years to pre-schedule</label>
                  <select
                    value={frequencySettings.yearlyDuration}
                    onChange={(e) => setFrequencySettings(prev => ({ ...prev, yearlyDuration: parseInt(e.target.value, 10) }))}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  >
                    <option value={1}>1 year</option>
                    <option value={3}>3 years</option>
                    <option value={5}>5 years</option>
                    <option value={10}>10 years</option>
                  </select>
                </div>
              )}
            </div>
          )}
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

        {steps.map((step, index) => {
          const searchTerm = (userSearchTerms[index] || '').toLowerCase();
          const filteredUsers = users.filter((u: any) =>
            u.username.toLowerCase().includes(searchTerm) ||
            (u.email || '').toLowerCase().includes(searchTerm) ||
            (u.phoneNumber ? String(u.phoneNumber).toLowerCase().includes(searchTerm) : false)
          );

          return (
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
                <div className="mb-2">
                  <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)]">
                    <Filter size={14} />
                    <span>Search teammates</span>
                  </div>
                  <input
                    type="text"
                    value={userSearchTerms[index] || ''}
                    onChange={(e) => updateUserSearchTerm(index, e.target.value)}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] text-sm"
                    placeholder="Start typing a name, email or phone..."
                  />
                </div>
                <select
                  multiple
                  value={step.who}
                  onChange={(e) => updateStep(index, 'who', Array.from(e.target.selectedOptions, option => option.value))}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  size={4}
                >
                  {filteredUsers.map((u: any) => (
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
                  disabled={index === 0}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value="fixed">Fixed (from start date)</option>
                  <option value="dependent">Dependent (after previous step completion)</option>
                  <option value="ask-on-completion">Ask planned date after previous step completes</option>
                </select>
              </div>

              {step.whenType !== 'ask-on-completion' && (
                <>
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
                      {errors[`step${index}_when`] && <p className="text-[var(--color-error)] text-sm mt-1">{errors[`step${index}_when`]}</p>}
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
                      {errors[`step${index}_when`] && <p className="text-[var(--color-error)] text-sm mt-1">{errors[`step${index}_when`]}</p>}
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
                        {errors[`step${index}_whenDays`] && <p className="text-[var(--color-error)] text-sm mt-1">{errors[`step${index}_whenDays`]}</p>}
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
                        {errors[`step${index}_whenHours`] && <p className="text-[var(--color-error)] text-sm mt-1">{errors[`step${index}_whenHours`]}</p>}
                      </div>
                    </>
                  )}
                </>
              )}
              {step.whenType === 'ask-on-completion' && (
                <div className="md:col-span-2 p-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-background)]/60 text-sm text-[var(--color-textSecondary)]">
                  Planned date will be requested automatically when Step {index} is completed. No fixed duration needed.
                </div>
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
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={step.requireAttachments}
                    onChange={(e) => updateStep(index, 'requireAttachments', e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-[var(--color-text)]">Ask for attachments when completing this step</span>
                </label>
                {step.requireAttachments && (
                  <label className="flex items-center space-x-2 mt-2 ml-6">
                    <input
                      type="checkbox"
                      checked={step.mandatoryAttachments}
                      onChange={(e) => updateStep(index, 'mandatoryAttachments', e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-sm text-[var(--color-text)]">Make attachments mandatory for completion</span>
                  </label>
                )}
              </div>

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

              <div className="mt-4">
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                  Trigger FMS on Completion (Optional)
                </label>
                <select
                  value={step.triggersFMSId || ''}
                  onChange={(e) => updateStep(index, 'triggersFMSId', e.target.value || undefined)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value="">None</option>
                  {fmsList.map((fms) => (
                    <option key={fms._id} value={fms._id}>
                      {fms.fmsName} ({fms.fmsId})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                  Automatically start another FMS project when this step completes
                </p>
              </div>
            </div>
          </div>
        );})}

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