import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Calendar, Plus, X, Save, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface ChecklistItem {
  label: string;
  description: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
}

const ChecklistTemplateForm: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    category: 'General',
    frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
    startDate: '',
    endDate: '',
    assignedTo: '',
    weeklyDays: [] as number[],
    monthlyDates: [] as number[],
  });

  const [items, setItems] = useState<ChecklistItem[]>([
    { label: 'A', description: '' }
  ]);

  const [users, setUsers] = useState<User[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchUsers();
    fetchCategories();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users. Please refresh the page.');
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/checklist-categories/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.success && Array.isArray(response.data.categories)) {
        setCategories(response.data.categories.map((cat: any) => cat.name));
      } else {
        setCategories(['General']);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Use default category if fetch fails
      setCategories(['General']);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const addItem = () => {
    const nextLabel = String.fromCharCode(65 + items.length); // A, B, C, etc.
    setItems([...items, { label: nextLabel, description: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof ChecklistItem, value: string) => {
    const updated = [...items];
    updated[index][field] = value;
    setItems(updated);
  };

  const toggleWeeklyDay = (day: number) => {
    setFormData(prev => {
      const weeklyDays = prev.weeklyDays.includes(day)
        ? prev.weeklyDays.filter(d => d !== day)
        : [...prev.weeklyDays, day].sort();
      return { ...prev, weeklyDays };
    });
  };

  const toggleMonthlyDate = (date: number) => {
    setFormData(prev => {
      const monthlyDates = prev.monthlyDates.includes(date)
        ? prev.monthlyDates.filter(d => d !== date)
        : [...prev.monthlyDates, date].sort((a, b) => a - b);
      return { ...prev, monthlyDates };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!formData.name.trim()) {
      setError('Please enter a template name');
      return;
    }

    if (!formData.assignedTo) {
      setError('Please select a user to assign');
      return;
    }

    if (!formData.startDate || !formData.endDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      setError('Start date must be before or equal to end date');
      return;
    }

    if (formData.frequency === 'weekly' && formData.weeklyDays.length === 0) {
      setError('Please select at least one weekday for weekly frequency');
      return;
    }

    if (formData.frequency === 'monthly' && formData.monthlyDates.length === 0) {
      setError('Please select at least one date for monthly frequency');
      return;
    }

    if (items.length === 0) {
      setError('Please add at least one checklist item');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        name: formData.name,
        category: formData.category,
        items: items,
        frequency: formData.frequency,
        dateRange: {
          startDate: formData.startDate,
          endDate: formData.endDate
        },
        assignedTo: formData.assignedTo,
        createdBy: user?.id,
        weeklyDays: formData.frequency === 'weekly' ? formData.weeklyDays : undefined,
        monthlyDates: formData.frequency === 'monthly' ? formData.monthlyDates : undefined,
      };

      console.log('Payload being sent:', payload);

      const token = localStorage.getItem('token');
      const response = await axios.post(`${address}/api/checklist-templates`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Template created successfully! Generated ${response.data.occurrenceCount} checklist occurrences.`);

      setTimeout(() => {
        navigate('/checklist-calendar');
      }, 2000);
    } catch (error: any) {
      console.error('Error creating template:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || 'Failed to create template';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const weekDays = [
    { value: 0, label: 'Sun' },
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <Calendar className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
          Create Checklist Template
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-textSecondary)' }}>
          Create a checklist template that will automatically generate checklist occurrences based on frequency and date range.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Basic Information
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Template Name *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Gate Opening"
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border)'
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Category *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border)'
                }}
              >
                {categories.length === 0 ? (
                  <option value="General">General</option>
                ) : (
                  categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Assigned To *
              </label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <option value="">Select a user</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.username} ({u.email})
                  </option>
                ))}
              </select>
              {users.length === 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--color-danger)' }}>
                  No users available. Please refresh the page.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Checklist Items */}
        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
              Checklist Items
            </h2>
            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-1 px-3 py-1 rounded text-sm"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="w-16">
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(index, 'label', e.target.value)}
                    placeholder="A"
                    className="w-full px-2 py-2 rounded border text-center font-semibold"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                  />
                </div>
                <div className="flex-1">
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 rounded border"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      color: 'var(--color-text)',
                      borderColor: 'var(--color-border)'
                    }}
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(index)}
                    className="p-2 rounded hover:bg-red-100"
                    style={{ color: 'var(--color-danger)' }}
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Frequency & Date Range */}
        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
          <h2 className="text-xl font-semibold mb-4" style={{ color: 'var(--color-text)' }}>
            Frequency & Date Range
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                Frequency *
              </label>
              <select
                name="frequency"
                value={formData.frequency}
                onChange={handleInputChange}
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>

            {formData.frequency === 'weekly' && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  Select Weekdays *
                </label>
                <div className="flex gap-2 flex-wrap">
                  {weekDays.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleWeeklyDay(day.value)}
                      className="px-4 py-2 rounded border"
                      style={{
                        backgroundColor: formData.weeklyDays.includes(day.value)
                          ? 'var(--color-primary)'
                          : 'var(--color-background)',
                        color: formData.weeklyDays.includes(day.value)
                          ? 'white'
                          : 'var(--color-text)',
                        borderColor: formData.weeklyDays.includes(day.value)
                          ? 'var(--color-primary)'
                          : 'var(--color-border)'
                      }}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {formData.frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                  Select Dates *
                </label>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(date => (
                    <button
                      key={date}
                      type="button"
                      onClick={() => toggleMonthlyDate(date)}
                      className="px-2 py-2 rounded border text-center"
                      style={{
                        backgroundColor: formData.monthlyDates.includes(date)
                          ? 'var(--color-primary)'
                          : 'var(--color-background)',
                        color: formData.monthlyDates.includes(date)
                          ? 'white'
                          : 'var(--color-text)',
                        borderColor: formData.monthlyDates.includes(date)
                          ? 'var(--color-primary)'
                          : 'var(--color-border)'
                      }}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  Start Date *
                </label>
                <input
                  type="date"
                  name="startDate"
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    borderColor: 'var(--color-border)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
                  End Date *
                </label>
                <input
                  type="date"
                  name="endDate"
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded border"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    borderColor: 'var(--color-border)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="p-4 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            {success}
          </div>
        )}

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/checklist-calendar')}
            className="px-6 py-2 rounded border"
            style={{
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text)',
              borderColor: 'var(--color-border)'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 rounded flex items-center gap-2"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <Save className="w-5 h-5" />
            {loading ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChecklistTemplateForm;

