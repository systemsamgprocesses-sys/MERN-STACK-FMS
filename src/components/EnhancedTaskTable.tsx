import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Archive, History, Filter, Search, Trash2, Users, Calendar, ChevronDown, 
  ChevronUp, ArrowUpDown, Eye, Paperclip, FileText, Edit3, RotateCcw, 
  ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Info, Download, 
  ExternalLink, AlertCircle, CheckCircle, Clock, Tag, SortAsc, SortDesc,
  RefreshCw, X, MoreVertical, Download as DownloadIcon
} from 'lucide-react';
import { Task } from '../types/Task';

interface User {
  _id: string;
  username: string;
  email: string;
  phoneNumber?: string;
}

interface Attachment {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  uploadedAt: string;
}

interface FilterState {
  search: string;
  status: string;
  priority: string;
  assignedTo: string;
  category: string;
  dateFrom: string;
  dateTo: string;
  overdue: boolean;
  hasAttachments: boolean | null;
  isCompleted: boolean | null;
}

interface SortConfig {
  key: 'dueDate' | 'created' | 'priority' | 'status' | 'assignedTo' | 'title' | 'updated';
  direction: 'asc' | 'desc';
}

interface EnhancedTaskTableProps {
  tasks: Task[];
  users: User[];
  loading: boolean;
  onEditTask?: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  onViewTask?: (task: Task) => void;
  onRefresh?: () => void;
  userPermissions?: {
    canEditTasks?: boolean;
    canDeleteTasks?: boolean;
    canViewAllTeamTasks?: boolean;
  };
  title?: string;
  showBulkActions?: boolean;
  onBulkAction?: (action: string, taskIds: string[]) => void;
}

