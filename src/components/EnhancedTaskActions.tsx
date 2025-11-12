import React, { useState } from 'react';
import { 
  CheckCircle, Clock, AlertTriangle, Edit3, MessageSquare, 
  Upload, Download, Eye, MoreVertical, ChevronDown, 
  Calendar, User, Flag, TrendingUp, FileText, 
  Zap, Sparkles, ArrowRight, CheckCircle2
} from 'lucide-react';

interface TaskAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  hoverColor: string;
  bgColor: string;
  description: string;
  requiresConfirmation?: boolean;
  disabled?: boolean;
  premium?: boolean;
}

interface EnhancedTaskActionsProps {
  task: {
    _id: string;
    title: string;
    status: string;
    priority: string;
    assignedTo?: any;
    attachments?: any[];
    dueDate?: string;
    progress?: number;
  };
  onUpdateProgress?: (taskId: string, progress: number) => void;
  onMarkComplete?: (taskId: string, remarks?: string) => void;
  onRequestExtension?: (taskId: string, newDate: string, reason: string) => void;
  onAddNotes?: (taskId: string, notes: string) => void;
  onUploadFiles?: (taskId: string, files: File[]) => void;
  onViewTask?: (taskId: string) => void;
  onEditTask?: (taskId: string) => void;
  className?: string;
  showQuickActions?: boolean;
  showAdvancedActions?: boolean;
  userRole?: string;
}

const EnhancedTaskActions: React.FC<EnhancedTaskActionsProps> = ({
  task,
  onUpdateProgress,
  onMarkComplete,
  onRequestExtension,
  onAddNotes,
  onUploadFiles,
  onViewTask,
  onEditTask,
  className = '',
  showQuickActions = true,
  showAdvancedActions = true,
  userRole = 'employee'
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);
  const [showExtensionModal, setShowExtensionModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [progressValue, setProgressValue] = useState(task.progress || 0);
  const [newDueDate, setNewDueDate] = useState('');
  const [extensionReason, setExtensionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const getTaskStatusColor = () => {
    switch (task.status) {
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = () => {
    switch (task.priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const quickActions: TaskAction[] = [
    {
      id: 'view',
      label: 'View Details',
      icon: <Eye size={16} />,
      color: 'text-blue-600',
      hoverColor: 'hover:text-blue-700',
      bgColor: 'bg-blue-50 border-blue-200',
      description: 'View full task details and history'
    },
    {
      id: 'progress',
      label: 'Update Progress',
      icon: <TrendingUp size={16} />,
      color: 'text-purple-600',
      hoverColor: 'hover:text-purple-700',
      bgColor: 'bg-purple-50 border-purple-200',
      description: 'Update task progress percentage',
      premium: true
    }
  ];

  const actionActions: TaskAction[] = [
    {
      id: 'complete',
      label: 'Mark Complete',
      icon: <CheckCircle2 size={16} />,
      color: 'text-green-600',
      hoverColor: 'hover:text-green-700',
      bgColor: 'bg-green-50 border-green-200',
      description: 'Mark task as completed',
      requiresConfirmation: true
    },
    {
      id: 'extend',
      label: 'Request Extension',
      icon: <Calendar size={16} />,
      color: 'text-orange-600',
      hoverColor: 'hover:text-orange-700',
      bgColor: 'bg-orange-50 border-orange-200',
      description: 'Request deadline extension',
      premium: true
    },
    {
      id: 'notes',
      label: 'Add Notes',
      icon: <MessageSquare size={16} />,
      color: 'text-indigo-600',
      hoverColor: 'hover:text-indigo-700',
      bgColor: 'bg-indigo-50 border-indigo-200',
      description: 'Add notes or updates'
    },
    {
      id: 'upload',
      label: 'Upload Files',
      icon: <Upload size={16} />,
      color: 'text-emerald-600',
      hoverColor: 'hover:text-emerald-700',
      bgColor: 'bg-emerald-50 border-emerald-200',
      description: 'Upload task attachments'
    },
    {
      id: 'edit',
      label: 'Edit Task',
      icon: <Edit3 size={16} />,
      color: 'text-gray-600',
      hoverColor: 'hover:text-gray-700',
      bgColor: 'bg-gray-50 border-gray-200',
      description: 'Edit task details',
      disabled: userRole !== 'admin' && userRole !== 'manager'
    }
  ];

  const handleAction = async (actionId: string) => {
    switch (actionId) {
      case 'view':
        onViewTask?.(task._id);
        break;
      case 'progress':
        setShowProgressModal(true);
        break;
      case 'complete':
        setShowCompleteModal(true);
        break;
      case 'extend':
        setShowExtensionModal(true);
        break;
      case 'notes':
        setShowNotesModal(true);
        break;
      case 'upload':
        setShowUploadModal(true);
        break;
      case 'edit':
        onEditTask?.(task._id);
        break;
    }
    setShowDropdown(false);
  };

  const handleProgressUpdate = () => {
    onUpdateProgress?.(task._id, progressValue);
    setShowProgressModal(false);
  };

  const handleMarkComplete = () => {
    onMarkComplete?.(task._id, completionRemarks);
    setShowCompleteModal(false);
  };

  const handleRequestExtension = () => {
    onRequestExtension?.(task._id, newDueDate, extensionReason);
    setShowExtensionModal(false);
    setExtensionReason('');
    setNewDueDate('');
  };

  const handleAddNotes = () => {
    onAddNotes?.(task._id, notes);
    setShowNotesModal(false);
    setNotes('');
  };

  const handleFileUpload = () => {
    onUploadFiles?.(task._id, selectedFiles);
    setShowUploadModal(false);
    setSelectedFiles([]);
  };

  const renderActionButton = (action: TaskAction, compact = false) => (
    <button
      key={action.id}
      onClick={() => handleAction(action.id)}
      disabled={action.disabled}
      className={`
        flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium 
        transition-all duration-200 transform hover:scale-105 hover:shadow-md
        ${action.color} ${action.hoverColor} ${action.bgColor}
        ${action.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'}
        ${compact ? 'px-3 py-2' : 'px-4 py-2'}
        group
      `}
      title={action.description}
    >
      <div className="relative">
        {action.icon}
        {action.premium && (
          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
        )}
      </div>
      {!compact && (
        <span className="hidden sm:inline">{action.label}</span>
      )}
    </button>
  );

  const renderModal = (
    isOpen: boolean,
    onClose: () => void,
    title: string,
    children: React.ReactNode,
    onSubmit?: () => void,
    submitText?: string,
    submitDisabled?: boolean
  ) => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                {title}
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              {children}
            </div>
            {onSubmit && (
              <div className="flex gap-3 mt-6">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={onSubmit}
                  disabled={submitDisabled}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {submitText || 'Save'}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`relative ${className}`}>
      {/* Status and Priority Badges */}
      <div className="flex gap-2 mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTaskStatusColor()}`}>
          {task.status.replace('-', ' ').toUpperCase()}
        </span>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor()}`}>
          <Flag className="w-3 h-3 mr-1" />
          {task.priority.toUpperCase()}
        </span>
        {task.progress !== undefined && task.progress > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            <TrendingUp className="w-3 h-3 mr-1" />
            {task.progress}%
          </span>
        )}
      </div>

      {/* Quick Actions Bar */}
      {showQuickActions && (
        <div className="flex flex-wrap gap-2 mb-3">
          {quickActions.slice(0, 2).map(action => renderActionButton(action, true))}
          
          {/* More Actions Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="flex items-center gap-2 px-3 py-2 border border-gray-200 text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <MoreVertical size={16} />
              <ChevronDown size={14} className={`transform transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
            </button>
            
            {showDropdown && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-10">
                <div className="p-2">
                  {actionActions.map(action => (
                    <button
                      key={action.id}
                      onClick={() => handleAction(action.id)}
                      disabled={action.disabled}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2 text-sm rounded-lg transition-colors
                        ${action.color} ${action.hoverColor} hover:bg-gray-50
                        ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      `}
                    >
                      <div className="relative">
                        {action.icon}
                        {action.premium && (
                          <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-500" />
                        )}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium">{action.label}</div>
                        <div className="text-xs text-gray-500">{action.description}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Advanced Actions Grid */}
      {showAdvancedActions && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {actionActions.map(action => renderActionButton(action))}
        </div>
      )}

      {/* Progress Update Modal */}
      {renderModal(
        showProgressModal,
        () => setShowProgressModal(false),
        'Update Progress',
        (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Progress: {progressValue}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={progressValue}
              onChange={(e) => setProgressValue(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            {progressValue === 100 && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Progress is 100%. Would you like to mark this task as completed?
                </p>
                <button
                  onClick={() => {
                    setShowProgressModal(false);
                    setShowCompleteModal(true);
                  }}
                  className="mt-2 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  Mark as Complete
                </button>
              </div>
            )}
          </div>
        ),
        () => handleProgressUpdate(),
        'Update Progress',
        false
      )}

      {/* Complete Task Modal */}
      {renderModal(
        showCompleteModal,
        () => setShowCompleteModal(false),
        'Mark Task Complete',
        (
          <div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to mark "<strong>{task.title}</strong>" as completed?
            </p>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Completion Remarks (Optional)
              </label>
              <textarea
                value={completionRemarks}
                onChange={(e) => setCompletionRemarks(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add any notes about the completion..."
              />
            </div>
          </div>
        ),
        () => handleMarkComplete(),
        'Mark Complete'
      )}

      {/* Extension Request Modal */}
      {renderModal(
        showExtensionModal,
        () => setShowExtensionModal(false),
        'Request Extension',
        (
          <div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Due Date
              </label>
              <p className="text-gray-900">
                {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date set'}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Due Date
              </label>
              <input
                type="date"
                value={newDueDate}
                onChange={(e) => setNewDueDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for Extension
              </label>
              <textarea
                value={extensionReason}
                onChange={(e) => setExtensionReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Please provide a reason for the extension request..."
                required
              />
            </div>
          </div>
        ),
        () => handleRequestExtension(),
        'Request Extension',
        !newDueDate || !extensionReason.trim()
      )}

      {/* Add Notes Modal */}
      {renderModal(
        showNotesModal,
        () => setShowNotesModal(false),
        'Add Notes',
        (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add your notes or updates..."
              required
            />
          </div>
        ),
        () => handleAddNotes(),
        'Add Notes',
        !notes.trim()
      )}

      {/* Upload Files Modal */}
      {renderModal(
        showUploadModal,
        () => setShowUploadModal(false),
        'Upload Files',
        (
          <div>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <div className="space-y-2">
                <p className="text-gray-600">Drop files here or click to browse</p>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                >
                  Choose Files
                </label>
              </div>
            </div>
            {selectedFiles.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Selected Files:</p>
                <div className="space-y-2">
                  {selectedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      <FileText className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-900">{file.name}</span>
                      <span className="text-xs text-gray-500">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ),
        () => handleFileUpload(),
        'Upload Files',
        selectedFiles.length === 0
      )}

      {/* Click outside to close dropdown */}
      {showDropdown && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setShowDropdown(false)}
        />
      )}
    </div>
  );
};

export default EnhancedTaskActions;