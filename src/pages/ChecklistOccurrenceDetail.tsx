import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, ArrowLeft, Save, CheckCircle2, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface ChecklistItem {
  label: string;
  description?: string;
  checked: boolean;
  checkedAt?: string;
  remarks?: string;
}

interface ChecklistOccurrence {
  _id: string;
  templateName: string;
  dueDate: string;
  assignedTo: {
    _id: string;
    username: string;
    email: string;
  };
  items: ChecklistItem[];
  status: 'pending' | 'completed';
  completedAt?: string;
  progressPercentage: number;
}

const ChecklistOccurrenceDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [occurrence, setOccurrence] = useState<ChecklistOccurrence | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchOccurrence();
  }, [id]);

  const fetchOccurrence = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/checklist-occurrences/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setOccurrence(response.data);
    } catch (error) {
      console.error('Error fetching occurrence:', error);
      setError('Failed to load checklist');
    } finally {
      setLoading(false);
    }
  };

  const handleItemToggle = async (itemIndex: number) => {
    if (!occurrence) return;

    const updatedItems = [...occurrence.items];
    updatedItems[itemIndex].checked = !updatedItems[itemIndex].checked;

    // Optimistically update UI
    setOccurrence({ ...occurrence, items: updatedItems });

    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${address}/api/checklist-occurrences/${id}/items/${itemIndex}`,
        { checked: updatedItems[itemIndex].checked },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOccurrence(response.data);
      
      // Show success if all items are now completed
      if (response.data.status === 'completed') {
        setSuccess('Checklist completed! All items checked.');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      setError('Failed to update item');
      // Revert optimistic update
      fetchOccurrence();
    }
  };

  const handleRemarksChange = (itemIndex: number, remarks: string) => {
    if (!occurrence) return;
    
    const updatedItems = [...occurrence.items];
    updatedItems[itemIndex].remarks = remarks;
    setOccurrence({ ...occurrence, items: updatedItems });
  };

  const handleSaveRemarks = async (itemIndex: number) => {
    if (!occurrence) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${address}/api/checklist-occurrences/${id}/items/${itemIndex}`,
        { remarks: occurrence.items[itemIndex].remarks },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOccurrence(response.data);
      setSuccess('Remarks saved successfully');
      
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      console.error('Error saving remarks:', error);
      setError('Failed to save remarks');
    } finally {
      setSaving(false);
    }
  };

  const handleCompleteChecklist = async () => {
    if (!occurrence || !user) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${address}/api/checklist-occurrences/${id}/complete`,
        { userId: user.id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOccurrence(response.data);
      setSuccess('Checklist marked as completed!');
      
      setTimeout(() => {
        navigate('/checklist-calendar');
      }, 1500);
    } catch (error) {
      console.error('Error completing checklist:', error);
      setError('Failed to complete checklist');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
          <p style={{ color: 'var(--color-textSecondary)' }}>Loading checklist...</p>
        </div>
      </div>
    );
  }

  if (!occurrence) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-danger)' }} />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--color-text)' }}>
            Checklist Not Found
          </h2>
          <button
            onClick={() => navigate('/checklist-calendar')}
            className="mt-4 px-6 py-2 rounded"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            Back to Calendar
          </button>
        </div>
      </div>
    );
  }

  const allItemsChecked = occurrence.items.every(item => item.checked);
  const checkedCount = occurrence.items.filter(item => item.checked).length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/checklist-calendar')}
          className="flex items-center gap-2 mb-4 hover:underline"
          style={{ color: 'var(--color-primary)' }}
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Calendar
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
              <CheckSquare className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
              {occurrence.templateName}
            </h1>
            <p className="mt-2" style={{ color: 'var(--color-textSecondary)' }}>
              Due: {new Date(occurrence.dueDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {occurrence.status === 'completed' && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
              <CheckCircle2 className="w-5 h-5" />
              <span className="font-semibold">Completed</span>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex justify-between items-center mb-2">
          <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
            Progress
          </span>
          <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
            {checkedCount} / {occurrence.items.length} items completed ({occurrence.progressPercentage}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="h-3 rounded-full transition-all"
            style={{
              width: `${occurrence.progressPercentage}%`,
              backgroundColor: occurrence.status === 'completed'
                ? 'var(--color-success)'
                : 'var(--color-primary)'
            }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-4 mb-6">
        {occurrence.items.map((item, index) => (
          <div
            key={index}
            className="p-4 rounded-lg border-2 transition-all"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: item.checked ? 'var(--color-success)' : 'var(--color-border)'
            }}
          >
            <div className="flex items-start gap-3">
              <button
                onClick={() => handleItemToggle(index)}
                disabled={occurrence.status === 'completed'}
                className="flex-shrink-0 mt-1"
              >
                {item.checked ? (
                  <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
                ) : (
                  <div
                    className="w-6 h-6 rounded border-2 hover:border-gray-400"
                    style={{ borderColor: 'var(--color-border)' }}
                  />
                )}
              </button>

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span
                    className="font-bold text-lg px-3 py-1 rounded"
                    style={{
                      backgroundColor: 'var(--color-primary)',
                      color: 'white'
                    }}
                  >
                    {item.label}
                  </span>
                  {item.description && (
                    <span style={{ color: 'var(--color-text)' }}>
                      {item.description}
                    </span>
                  )}
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                    Remarks (optional)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={item.remarks || ''}
                      onChange={(e) => handleRemarksChange(index, e.target.value)}
                      disabled={occurrence.status === 'completed'}
                      placeholder="Add any notes or remarks..."
                      className="flex-1 px-3 py-2 rounded border"
                      style={{
                        backgroundColor: 'var(--color-background)',
                        color: 'var(--color-text)',
                        borderColor: 'var(--color-border)'
                      }}
                    />
                    {occurrence.status !== 'completed' && (
                      <button
                        onClick={() => handleSaveRemarks(index)}
                        disabled={saving}
                        className="px-4 py-2 rounded flex items-center gap-2"
                        style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                      >
                        <Save className="w-4 h-4" />
                        Save
                      </button>
                    )}
                  </div>
                </div>

                {item.checkedAt && (
                  <p className="text-xs mt-2" style={{ color: 'var(--color-textSecondary)' }}>
                    Checked at: {new Date(item.checkedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-4 rounded-lg flex items-start gap-2" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-4 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
          <CheckCircle2 className="w-5 h-5" />
          <span>{success}</span>
        </div>
      )}

      {/* Action Buttons */}
      {occurrence.status !== 'completed' && (
        <div className="flex justify-end gap-3">
          {allItemsChecked ? (
            <button
              onClick={handleCompleteChecklist}
              disabled={saving}
              className="px-6 py-3 rounded-lg flex items-center gap-2 text-lg font-semibold"
              style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
            >
              <CheckCircle2 className="w-6 h-6" />
              {saving ? 'Completing...' : 'Mark as Complete'}
            </button>
          ) : (
            <div className="text-center py-2 px-4 rounded" style={{ backgroundColor: 'var(--color-warning-light)', color: 'var(--color-warning)' }}>
              Complete all items to finish this checklist
            </div>
          )}
        </div>
      )}

      {occurrence.status === 'completed' && occurrence.completedAt && (
        <div className="text-center py-4 px-6 rounded-lg" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
          <CheckCircle2 className="w-12 h-12 mx-auto mb-2" />
          <p className="font-semibold text-lg">Checklist Completed!</p>
          <p className="text-sm mt-1">
            Completed on: {new Date(occurrence.completedAt).toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );
};

export default ChecklistOccurrenceDetail;

