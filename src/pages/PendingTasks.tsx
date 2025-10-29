import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, Clock, RefreshCcw, Search, Users, Calendar, ArrowUpDown, ArrowUp, ArrowDown, Filter, Paperclip, FileText, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import axios from 'axios';
import ViewToggle from '../components/ViewToggle';
import PriorityBadge from '../components/PriorityBadge';
import TaskCompletionModal from '../components/TaskCompletionModal';
import { useTaskSettings } from '../hooks/useTaskSettings';
import { useTheme } from '../contexts/ThemeContext';
import { address } from '../../utils/ipAddress';

interface Attachment {
  filename: string;
  originalName: string;
  path: string;
  size: number;
  uploadedAt: string;
}

interface Task {
  _id: string;
  title: string;
  description: string;
  taskType: string;
  assignedBy: { username: string; email: string };
  assignedTo: {
    _id: string; username: string; email: string; phoneNumber?: string
  };
  dueDate?: string;
  priority: string;
  status: string;
  revisionCount: number;
  createdAt: string;
  attachments: Attachment[];
}

interface User {
  _id: string;
  username: string;
  email: string;
}

type SortOrder = 'asc' | 'desc' | 'none';

// Helper function to detect mobile devices
const isMobileDevice = () => {
  return window.innerWidth < 768; // md breakpoint in Tailwind
};

// Helper function to check if currently on mobile
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(isMobileDevice);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(isMobileDevice());
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isMobile;
};

// Helper function to get initial view preference
const getInitialViewPreference = (): 'table' | 'card' => {
  const savedView = localStorage.getItem('taskViewPreference');

  // If there's a saved preference, use it
  if (savedView === 'table' || savedView === 'card') {
    return savedView;
  }

  // If no saved preference, default to 'card' on mobile, 'table' on desktop
  return isMobileDevice() ? 'card' : 'table';
};

