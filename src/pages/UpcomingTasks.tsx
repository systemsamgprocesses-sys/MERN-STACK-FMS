import React, { useState, useEffect } from 'react';
import { Calendar, Search, Filter, Loader } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface Task {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  taskType?: string;
  assignedTo?: {
    username: string;
    _id: string;
  };
  priority?: string;
}

interface FilterState {
  status: string;
  priority: string;
  searchTerm: string;
}

type TaskTypeTab = 'all' | 'repetitive' | 'one-time';

const UpcomingTasks: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [activeTab, setActiveTab] = useState<TaskTypeTab>('all');
  const [filters, setFilters] = useState<FilterState>({
    status: '',
    priority: '',
    searchTerm: ''
  });
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'title'>('dueDate');

  useEffect(() => {
    if (user?.id) {
      fetchUpcomingTasks();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [tasks, filters, sortBy, activeTab]);

  const fetchUpcomingTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(`${address}/api/dashboard/upcoming-tasks`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      });
      setTasks(response.data.upcomingTasks || []);
    } catch (err: any) {
      console.error('Error fetching upcoming tasks:', err);
      setError(err.response?.data?.message || 'Failed to load upcoming tasks');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let result = [...tasks];

    // Tab filter - separate one-time from cyclic tasks
    if (activeTab === 'repetitive') {
      result = result.filter(task => 
        task.taskType && task.taskType !== 'one-time'
      );
    } else if (activeTab === 'one-time') {
      result = result.filter(task => 
        task.taskType === 'one-time'
      );
    }

    // Search filter
    if (filters.searchTerm) {
      result = result.filter(task =>
        task.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        task.description?.toLowerCase().includes(filters.searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (filters.status) {
      result = result.filter(task => task.status === filters.status);
    }

    // Priority filter
    if (filters.priority) {
      result = result.filter(task => task.priority === filters.priority);
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return (priorityOrder[a.priority as keyof typeof priorityOrder] || 3) -
                 (priorityOrder[b.priority as keyof typeof priorityOrder] || 3);
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

    setFilteredTasks(result);
    setCurrentPage(1);
  };

  const getPaginatedTasks = () => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredTasks.slice(startIndex, endIndex);
  };

  const getTotalPages = () => Math.ceil(filteredTasks.length / itemsPerPage);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'on hold':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'text-red-600 bg-red-50';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50';
      case 'low':
        return 'text-green-600 bg-green-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getDaysUntilDue = (dueDate: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--color-background)]">
        <div className="text-center">
          <Loader className="animate-spin mx-auto mb-4 text-[var(--color-primary)]" size={48} />
          <p className="text-lg text-[var(--color-textSecondary)]">Loading upcoming tasks...</p>
        </div>
      </div>
    );
  }

  const paginatedTasks = getPaginatedTasks();
  const totalPages = getTotalPages();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-secondary)] text-white p-6 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <Calendar size={32} />
            <h1 className="text-4xl font-bold">Upcoming Tasks</h1>
          </div>
          <p className="text-white/80 text-lg">Tasks scheduled for the future</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 md:p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {/* Task Type Tabs */}
        <div className="flex gap-2 mb-6 border-b border-[var(--color-border)]">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'all'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            All Tasks ({tasks.length})
          </button>
          <button
            onClick={() => setActiveTab('repetitive')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'repetitive'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Cyclic/Repetitive ({tasks.filter(t => t.taskType && t.taskType !== 'one-time').length})
          </button>
          <button
            onClick={() => setActiveTab('one-time')}
            className={`px-4 py-3 font-medium border-b-2 transition-colors ${
              activeTab === 'one-time'
                ? 'border-[var(--color-primary)] text-[var(--color-primary)]'
                : 'border-transparent text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            One-Time ({tasks.filter(t => t.taskType === 'one-time').length})
          </button>
        </div>

        {/* Filters and Search */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={20} className="text-[var(--color-primary)]" />
            <h2 className="text-xl font-bold text-[var(--color-text)]">Filters & Search</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Search</label>
              <div className="relative">
                <Search size={18} className="absolute left-3 top-2.5 text-[var(--color-textSecondary)]" />
                <input
                  type="text"
                  placeholder="Search by title or description..."
                  value={filters.searchTerm}
                  onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
                  className="w-full pl-10 pr-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on hold">On Hold</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Priority</label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="">All Priorities</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Sort By</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-4 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                <option value="dueDate">Due Date (Earliest)</option>
                <option value="priority">Priority (High to Low)</option>
                <option value="title">Title (A-Z)</option>
              </select>
            </div>
          </div>

          {/* Clear Filters Button */}
          {(filters.searchTerm || filters.status || filters.priority) && (
            <button
              onClick={() => setFilters({ searchTerm: '', status: '', priority: '' })}
              className="text-sm text-[var(--color-primary)] hover:underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Tasks Count */}
        <div className="mb-4 text-sm text-[var(--color-textSecondary)]">
          Showing {paginatedTasks.length} of {filteredTasks.length} upcoming tasks
        </div>

        {/* Tasks List */}
        {paginatedTasks.length === 0 ? (
          <div className="text-center py-16 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
            <Calendar size={64} className="mx-auto mb-4 opacity-30 text-[var(--color-textSecondary)]" />
            <p className="text-xl font-semibold text-[var(--color-textSecondary)] mb-2">No upcoming tasks</p>
            <p className="text-sm text-[var(--color-textSecondary)]">
              {filteredTasks.length === 0 && tasks.length === 0
                ? 'No tasks scheduled for the future'
                : 'Try adjusting your filters'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedTasks.map((task) => {
              const daysUntilDue = getDaysUntilDue(task.dueDate);
              const isOverdue = daysUntilDue < 0;

              return (
                <div
                  key={task._id}
                  className="p-4 md:p-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-lg transition-all hover:border-[var(--color-primary)]"
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg md:text-xl font-bold text-[var(--color-text)] mb-2 truncate">
                        {task.title}
                      </h3>
                      <p className="text-sm text-[var(--color-textSecondary)] mb-3 line-clamp-2">
                        {task.description || 'No description provided'}
                      </p>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-4 text-sm">
                        <span className="flex items-center gap-2">
                          <Calendar size={16} className="text-[var(--color-textSecondary)]" />
                          <span className="text-[var(--color-text)]">
                            {new Date(task.dueDate).toLocaleDateString('en-GB', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </span>
                        </span>

                        {task.assignedTo && (
                          <span className="text-[var(--color-textSecondary)]">
                            Assigned to: <strong className="text-[var(--color-text)]">{task.assignedTo.username}</strong>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Status and Priority Badges */}
                    <div className="flex flex-wrap items-center gap-2 justify-end">
                      {task.priority && (
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(task.priority)}`}>
                          {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                      )}

                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>

                      <div className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                        isOverdue
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : daysUntilDue === 0
                          ? 'bg-red-50 border-red-200 text-red-700'
                          : daysUntilDue <= 3
                          ? 'bg-orange-50 border-orange-200 text-orange-700'
                          : daysUntilDue <= 7
                          ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
                          : 'bg-green-50 border-green-200 text-green-700'
                      }`}>
                        {isOverdue
                          ? `${Math.abs(daysUntilDue)} days overdue`
                          : daysUntilDue === 0
                          ? 'Due Today'
                          : daysUntilDue === 1
                          ? 'Due Tomorrow'
                          : `${daysUntilDue} days left`}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8 pt-6 border-t border-[var(--color-border)]">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] disabled:opacity-50 hover:bg-[var(--color-border)] transition-colors"
            >
              Previous
            </button>
            <span className="text-sm text-[var(--color-textSecondary)] px-4">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text)] disabled:opacity-50 hover:bg-[var(--color-border)] transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpcomingTasks;
