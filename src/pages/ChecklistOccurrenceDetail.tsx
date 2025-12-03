import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, ArrowLeft, Save, CheckCircle2, AlertCircle, X, FileText, ClipboardList } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface ChecklistItem {
  _id?: string;
  label: string;
  description?: string;
  checked: boolean;
  checkedAt?: string;
  remarks?: string;
  status?: 'done' | 'not-done' | 'pending';
  notDoneReason?: string;
  actionTaken?: {
    type: 'complaint' | 'task' | 'none';
    complaintId?: string;
    taskId?: string;
    description?: string;
  };
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
  triggeredFMS?: {
    projectId: string;
    projectName: string;
    triggeredAt: string;
  };
}

interface NotDoneModalData {
  itemIndex: number;
  itemLabel: string;
  reason: string;
  actionType: 'complaint' | 'task' | 'none';
  actionDescription: string;
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
  const [showNotDoneModal, setShowNotDoneModal] = useState(false);
  const [notDoneData, setNotDoneData] = useState<NotDoneModalData | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  const handleItemDone = async (itemIndex: number) => {
    if (!occurrence) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const response = await axios.patch(
        `${address}/api/checklist-occurrences/${id}/items/${itemIndex}`,
        { status: 'done' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOccurrence(response.data);
      setSuccess('Item marked as done');
      setTimeout(() => setSuccess(''), 2000);
    } catch (error) {
      console.error('Error updating item:', error);
      setError('Failed to update item');
    } finally {
      setSaving(false);
    }
  };

  const handleItemNotDone = (itemIndex: number) => {
    if (!occurrence) return;
    const item = occurrence.items[itemIndex];
    setNotDoneData({
      itemIndex,
      itemLabel: item.label,
      reason: item.notDoneReason || '',
      actionType: item.actionTaken?.type || 'none',
      actionDescription: item.actionTaken?.description || ''
    });
    setShowNotDoneModal(true);
  };

  const handleSaveNotDone = async () => {
    if (!occurrence || !notDoneData) return;

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      
      // Prepare action taken data
      let actionTaken: any = { type: notDoneData.actionType };
      if (notDoneData.actionType !== 'none') {
        actionTaken.description = notDoneData.actionDescription;
      }

      // If creating complaint or task, do that first
      if (notDoneData.actionType === 'complaint' && notDoneData.actionDescription) {
        try {
          const complaintResponse = await axios.post(
            `${address}/api/help-tickets`,
            {
              title: `Checklist Item Not Done: ${notDoneData.itemLabel}`,
              description: `Reason: ${notDoneData.reason}\n\nAction: ${notDoneData.actionDescription}\n\nRelated to checklist: ${occurrence.templateName}`,
              priority: 'medium',
              raisedBy: user?.id
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          actionTaken.complaintId = complaintResponse.data._id;
        } catch (err) {
          console.error('Error creating complaint:', err);
          setError('Failed to create complaint, but item status will be updated');
        }
      } else if (notDoneData.actionType === 'task' && notDoneData.actionDescription) {
        try {
          const taskResponse = await axios.post(
            `${address}/api/tasks`,
            {
              title: `Checklist Item Not Done: ${notDoneData.itemLabel}`,
              description: `Reason: ${notDoneData.reason}\n\nAction: ${notDoneData.actionDescription}\n\nRelated to checklist: ${occurrence.templateName}`,
              taskType: 'one-time',
              assignedBy: user?.id,
              assignedTo: occurrence.assignedTo._id,
              dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
              priority: 'normal'
            },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          actionTaken.taskId = taskResponse.data.tasks?.[0]?._id || taskResponse.data._id;
        } catch (err) {
          console.error('Error creating task:', err);
          setError('Failed to create task, but item status will be updated');
        }
      }

      // Update item status
      const response = await axios.patch(
        `${address}/api/checklist-occurrences/${id}/items/${notDoneData.itemIndex}`,
        {
          status: 'not-done',
          notDoneReason: notDoneData.reason,
          actionTaken
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOccurrence(response.data);
      setShowNotDoneModal(false);
      setNotDoneData(null);
      setSuccess('Item marked as not done and action recorded');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error: any) {
      console.error('Error updating item:', error);
      setError(error.response?.data?.message || 'Failed to update item');
    } finally {
      setSaving(false);
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

  const handleSubmitChecklist = async () => {
    if (!occurrence || !user) return;

    if (!window.confirm('Submit this checklist? This will record the current progress and trigger any configured FMS.')) {
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${address}/api/checklist-occurrences/${id}/submit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setOccurrence(response.data.occurrence);
      
      let message = 'Checklist submitted successfully!';
      if (response.data.triggeredFMS) {
        message += `\n\nFMS project "${response.data.triggeredFMS.projectName}" (${response.data.triggeredFMS.projectId}) has been automatically started from this checklist.`;
      }
      
      setSuccess(message);
      
      // Note: Cache will be invalidated automatically on next calendar refresh
      
      setTimeout(() => {
        navigate('/checklist-calendar');
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting checklist:', error);
      setError(error.response?.data?.error || 'Failed to submit checklist');
    } finally {
      setSubmitting(false);
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

  const doneCount = occurrence.items.filter(item => item.status === 'done' || (item.checked && item.status !== 'not-done')).length;
  const notDoneCount = occurrence.items.filter(item => item.status === 'not-done').length;
  const pendingCount = occurrence.items.length - doneCount - notDoneCount;

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
            {occurrence.triggeredFMS && (
              <div className="mt-2 p-3 rounded-lg flex items-center gap-2" style={{ backgroundColor: 'var(--color-primary-light)', border: '1px solid var(--color-primary)' }}>
                <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                    FMS Project Started
                  </p>
                  <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                    {occurrence.triggeredFMS.projectName} was automatically started from this checklist
                  </p>
                </div>
              </div>
            )}
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
            {doneCount} done, {notDoneCount} not done, {pendingCount} pending ({occurrence.progressPercentage}%)
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
        {occurrence.items.map((item, index) => {
          const isDone = item.status === 'done' || (item.checked && item.status !== 'not-done');
          const isNotDone = item.status === 'not-done';
          
          return (
            <div
              key={index}
              className="p-4 rounded-lg border-2 transition-all"
              style={{
                backgroundColor: 'var(--color-surface)',
                borderColor: isDone 
                  ? 'var(--color-success)' 
                  : isNotDone 
                    ? 'var(--color-danger)' 
                    : 'var(--color-border)'
              }}
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className="font-bold text-lg px-3 py-1 rounded"
                      style={{
                        backgroundColor: isDone 
                          ? 'var(--color-success)' 
                          : isNotDone 
                            ? 'var(--color-danger)' 
                            : 'var(--color-primary)',
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
                    {isDone && (
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-success-light)', color: 'var(--color-success)' }}>
                        Done
                      </span>
                    )}
                    {isNotDone && (
                      <span className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                        Not Done
                      </span>
                    )}
                  </div>

                  {isNotDone && item.notDoneReason && (
                    <div className="mt-2 p-3 rounded" style={{ backgroundColor: 'var(--color-danger-light)' }}>
                      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-danger)' }}>
                        Reason:
                      </p>
                      <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                        {item.notDoneReason}
                      </p>
                      {item.actionTaken && item.actionTaken.type !== 'none' && (
                        <div className="mt-2">
                          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-danger)' }}>
                            Action Taken: {item.actionTaken.type === 'complaint' ? 'Complaint Raised' : 'Task Created'}
                          </p>
                          {item.actionTaken.description && (
                            <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                              {item.actionTaken.description}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}

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

                  {occurrence.status !== 'completed' && !isDone && !isNotDone && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => handleItemDone(index)}
                        disabled={saving}
                        className="px-4 py-2 rounded flex items-center gap-2"
                        style={{ backgroundColor: 'var(--color-success)', color: 'white' }}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark as Done
                      </button>
                      <button
                        onClick={() => handleItemNotDone(index)}
                        disabled={saving}
                        className="px-4 py-2 rounded flex items-center gap-2"
                        style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}
                      >
                        <AlertCircle className="w-4 h-4" />
                        Mark as Not Done
                      </button>
                    </div>
                  )}

                  {item.checkedAt && (
                    <p className="text-xs mt-2" style={{ color: 'var(--color-textSecondary)' }}>
                      Checked at: {new Date(item.checkedAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Not Done Modal */}
      {showNotDoneModal && notDoneData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4" style={{ backgroundColor: 'var(--color-surface)' }}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                Mark Item as Not Done
              </h2>
              <button
                onClick={() => {
                  setShowNotDoneModal(false);
                  setNotDoneData(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-sm mb-2" style={{ color: 'var(--color-textSecondary)' }}>
                Item: <strong>{notDoneData.itemLabel}</strong>
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                Reason for not completing this item *
              </label>
              <textarea
                value={notDoneData.reason}
                onChange={(e) => setNotDoneData({ ...notDoneData, reason: e.target.value })}
                placeholder="Please provide a reason why this item could not be completed..."
                className="w-full px-3 py-2 rounded border"
                rows={4}
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border)'
                }}
                required
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text)' }}>
                What action have you taken? *
              </label>
              <select
                value={notDoneData.actionType}
                onChange={(e) => setNotDoneData({ ...notDoneData, actionType: e.target.value as any })}
                className="w-full px-3 py-2 rounded border mb-2"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border)'
                }}
              >
                <option value="none">No action taken</option>
                <option value="complaint">Raised a complaint</option>
                <option value="task">Created a task</option>
              </select>

              {(notDoneData.actionType === 'complaint' || notDoneData.actionType === 'task') && (
                <textarea
                  value={notDoneData.actionDescription}
                  onChange={(e) => setNotDoneData({ ...notDoneData, actionDescription: e.target.value })}
                  placeholder={`Describe the ${notDoneData.actionType === 'complaint' ? 'complaint' : 'task'} you ${notDoneData.actionType === 'complaint' ? 'raised' : 'created'}...`}
                  className="w-full px-3 py-2 rounded border mt-2"
                  rows={3}
                  style={{
                    backgroundColor: 'var(--color-background)',
                    color: 'var(--color-text)',
                    borderColor: 'var(--color-border)'
                  }}
                  required
                />
              )}
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowNotDoneModal(false);
                  setNotDoneData(null);
                }}
                className="px-4 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--color-background)',
                  color: 'var(--color-text)',
                  borderColor: 'var(--color-border)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNotDone}
                disabled={saving || !notDoneData.reason.trim() || (notDoneData.actionType !== 'none' && !notDoneData.actionDescription.trim())}
                className="px-4 py-2 rounded flex items-center gap-2"
                style={{ backgroundColor: 'var(--color-danger)', color: 'white' }}
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

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
          <button
            onClick={handleSubmitChecklist}
            disabled={submitting}
            className="px-6 py-3 rounded-lg flex items-center gap-2 text-lg font-semibold"
            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
          >
            <CheckCircle2 className="w-6 h-6" />
            {submitting ? 'Submitting...' : 'Submit Checklist'}
          </button>
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
