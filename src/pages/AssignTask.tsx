import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserPlus, Calendar, Paperclip, X, Users, CheckSquare, Hash, ChevronDown, Search, Volume2 } from 'lucide-react';
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
  phoneNumber?: string; // Added phoneNumber to User interface
}

const AssignTask: React.FC = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [users, setUsers] = useState<User[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
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
    yearlyDuration: 3
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  // New states for dropdown
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Ref for date inputs to programmatically open calendar
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

  // Effect to close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);

  const fetchUsers = async () => {
    try {
      console.log(`📍 Fetching users from: ${address}/api/users`);
      const response = await axios.get(`${address}/api/users`);
      console.log('✅ Users fetched:', response.data);
      
      if (!response.data || response.data.length === 0) {
        console.warn('⚠️  No users returned from API');
        setUsers([]);
        return;
      }
      
      // Allow everyone to assign tasks to themselves as well
      const filteredUsers = response.data;
      console.log(`✅ Filtered users (${filteredUsers.length}):`, filteredUsers);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('❌ Error fetching users:', error);
      if (axios.isAxiosError(error)) {
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
      toast.error('Failed to fetch users. Check console for details.', { theme: isDark ? 'dark' : 'light' });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              name === 'monthlyDay' ? parseInt(value) : 
              name === 'yearlyDuration' ? parseInt(value) : value
    }));
  };

  const handleUserSelection = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(userId)
        ? prev.assignedTo.filter(id => id !== userId)
        : [...prev.assignedTo, userId]
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
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(file => file.size <= 10 * 1024 * 1024); // 10MB limit

    if (validFiles.length !== files.length) {
      toast.error('Some files were too large (max 10MB per file).', { theme: isDark ? 'dark' : 'light' });
    }

    setAttachments(prev => [...prev, ...validFiles]);
  };

  const handleVoiceRecordingComplete = (audioFile: File) => {
    setAttachments(prev => [...prev, audioFile]);
    toast.success('Voice recording added to attachments!', { theme: isDark ? 'dark' : 'light' });
  };

  const handleVoiceRecordingDeleted = (fileName: string) => {
    setAttachments(prev => prev.filter(file => file.name !== fileName));
  };
  
  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const isAudioFile = (file: File) => {
    return file.type.startsWith('audio/') || file.name.includes('voice-recording');
  };

  // Helper function to calculate expected number of yearly tasks
  const calculateYearlyTasks = () => {
    if (formData.taskType !== 'yearly' || !formData.startDate) return 0;
    
    if (!formData.isForever) {
      return 1; // Single yearly task
    }
    
    return formData.yearlyDuration; // Exact number of years selected
  };

  // Helper function to preview yearly task dates
  const getYearlyTaskPreview = () => {
    if (formData.taskType !== 'yearly' || !formData.startDate) return [];
    
    const startDate = new Date(formData.startDate);
    const tasks = [];
    
    const count = formData.isForever ? formData.yearlyDuration : 1;
    
    for (let i = 0; i < count; i++) {
      const taskDate = new Date(startDate);
      taskDate.setFullYear(startDate.getFullYear() + i);
      
      // Handle Sunday exclusion
      if (!formData.includeSunday && taskDate.getDay() === 0) {
        taskDate.setDate(taskDate.getDate() - 1); // Move to Saturday
      }
      
      tasks.push(taskDate);
    }
    
    return tasks;
  };

  // Helper function to preview quarterly task dates
  const getQuarterlyTaskPreview = () => {
    if (formData.taskType !== 'quarterly' || !formData.startDate) return [];
    
    const startDate = new Date(formData.startDate);
    const tasks = [];
    
    // Create 4 quarterly tasks
    for (let i = 0; i < 4; i++) {
      const taskDate = new Date(startDate);
      taskDate.setMonth(startDate.getMonth() + (i * 3)); // Add 3 months for each quarter
      
      // Handle Sunday exclusion
      if (!formData.includeSunday && taskDate.getDay() === 0) {
        taskDate.setDate(taskDate.getDate() - 1); // Move to Saturday
      }
      
      tasks.push(taskDate);
    }
    
    return tasks;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Validation
    if (formData.assignedTo.length === 0) {
      toast.error('Please select at least one user to assign the task to.', { theme: isDark ? 'dark' : 'light' });
      setLoading(false);
      return;
    }

    if (formData.taskType === 'weekly' && formData.weeklyDays.length === 0) {
      toast.error('Please select at least one day for weekly tasks.', { theme: isDark ? 'dark' : 'light' });
      setLoading(false);
      return;
    }

    // Validate dates for recurring tasks
    if (formData.taskType !== 'one-time') {
      // For yearly and quarterly tasks, only validate start date
      if (formData.taskType === 'yearly' || formData.taskType === 'quarterly') {
        if (!formData.startDate) {
          toast.error(`Please select start date for ${formData.taskType} tasks.`, { theme: isDark ? 'dark' : 'light' });
          setLoading(false);
          return;
        }
      } 
      // For other recurring tasks (daily, weekly, monthly), validate based on isForever
      else if (!formData.isForever) {
        if (!formData.startDate || !formData.endDate) {
          toast.error('Please select both start and end dates for recurring tasks.', { theme: isDark ? 'dark' : 'light' });
          setLoading(false);
          return;
        }
        
        if (new Date(formData.startDate) >= new Date(formData.endDate)) {
          toast.error('End date must be after start date.', { theme: isDark ? 'dark' : 'light' });
          setLoading(false);
          return;
        }
      }
      // For forever tasks (non-yearly and non-quarterly), only validate start date
      else if (formData.taskType !== 'yearly' && formData.taskType !== 'quarterly' && !formData.startDate) {
        toast.error('Please select start date for recurring tasks.', { theme: isDark ? 'dark' : 'light' });
        setLoading(false);
        return;
      }
    }

    try {
      // Upload attachments first
      let uploadedAttachments: any[] = [];
      if (attachments.length > 0) {
        const formDataFiles = new FormData();
        attachments.forEach(file => {
          formDataFiles.append('files', file); // Use 'files' to match backend
        });
        const uploadResponse = await axios.post(`${address}/api/upload`, formDataFiles, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        // The backend returns { files: [...] }
        uploadedAttachments = uploadResponse.data.files || [];
      }

      // Create tasks for each selected user
      const taskPromises = formData.assignedTo.map(async (assignedUserId) => {
        const taskData = {
          ...formData,
          assignedTo: assignedUserId, // Single user per task
          assignedBy: user?.id,
          attachments: uploadedAttachments,
          // For yearly and quarterly tasks, ensure proper date handling
          ...((formData.taskType === 'yearly' || formData.taskType === 'quarterly') && !formData.isForever && {
            endDate: formData.startDate
          })
        };

        console.log('Sending task data:', taskData); // Debug log
        return axios.post(`${address}/api/tasks/create-scheduled`, taskData);
      });

      const results = await Promise.all(taskPromises);

      // Calculate total tasks created
      const totalTasksCreated = results.reduce((sum, result) => sum + result.data.tasksCreated, 0);
      const userCount = formData.assignedTo.length;
      const uploadedAttachmentCount = uploadedAttachments.length;
      const voiceRecordingCount = attachments.filter(isAudioFile).length;

      let successMessage = `Successfully created ${totalTasksCreated} task${totalTasksCreated > 1 ? 's' : ''} for ${userCount} user${userCount > 1 ? 's' : ''}.`;
      if (uploadedAttachmentCount > 0) {
        successMessage += ` (${uploadedAttachmentCount} attachment${uploadedAttachmentCount > 1 ? 's' : ''} uploaded`;
        if (voiceRecordingCount > 0) {
          successMessage += `, including ${voiceRecordingCount} voice recording${voiceRecordingCount > 1 ? 's' : ''}`;
        }
        successMessage += ')';
      }
      toast.success(successMessage, { theme: isDark ? 'dark' : 'light' });

      // Reset form
      setFormData({
        title: '',
        description: '',
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
        yearlyDuration: 3
      });
      setAttachments([]);
      setUserSearchTerm('');
      setShowUserDropdown(false);
      
      // Reset voice recorder
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

  const isRecurring = formData.taskType !== 'one-time';
  const isWeekly = formData.taskType === 'weekly';
  const isMonthly = formData.taskType === 'monthly';
  const isYearly = formData.taskType === 'yearly';
  const isQuarterly = formData.taskType === 'quarterly';

  const getSelectedUsers = () => {
    return users.filter(u => formData.assignedTo.includes(u._id));
  };

  // Filtered users for the dropdown
  const filteredUsers = users.filter(userItem =>
    userItem.username.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    userItem.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
    userItem.phoneNumber?.toLowerCase().includes(userSearchTerm.toLowerCase()) // Added phone number search
  );

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
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
      yearlyDuration: 3
    });
    setAttachments([]);
    setMessage({ type: '', text: '' });
    setUserSearchTerm('');
    setShowUserDropdown(false);
    
    // Reset voice recorder
    if (voiceRecorderRef.current) {
      voiceRecorderRef.current.resetFromParent();
    }
  };

  // Function to open the date picker
  const openDatePicker = (ref: React.RefObject<HTMLInputElement>) => {
    if (ref.current && typeof ref.current.showPicker === 'function') {
      ref.current.showPicker();
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 via-white to-purple-50'} pb-8`}>
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* Compact Header */}
        <div className="relative overflow-hidden rounded-2xl shadow-md" style={{ background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-secondary) 100%)' }}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12"></div>
          
          <div className="relative p-5 md:p-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <UserPlus size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">Assign Task</h1>
                <p className="text-white/85 text-xs md:text-sm mt-0.5">Create and distribute tasks to your team</p>
              </div>
            </div>
          </div>
        </div>

        {/* Toast Messages */}
        {message.text && (
          <div
            className={`p-4 rounded-xl border-l-4 flex items-start gap-3 backdrop-blur-sm ${
              message.type === 'success'
                ? 'bg-gradient-to-r from-green-50 to-green-50/50 text-green-800 border-green-500 dark:from-green-500/10 dark:to-green-500/5 dark:text-green-300'
                : 'bg-gradient-to-r from-red-50 to-red-50/50 text-red-800 border-red-500 dark:from-red-500/10 dark:to-red-500/5 dark:text-red-300'
            }`}
          >
            <div className="mt-0.5">
              {message.type === 'success' ? (
                <CheckSquare size={18} className="text-green-600 dark:text-green-300" />
              ) : (
                <X size={18} className="text-red-600 dark:text-red-300" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">{message.type === 'success' ? 'Success!' : 'Error'}</p>
              <p className="text-xs mt-1">{message.text}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Task Basics Card */}
          <div className={`rounded-2xl border overflow-hidden transition-all shadow-sm hover:shadow-md ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary)12' }}>
                  <CheckSquare size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  Task Basics
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Task Title */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all font-medium ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-white'
                    }`}
                    placeholder="Enter a clear task title"
                  />
                </div>

                {/* Task Type */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Task Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      name="taskType"
                      value={formData.taskType}
                      onChange={handleInputChange}
                      required
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all font-medium appearance-none ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-100'
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white'
                      }`}
                    >
                      <option value="one-time">One Time</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="quarterly">Quarterly</option>
                      <option value="yearly">Yearly</option>
                    </select>
                    <ChevronDown size={18} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Priority Level
                  </label>
                  <div className="relative">
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all font-medium appearance-none ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-100'
                          : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white'
                      }`}
                    >
                      <option value="normal">Normal</option>
                      <option value="high">High</option>
                    </select>
                    <ChevronDown size={18} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                  </div>
                </div>

                {/* Description */}
                <div className="md:col-span-2">
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Description
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all resize-none font-medium ${
                      isDark
                        ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                        : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-white'
                    }`}
                    placeholder="Provide task instructions"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assignment & Scheduling Card */}
          <div className={`rounded-2xl border transition-all shadow-sm hover:shadow-md ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            <div className="p-5 md:p-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* User Assignment */}
                <div className="lg:col-span-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary)12' }}>
                      <Users size={20} style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      Assign To Users <span className="text-red-500">*</span>
                    </h2>
                  </div>

                  <div className="relative" ref={dropdownRef}>
                    <button
                      type="button"
                      className={`w-full flex justify-between items-center px-4 py-3 border-2 rounded-xl transition-all font-medium ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-100 hover:border-gray-500'
                          : 'bg-gray-50 border-gray-200 text-gray-900 hover:bg-white hover:border-[var(--color-primary)]/50'
                      }`}
                      onClick={() => setShowUserDropdown(!showUserDropdown)}
                    >
                      {formData.assignedTo.length > 0 ? (
                        <span className="text-sm">
                          {formData.assignedTo.length} user{formData.assignedTo.length !== 1 ? 's' : ''} selected
                        </span>
                      ) : (
                        <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          Select team members...
                        </span>
                      )}
                      <ChevronDown size={18} className={`transition-transform ${showUserDropdown ? 'rotate-180' : ''}`} style={{ color: 'var(--color-primary)' }} />
                    </button>

                    {showUserDropdown && (
                      <div
                        className={`absolute z-50 w-full mt-2 rounded-xl shadow-lg border backdrop-blur-sm ${
                          isDark ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-100'
                        }`}
                      >
                        <div className="p-2 border-b" style={{ borderColor: isDark ? 'var(--color-border)' : 'var(--color-border-light)' }}>
                          <div className="relative">
                            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${isDark ? 'text-gray-400' : 'text-gray-400'}`} size={16} />
                            <input
                              type="text"
                              placeholder="Search by name or phone..."
                              className={`w-full pl-9 pr-3 py-2 border-2 rounded-lg focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all font-medium text-sm ${
                                isDark
                                  ? 'bg-gray-600 border-gray-500 text-gray-100 placeholder-gray-400'
                                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-white'
                              }`}
                              value={userSearchTerm}
                              onChange={(e) => setUserSearchTerm(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {filteredUsers.length === 0 && (
                            <p className={`p-4 text-center text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                              No users found
                            </p>
                          )}
                          {filteredUsers.map((userItem) => (
                            <label
                              key={userItem._id}
                              className={`flex items-center px-4 py-3 cursor-pointer transition-all border-b last:border-b-0 text-sm ${
                                formData.assignedTo.includes(userItem._id)
                                  ? isDark ? 'bg-gray-600/50' : 'bg-blue-50'
                                  : isDark ? 'hover:bg-gray-600/30' : 'hover:bg-gray-50'
                              }`}
                              style={{
                                borderColor: isDark ? 'var(--color-border)' : 'var(--color-border-light)'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={formData.assignedTo.includes(userItem._id)}
                                onChange={() => handleUserSelection(userItem._id)}
                                className="w-4 h-4 rounded cursor-pointer accent-blue-500"
                              />
                              <div className="ml-3 flex-1">
                                <div className={`font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                                  {userItem.username}
                                </div>
                                <div className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                                  {userItem.phoneNumber || userItem.email}
                                </div>
                              </div>
                              {formData.assignedTo.includes(userItem._id) && (
                                <div className="p-1 rounded-full" style={{ backgroundColor: 'var(--color-primary)' }}>
                                  <CheckSquare size={14} className="text-white" />
                                </div>
                              )}
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Selected Users Summary */}
                <div className={`rounded-xl border-2 p-4 ${isDark ? 'bg-gray-700 border-gray-600' : 'bg-gradient-to-br from-blue-50 to-blue-50/50 border-blue-200'}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={16} style={{ color: 'var(--color-primary)' }} />
                    <p className="font-semibold text-sm" style={{ color: 'var(--color-primary)' }}>
                      {formData.assignedTo.length} Selected
                    </p>
                  </div>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {formData.assignedTo.length === 0 ? (
                      <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                        Select users
                      </p>
                    ) : (
                      getSelectedUsers().map(selectedUser => (
                        <div key={selectedUser._id} className={`flex items-center justify-between p-2 rounded-lg text-sm ${isDark ? 'bg-gray-600' : 'bg-white'}`}>
                          <div className="font-medium truncate">{selectedUser.username}</div>
                          <button
                            type="button"
                            onClick={() => handleUserSelection(selectedUser._id)}
                            className="p-1 hover:bg-red-100 dark:hover:bg-red-500/20 rounded transition-all flex-shrink-0 ml-2"
                          >
                            <X size={14} className="text-red-500" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Weekly Days Section */}
          {isWeekly && (
            <div className={`rounded-2xl border overflow-hidden transition-all shadow-sm hover:shadow-md ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary)12' }}>
                    <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    Select Weekly Days <span className="text-red-500">*</span>
                  </h2>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                  {weekDays.map(day => (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => handleWeekDaySelection(day.value)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all font-semibold text-center text-sm ${
                        formData.weeklyDays.includes(day.value)
                          ? 'text-white shadow-md scale-105'
                          : (isDark ? 'border-gray-600 bg-gray-700 text-gray-100 hover:border-gray-500 hover:shadow-sm' : 'border-gray-200 bg-gray-50 text-gray-900 hover:border-gray-300 hover:shadow-sm hover:bg-white')
                      }`}
                      style={{
                        borderColor: formData.weeklyDays.includes(day.value) ? 'var(--color-primary)' : undefined,
                        backgroundColor: formData.weeklyDays.includes(day.value) ? 'var(--color-primary)' : undefined,
                      }}
                    >
                      <div className="font-bold">{day.short}</div>
                      <div className="text-xs opacity-75">{day.label}</div>
                    </button>
                  ))}
                </div>

                {formData.weeklyDays.length > 0 && (
                  <div
                    className="mt-4 p-3 rounded-lg border-l-4 text-sm"
                    style={{
                      backgroundColor: 'var(--color-primary)10',
                      borderColor: 'var(--color-primary)'
                    }}
                  >
                    <p className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                      ✓ Selected: {formData.weeklyDays.map(dayValue =>
                        weekDays.find(d => d.value === dayValue)?.label
                      ).join(', ')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Monthly Day Section */}
          {isMonthly && (
            <div className={`rounded-2xl border overflow-hidden transition-all shadow-sm hover:shadow-md ${
              isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
            }`}>
              <div className="p-5 md:p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary)12' }}>
                    <Hash size={20} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    Monthly Configuration <span className="text-red-500">*</span>
                  </h2>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Day of Month (1-31)
                    </label>
                    <div className="relative">
                      <select
                        name="monthlyDay"
                        value={formData.monthlyDay}
                        onChange={handleInputChange}
                        required
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all font-medium appearance-none ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-gray-100'
                            : 'bg-gray-50 border-gray-200 text-gray-900 focus:bg-white'
                        }`}
                      >
                        {monthlyDayOptions.map(day => (
                          <option key={day} value={day}>
                            {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={18} className={`absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-gray-400' : 'text-gray-600'}`} />
                    </div>
                  </div>

                  <div
                    className="p-3 rounded-lg border-l-4 text-sm"
                    style={{
                      backgroundColor: 'var(--color-primary)10',
                      borderColor: 'var(--color-primary)'
                    }}
                  >
                    <p className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                      ✓ {formData.monthlyDay}{formData.monthlyDay === 1 ? 'st' : formData.monthlyDay === 2 ? 'nd' : formData.monthlyDay === 3 ? 'rd' : 'th'} day of each month
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--color-primary-dark)' }}>
                      Tasks created on the {formData.monthlyDay}{formData.monthlyDay === 1 ? 'st' : formData.monthlyDay === 2 ? 'nd' : formData.monthlyDay === 3 ? 'rd' : 'th'} day.
                      {formData.monthlyDay > 28 && ' For months with fewer days, created on the last day.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Date Configuration */}
          <div className={`rounded-2xl border overflow-hidden transition-all shadow-sm hover:shadow-md ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary)12' }}>
                  <Calendar size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  Date Configuration
                </h2>
              </div>

              {!isRecurring ? (
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                    Due Date <span className="text-red-500">*</span>
                  </label>
                  <div onClick={() => openDatePicker(dueDateInputRef)} className="cursor-pointer">
                    <input
                      type="date"
                      name="dueDate"
                      value={formData.dueDate}
                      onChange={handleInputChange}
                      required
                      ref={dueDateInputRef}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all font-medium text-lg ${
                        isDark
                          ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                          : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-white'
                      }`}
                      placeholder="Select a due date"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        {isYearly || isQuarterly ? 'Task Date <span className="text-red-500">*</span>' : 'Start Date <span className="text-red-500">*</span>'}
                      </label>
                      <div onClick={() => openDatePicker(startDateInputRef)} className="cursor-pointer">
                        <input
                          type="date"
                          name="startDate"
                          value={formData.startDate}
                          onChange={handleInputChange}
                          required
                          ref={startDateInputRef}
                          className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all font-medium text-lg ${
                            isDark
                              ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                              : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-white'
                          }`}
                          placeholder="Select a start date"
                        />
                      </div>
                    </div>

                    {!isYearly && !isQuarterly && (
                      <div>
                        <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          End Date {!formData.isForever && '<span className="text-red-500">*</span>'}
                        </label>
                        <div onClick={() => !formData.isForever && openDatePicker(endDateInputRef)} className={`cursor-pointer ${formData.isForever ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <input
                            type="date"
                            name="endDate"
                            value={formData.endDate}
                            onChange={handleInputChange}
                            required={!formData.isForever}
                            disabled={formData.isForever}
                            ref={endDateInputRef}
                            className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all font-medium text-lg ${
                              isDark
                                ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                                : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-white'
                            }`}
                            placeholder="Select an end date"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-4">
                    {/* Forever checkbox - only for non-yearly and non-quarterly tasks */}
                    {!isYearly && !isQuarterly && (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isForever"
                          checked={formData.isForever}
                          onChange={handleInputChange}
                          className="w-4 h-4 rounded cursor-pointer accent-blue-500"
                        />
                        <span className={`text-sm ml-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Forever (1 year)
                        </span>
                      </label>
                    )}

                    {/* Multi-year checkbox - only for yearly tasks */}
                    {isYearly && (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="isForever"
                          checked={formData.isForever}
                          onChange={handleInputChange}
                          className="w-4 h-4 rounded cursor-pointer accent-blue-500"
                        />
                        <span className={`text-sm ml-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                          Create for multiple years
                        </span>
                      </label>
                    )}

                    {/* Include Sunday checkbox - for daily, monthly, quarterly, and yearly tasks */}
                    {(formData.taskType === 'daily' || isMonthly || isQuarterly || isYearly) && (
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          name="includeSunday"
                          checked={formData.includeSunday}
                          onChange={handleInputChange}
                          className="w-4 h-4 rounded cursor-pointer accent-blue-500"
                        />
                        <span className={`text-sm ml-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>Include Sunday</span>
                      </label>
                    )}
                  </div>

                  {/* Yearly Duration Selection */}
                  {isYearly && formData.isForever && (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-primary)10',
                        borderColor: 'var(--color-primary-border)'
                      }}
                    >
                      <label className={`block text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        How many years should this task repeat? <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="yearlyDuration"
                        value={formData.yearlyDuration}
                        onChange={handleInputChange}
                        className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-[var(--color-primary)]/30 focus:border-[var(--color-primary)] transition-all font-medium text-lg ${
                          isDark
                            ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400'
                            : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500 focus:bg-white'
                        }`}
                      >
                        <option value={3}>3 years</option>
                        <option value={5}>5 years</option>
                        <option value={10}>10 years</option>
                      </select>
                    </div>
                  )}

                  {/* Yearly Task Preview */}
                  {isYearly && formData.startDate && (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-info-light)',
                        borderColor: 'var(--color-info-border)'
                      }}
                    >
                      <p className={`text-sm font-semibold mb-2 flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <Calendar className="inline mr-1" size={14} />
                        Task Preview ({calculateYearlyTasks()} task{calculateYearlyTasks() > 1 ? 's' : ''}):
                      </p>
                      <div className="space-y-1">
                        {getYearlyTaskPreview().map((date, index) => (
                          <div key={index} className={`text-xs ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            • {date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              weekday: 'long'
                            })}
                            {!formData.includeSunday && new Date(formData.startDate).getDay() === 0 && index === 0 && (
                              <span className="text-orange-600 ml-1">(moved from Sunday)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quarterly Task Preview */}
                  {isQuarterly && formData.startDate && (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-info-light)',
                        borderColor: 'var(--color-info-border)'
                      }}
                    >
                      <p className={`text-sm font-semibold mb-2 flex items-center gap-1 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <Calendar className="inline mr-1" size={14} />
                        Quarterly Task Preview (4 tasks for one year):
                      </p>
                      <div className="space-y-1">
                        {getQuarterlyTaskPreview().map((date, index) => (
                          <div key={index} className={`text-xs ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                            • Quarter {index + 1}: {date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'long', 
                              day: 'numeric',
                              weekday: 'long'
                            })}
                            {!formData.includeSunday && date.getDay() === 0 && (
                              <span className="text-orange-600 ml-1">(moved from Sunday)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sunday warning for monthly, quarterly and yearly tasks */}
                  {(isMonthly || isQuarterly || isYearly) && !formData.includeSunday && (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-warning-light)',
                        borderColor: 'var(--color-warning-border)'
                      }}
                    >
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <strong>Note:</strong> If any {isMonthly ? 'monthly' : isQuarterly ? 'quarterly' : 'yearly'} task falls on a Sunday, it will be moved to the previous day (Saturday).
                      </p>
                    </div>
                  )}

                  {isRecurring && (
                    <div
                      className="p-3 rounded-lg border"
                      style={{
                        backgroundColor: 'var(--color-surface)',
                        borderColor: 'var(--color-border)'
                      }}
                    >
                      <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                        <strong>Task Generation:</strong>
                        {formData.taskType === 'daily' && ' Individual tasks will be created for each day in the selected date range.'}
                        {formData.taskType === 'weekly' && ' Tasks will be created for each occurrence of the selected days within the date range.'}
                        {formData.taskType === 'monthly' && ` Tasks will be created for the ${formData.monthlyDay}${formData.monthlyDay === 1 ? 'st' : formData.monthlyDay === 2 ? 'nd' : formData.monthlyDay === 3 ? 'rd' : 'th'} day of each month within the date range.`}
                        {formData.taskType === 'quarterly' && ' Tasks will be created for 4 quarters (every 3 months) starting from the selected date for one year.'}
                        {formData.taskType === 'yearly' && !formData.isForever && ' A single task will be created for the selected date.'}
                        {formData.taskType === 'yearly' && formData.isForever && ` Exactly ${formData.yearlyDuration} tasks will be created, one for each year starting from the selected date.`}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Voice Recording Section */}
          <VoiceRecorder 
            ref={voiceRecorderRef}
            onRecordingComplete={handleVoiceRecordingComplete}
            onRecordingDeleted={handleVoiceRecordingDeleted}
            isDark={isDark}
          />

          {/* Attachments */}
          <div className={`rounded-2xl border overflow-hidden transition-all shadow-sm hover:shadow-md ${
            isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'
          }`}>
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary)12' }}>
                  <Paperclip size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                  Attachments (Max 10MB per file)
                </h2>
              </div>
              
              {/* Centered File Upload Area */}
              <div className="flex flex-col items-center justify-center">
                <div className={`w-full max-w-md p-6 rounded-xl border-2 border-dashed text-center transition-all ${
                  isDark 
                    ? 'border-gray-600 bg-gray-700/50 hover:border-gray-500 hover:bg-gray-700' 
                    : 'border-gray-300 bg-gray-50 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary)]/5'
                }`}>
                  <div className="mb-4">
                    <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl" style={{ backgroundColor: 'var(--color-primary)10' }}>
                      <Paperclip size={20} style={{ color: 'var(--color-primary)' }} />
                    </div>
                  </div>
                  
                  <input
                    type="file"
                    multiple
                    onChange={handleFileChange}
                    className={`hidden`}
                    id="file-input"
                  />
                  
                  <label htmlFor="file-input" className="cursor-pointer">
                    <p className={`text-sm font-semibold mb-1 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                      Click to upload files
                    </p>
                    <p className={`text-xs mb-3 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      or drag and drop
                    </p>
                  </label>
                  
                  <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    Supported formats: PDF, images (JPG, PNG), documents (DOCX, XLSX), voice recordings. Max 10MB per file.
                  </p>
                </div>
              </div>

              {/* Selected Files List */}
              {attachments.length > 0 && (
                <div className="mt-5">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckSquare size={14} style={{ color: 'var(--color-primary)' }} />
                    <p className={`text-sm font-semibold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                      Selected files ({attachments.length}):
                    </p>
                  </div>
                  <div className="space-y-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isAudioFile(file) 
                            ? (isDark ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50/80 border-blue-200')
                            : (isDark ? 'bg-gray-700/50 border-gray-600' : 'bg-gray-50/80 border-gray-200')
                        }`}
                      >
                        <span className={`text-sm font-medium flex items-center gap-1 ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                          {isAudioFile(file) && (
                            <span className="flex items-center gap-1">
                              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                              <Volume2 size={14} className="text-blue-500" />
                              <span className="text-xs font-semibold text-blue-600">Voice</span>
                            </span>
                          )}
                          <span className={isAudioFile(file) ? '' : ''}>
                            {file.name}
                          </span>
                          <span className={`text-xs font-medium ml-auto ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            {(file.size / 1024 / 1024).toFixed(2)} MB
                          </span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="p-1 rounded-lg transition-all hover:scale-110"
                          style={{ color: 'var(--color-error)', backgroundColor: 'var(--color-error)/10' }}
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No files message */}
              {attachments.length === 0 && (
                <div className="mt-3 p-3 rounded-xl border border-dashed" style={{ borderColor: 'var(--color-primary)30', backgroundColor: 'var(--color-primary)05' }}>
                  <p className={`text-sm text-center font-medium ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    No file chosen
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={resetForm}
              className={`px-6 py-3 border rounded-xl font-semibold transition-colors ${
                isDark
                  ? 'border-gray-600 text-gray-100 hover:bg-gray-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
              style={{ borderColor: 'var(--color-border)', color: 'var(--color-text)', backgroundColor: 'var(--color-surface)' }}
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 text-white rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
              style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                  Creating Tasks...
                </>
              ) : (
                <>
                  <UserPlus size={18} className="mr-3" />
                  Create Tasks
                </>
              )}
            </button>
          </div>
        </form>
        
        {/* ToastContainer for React-Toastify alerts */}
        <ToastContainer
          position="top-right"
          autoClose={1500}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme={isDark ? "dark" : "light"}
        />
      </div>
    </div>
  );
};

export default AssignTask;