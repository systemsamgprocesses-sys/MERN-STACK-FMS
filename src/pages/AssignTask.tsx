import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar, Paperclip, X, Users, CheckSquare, Plus, CheckCircle
} from 'lucide-react';
import axios from 'axios';
import { useTheme } from '../contexts/ThemeContext';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import VoiceRecorder from '../components/VoiceRecorder';
import { address } from '../../utils/ipAddress';

// Add ref type for VoiceRecorder
interface VoiceRecorderRef {
  resetFromParent: () => void;
}

interface User {
  _id: string;
  username: string;
  email: string;
  phoneNumber?: string;
  role?: string;
}

const AssignTask: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    taskCategory: 'regular' as 'regular' | 'multi-level' | 'date-range',
    taskType: 'one-time',
    assignedTo: [] as string[],
    priority: 'normal',
    dueDate: '',
    startDate: '',
    endDate: '',
    isForever: false,
    includeSunday: false,
    weeklyDays: [] as number[],
    monthlyDay: 1,
    yearlyDuration: 3,
    mandatoryAttachments: false,
    requiresChecklist: false,
    checklistItems: [] as Array<{ id: string; text: string; completed: boolean }>
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dueDateInputRef = useRef<HTMLInputElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);
  const voiceRecorderRef = useRef<VoiceRecorderRef>(null);

  const weekDays = [
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
    { value: 0, label: 'Sunday', short: 'Sun' }
  ];

  const monthlyDayOptions = Array.from({ length: 31 }, (_, i) => i + 1);

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users', { theme: isDark ? 'dark' : 'light' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      ...(type === 'checkbox'
        ? { [name]: (e.target as HTMLInputElement).checked }
        : name === 'monthlyDay'
          ? { monthlyDay: parseInt(value, 10) }
          : name === 'yearlyDuration'
            ? { yearlyDuration: parseInt(value, 10) }
            : { [name]: value })
    }));
  };

  const handleUserSelection = (userId: string) => {
    setFormData(prev => {
      if (prev.taskCategory === 'multi-level') {
        return {
          ...prev,
          assignedTo: prev.assignedTo.includes(userId) ? [] : [userId]
        };
      }
      return {
        ...prev,
        assignedTo: prev.assignedTo.includes(userId)
          ? prev.assignedTo.filter(id => id !== userId)
          : [...prev.assignedTo, userId]
      };
    });
  };

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const newItem = {
        id: Date.now().toString(),
        text: newChecklistItem.trim(),
        completed: false
      };
      setFormData(prev => ({
        ...prev,
        checklistItems: [...prev.checklistItems, newItem]
      }));
      setNewChecklistItem('');
    }
  };

  const handleRemoveChecklistItem = (id: string) => {
    setFormData(prev => ({
      ...prev,
      checklistItems: prev.checklistItems.filter(item => item.id !== id)
    }));
  };

  const handleWeekDaySelection = (dayValue: number) => {
    setFormData(prev => ({
      ...prev,
      weeklyDays: prev.weeklyDays.includes(dayValue)
        ? prev.weeklyDays.filter(day => day !== dayValue)
        : [...prev.weeklyDays, dayValue]
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter(file => file.size <= 10 * 1024 * 1024);
      if (validFiles.length !== selectedFiles.length) {
        toast.warning('Some files exceeded 10MB limit', { theme: isDark ? 'dark' : 'light' });
      }
      setAttachments(prev => [...prev, ...validFiles]);
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleVoiceRecordingComplete = (audioFile: File) => {
    setAttachments(prev => [...prev, audioFile]);
  };

  const handleVoiceRecordingDeleted = (fileName: string) => {
    setAttachments(prev => prev.filter(file => file.name !== fileName));
  };

  const isRecurring = formData.taskType !== 'one-time';
  const isWeekly = formData.taskType === 'weekly';
  const isMonthly = formData.taskType === 'monthly';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.assignedTo.length === 0) {
      toast.error('Please select at least one user', { theme: isDark ? 'dark' : 'light' });
      return;
    }

    if (formData.taskCategory === 'date-range' && (!formData.startDate || !formData.endDate)) {
      toast.error('Please select both start and end dates for date-range tasks', { theme: isDark ? 'dark' : 'light' });
      return;
    }

    if (isRecurring && (!formData.startDate || (!formData.endDate && !formData.isForever))) {
      toast.error('Please select start and end dates for recurring tasks', { theme: isDark ? 'dark' : 'light' });
      return;
    }

    if (isWeekly && formData.weeklyDays.length === 0) {
      toast.error('Please select at least one day for weekly tasks', { theme: isDark ? 'dark' : 'light' });
      return;
    }

    setLoading(true);
    try {
      let uploadedAttachments: any[] = [];

      if (attachments.length > 0) {
        const formDataFiles = new FormData();
        attachments.forEach(file => {
          formDataFiles.append('files', file);
        });
        const uploadResponse = await axios.post(`${address}/api/upload`, formDataFiles, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedAttachments = uploadResponse.data.files || [];
      }

      const taskPromises = formData.assignedTo.map(async (assignedUserId) => {
        const taskData = {
          ...formData,
          assignedTo: assignedUserId,
          assignedBy: user?.id,
          attachments: uploadedAttachments,
          requireAttachments: formData.mandatoryAttachments,
          mandatoryAttachments: formData.mandatoryAttachments,
          ...((formData.taskType === 'yearly' || formData.taskType === 'quarterly') && !formData.isForever && {
            endDate: formData.startDate
          })
        };
        return axios.post(`${address}/api/tasks/create-scheduled`, taskData);
      });

      const results = await Promise.all(taskPromises);
      const totalTasksCreated = results.reduce((sum, result) => sum + result.data.tasksCreated, 0);
      
      toast.success(
        `✨ Successfully created ${totalTasksCreated} task${totalTasksCreated > 1 ? 's' : ''} for ${formData.assignedTo.length} user${formData.assignedTo.length > 1 ? 's' : ''}!`,
        { theme: isDark ? 'dark' : 'light', autoClose: 5000 }
      );

      // Reset form
      setFormData({
        title: '',
        description: '',
        taskCategory: 'regular',
        taskType: 'one-time',
        assignedTo: [],
        priority: 'normal',
        dueDate: '',
        startDate: '',
        endDate: '',
        isForever: false,
        includeSunday: false,
        weeklyDays: [],
        monthlyDay: 1,
        yearlyDuration: 3,
        mandatoryAttachments: false,
        requiresChecklist: false,
        checklistItems: []
      });
      setAttachments([]);
      setNewChecklistItem('');
      setUserSearchTerm('');
      setShowUserDropdown(false);

      if (voiceRecorderRef.current) {
        voiceRecorderRef.current.resetFromParent();
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to assign task. Please try again.', { theme: isDark ? 'dark' : 'light' });
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    u.phoneNumber?.includes(userSearchTerm)
  );

  const selectedUsers = users.filter(u => formData.assignedTo.includes(u._id));

  return (
    <div className="min-h-screen p-8" style={{ backgroundColor: isDark ? '#0f1117' : '#f9fafb' }}>
      <ToastContainer />
      
      {/* Header */}
      <div className="max-w-3xl mx-auto mb-8">
        <h1 className="text-4xl font-bold mb-2" style={{ color: isDark ? '#ffffff' : '#111827' }}>
          Assign New Task
        </h1>
        <p style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
          Create and delegate tasks with precision
        </p>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
        <div className="rounded-xl shadow-sm overflow-hidden" style={{
          backgroundColor: isDark ? '#1a1d29' : '#ffffff',
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'}`
        }}>
          
          {/* Section 1: Task Basics */}
          <div className="p-8" style={{
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'}`
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                1
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                  Task Basics
                </h2>
                <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  Define the core details of your task
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                  Task Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  required
                  placeholder="Enter a clear and concise task title..."
                  className="w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  style={{
                    backgroundColor: isDark ? '#0f1117' : '#ffffff',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                    color: isDark ? '#ffffff' : '#111827'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  placeholder="Provide detailed instructions and context for this task..."
                  className="w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  style={{
                    backgroundColor: isDark ? '#0f1117' : '#ffffff',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                    color: isDark ? '#ffffff' : '#111827'
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                    Category *
                  </label>
                  <select
                    name="taskCategory"
                    value={formData.taskCategory}
                    onChange={(e) => {
                      const category = e.target.value as 'regular' | 'multi-level' | 'date-range';
                      setFormData(prev => ({
                        ...prev,
                        taskCategory: category,
                        assignedTo: category === 'multi-level' && prev.assignedTo.length > 1 ? [prev.assignedTo[0]] : prev.assignedTo,
                        taskType: category === 'date-range' ? 'one-time' : prev.taskType
                      }));
                    }}
                    className="w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    style={{
                      backgroundColor: isDark ? '#0f1117' : '#ffffff',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                      color: isDark ? '#ffffff' : '#111827'
                    }}
                  >
                    <option value="regular">Regular</option>
                    <option value="multi-level">Multi-Level</option>
                    <option value="date-range">Date Range</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                    Priority *
                  </label>
                  <select
                    name="priority"
                    value={formData.priority}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    style={{
                      backgroundColor: isDark ? '#0f1117' : '#ffffff',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                      color: isDark ? '#ffffff' : '#111827'
                    }}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                    Type *
                  </label>
                  <select
                    name="taskType"
                    value={formData.taskType}
                    onChange={handleInputChange}
                    disabled={formData.taskCategory === 'date-range'}
                    className="w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                    style={{
                      backgroundColor: isDark ? '#0f1117' : '#ffffff',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                      color: isDark ? '#ffffff' : '#111827'
                    }}
                  >
                    <option value="one-time">One Time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Assign Users */}
          <div className="p-8" style={{
            backgroundColor: isDark ? 'rgba(15, 17, 23, 0.5)' : '#f9fafb',
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'}`
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                  Assign Users
                </h2>
                <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  {formData.taskCategory === 'multi-level' ? 'Select one user (can be forwarded later)' : 'Select one or more users for this task'}
                </p>
              </div>
            </div>

            <div className="relative mb-4" ref={dropdownRef}>
              <Users 
                className="absolute left-3 top-3 pointer-events-none" 
                size={18} 
                style={{ color: isDark ? '#6b7280' : '#9ca3af' }} 
              />
              <input
                type="text"
                placeholder="Search users by name, email, or phone..."
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                onFocus={() => setShowUserDropdown(true)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                style={{
                  backgroundColor: isDark ? '#1a1d29' : '#ffffff',
                  border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                  color: isDark ? '#ffffff' : '#111827'
                }}
              />

              {/* Dropdown */}
              {showUserDropdown && filteredUsers.length > 0 && (
                <div 
                  className="absolute z-50 mt-2 w-full max-h-64 overflow-y-auto rounded-lg shadow-lg"
                  style={{
                    backgroundColor: isDark ? '#1a1d29' : '#ffffff',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'}`
                  }}
                >
                  {filteredUsers.map(userItem => (
                    <div
                      key={userItem._id}
                      onClick={() => handleUserSelection(userItem._id)}
                      className="p-3 cursor-pointer transition-all text-sm"
                      style={{
                        backgroundColor: formData.assignedTo.includes(userItem._id)
                          ? (isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)')
                          : 'transparent',
                        borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : '#f3f4f6'}`
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                            style={{ 
                              background: formData.assignedTo.includes(userItem._id) 
                                ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                                : '#6b7280'
                            }}
                          >
                            {userItem.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-medium" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                              {userItem.username}
                            </div>
                            <div className="text-xs" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                              {userItem.email}
                            </div>
                          </div>
                        </div>
                        {formData.assignedTo.includes(userItem._id) && (
                          <CheckCircle size={18} className="text-blue-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {selectedUsers.map(u => (
                  <div
                    key={u._id}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm"
                    style={{
                      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                      border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.3)'}`,
                      color: isDark ? '#60a5fa' : '#2563eb'
                    }}
                  >
                    <span className="font-medium">{u.username}</span>
                    <button
                      type="button"
                      onClick={() => handleUserSelection(u._id)}
                      className="hover:opacity-70"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section 3: Schedule & Timing */}
          <div className="p-8" style={{
            borderBottom: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#e5e7eb'}`
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                  Schedule & Timing
                </h2>
                <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  Set deadlines and schedules
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Date Range Tasks */}
              {formData.taskCategory === 'date-range' ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                      Start Date *
                    </label>
                    <div className="relative">
                      <Calendar 
                        className="absolute left-3 top-3 pointer-events-none" 
                        size={18} 
                        style={{ color: isDark ? '#6b7280' : '#9ca3af' }} 
                      />
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        required
                        ref={startDateInputRef}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        style={{
                          backgroundColor: isDark ? '#0f1117' : '#ffffff',
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                          color: isDark ? '#ffffff' : '#111827'
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                      End Date *
                    </label>
                    <div className="relative">
                      <Calendar 
                        className="absolute left-3 top-3 pointer-events-none" 
                        size={18} 
                        style={{ color: isDark ? '#6b7280' : '#9ca3af' }} 
                      />
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        required
                        min={formData.startDate || undefined}
                        ref={endDateInputRef}
                        className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        style={{
                          backgroundColor: isDark ? '#0f1117' : '#ffffff',
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                          color: isDark ? '#ffffff' : '#111827'
                        }}
                      />
                    </div>
                  </div>
                  {formData.startDate && formData.endDate && (
                    <div className="col-span-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                      <p className="text-sm text-blue-700">
                        📅 Duration: {Math.ceil((new Date(formData.endDate).getTime() - new Date(formData.startDate).getTime()) / (1000 * 60 * 60 * 24))} days • Scoring based on end date
                      </p>
                    </div>
                  )}
                </div>
              ) : !isRecurring ? (
                <div className="max-w-xs">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                    Due Date *
                  </label>
                  <div className="relative">
                    <Calendar 
                      className="absolute left-3 top-3 pointer-events-none" 
                      size={18} 
                      style={{ color: isDark ? '#6b7280' : '#9ca3af' }} 
                    />
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      required
                      ref={dueDateInputRef}
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      style={{
                        backgroundColor: isDark ? '#0f1117' : '#ffffff',
                        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                        color: isDark ? '#ffffff' : '#111827'
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                        Start Date *
                      </label>
                      <input
                        type="date"
                        name="startDate"
                        value={formData.startDate}
                        onChange={handleInputChange}
                        required
                        ref={startDateInputRef}
                        className="w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        style={{
                          backgroundColor: isDark ? '#0f1117' : '#ffffff',
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                          color: isDark ? '#ffffff' : '#111827'
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                        End Date {!formData.isForever && '*'}
                      </label>
                      <input
                        type="date"
                        name="endDate"
                        value={formData.endDate}
                        onChange={handleInputChange}
                        required={!formData.isForever}
                        disabled={formData.isForever}
                        min={formData.startDate || undefined}
                        ref={endDateInputRef}
                        className="w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:opacity-50"
                        style={{
                          backgroundColor: isDark ? '#0f1117' : '#ffffff',
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                          color: isDark ? '#ffffff' : '#111827'
                        }}
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name="isForever"
                      checked={formData.isForever}
                      onChange={handleInputChange}
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="text-sm" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                      Repeat Forever (for 1 year)
                    </span>
                  </label>
                </div>
              )}

              {/* Weekly Days */}
              {isWeekly && (
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                    Select Days *
                  </label>
                  <div className="flex gap-2">
                    {weekDays.map(day => (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => handleWeekDaySelection(day.value)}
                        className="flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all"
                        style={{
                          backgroundColor: formData.weeklyDays.includes(day.value)
                            ? '#3b82f6'
                            : (isDark ? '#0f1117' : '#ffffff'),
                          color: formData.weeklyDays.includes(day.value)
                            ? '#ffffff'
                            : (isDark ? '#9ca3af' : '#6b7280'),
                          border: `1px solid ${formData.weeklyDays.includes(day.value) ? '#3b82f6' : (isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db')}`
                        }}
                      >
                        {day.short}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Monthly Day */}
              {isMonthly && (
                <div className="max-w-xs">
                  <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                    Day of Month *
                  </label>
                  <select
                    name="monthlyDay"
                    value={formData.monthlyDay}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    style={{
                      backgroundColor: isDark ? '#0f1117' : '#ffffff',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                      color: isDark ? '#ffffff' : '#111827'
                    }}
                  >
                    {monthlyDayOptions.map(day => (
                      <option key={day} value={day}>
                        {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Additional Options */}
          <div className="p-8" style={{
            backgroundColor: isDark ? 'rgba(15, 17, 23, 0.5)' : '#f9fafb'
          }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                4
              </div>
              <div>
                <h2 className="text-lg font-semibold" style={{ color: isDark ? '#ffffff' : '#111827' }}>
                  Additional Options
                </h2>
                <p className="text-sm" style={{ color: isDark ? '#9ca3af' : '#6b7280' }}>
                  Checklists, attachments, and more
                </p>
              </div>
            </div>

            <div className="space-y-5">
              {/* Checklist */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                  Checklist Items
                </label>
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newChecklistItem}
                    onChange={(e) => setNewChecklistItem(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder="Add checklist item..."
                    className="flex-1 px-4 py-2.5 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    style={{
                      backgroundColor: isDark ? '#1a1d29' : '#ffffff',
                      border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                      color: isDark ? '#ffffff' : '#111827'
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm transition-all"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                {formData.checklistItems.length > 0 && (
                  <div className="space-y-2">
                    {formData.checklistItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-2 p-3 rounded-lg text-sm"
                        style={{
                          backgroundColor: isDark ? '#1a1d29' : '#f3f4f6',
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : '#e5e7eb'}`
                        }}
                      >
                        <CheckSquare size={16} className="text-blue-600 flex-shrink-0" />
                        <span className="flex-1" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>{item.text}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(item.id)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Voice Recorder */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                  Voice Recording
                </label>
                <VoiceRecorder
                  ref={voiceRecorderRef}
                  onRecordingComplete={handleVoiceRecordingComplete}
                  onRecordingDeleted={handleVoiceRecordingDeleted}
                  isDark={isDark}
                />
              </div>

              {/* File Upload */}
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                  Attachments
                </label>
                <input
                  type="file"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls"
                />
                <label
                  htmlFor="file-upload"
                  className="block px-4 py-6 rounded-lg text-center cursor-pointer transition-all text-sm"
                  style={{
                    border: `2px dashed ${isDark ? 'rgba(255, 255, 255, 0.1)' : '#d1d5db'}`,
                    backgroundColor: isDark ? '#1a1d29' : '#ffffff'
                  }}
                >
                  <Paperclip className="mx-auto mb-2" size={24} style={{ color: isDark ? '#6b7280' : '#9ca3af' }} />
                  <p className="font-medium" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                    Upload Files
                  </p>
                  <p className="text-xs mt-1" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                    PDF, DOC, Images, Excel (Max 10MB each)
                  </p>
                </label>

                {attachments.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2.5 rounded-lg text-sm"
                        style={{
                          backgroundColor: isDark ? '#1a1d29' : '#f3f4f6',
                          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.05)' : '#e5e7eb'}`
                        }}
                      >
                        <Paperclip size={14} style={{ color: isDark ? '#6b7280' : '#9ca3af' }} />
                        <span className="flex-1 truncate" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                          {file.name}
                        </span>
                        <span className="text-xs" style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>
                          {(file.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="text-red-500 hover:text-red-700 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attachment Options */}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="mandatoryAttachments"
                  checked={formData.mandatoryAttachments}
                  onChange={handleInputChange}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm" style={{ color: isDark ? '#e5e7eb' : '#374151' }}>
                  Make attachments mandatory
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="mt-6 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Assign Task'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AssignTask;
