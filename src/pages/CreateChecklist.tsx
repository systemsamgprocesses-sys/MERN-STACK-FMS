
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
    recurrenceType: 'one-time',
    customUnit: 'days',
    customN: 1,
    startDate: new Date().toISOString().split('T')[0],
    status: 'Draft',
  });

  const [items, setItems] = useState<ChecklistItem[]>([{ title: '' }]);

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
      setTasks(response.data);
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
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const payload = {
        title: formData.title,
        parentTaskId: formData.parentTaskId || undefined,
        assignedTo: formData.assignedTo,
        recurrence: {
          type: formData.recurrenceType,
          customInterval: formData.recurrenceType === 'custom' ? {
            unit: formData.customUnit,
            n: formData.customN,
          } : undefined,
        },
        startDate: formData.startDate,
        status: formData.status,
        items: items.filter(item => item.title.trim()).map(item => ({ title: item.title })),
      };

      await axios.post(`${address}/api/checklists`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      navigate('/checklists');
    } catch (error: any) {
      console.error('Error creating checklist:', error);
      alert(error.response?.data?.error || 'Failed to create checklist');
    } finally {
      setLoading(false);
    }
  };

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