const EnhancedTaskTable: React.FC<EnhancedTaskTableProps> = ({
  tasks,
  users,
  loading,
  onEditTask,
  onDeleteTask,
  onViewTask,
  onRefresh,
  userPermissions = {},
  title = "Task Management",
  showBulkActions = true,
  onBulkAction
}) => {
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'dueDate', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(true);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [showAttachmentsModal, setShowAttachmentsModal] = useState<{ attachments: Attachment[], taskTitle: string } | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [showRemarksModal, setShowRemarksModal] = useState<Task | null>(null);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  const [filterState, setFilterState] = useState<FilterState>({
    search: '',
    status: '',
    priority: '',
    assignedTo: '',
    category: '',
    dateFrom: '',
    dateTo: '',
    overdue: false,
    hasAttachments: null,
    isCompleted: null
  });

  // Debounced search function
  const debouncedSearch = useCallback((searchTerm: string) => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    const timeout = setTimeout(() => {
      setFilterState(prev => ({ ...prev, search: searchTerm }));
    }, 300);
    
    setSearchTimeout(timeout);
  }, [searchTimeout]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = tasks.filter((task: Task) => {
      // Search filter - enhanced with better matching
      if (filterState.search) {
        const searchLower = filterState.search.toLowerCase();
        const matchesSearch =
          task.title.toLowerCase().includes(searchLower) ||
          task.description.toLowerCase().includes(searchLower) ||
          (task.assignedTo?.username?.toLowerCase().includes(searchLower)) ||
          (task.assignedBy?.username?.toLowerCase().includes(searchLower)) ||
          (task.assignedTo?.email?.toLowerCase().includes(searchLower)) ||
          (task.assignedTo?.phoneNumber?.toLowerCase().includes(searchLower));

        if (!matchesSearch) return false;
      }

      // Status filter
      if (filterState.status && task.status !== filterState.status) {
        return false;
      }

      // Priority filter
      if (filterState.priority && task.priority !== filterState.priority) {
        return false;
      }

      // Assigned to filter
      if (filterState.assignedTo && (!task.assignedTo || task.assignedTo._id !== filterState.assignedTo)) {
        return false;
      }

      // Category filter - removed as category doesn't exist on Task type
      // if (filterState.category && task.category !== filterState.category) {
      //   return false;
      // }

      // Date range filter for due date
      if (filterState.dateFrom || filterState.dateTo) {
        if (!task.dueDate) return false; // Skip tasks without due date when date filter is applied
        const taskDate = new Date(task.dueDate);
        if (filterState.dateFrom) {
          const fromDate = new Date(filterState.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (taskDate < fromDate) return false;
        }
        if (filterState.dateTo) {
          const toDate = new Date(filterState.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (taskDate > toDate) return false;
        }
      }

      // Overdue filter - new enhanced feature
      if (filterState.overdue) {
        if (task.status === 'completed' || !task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (dueDate >= today) return false;
      }

      // Has attachments filter
      if (filterState.hasAttachments !== null) {
        const hasAttachments = task.attachments && task.attachments.length > 0;
        if (filterState.hasAttachments !== hasAttachments) return false;
      }

      // Is completed filter
      if (filterState.isCompleted !== null) {
        const isCompleted = task.status === 'completed';
        if (filterState.isCompleted !== isCompleted) return false;
      }

      return true;
    });

    // Sort tasks
    filtered.sort((a: Task, b: Task) => {
      let aValue: any, bValue: any;

      switch (sortConfig.key) {
        case 'dueDate':
          aValue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
          bValue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
          break;
        case 'created':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updated':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'priority':
          const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1, normal: 1 };
          aValue = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
          bValue = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
          break;
        case 'status':
          const statusOrder = { overdue: 4, pending: 3, 'in-progress': 2, completed: 1 };
          aValue = statusOrder[a.status as keyof typeof statusOrder] || 0;
          bValue = statusOrder[b.status as keyof typeof statusOrder] || 0;
          break;
        case 'assignedTo':
          aValue = a.assignedTo?.username || '';
          bValue = b.assignedTo?.username || '';
          break;
        case 'title':
          aValue = a.title.toLowerCase();
          bValue = b.title.toLowerCase();
          break;
        default:
          aValue = a.createdAt;
          bValue = b.createdAt;
      }

      if (sortConfig.direction === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredTasks(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [tasks, filterState, sortConfig]);

  const resetFilters = () => {
    setFilterState({
      search: '',
      status: '',
      priority: '',
      assignedTo: '',
      category: '',
      dateFrom: '',
      dateTo: '',
      overdue: false,
      hasAttachments: null,
      isCompleted: null
    });
    setCurrentPage(1);
  };

  const handleSort = (key: SortConfig['key']) => {
    if (sortConfig.key === key) {
      setSortConfig({
        key,
        direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
      });
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleTaskSelection = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks);
    if (checked) {
      newSelected.add(taskId);
    } else {
      newSelected.delete(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(currentTasks.map(task => task._id)));
    } else {
      setSelectedTasks(new Set());
    }
  };

  const handleBulkAction = (action: string) => {
    if (onBulkAction && selectedTasks.size > 0) {
      onBulkAction(action, Array.from(selectedTasks));
    }
  };

  const getSortIcon = (column: SortConfig['key']) => {
    if (sortConfig.key !== column) {
      return <ArrowUpDown size={14} className="text-gray-400" />;
    }
    return sortConfig.direction === 'asc' ?
      <SortAsc size={14} className="text-blue-600" /> :
      <SortDesc size={14} className="text-blue-600" />;
  };

  const isTaskOverdue = (dueDate?: string, status?: string) => {
    if (status === 'completed' || !dueDate) return false;
    const dueDateTime = new Date(dueDate);
    dueDateTime.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDateTime < today;
  };

  const toggleDescriptionExpansion = (taskId: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const isImage = (filename: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lowercasedFilename = filename.toLowerCase();
    return imageExtensions.some(ext => lowercasedFilename.endsWith(ext));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200 animate-pulse';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string, isOverdue = false) => {
    if (isOverdue) return 'bg-red-100 text-red-800 border-red-200';
    
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string, isOverdue = false) => {
    if (isOverdue) return <AlertCircle size={16} />;
    
    switch (status) {
      case 'pending': return <Clock size={16} />;
      case 'in-progress': return <RefreshCw size={16} />;
      case 'completed': return <CheckCircle size={16} />;
      default: return <Clock size={16} />;
    }
  };

  // Calculate pagination
  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = filteredTasks.slice(startIndex, endIndex);

  // Helper function to check if actions column should be shown
  const shouldShowActionsColumn = () => {
    if (userPermissions.canEditTasks || userPermissions.canDeleteTasks) {
      return true;
    }
    return currentTasks.some(task => task.revisionCount > 0);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Archive className="h-6 w-6 text-blue-600" />
            {title}
          </h1>
          <p className="text-gray-600 mt-1">
            {filteredTasks.length} of {tasks.length} task(s) found
            {userPermissions.canViewAllTeamTasks ? ' (All team members)' : ' (Your tasks)'}
          </p>
        </div>
        <div className="flex items-center mt-4 sm:mt-0 gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
          >
            <Filter size={16} />
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Search */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Search size={14} className="inline mr-1" />
                Search Tasks
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search titles, descriptions, users, categories..."
                  onChange={(e) => debouncedSearch(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filterState.status}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setFilterState(prev => ({ ...prev, status: newValue }));
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filterState.priority}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setFilterState(prev => ({ ...prev, priority: newValue }));
                }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>

            {/* Assigned To (Admin only) */}
            {userPermissions.canViewAllTeamTasks && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Users size={14} className="inline mr-1" />
                  Assigned To
                </label>
                <select
                  value={filterState.assignedTo}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setFilterState(prev => ({ ...prev, assignedTo: newValue }));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                >
                  <option value="">All Team Members</option>
                  {users.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.username} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={14} className="inline mr-1" />
                Date From
              </label>
              <input
                type="date"
                value={filterState.dateFrom}
                onChange={(e) => setFilterState({ ...filterState, dateFrom: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar size={14} className="inline mr-1" />
                Date To
              </label>
              <input
                type="date"
                value={filterState.dateTo}
                onChange={(e) => setFilterState({ ...filterState, dateTo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Advanced Filters */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Quick Filters
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filterState.overdue}
                    onChange={(e) => setFilterState({ ...filterState, overdue: e.target.checked })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-red-600">Overdue Only</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filterState.hasAttachments === true}
                    onChange={(e) => setFilterState({ ...filterState, hasAttachments: e.target.checked ? true : null })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Has Attachments</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={filterState.isCompleted === false}
                    onChange={(e) => setFilterState({ ...filterState, isCompleted: e.target.checked ? false : null })}
                    className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-600">Incomplete Only</span>
                </label>
              </div>
            </div>

            {/* Clear Filters */}
            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <RotateCcw size={16} />
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Actions */}
      {showBulkActions && selectedTasks.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                {selectedTasks.size} task(s) selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleBulkAction('complete')}
                className="px-3 py-1 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
              >
                Mark Complete
              </button>
              <button
                onClick={() => handleBulkAction('archive')}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Archive
              </button>
              <button
                onClick={() => setSelectedTasks(new Set())}
                className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Selection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Table */}
      {filteredTasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <Archive size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-lg text-gray-600 mb-4">
            {Object.values(filterState).some(value => value !== '' && value !== false && value !== null)
              ? 'No tasks match your filters'
              : 'No tasks found'}
          </p>
          {Object.values(filterState).some(value => value !== '' && value !== false && value !== null) && (
            <button
              onClick={resetFilters}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Clear all filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {showBulkActions && (
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedTasks.size === currentTasks.length && currentTasks.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                  </tr>
                )}
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('title')}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>Task</span>
                      {getSortIcon('title')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>Status</span>
                      {getSortIcon('status')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('priority')}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>Priority</span>
                      {getSortIcon('priority')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('assignedTo')}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>Assigned To</span>
                      {getSortIcon('assignedTo')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('dueDate')}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>Due Date</span>
                      {getSortIcon('dueDate')}
                    </button>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('updated')}
                      className="flex items-center space-x-1 hover:text-gray-700 transition-colors"
                    >
                      <span>Updated</span>
                      {getSortIcon('updated')}
                    </button>
                  </th>
                  {shouldShowActionsColumn() && (
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentTasks.map((task, index) => {
                  const isOverdue = isTaskOverdue(task.dueDate, task.status);
                  const isExpanded = expandedDescriptions.has(task._id);
                  const showReadMore = task.description.length > 100;
                  const displayedDescription = isExpanded || !showReadMore
                    ? task.description
                    : `${task.description.substring(0, 100)}...`;

                  return (
                    <tr
                      key={task._id}
                      className={`hover:bg-gray-50 transition-colors ${isOverdue ? 'bg-red-25 hover:bg-red-50' : ''}`}
                    >
                      {showBulkActions && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedTasks.has(task._id)}
                            onChange={(e) => handleTaskSelection(task._id, e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex items-start">
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 flex items-center gap-2">
                              {task.title}
                              {isOverdue && (
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              )}
                              {task.revisionCount > 0 && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  <History size={10} className="mr-1" />
                                  {task.revisionCount}x
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              {displayedDescription}
                              {showReadMore && (
                                <button
                                  onClick={() => toggleDescriptionExpansion(task._id)}
                                  className="ml-1 text-blue-500 hover:underline text-xs"
                                >
                                  {isExpanded ? 'Show Less' : 'Show More'}
                                </button>
                              )}
                            </div>
                            {task.attachments && task.attachments.length > 0 && (
                              <div className="flex items-center mt-2 text-xs text-gray-500">
                                <Paperclip className="h-3 w-3 mr-1" />
                                {task.attachments.length} attachment(s)
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status, isOverdue)}`}>
                          {getStatusIcon(task.status, isOverdue)}
                          {isOverdue ? 'OVERDUE' : task.status.replace('-', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                          <Tag className="h-3 w-3 mr-1" />
                          {task.priority.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3">
                            {task.assignedTo?.username?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {task.assignedTo?.username || 'Unassigned'}
                            </div>
                            {task.assignedTo?.email && (
                              <div className="text-xs text-gray-500">{task.assignedTo.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: 'numeric',
                            year: 'numeric',
                          }) : 'N/A'}
                        </div>
                        {isOverdue && (
                          <div className="text-xs text-red-500">Overdue</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(task.createdAt).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      {shouldShowActionsColumn() && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {task.attachments && task.attachments.length > 0 && (
                              <button
                                onClick={() => setShowAttachmentsModal({ attachments: task.attachments, taskTitle: task.title })}
                                className="p-1 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded transition-colors"
                                title="View attachments"
                              >
                                <Paperclip size={16} />
                              </button>
                            )}
                            {task.completionRemarks && task.completedAt && (
                              <button
                                onClick={() => setShowRemarksModal(task)}
                                className="p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors"
                                title="View completion remarks"
                              >
                                <Info size={16} />
                              </button>
                            )}
                            {onViewTask && (
                              <button
                                onClick={() => onViewTask(task)}
                                className="p-1 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded transition-colors"
                                title="View task details"
                              >
                                <Eye size={16} />
                              </button>
                            )}
                            {task.status !== 'completed' && userPermissions.canEditTasks && onEditTask && (
                              <button
                                onClick={() => onEditTask(task)}
                                className="p-1 text-green-600 hover:text-green-900 hover:bg-green-50 rounded transition-colors"
                                title="Edit task"
                              >
                                <Edit3 size={16} />
                              </button>
                            )}
                            {userPermissions.canDeleteTasks && onDeleteTask && (
                              <button
                                onClick={() => onDeleteTask(task._id)}
                                className="p-1 text-red-600 hover:text-red-900 hover:bg-red-50 rounded transition-colors"
                                title="Delete task"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Items per page selector */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-700">Show:</span>
              <select
                value={itemsPerPage}
                onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                className="text-sm px-2 py-1 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-gray-700">per page</span>
            </div>

            {/* Page info */}
            <div className="flex items-center">
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                <span className="font-medium">{Math.min(endIndex, filteredTasks.length)}</span> of{' '}
                <span className="font-medium">{filteredTasks.length}</span> results
              </p>
            </div>

            {/* Pagination controls */}
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(1)}
                disabled={currentPage === 1}
                className="p-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="First page"
              >
                <ChevronsLeft size={16} />
              </button>

              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>

              <div className="flex items-center space-x-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage <= 3) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => handlePageChange(pageNumber)}
                      className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        currentPage === pageNumber
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-700 bg-white border border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>

              <button
                onClick={() => handlePageChange(totalPages)}
                disabled={currentPage === totalPages}
                className="p-2 text-sm font-medium text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Last page"
              >
                <ChevronsRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attachments Modal */}
      {showAttachmentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Paperclip size={20} />
                Attachments - {showAttachmentsModal.taskTitle}
              </h3>
            </div>
            <div className="p-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {showAttachmentsModal.attachments.map((attachment, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 bg-gray-50 hover:shadow-md transition-shadow">
                    <div className="flex flex-col h-full">
                      {isImage(attachment.filename) ? (
                        <div className="relative group mb-3">
                          <img
                            src={`/uploads/${attachment.filename}`}
                            alt={attachment.originalName}
                            className="w-full h-32 object-cover rounded-md border border-gray-200 cursor-pointer"
                            onClick={() => setSelectedImagePreview(`/uploads/${attachment.filename}`)}
                          />
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-200 rounded-md flex items-center justify-center">
                            <ExternalLink size={24} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-white border border-gray-200 rounded-md flex items-center justify-center mb-3">
                          <FileText size={48} className="text-gray-400" />
                        </div>
                      )}

                      <div className="space-y-2 flex-1">
                        <h4 className="text-sm font-medium text-gray-900 truncate" title={attachment.originalName}>
                          {attachment.originalName}
                        </h4>
                        <div className="text-xs text-gray-500 space-y-1">
                          <div>Size: {formatFileSize(attachment.size)}</div>
                          <div>Uploaded: {new Date(attachment.uploadedAt).toLocaleDateString()}</div>
                        </div>
                      </div>

                      <div className="flex gap-2 mt-3">
                        {isImage(attachment.filename) && (
                          <button
                            onClick={() => window.open(`/uploads/${attachment.filename}`, '_blank')}
                            className="flex-1 px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-1"
                          >
                            <ExternalLink size={12} />
                            View
                          </button>
                        )}
                        <button
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `/uploads/${attachment.filename}`;
                            link.download = attachment.originalName;
                            link.click();
                          }}
                          className={`flex-1 px-3 py-2 text-xs font-medium text-white rounded-lg transition-colors flex items-center justify-center gap-1 ${
                            isImage(attachment.filename) 
                              ? 'bg-green-600 hover:bg-green-700' 
                              : 'bg-blue-600 hover:bg-blue-700'
                          }`}
                        >
                          <DownloadIcon size={12} />
                          Download
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowAttachmentsModal(null)}
                className="px-4 py-2 font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Remarks Modal */}
      {showRemarksModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900">
                <Info size={20} />
                Completion Remarks
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-800 leading-relaxed">
                  {showRemarksModal.completionRemarks}
                </p>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowRemarksModal(null)}
                  className="px-4 py-2 font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-screen Image Preview Modal */}
      {selectedImagePreview && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedImagePreview(null)}
        >
          <div
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selectedImagePreview}
              alt="Full Screen Preview"
              className="max-w-full max-h-[90vh] object-contain cursor-pointer"
              onClick={() => setSelectedImagePreview(null)}
            />
            <button
              onClick={() => setSelectedImagePreview(null)}
              className="absolute top-4 right-4 text-white text-3xl bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-opacity"
              title="Close"
            >
              <X size={24} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTaskTable;