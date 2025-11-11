
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckSquare, Check, Send, Archive, Edit } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface ChecklistItem {
  _id: string;
  title: string;
  isDone: boolean;
  remarks?: string;
  doneAt?: string;
}

interface Checklist {
  _id: string;
  title: string;
  assignedTo: { _id: string; username: string };
  createdBy: { _id: string; username: string };
  parentTaskId?: { _id: string; title: string };
  recurrence: {
    type: string;
    customInterval?: { unit: string; n: number };
  };
  status: string;
  startDate: string;
  nextRunDate?: string;
  items: ChecklistItem[];
}

const ChecklistDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchChecklist();
  }, [id]);

  const fetchChecklist = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/checklists/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChecklist(response.data);
    } catch (error) {
      console.error('Error fetching checklist:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (itemId: string, isDone: boolean) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${address}/api/checklists/${id}/items/${itemId}`,
        { isDone: !isDone },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchChecklist();
    } catch (error) {
      console.error('Error updating item:', error);
    }
  };

  const submitChecklist = async () => {
    if (!window.confirm('Submit this checklist? This will record the current progress.')) return;
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${address}/api/checklists/${id}/submit`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchChecklist();
      alert('Checklist submitted successfully!');
    } catch (error: any) {
      console.error('Error submitting checklist:', error);
      alert(error.response?.data?.error || 'Failed to submit checklist');
    } finally {
      setSubmitting(false);
    }
  };

  const archiveChecklist = async () => {
    if (!window.confirm('Archive this checklist?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.patch(
        `${address}/api/checklists/${id}`,
        { status: 'Archived' },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigate('/checklists');
    } catch (error) {
      console.error('Error archiving checklist:', error);
    }
  };

  const getProgressPercentage = () => {
    if (!checklist || !checklist.items.length) return 0;
    const completed = checklist.items.filter(item => item.isDone).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[--color-background] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
      </div>
    );
  }

  if (!checklist) {
    return (
      <div className="min-h-screen bg-[--color-background] flex items-center justify-center">
        <p className="text-[--color-textSecondary]">Checklist not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--color-background] p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
            <CheckSquare className="text-[--color-primary]" />
            {checklist.title}
          </h1>
          <div className="flex items-center gap-4 mt-3 text-sm text-[--color-textSecondary]">
            <span>Assigned to: {checklist.assignedTo.username}</span>
            <span>•</span>
            <span>Created by: {checklist.createdBy.username}</span>
            <span>•</span>
            <span className={`px-2 py-1 rounded-full ${
              checklist.status === 'Active' ? 'bg-green-100 text-green-800' :
              checklist.status === 'Submitted' ? 'bg-blue-100 text-blue-800' :
              checklist.status === 'Draft' ? 'bg-gray-100 text-gray-800' :
              'bg-red-100 text-red-800'
            }`}>
              {checklist.status}
            </span>
          </div>
        </div>

        {/* Progress */}
        <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border] mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[--color-text]">Progress</span>
            <span className="text-sm font-medium text-[--color-text]">{getProgressPercentage()}%</span>
          </div>
          <div className="w-full bg-[--color-border] rounded-full h-3">
            <div
              className="bg-[--color-primary] h-3 rounded-full transition-all"
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>
          <p className="text-sm text-[--color-textSecondary] mt-2">
            {checklist.items.filter(i => i.isDone).length} of {checklist.items.length} items completed
          </p>
        </div>

        {/* Items */}
        <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border] mb-6">
          <h2 className="text-xl font-semibold text-[--color-text] mb-4">Items</h2>
          <div className="space-y-3">
            {checklist.items.map((item) => (
              <div
                key={item._id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-[--color-background] transition-colors"
              >
                <button
                  onClick={() => toggleItem(item._id, item.isDone)}
                  className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                    item.isDone
                      ? 'bg-[--color-primary] border-[--color-primary]'
                      : 'border-[--color-border] hover:border-[--color-primary]'
                  }`}
                >
                  {item.isDone && <Check size={16} className="text-white" />}
                </button>
                <div className="flex-1">
                  <p className={`text-[--color-text] ${item.isDone ? 'line-through text-[--color-textSecondary]' : ''}`}>
                    {item.title}
                  </p>
                  {item.isDone && item.doneAt && (
                    <p className="text-xs text-[--color-textSecondary] mt-1">
                      Completed on {new Date(item.doneAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/checklists')}
            className="flex-1 px-6 py-3 border border-[--color-border] text-[--color-text] rounded-lg hover:bg-[--color-border] transition-colors"
          >
            Back to List
          </button>
          {checklist.status === 'Active' && (
            <>
              <button
                onClick={submitChecklist}
                disabled={submitting}
                className="flex-1 px-6 py-3 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                {submitting ? 'Submitting...' : 'Submit Checklist'}
              </button>
              <button
                onClick={archiveChecklist}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 flex items-center gap-2"
              >
                <Archive size={18} />
                Archive
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChecklistDetail;
