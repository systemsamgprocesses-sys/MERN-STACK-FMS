
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Plus, Trash2, Save } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface ChecklistItem {
  title: string;
  parentId?: string;
}

const CreateChecklist: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [users, setUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    parentTaskId: '',
    assignedTo: '',
    category: 'custom',
    recurrenceType: 'one-time',
    customUnit: 'days',
    customN: 1,
    startDate: new Date().toISOString().split('T')[0],
    status: 'Draft',
  });

  const [items, setItems] = useState<ChecklistItem[]>([{ title: '' }]);

  const canCreateChecklist =
    user?.role === 'superadmin' ||
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    user?.permissions?.canCreateChecklists;

  useEffect(() => {
    fetchUsers();
    fetchTasks();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // API returns { tasks, totalPages, currentPage, total }
      setTasks(response.data.tasks || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const addItem = () => {
    setItems([...items, { title: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, title: string) => {
    const newItems = [...items];
    newItems[index].title = title;
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      alert('Please enter a checklist title');
      return;
    }
    
    if (!formData.assignedTo) {
      alert('Please select who to assign this checklist to');
      return;
    }
    
    const filteredItems = items.filter(item => item.title.trim());
    if (filteredItems.length === 0) {
      alert('Please add at least one checklist item');
      return;
    }
    
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        title: formData.title.trim(),
        createdBy: user?.id,
        parentTaskId: formData.parentTaskId || undefined,
        assignedTo: formData.assignedTo,
        category: formData.category,
        recurrence: {
          type: formData.recurrenceType,
          customInterval: formData.recurrenceType === 'custom' ? {
            unit: formData.customUnit,
            n: formData.customN,
          } : undefined,
        },
        startDate: new Date(formData.startDate).toISOString(),
        status: formData.status,
        items: filteredItems.map(item => ({ title: item.title.trim() })),
      };

      const response = await axios.post(`${address}/api/checklists`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.data) {
        alert('Checklist created successfully!');
        navigate('/checklists');
      }
    } catch (error: any) {
      console.error('Error creating checklist:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to create checklist';
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (!canCreateChecklist) {
    return (
      <div className="min-h-screen bg-[--color-background] p-6 flex items-center justify-center">
        <div className="max-w-md text-center bg-[--color-surface] border border-[--color-border] rounded-xl p-8">
          <h2 className="text-2xl font-semibold text-[--color-text] mb-4">Access Restricted</h2>
          <p className="text-[--color-textSecondary]">
            You do not have permission to create checklists. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--color-background] p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
            <CheckSquare className="text-[--color-primary]" />
            Create Checklist
          </h1>
          <p className="text-[--color-textSecondary] mt-1">Create a new checklist with items</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
          <div className="space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                placeholder="Enter checklist title"
              />
            </div>

            {/* Assigned To */}
            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-2">
                Assigned To <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.assignedTo}
                onChange={(e) => setFormData({ ...formData, assignedTo: e.target.value })}
                required
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
              >
                <option value="">Select user</option>
                {users.map(u => (
                  <option key={u._id} value={u._id}>{u.username}</option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-2">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                required
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
                <option value="maintenance">Maintenance</option>
                <option value="compliance">Compliance</option>
                <option value="training">Training</option>
                <option value="audit">Audit</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Parent Task (Optional) */}
            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-2">
                Attach to Task (Optional)
              </label>
              <select
                value={formData.parentTaskId}
                onChange={(e) => setFormData({ ...formData, parentTaskId: e.target.value })}
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
              >
                <option value="">None</option>
                {tasks.map(task => (
                  <option key={task._id} value={task._id}>{task.title}</option>
                ))}
              </select>
            </div>

            {/* Recurrence */}
            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-2">
                Recurrence <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.recurrenceType}
                onChange={(e) => setFormData({ ...formData, recurrenceType: e.target.value })}
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
              >
                <option value="one-time">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="fortnightly">Fortnightly</option>
                <option value="monthly">Monthly</option>
                <option value="custom">Custom</option>
              </select>
            </div>

            {/* Custom Recurrence */}
            {formData.recurrenceType === 'custom' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-[--color-text] mb-2">Every</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.customN}
                    onChange={(e) => setFormData({ ...formData, customN: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[--color-text] mb-2">Unit</label>
                  <select
                    value={formData.customUnit}
                    onChange={(e) => setFormData({ ...formData, customUnit: e.target.value })}
                    className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                  >
                    <option value="days">Days</option>
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                  </select>
                </div>
              </div>
            )}

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-2">
                Start Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
              />
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
              >
                <option value="Draft">Draft</option>
                <option value="Active">Active</option>
              </select>
            </div>

            {/* Checklist Items */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-[--color-text]">
                  Checklist Items <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="px-3 py-1 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] flex items-center gap-2 text-sm"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>
              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="flex gap-2">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem(index, e.target.value)}
                      placeholder={`Item ${index + 1}`}
                      className="flex-1 px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                    />
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate('/checklists')}
                className="flex-1 px-6 py-3 border border-[--color-border] text-[--color-text] rounded-lg hover:bg-[--color-border] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                {loading ? 'Creating...' : 'Create Checklist'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateChecklist;
