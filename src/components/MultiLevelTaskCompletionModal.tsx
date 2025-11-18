import React, { useState, useEffect } from 'react';
import { CheckSquare, Paperclip, X, Upload, File, ArrowRight, User } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { toast } from 'react-toastify';
import { useAuth } from '../contexts/AuthContext';

interface MultiLevelTaskCompletionModalProps {
  taskId: string;
  task: any;
  onClose: () => void;
  onComplete: () => void;
  isDark?: boolean;
}

const MultiLevelTaskCompletionModal: React.FC<MultiLevelTaskCompletionModalProps> = ({
  taskId,
  task,
  onClose,
  onComplete,
  isDark = false,
}) => {
  const { user } = useAuth();
  const [completionType, setCompletionType] = useState<'complete' | 'forward'>('complete');
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Forward-specific states
  const [forwardTo, setForwardTo] = useState('');
  const [forwardDate, setForwardDate] = useState('');
  const [forwardRemarks, setForwardRemarks] = useState('');
  const [users, setUsers] = useState<Array<{ _id: string; username: string; email: string }>>([]);
  
  // Checklist state
  const [checklistItems, setChecklistItems] = useState(
    task.requiresChecklist && task.checklistItems 
      ? task.checklistItems.map((item: any) => ({ ...item }))
      : []
  );

  const [errors, setErrors] = useState<{ 
    remarks?: string; 
    attachments?: string; 
    forwardTo?: string;
    forwardDate?: string;
    checklist?: string;
  }>({});

  useEffect(() => {
    fetchUsers();
  }, []);

  // Update checklist when task prop changes
  useEffect(() => {
    if (task.requiresChecklist && task.checklistItems && Array.isArray(task.checklistItems)) {
      setChecklistItems(task.checklistItems.map((item: any) => ({ ...item })));
    } else {
      setChecklistItems([]);
    }
    // Reset completion type when task changes
    setCompletionType('complete');
    setForwardTo('');
    setForwardDate('');
    setForwardRemarks('');
    setCompletionRemarks('');
    setAttachments([]);
    setErrors({});
  }, [task]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      // Filter out current user
      setUsers(response.data.filter((u: any) => u._id !== user?.id));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setAttachments(prev => [...prev, ...files]);
      setErrors(prev => ({ ...prev, attachments: '' }));
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: File[]): Promise<any[]> => {
    if (files.length === 0) return [];

    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.post(`${address}/api/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.files;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw new Error('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: any = {};

    // Validate checklist if required
    if (task.requiresChecklist && checklistItems.length > 0 && completionType === 'complete') {
      const allCompleted = checklistItems.every((item: any) => item.completed);
      if (!allCompleted) {
        newErrors.checklist = 'Please complete all checklist items before marking as complete';
      }
    }

    if (completionType === 'forward') {
      if (!forwardTo) {
        newErrors.forwardTo = 'Please select a user to forward this task to';
      }
      if (!forwardDate) {
        newErrors.forwardDate = 'Please select a due date for the forwarded task';
      }
      if (!forwardRemarks.trim()) {
        newErrors.remarks = 'Please provide remarks for forwarding';
      }
    } else {
      // Complete validation
      if (task.mandatoryAttachments && attachments.length === 0) {
        newErrors.attachments = 'At least one attachment is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setSubmitting(true);
    try {
      let uploadedAttachments: any[] = [];

      if (attachments.length > 0) {
        uploadedAttachments = await uploadFiles(attachments);
      }

      if (completionType === 'forward') {
        // Forward the task
        const response = await axios.post(
          `${address}/api/tasks/${taskId}/forward`,
          {
            forwardTo,
            remarks: forwardRemarks,
            dueDate: forwardDate,
            checklistItems: task.requiresChecklist ? checklistItems : undefined
          }
        );

        if (response.data) {
          toast.success('Task forwarded successfully!', { theme: isDark ? 'dark' : 'light' });
          onComplete();
          onClose();
        }
      } else {
        // Complete the task
        const completionData: any = {
          status: 'completed',
          completionRemarks: completionRemarks.trim(),
          completedBy: user?.id,
          completedAt: new Date().toISOString(),
        };

        if (uploadedAttachments.length > 0) {
          completionData.completionAttachments = uploadedAttachments;
        }

        if (task.requiresChecklist && checklistItems.length > 0) {
          completionData.checklistItems = checklistItems;
        }

        const response = await axios.put(
          `${address}/api/tasks/${taskId}`,
          completionData
        );

        if (response.data) {
          toast.success('Task completed successfully!', { theme: isDark ? 'dark' : 'light' });
          onComplete();
          onClose();
        }
      }
    } catch (error: any) {
      console.error('Error submitting task:', error);
      toast.error(
        error.response?.data?.message || 'Failed to process task',
        { theme: isDark ? 'dark' : 'light' }
      );
    } finally {
      setSubmitting(false);
    }
  };

  const toggleChecklistItem = (index: number) => {
    setChecklistItems((prev: any[]) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        completed: !updated[index].completed,
        completedAt: !updated[index].completed ? new Date().toISOString() : null
      };
      return updated;
    });
    setErrors(prev => ({ ...prev, checklist: '' }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div 
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ 
          backgroundColor: 'var(--color-surface)',
          border: '2px solid var(--color-primary)'
        }}
      >
        {/* Header */}
        <div 
          className="sticky top-0 z-10 flex items-center justify-between p-6 border-b"
          style={{ 
            backgroundColor: 'var(--color-primary)',
            borderColor: 'var(--color-border)'
          }}
        >
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <CheckSquare size={24} />
              Multi-Level Task (MLT)
            </h2>
            <p className="text-white/80 text-sm mt-1">{task.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            disabled={submitting || uploading}
          >
            <X size={24} className="text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {/* Info Banner for Multi-Level Tasks */}
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Multi-Level Task:</strong> You can either complete this task or forward it to another person. 
              {task.requiresChecklist && ' Please complete the checklist items below.'}
            </p>
          </div>

          {/* Completion Type Selection */}
          <div>
            <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
              What would you like to do? <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setCompletionType('complete')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  completionType === 'complete'
                    ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                    : 'border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <CheckSquare 
                    size={32} 
                    style={{ color: completionType === 'complete' ? 'var(--color-primary)' : 'var(--color-textSecondary)' }}
                  />
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    Complete Task
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                    Mark as fully done
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setCompletionType('forward')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  completionType === 'forward'
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10'
                    : 'border-[var(--color-border)] hover:border-[var(--color-accent)]/50'
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <ArrowRight 
                    size={32} 
                    style={{ color: completionType === 'forward' ? 'var(--color-accent)' : 'var(--color-textSecondary)' }}
                  />
                  <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                    Forward Task
                  </span>
                  <span className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                    Send to next person
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* Checklist (if required) */}
          {task.requiresChecklist && (
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Task Checklist {completionType === 'complete' && <span className="text-red-500">*</span>}
              </label>
              {checklistItems.length > 0 ? (
                <>
                  <div 
                    className="p-4 rounded-lg space-y-2"
                    style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}
                  >
                    {checklistItems.map((item: any, index: number) => (
                      <div key={item.id || index} className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={item.completed || false}
                          onChange={() => toggleChecklistItem(index)}
                          className="w-5 h-5 rounded accent-blue-500"
                        />
                        <span 
                          className={item.completed ? 'line-through' : ''}
                          style={{ color: item.completed ? 'var(--color-textSecondary)' : 'var(--color-text)' }}
                        >
                          {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                  {errors.checklist && (
                    <p className="text-red-500 text-sm mt-1">{errors.checklist}</p>
                  )}
                  <p className="text-xs mt-2" style={{ color: 'var(--color-textSecondary)' }}>
                    {checklistItems.filter((i: any) => i.completed).length} of {checklistItems.length} completed
                  </p>
                </>
              ) : (
                <div className="p-4 rounded-lg border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20">
                  <p className="text-sm text-yellow-700 dark:text-yellow-300">
                    This task requires a checklist, but no checklist items were found. Please contact the administrator.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Forward Form */}
          {completionType === 'forward' && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  Forward To (New Assignee) <span className="text-red-500">*</span>
                </label>
                <select
                  value={forwardTo}
                  onChange={(e) => {
                    setForwardTo(e.target.value);
                    setErrors(prev => ({ ...prev, forwardTo: '' }));
                  }}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: errors.forwardTo ? '#ef4444' : 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                >
                  <option value="">Select user...</option>
                  {users.map(u => (
                    <option key={u._id} value={u._id}>
                      {u.username} ({u.email})
                    </option>
                  ))}
                </select>
                {errors.forwardTo && (
                  <p className="text-red-500 text-sm mt-1">{errors.forwardTo}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  New Due Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={forwardDate}
                  onChange={(e) => {
                    setForwardDate(e.target.value);
                    setErrors(prev => ({ ...prev, forwardDate: '' }));
                  }}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 rounded-lg border-2 focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: errors.forwardDate ? '#ef4444' : 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
                {errors.forwardDate && (
                  <p className="text-red-500 text-sm mt-1">{errors.forwardDate}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  Forwarding Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={forwardRemarks}
                  onChange={(e) => {
                    setForwardRemarks(e.target.value);
                    setErrors(prev => ({ ...prev, remarks: '' }));
                  }}
                  rows={4}
                  placeholder="Explain why you're forwarding this task..."
                  className="w-full px-4 py-3 rounded-lg border-2 focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all resize-none"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: errors.remarks ? '#ef4444' : 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
                {errors.remarks && (
                  <p className="text-red-500 text-sm mt-1">{errors.remarks}</p>
                )}
              </div>
            </>
          )}

          {/* Complete Form */}
          {completionType === 'complete' && (
            <>
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  Completion Remarks
                </label>
                <textarea
                  value={completionRemarks}
                  onChange={(e) => setCompletionRemarks(e.target.value)}
                  rows={4}
                  placeholder="Add any completion notes..."
                  className="w-full px-4 py-3 rounded-lg border-2 focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all resize-none"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>

              {/* Attachments */}
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                  Attachments {task.mandatoryAttachments && <span className="text-red-500">*</span>}
                </label>
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center"
                  style={{ borderColor: errors.attachments ? '#ef4444' : 'var(--color-border)' }}
                >
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload size={32} className="mx-auto mb-2" style={{ color: 'var(--color-primary)' }} />
                    <p className="font-medium" style={{ color: 'var(--color-text)' }}>
                      Click to upload files
                    </p>
                    <p className="text-sm mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                      PDF, DOC, Images, Excel (Max 10MB each)
                    </p>
                  </label>
                </div>
                {errors.attachments && (
                  <p className="text-red-500 text-sm mt-1">{errors.attachments}</p>
                )}

                {/* Attachment List */}
                {attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg"
                        style={{ backgroundColor: 'var(--color-background)' }}
                      >
                        <div className="flex items-center gap-2">
                          <File size={18} style={{ color: 'var(--color-primary)' }} />
                          <span className="text-sm" style={{ color: 'var(--color-text)' }}>
                            {file.name}
                          </span>
                          <span className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                            ({(file.size / 1024).toFixed(2)} KB)
                          </span>
                        </div>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="p-1 hover:bg-red-50 rounded"
                        >
                          <X size={16} className="text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div 
          className="sticky bottom-0 flex items-center justify-end gap-3 p-6 border-t"
          style={{ 
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)'
          }}
        >
          <button
            onClick={onClose}
            disabled={submitting || uploading}
            className="px-6 py-3 rounded-lg font-semibold transition-all"
            style={{
              backgroundColor: 'var(--color-background)',
              color: 'var(--color-text)',
              border: '2px solid var(--color-border)'
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || uploading}
            className="px-6 py-3 rounded-lg font-semibold text-white transition-all disabled:opacity-50 flex items-center gap-2"
            style={{
              backgroundColor: completionType === 'forward' ? 'var(--color-accent)' : 'var(--color-success)'
            }}
          >
            {(submitting || uploading) ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                {uploading ? 'Uploading...' : 'Processing...'}
              </>
            ) : (
              <>
                {completionType === 'forward' ? <ArrowRight size={20} /> : <CheckSquare size={20} />}
                {completionType === 'forward' ? 'Forward Task' : 'Complete Task'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MultiLevelTaskCompletionModal;