const PendingTasks: React.FC = () => {
  const { user } = useAuth();
  const { theme } = useTheme();
  const { settings: taskSettings, loading: settingsLoading } = useTaskSettings();
  const isMobile = useIsMobile();
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'card'>(getInitialViewPreference);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [filter, setFilter] = useState({
    priority: '',
    assignedTo: '',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [showReviseModal, setShowReviseModal] = useState<string | null>(null);
  const [showObjectionModal, setShowObjectionModal] = useState<string | null>(null);
  const [objectionType, setObjectionType] = useState<'date_change' | 'terminate' | 'hold'>('date_change');
  const [revisionDate, setRevisionDate] = useState('');
  const [revisionRemarks, setRevisionRemarks] = useState('');
  const [objectionRemarks, setObjectionRemarks] = useState('');
  const [objectionRequestedDate, setObjectionRequestedDate] = useState('');
  const [showFullDescription, setShowFullDescription] = useState<{ [key: string]: boolean }>({});
  const [fmsTasks, setFmsTasks] = useState<any[]>([]);
  const [showFMSCompleteModal, setShowFMSCompleteModal] = useState<{ projectId: string; taskIndex: number } | null>(null);
  const [showFMSObjectionModal, setShowFMSObjectionModal] = useState<{ projectId: string; taskIndex: number } | null>(null);

  const [showFilters, setShowFilters] = useState(false);
  const [showAttachmentsModal, setShowAttachmentsModal] = useState<Attachment[] | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<{ [key: string]: boolean }>({});

  // Calculate pagination
  const totalPages = Math.ceil(tasks.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTasks = tasks.slice(startIndex, endIndex);

  // Force card view on mobile
  useEffect(() => {
    if (isMobile && view === 'table') {
      setView('card');
    }
  }, [isMobile, view]);

  useEffect(() => {
    localStorage.setItem('taskViewPreference', view);
  }, [view]);

  useEffect(() => {
    fetchTasks();
    if (user?.permissions.canViewAllTeamTasks) {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    applyFiltersAndSort();
    setCurrentPage(1);
  }, [allTasks, filter, sortOrder]);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        taskType: 'one-time'
      });

      if (!user?.permissions.canViewAllTeamTasks && user?.id) {
        params.append('userId', user.id);
      }

      const response = await axios.get(`${address}/api/tasks/pending?${params}`);
      setAllTasks(response.data);

      // Fetch FMS pending tasks
      if (user?.id) {
        const fmsResponse = await axios.get(`${address}/api/projects/pending-fms-tasks/${user.id}`);
        setFmsTasks(fmsResponse.data.tasks || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const applyFiltersAndSort = () => {
    let filteredTasks = [...allTasks];

    if (filter.assignedTo) {
      filteredTasks = filteredTasks.filter(task => task.assignedTo._id === filter.assignedTo);
    }

    if (filter.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filter.priority);
    }

    if (filter.search) {
      filteredTasks = filteredTasks.filter(task =>
        task.title.toLowerCase().includes(filter.search.toLowerCase()) ||
        task.description.toLowerCase().includes(filter.search.toLowerCase()) ||
        task.assignedTo.username.toLowerCase().includes(filter.search.toLowerCase())
      );
    }

    // Date range filter
    if (filter.dateFrom || filter.dateTo) {
      filteredTasks = filteredTasks.filter(task => {
        if (!task.dueDate) return false;

        const taskDate = new Date(task.dueDate);

        if (filter.dateFrom) {
          const fromDate = new Date(filter.dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          if (taskDate < fromDate) return false;
        }

        if (filter.dateTo) {
          const toDate = new Date(filter.dateTo);
          toDate.setHours(23, 59, 59, 999);
          if (taskDate > toDate) return false;
        }

        return true;
      });
    }

    if (sortOrder !== 'none') {
      filteredTasks.sort((a, b) => {
        const dateA = a.dueDate ? new Date(a.dueDate).setHours(0, 0, 0, 0) : Infinity;
        const dateB = b.dueDate ? new Date(b.dueDate).setHours(0, 0, 0, 0) : Infinity;

        if (sortOrder === 'asc') {
          return dateA - dateB;
        } else {
          return dateB - dateA;
        }
      });
    }

    setTasks(filteredTasks);
  };

  const handleReviseTask = async (taskId: string) => {
    try {
      await axios.post(`${address}/api/tasks/${taskId}/revise`, {
        newDate: revisionDate,
        remarks: revisionRemarks,
        revisedBy: user?.id
      });
      setShowReviseModal(null);
      setRevisionDate('');
      setRevisionRemarks('');
      fetchTasks();
    } catch (error) {
      console.error('Error revising task:', error);
    }
  };

  // New handler for raising objection
  const handleRaiseObjection = async (taskId: string) => {
    try {
      if (!objectionRemarks.trim()) {
        alert('Please provide remarks for the objection');
        return;
      }

      if (objectionType === 'date_change' && !objectionRequestedDate) {
        alert('Please select a new requested date');
        return;
      }

      await axios.post(`${address}/api/objections/task/${taskId}`, {
        type: objectionType,
        requestedDate: objectionType === 'date_change' ? objectionRequestedDate : undefined,
        remarks: objectionRemarks,
        requestedBy: user?.id
      });
      setShowObjectionModal(null);
      setObjectionRemarks('');
      setObjectionRequestedDate('');
      setObjectionType('date_change');
      fetchTasks();
      alert('Objection raised successfully. Waiting for approval.');
    } catch (error) {
      console.error('Error raising objection:', error);
      alert('Failed to raise objection');
    }
  };

  const handleCompleteFMSTask = (projectId: string, taskIndex: number) => {
    setShowFMSCompleteModal({ projectId, taskIndex });
  };

  const handleFMSObjection = (projectId: string, taskIndex: number) => {
    setShowFMSObjectionModal({ projectId, taskIndex });
  };

  const handleFMSTaskCompletion = async (projectId: string, taskIndex: number, remarks: string, attachments: File[]) => {
    try {
      const formData = new FormData();
      formData.append('remarks', remarks);
      formData.append('completedBy', user?.id || '');
      attachments.forEach((file) => {
        formData.append('files', file);
      });

      await axios.post(`${address}/api/projects/${projectId}/complete-task/${taskIndex}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setShowFMSCompleteModal(null);
      fetchTasks();
      alert('FMS task completed successfully!');
    } catch (error) {
      console.error('Error completing FMS task:', error);
      alert('Failed to complete FMS task');
    }
  };

  const handleRaiseFMSObjection = async () => {
    if (!showFMSObjectionModal) return;

    try {
      if (!objectionRemarks.trim()) {
        alert('Please provide remarks for the objection');
        return;
      }

      if (objectionType === 'date_change' && !objectionRequestedDate) {
        alert('Please select a new requested date');
        return;
      }

      await axios.post(`${address}/api/objections/fms/${showFMSObjectionModal.projectId}/task/${showFMSObjectionModal.taskIndex}`, {
        type: objectionType,
        requestedDate: objectionType === 'date_change' ? objectionRequestedDate : undefined,
        remarks: objectionRemarks,
        requestedBy: user?.id
      });

      setShowFMSObjectionModal(null);
      setObjectionRemarks('');
      setObjectionRequestedDate('');
      setObjectionType('date_change');
      fetchTasks();
      alert('FMS objection raised successfully. Waiting for approval.');
    } catch (error) {
      console.error('Error raising FMS objection:', error);
      alert('Failed to raise FMS objection');
    }
  };

  const resetFilters = () => {
    setFilter({ priority: '', assignedTo: '', search: '', dateFrom: '', dateTo: '' });
    setSortOrder('none');
    setCurrentPage(1);
  };

  const toggleSort = () => {
    if (sortOrder === 'none') {
      setSortOrder('asc');
    } else if (sortOrder === 'asc') {
      setSortOrder('desc');
    } else {
      setSortOrder('none');
    }
  };

  const getSortIcon = () => {
    if (sortOrder === 'asc') return <ArrowUp size={16} className="text-[--color-primary]" />;
    if (sortOrder === 'desc') return <ArrowDown size={16} className="text-[--color-primary]" />;
    return <ArrowUpDown size={16} className="text-[--color-textSecondary]" />;
  };

  const isOverdue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDueDate = new Date(dueDate);
    taskDueDate.setHours(0, 0, 0, 0);

    return taskDueDate < today;
  };

  const isDueToday = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const taskDueDate = new Date(dueDate);
    taskDueDate.setHours(0, 0, 0, 0);

    return taskDueDate.getTime() === today.getTime();
  };

  const toggleDescriptionVisibility = (taskId: string) => {
    setShowFullDescription(prevState => ({
      ...prevState,
      [taskId]: !prevState[taskId]
    }));
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const isImage = (filename: string) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const lowercasedFilename = filename.toLowerCase();
    return imageExtensions.some(ext => lowercasedFilename.endsWith(ext));
  };

  const handleDownload = async (attachment: Attachment) => {
    const downloadKey = `${attachment.filename}-${Date.now()}`;

    try {
      setDownloading(prev => ({ ...prev, [downloadKey]: true }));

      const response = await fetch(`${address}/uploads/${attachment.filename}`);

      if (!response.ok) {
        throw new Error('Failed to download file');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const tempAnchor = document.createElement('a');
      tempAnchor.href = url;
      tempAnchor.download = attachment.originalName;
      tempAnchor.style.display = 'none';

      document.body.appendChild(tempAnchor);
      tempAnchor.click();
      document.body.removeChild(tempAnchor);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading file:', error);
      alert('Failed to download file. Please try again.');
    } finally {
      setDownloading(prev => ({ ...prev, [downloadKey]: false }));
    }
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const handleTaskCompletion = () => {
    setShowCompleteModal(null);
    fetchTasks();
  };

  const getTaskToComplete = () => {
    return allTasks.find(task => task._id === showCompleteModal);
  };

  // Add print function - prints ALL tasks, not just current page
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Use allTasks to print everything, not just filtered/paginated tasks
    const tasksToprint = tasks.length > 0 ? tasks : allTasks;

    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tasks Report</title>
        <style>
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 20px; font-family: Arial, sans-serif; color: #1E293B; }
          .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 30px; border-bottom: 3px solid #6366F1; padding-bottom: 15px; }
          .logo { width: 60px; height: 60px; object-fit: contain; }
          .company-info { flex: 1; margin-left: 20px; }
          .title { font-size: 24px; font-weight: bold; color: #1E293B; margin: 0; }
          .subtitle { font-size: 12px; color: #64748B; margin: 5px 0 0 0; }
          .filter-info { font-size: 11px; color: #64748B; margin: 10px 0; padding: 10px; background-color: #F7F9FC; border-left: 3px solid #6366F1; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 11px; }
          .table th { background-color: #6366F1; color: white; padding: 12px; text-align: left; font-weight: bold; border: 1px solid #6366F1; }
          .table td { padding: 10px 12px; border: 1px solid #E2E8F0; }
          .table tr:nth-child(even) { background-color: #F7F9FC; }
          .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 10px; font-weight: bold; }
          .badge-high { background-color: #FEE2E2; color: #991B1B; }
          .badge-normal { background-color: #DBEAFE; color: #1E40AF; }
          .badge-pending { background-color: #FEF3C7; color: #92400E; }
          .badge-completed { background-color: #D1FAE5; color: #065F46; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 10px; color: #64748B; text-align: center; }
          .summary { margin: 10px 0; font-size: 12px; color: #64748B; }
          @media print { body { margin: 0; padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="/assets/AMG LOGO.webp" alt="Logo" class="logo" />
          <div class="company-info">
            <p class="title">Tasks Report</p>
            <p class="subtitle">Ashok Malhotra Group - Task & FMS Management System</p>
          </div>
        </div>

        <div class="summary">
          <strong>Report Generated:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          <br><strong>Total Tasks:</strong> ${tasksToprint.length}
        </div>

        ${filter.search || filter.priority || filter.dateFrom || filter.dateTo ? `
          <div class="filter-info">
            <strong>⚠️ Filters Applied:</strong> Showing results matching: 
            ${filter.search ? `Search: "${filter.search}" ` : ''}
            ${filter.priority ? `Priority: ${filter.priority} ` : ''}
            ${filter.dateFrom ? `From: ${filter.dateFrom} ` : ''}
            ${filter.dateTo ? `To: ${filter.dateTo}` : ''}
          </div>
        ` : ''}

        <table class="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Task Title</th>
              <th>Description</th>
              <th>Assigned To</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Due Date</th>
            </tr>
          </thead>
          <tbody>
            ${tasksToprint.map((task, idx) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${task.title}</td>
                <td>${task.description.substring(0, 40)}...</td>
                <td>${task.assignedTo.username}</td>
                <td><span class="badge badge-${task.priority}">${task.priority.toUpperCase()}</span></td>
                <td><span class="badge badge-${task.status}">${task.status.toUpperCase()}</span></td>
                <td>${task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB') : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Printed on ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
          <p>© 2024 Ashok Malhotra Group. All rights reserved.</p>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 250);
  };

  // Enhanced Pagination Component
  const renderEnhancedPagination = () => (
    <div className="bg-[--color-background] rounded-xl shadow-sm border border-[--color-border] p-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Items per page selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm text-[--color-textSecondary]">Show:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
            className="text-sm px-2 py-1 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] bg-[--color-surface] text-[--color-text]"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span className="text-sm text-[--color-textSecondary]">per page</span>
        </div>

        {/* Page info */}
        <div className="flex items-center">
          <p className="text-sm text-[--color-textSecondary]">
            Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
            <span className="font-medium">{Math.min(endIndex, tasks.length)}</span> of{' '}
            <span className="font-medium">{tasks.length}</span> results
          </p>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center space-x-1">
          {/* First page */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
            className="p-2 text-sm font-medium text-[--color-textSecondary] bg-[--color-surface] border border-[--color-border] rounded-lg hover:bg-[--color-border] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="First page"
          >
            <ChevronsLeft size={16} />
          </button>

          {/* Previous page */}
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 text-sm font-medium text-[--color-textSecondary] bg-[--color-surface] border border-[--color-border] rounded-lg hover:bg-[--color-border] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Previous page"
          >
            <ChevronLeft size={16} />
          </button>

          {/* Page numbers */}
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
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${currentPage === pageNumber
                    ? 'bg-[--color-primary] text-white'
                    : 'text-[--color-textSecondary] bg-[--color-surface] border border-[--color-border] hover:bg-[--color-border]'
                    }`}
                >
                  {pageNumber}
                </button>
              );
            })}
          </div>

          {/* Next page */}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="p-2 text-sm font-medium text-[--color-textSecondary] bg-[--color-surface] border border-[--color-border] rounded-lg hover:bg-[--color-border] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Next page"
          >
            <ChevronRight size={16} />
          </button>

          {/* Last page */}
          <button
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
            className="p-2 text-sm font-medium text-[--color-textSecondary] bg-[--color-surface] border border-[--color-border] rounded-lg hover:bg-[--color-border] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Last page"
          >
            <ChevronsRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderCardView = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6">
        {currentTasks.map((task) => (
          <div
            key={task._id}
            className={`group rounded-xl shadow-sm border hover:shadow-lg transition-all duration-300 overflow-hidden transform hover:-translate-y-1 ${task.dueDate && isOverdue(task.dueDate)
              ? 'border-l-4 border-[--color-error]'
              : task.dueDate && isDueToday(task.dueDate)
                ? 'border-l-4 border-[--color-accent]'
                : 'border-[--color-border]'
              } ${theme === 'light' ? 'bg-white' : 'bg-[--color-background]'}`}
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold line-clamp-2 text-[--color-text] transition-colors group-hover:text-[--color-primary]">
                  {task.title}
                </h3>
                {user?.role !== 'admin' && (
                  <div className="flex space-x-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setShowCompleteModal(task._id)}
                      className="p-2 rounded-lg transition-all transform hover:scale-110 hover:bg-[--color-success] hover:text-[--color-background] text-[--color-success]"
                      title="Complete task"
                    >
                      <CheckSquare size={16} />
                    </button>
                    <button
                      onClick={() => setShowObjectionModal(task._id)}
                      className="p-2 rounded-lg transition-all transform hover:scale-110 hover:bg-[--color-warning] hover:text-[--color-background] text-[--color-warning]"
                      title="Raise objection"
                    >
                      <RefreshCcw size={16} />
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <PriorityBadge priority={task.priority} />
                {task.revisionCount > 0 && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-[--color-warning] text-[--color-background]">
                    Revised {task.revisionCount}x
                  </span>
                )}
                {task.dueDate && isOverdue(task.dueDate) && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full shadow-sm animate-pulse bg-[--color-error] text-[--color-background]">
                    🚨 OVERDUE
                  </span>
                )}
                {task.dueDate && isDueToday(task.dueDate) && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full shadow-sm animate-pulse bg-[--color-accent] text-[--color-background]">
                    🗓️ DUE TODAY
                  </span>
                )}
              </div>

              <p className="text-sm mb-2 text-[--color-textSecondary]">
                {showFullDescription[task._id] ? task.description : truncateText(task.description, 150)}
                {task.description.length > 150 && (
                  <button
                    onClick={() => toggleDescriptionVisibility(task._id)}
                    className="ml-1 text-sm font-medium text-[--color-primary] hover:text-[--color-primary-dark]"
                  >
                    Show {showFullDescription[task._id] ? 'Less' : 'More'}
                  </button>
                )}
              </p>

              <div className="space-y-3 text-sm">
                <div className={`flex items-center justify-between p-2 rounded-lg ${theme === 'light' ? 'bg-gray-50' : 'bg-[--color-background]'}`}>
                  <span className="flex items-center text-[--color-textSecondary]">
                    <Users size={14} className="mr-1" />
                    Assigned By:
                  </span>
                  <span className="font-medium text-[--color-text]">{task.assignedBy.username}</span>
                </div>
                <div className={`flex items-center justify-between p-2 rounded-lg ${theme === 'light' ? 'bg-gray-50' : 'bg-[--color-background]'}`}>
                  <span className="flex items-center text-[--color-textSecondary]">
                    <Users size={14} className="mr-1" />
                    Assigned To:
                  </span>
                  <span className="font-medium text-[--color-text]">{task.assignedTo.username}</span>
                </div>
                <div className={`flex items-center justify-between p-2 rounded-lg ${theme === 'light' ? 'bg-gray-50' : 'bg-[--color-background]'}`}>
                  <span className="flex items-center text-[--color-textSecondary]">
                    <Calendar size={14} className="mr-1" />
                    Due date:
                  </span>
                  <span className={`font-medium ${task.dueDate && isOverdue(task.dueDate) ? 'text-[--color-error]' : task.dueDate && isDueToday(task.dueDate) ? 'text-[--color-accent]' : 'text-[--color-text]'}`}>
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'numeric',
                        year: 'numeric',
                      }) : 'N/A'}
                  </span>
                </div>
                <div className={`flex items-center justify-between p-2 rounded-lg ${theme === 'light' ? 'bg-gray-50' : 'bg-[--color-background]'}`}>
                  <span className="flex items-center text-[--color-textSecondary]">
                    <Clock size={14} className="mr-1" />
                    Created:
                  </span>
                  <span className="font-medium text-[--color-text]">
                    {new Date(task.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'numeric',
                        year: 'numeric',
                      })}
                  </span>
                </div>
                <div className={`flex items-center justify-between p-2 rounded-lg ${theme === 'light' ? 'bg-gray-50' : 'bg-[--color-background]'}`}>
                  <span className="flex items-center text-[--color-textSecondary]">
                    <Paperclip size={14} className="mr-1" />
                    Attachments:
                  </span>
                  {task.attachments && task.attachments.length > 0 ? (
                    <button
                      onClick={() => setShowAttachmentsModal(task.attachments)}
                      className="font-medium text-[--color-primary] hover:text-[--color-primary-dark]"
                    >
                      Click Here ({task.attachments.length})
                    </button>
                  ) : (
                    <span className="text-[--color-textSecondary]">No Attachments</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      {totalPages > 1 && renderEnhancedPagination()}
    </div>
  );

  const renderTableView = () => (
    <div className="space-y-6">
      <div className={`rounded-xl shadow-sm border border-[--color-border] overflow-hidden ${theme === 'light' ? 'bg-white' : 'bg-[--color-surface]'}`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[--color-border]">
            <thead className={theme === 'light' ? 'bg-gray-50' : 'bg-[--color-surface]'}>
              <tr>
                <th className="px-6 py-4 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                  Task
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                  Priority
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                  Assigned By
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                  Attachments
                </th>
                <th className="px-6 py-4 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                  <button
                    onClick={toggleSort}
                    className="flex items-center space-x-1 transition-colors hover:text-[--color-primary]"
                    title="Sort by due date"
                  >
                    <span>DUE DATE</span>
                    {getSortIcon()}
                  </button>
                </th>
                {user?.role !== 'admin' && (
                  <th className="px-6 py-4 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[--color-border]">
              {currentTasks.map((task, index) => (
                <tr
                  key={task._id}
                  className={`transition-all duration-200 hover:bg-[--color-surface] ${theme === 'light'
                    ? index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    : index % 2 === 0 ? 'bg-[--color-background]' : 'bg-[--color-background]'
                    }`}
                >
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-[--color-text] mb-1">
                        {task.title}
                      </div>
                      <div className="text-sm text-[--color-textSecondary]">
                        {showFullDescription[task._id] ? task.description : truncateText(task.description, 100)}
                        {task.description.length > 100 && (
                          <button
                            onClick={() => toggleDescriptionVisibility(task._id)}
                            className="ml-1 text-sm font-medium text-[--color-primary] hover:text-[--color-primary-dark]"
                          >
                            Show {showFullDescription[task._id] ? 'Less' : 'More'}
                          </button>
                        )}
                      </div>
                      <div className="flex items-center mt-2 space-x-2">
                        {task.revisionCount > 0 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[--color-warning] text-[--color-background]">
                            Revised {task.revisionCount}x
                          </span>
                        )}
                        {task.dueDate && isOverdue(task.dueDate) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shadow-sm animate-pulse bg-[--color-error] text-[--color-background]">
                            🚨 OVERDUE
                          </span>
                        )}
                        {task.dueDate && isDueToday(task.dueDate) && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium shadow-sm animate-pulse bg-[--color-accent] text-[--color-background]">
                            🗓️ DUE TODAY
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 bg-[--color-secondary] text-[--color-background]">
                        {task.assignedBy.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-[--color-text]">{task.assignedBy.username}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium mr-3 bg-[--color-primary-dark] text-[--color-background]">
                        {task.assignedTo.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-sm text-[--color-text]">{task.assignedTo.username}</div>
                        <div className="text-sm text-[--color-textSecondary]">{task.phoneNumber || task.assignedTo.phoneNumber || task.assignedTo.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {task.attachments && task.attachments.length > 0 ? (
                      <button
                        onClick={() => setShowAttachmentsModal(task.attachments)}
                        className="font-medium text-[--color-primary] hover:text-[--color-primary-dark]"
                      >
                        Click Here ({task.attachments.length})
                      </button>
                    ) : (
                      <span className="text-[--color-textSecondary]">No Attachments</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`text-sm font-medium ${task.dueDate && isOverdue(task.dueDate) ? 'text-[--color-error]' : task.dueDate && isDueToday(task.dueDate) ? 'text-[--color-accent]' : 'text-[--color-text]'}`}>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'numeric',
                        year: 'numeric',
                      }) : 'N/A'}
                    </div>
                    <div className="text-xs text-[--color-textSecondary]">
                      Created: {new Date(task.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'numeric',
                        year: 'numeric',
                      })}
                    </div>
                  </td>
                  {user?.role !== 'admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => setShowObjectionModal(task._id)}
                          className="transition-all transform hover:scale-110 text-[--color-warning]"
                          title="Raise objection"
                        >
                          <RefreshCcw size={16} />
                        </button>
                        <button
                          onClick={() => setShowCompleteModal(task._id)}
                          className="transition-all transform hover:scale-110 text-[--color-success]"
                          title="Complete task"
                        >
                          <CheckSquare size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {totalPages > 1 && renderEnhancedPagination()}
    </div>
  );

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-[--color-textSecondary]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
        <span className="ml-3 text-lg">Loading tasks...</span>
      </div>
    );
  }

  const completingTask = getTaskToComplete();

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 space-y-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center">
          <div>
            <h1 className="text-lg font-bold text-[--color-text]">
              Pending Tasks
            </h1>
            <p className="mt-0 text-xs text-[--color-textSecondary]">
              {tasks.length + fmsTasks.length} pending task(s) found ({tasks.length} regular + {fmsTasks.length} FMS)
              {sortOrder !== 'none' && (
                <span className="ml-2 text-[--color-primary]">
                  • Sorted by due date ({sortOrder === 'asc' ? 'earliest first' : 'latest first'})
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="ml-2 p-2 rounded-full transition-colors hover:bg-[--color-background] bg-[--color-surface] text-[--color-textSecondary]"
            aria-expanded={showFilters}
            aria-controls="filters-panel"
          >
            <Filter size={20} />
          </button>
          <button
            onClick={handlePrint}
            className="ml-2 p-2 rounded-full transition-colors hover:bg-[--color-background] bg-[--color-surface] text-[--color-textSecondary]"
            title="Print"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
          </button>
        </div>
        {!isMobile && <ViewToggle view={view} onViewChange={setView} />}
      </div>

      {/* Enhanced Filters Section */}
      {showFilters && (
        <div
          id="filters-panel"
          className="rounded-xl shadow-sm border border-[--color-border] p-3 mt-2 bg-[--color-surface]"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {/* Date From */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[--color-textSecondary]">
                <Calendar size={14} className="inline mr-1" />
                Date From
              </label>
              <input
                type="date"
                value={filter.dateFrom}
                onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
                className="w-full text-sm px-2 py-1 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[--color-textSecondary]">
                <Calendar size={14} className="inline mr-1" />
                Date To
              </label>
              <input
                type="date"
                value={filter.dateTo}
                onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
                className="w-full text-sm px-2 py-1 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-medium mb-1 text-[--color-textSecondary]">
                Priority
              </label>
              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="w-full text-sm px-1 py-1 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
              >
                <option value="">All Priorities</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>

            {user?.permissions.canViewAllTeamTasks && (
              <div>
                <label className="block text-sm font-medium mb-1 text-[--color-textSecondary]">
                  <Users size={14} className="inline mr-1" />
                  Team Member
                </label>
                <select
                  value={filter.assignedTo}
                  onChange={(e) => setFilter({ ...filter, assignedTo: e.target.value })}
                  className="w-full text-sm px-1 py-1 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
                >
                  <option value="">All Members</option>
                  {users.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.username}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1 text-[--color-textSecondary]">
                Sort by Due Date
              </label>
              <button
                onClick={toggleSort}
                className="w-full text-sm px-1 py-1 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors flex items-center justify-between hover:bg-[--color-background] bg-[--color-surface] text-[--color-text]"
              >
                <span>
                  {sortOrder === 'none' ? 'No sorting' :
                    sortOrder === 'asc' ? 'Earliest first' : 'Latest first'}
                </span>
                {getSortIcon()}
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-[--color-textSecondary]">
                <Search size={14} className="inline mr-1" />
                Search
              </label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[--color-textSecondary]" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={filter.search}
                  onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                  className="w-full pl-8 text-sm pr-1 py-1 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
                />
              </div>
            </div>

            <div className="flex items-end">
              <button
                onClick={resetFilters}
                className="px-2 py-2 text-sm font-medium rounded-lg transition-all transform hover:scale-105 hover:bg-[--color-background] bg-[--color-surface] border border-[--color-border] text-[--color-text]"
              >
                Clear All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FMS Tasks Section */}
      {fmsTasks.length > 0 && (
        <div className="mb-6">
          <h2 className="text-md font-semibold text-[--color-text] mb-3">FMS Pending Tasks</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {fmsTasks.map((fmsTask) => (
              <div key={`${fmsTask.projectId}-${fmsTask.taskIndex}`} className="rounded-xl shadow-sm border border-[--color-border] p-4 bg-[--color-surface]">
                <h3 className="font-semibold text-[--color-text] mb-2">{fmsTask.task.what}</h3>
                <p className="text-sm text-[--color-textSecondary] mb-2">Project: {fmsTask.projectName}</p>
                <p className="text-sm text-[--color-textSecondary] mb-2">FMS: {fmsTask.fmsName}</p>
                <p className="text-sm text-[--color-textSecondary]">
                  Due: {fmsTask.task.plannedDueDate ? new Date(fmsTask.task.plannedDueDate).toLocaleDateString('en-GB') : 'N/A'}
                </p>
                {!fmsTask.canComplete && (
                  <p className="text-xs text-[--color-warning] mt-2">⚠️ Complete previous step first</p>
                )}
                {fmsTask.canComplete && user?.role !== 'admin' && (
                  <div className="flex space-x-2 mt-3">
                    <button
                      onClick={() => handleCompleteFMSTask(fmsTask.projectId, fmsTask.taskIndex)}
                      className="flex-1 py-2 px-3 bg-[--color-success] text-white rounded-lg hover:opacity-90 flex items-center justify-center text-sm"
                    >
                      <CheckSquare size={16} className="mr-1" />
                      Complete
                    </button>
                    <button
                      onClick={() => handleFMSObjection(fmsTask.projectId, fmsTask.taskIndex)}
                      className="flex-1 py-2 px-3 bg-[--color-warning] text-white rounded-lg hover:opacity-90 flex items-center justify-center text-sm"
                    >
                      <RefreshCcw size={16} className="mr-1" />
                      Objection
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      {tasks.length === 0 && fmsTasks.length === 0 ? (
        <div className="text-center py-12">
          <div className="rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-4 bg-gradient-to-r from-[--color-primary] to-[--color-accent]">
            <CheckSquare size={48} className="text-[--color-background]" />
          </div>
          <p className="text-lg text-[--color-textSecondary]">No pending tasks found</p>
          <p className="text-sm mt-2 text-[--color-textSecondary]">Try adjusting your filters or check back later</p>
        </div>
      ) : tasks.length > 0 ? (
        <>
          <h2 className="text-md font-semibold text-[--color-text] mb-3">Regular Pending Tasks</h2>
          {isMobile || view === 'card' ? renderCardView() : renderTableView()}
        </>
      ) : null}

      {/* Task Completion Modal */}
      {showCompleteModal && completingTask && (
        <TaskCompletionModal
          taskId={showCompleteModal}
          taskTitle={completingTask.title}
          isRecurring={false}
          allowAttachments={taskSettings.pendingTasks.allowAttachments}
          mandatoryAttachments={taskSettings.pendingTasks.mandatoryAttachments}
          mandatoryRemarks={taskSettings.pendingTasks.mandatoryRemarks}
          onClose={() => setShowCompleteModal(null)}
          onComplete={handleTaskCompletion}
        />
      )}

      {/* Revise Task Modal */}
      {showReviseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="rounded-xl max-w-md w-full shadow-2xl transform transition-all bg-[--color-surface]">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-[--color-text]">
                <RefreshCcw size={20} className="text-[--color-warning] mr-2" />
                Revise Task
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[--color-textSecondary]">
                    New Due Date
                  </label>
                  <input
                    type="date"
                    value={revisionDate}
                    onChange={(e) => setRevisionDate(e.target.value)}
                    className="w-full px-3 py-2 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-[--color-textSecondary]">
                    Revision Remarks
                  </label>
                  <textarea
                    value={revisionRemarks}
                    onChange={(e) => setRevisionRemarks(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
                    placeholder="Reason for revision..."
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handleReviseTask(showReviseModal)}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-all transform hover:scale-105 text-white bg-gradient-to-r from-[--color-warning] to-[--color-accent]"
                >
                  Revise Task
                </button>
                <button
                  onClick={() => {
                    setShowReviseModal(null);
                    setRevisionDate('');
                    setRevisionRemarks('');
                  }}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors hover:bg-[--color-background] bg-[--color-surface] border border-[--color-border] text-[--color-text]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Objection Task Modal */}
      {showObjectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="rounded-xl max-w-md w-full shadow-2xl transform transition-all bg-[--color-surface]">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-[--color-text]">
                <RefreshCcw size={20} className="text-[--color-warning] mr-2" />
                Raise Objection
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[--color-textSecondary]">
                    Objection Type
                  </label>
                  <select
                    value={objectionType}
                    onChange={(e) => setObjectionType(e.target.value as 'date_change' | 'terminate' | 'hold')}
                    className="w-full px-3 py-2 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
                  >
                    <option value="date_change">Request Date Change</option>
                    <option value="terminate">Terminate Task</option>
                    <option value="hold">Hold Task</option>
                  </select>
                </div>
                {objectionType === 'date_change' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[--color-textSecondary]">
                      Requested New Date
                    </label>
                    <input
                      type="date"
                      value={objectionRequestedDate}
                      onChange={(e) => setObjectionRequestedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2 text-[--color-textSecondary]">
                    Remarks (Mandatory)
                  </label>
                  <textarea
                    value={objectionRemarks}
                    onChange={(e) => setObjectionRemarks(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
                    placeholder="Reason for objection..."
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => handleRaiseObjection(showObjectionModal)}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-all transform hover:scale-105 text-white bg-gradient-to-r from-[--color-warning] to-[--color-accent]"
                >
                  Raise Objection
                </button>
                <button
                  onClick={() => {
                    setShowObjectionModal(null);
                    setObjectionRemarks('');
                    setObjectionRequestedDate('');
                    setObjectionType('date_change');
                  }}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors hover:bg-[--color-background] bg-[--color-surface] border border-[--color-border] text-[--color-text]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Attachments Modal */}
      {showAttachmentsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="rounded-xl max-w-xl w-full shadow-2xl transform transition-all bg-[--color-surface]">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-[--color-text]">
                <Paperclip size={20} className="mr-2" />
                Task Attachments
              </h3>
              {showAttachmentsModal.length > 0 ? (
                <ul className="space-y-3 max-h-96 overflow-y-auto pr-2">
                  {showAttachmentsModal.map((attachment, index) => {
                    const downloadKey = `${attachment.filename}-${Date.now()}`;
                    return (
                      <li key={index} className={`flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 rounded-lg ${theme === 'light' ? 'bg-gray-50' : 'bg-[--color-background]'} text-[--color-text]`}>
                        <div className="flex items-center mb-2 sm:mb-0 sm:mr-4">
                          {isImage(attachment.filename) ? (
                            <>
                              <img
                                src={`${address}/uploads/${attachment.filename}`}
                                alt={attachment.originalName}
                                className="w-16 h-16 object-cover rounded-md mr-3 border border-[--color-border] cursor-pointer"
                                onClick={() => setSelectedImagePreview(`${address}/uploads/${attachment.filename}`)}
                              />
                              <span className="text-sm font-medium break-all">{attachment.originalName}</span>
                            </>
                          ) : (
                            <>
                              <FileText size={40} className="mr-3 text-[--color-primary]" />
                              <span className="text-sm font-medium break-all">{attachment.originalName}</span>
                            </>
                          )}
                        </div>
                        {isImage(attachment.filename) ? (
                          <div className="flex items-center shrink-0 mt-2 sm:mt-0 space-x-2">
                            <button
                              onClick={() => window.open(`${address}/uploads/${attachment.filename}`, '_blank')}
                              className="text-sm font-medium text-[--color-primary] hover:text-[--color-primary-dark] flex items-center"
                            >
                              View
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDownload(attachment)}
                              disabled={downloading[downloadKey]}
                              className="text-sm font-medium text-[--color-primary] hover:text-[--color-primary-dark] flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              {downloading[downloadKey] ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-[--color-primary] border-t-transparent rounded-full animate-spin mr-1"></div>
                                  Downloading...
                                </>
                              ) : (
                                <>
                                  Download
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                  </svg>
                                </>
                              )}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDownload(attachment)}
                            disabled={downloading[downloadKey]}
                            className="text-sm font-medium text-[--color-primary] hover:text-[--color-primary-dark] flex items-center shrink-0 mt-2 sm:mt-0 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {downloading[downloadKey] ? (
                              <>
                                <div className="w-4 h-4 border-2 border-[--color-primary] border-t-transparent rounded-full animate-spin mr-1"></div>
                                Downloading...
                              </>
                            ) : (
                              <>
                                Download
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                              </>
                            )}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-[--color-textSecondary]">No attachments for this task.</p>
              )}
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowAttachmentsModal(null)}
                  className="py-2 px-4 rounded-lg font-medium transition-colors hover:bg-[--color-background] bg-[--color-surface] border border-[--color-border] text-[--color-text]"
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
              &times;
            </button>
          </div>
        </div>
      )}

      {/* FMS Task Completion Modal */}
      {showFMSCompleteModal && (
        <TaskCompletionModal
          taskId={`${showFMSCompleteModal.projectId}-${showFMSCompleteModal.taskIndex}`}
          taskTitle={fmsTasks.find(t => t.projectId === showFMSCompleteModal.projectId && t.taskIndex === showFMSCompleteModal.taskIndex)?.task.what || 'FMS Task'}
          isRecurring={false}
          allowAttachments={taskSettings.pendingTasks.allowAttachments}
          mandatoryAttachments={taskSettings.pendingTasks.mandatoryAttachments}
          mandatoryRemarks={taskSettings.pendingTasks.mandatoryRemarks}
          onClose={() => setShowFMSCompleteModal(null)}
          onComplete={async (remarks, attachments) => {
            await handleFMSTaskCompletion(showFMSCompleteModal.projectId, showFMSCompleteModal.taskIndex, remarks, attachments);
          }}
        />
      )}

      {/* FMS Objection Modal */}
      {showFMSObjectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="rounded-xl max-w-md w-full shadow-2xl transform transition-all bg-[--color-surface]">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center text-[--color-text]">
                <RefreshCcw size={20} className="text-[--color-warning] mr-2" />
                Raise FMS Objection
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-[--color-textSecondary]">
                    Objection Type
                  </label>
                  <select
                    value={objectionType}
                    onChange={(e) => setObjectionType(e.target.value as 'date_change' | 'terminate' | 'hold')}
                    className="w-full px-3 py-2 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
                  >
                    <option value="date_change">Request Date Change</option>
                    <option value="terminate">Terminate Task</option>
                    <option value="hold">Hold Task</option>
                  </select>
                </div>
                {objectionType === 'date_change' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-[--color-textSecondary]">
                      Requested New Date
                    </label>
                    <input
                      type="date"
                      value={objectionRequestedDate}
                      onChange={(e) => setObjectionRequestedDate(e.target.value)}
                      className="w-full px-3 py-2 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2 text-[--color-textSecondary]">
                    Remarks (Mandatory)
                  </label>
                  <textarea
                    value={objectionRemarks}
                    onChange={(e) => setObjectionRemarks(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-[--color-border] rounded-lg focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-colors bg-[--color-background] text-[--color-text]"
                    placeholder="Reason for objection..."
                    required
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleRaiseFMSObjection}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-all transform hover:scale-105 text-white bg-gradient-to-r from-[--color-warning] to-[--color-accent]"
                >
                  Raise Objection
                </button>
                <button
                  onClick={() => {
                    setShowFMSObjectionModal(null);
                    setObjectionRemarks('');
                    setObjectionRequestedDate('');
                    setObjectionType('date_change');
                  }}
                  className="flex-1 py-2 px-4 rounded-lg font-medium transition-colors hover:bg-[--color-background] bg-[--color-surface] border border-[--color-border] text-[--color-text]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingTasks;