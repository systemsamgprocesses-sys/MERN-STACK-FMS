
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCheck, Calendar, CheckSquare, Clock, Printer, ArrowUpDown, TrendingUp, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface Task {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  assignedTo: {
    _id: string;
    username: string;
    email: string;
  };
  assignedBy: {
    _id: string;
    username: string;
  };
  priority: string;
  status: string;
  taskType: string;
  createdAt: string;
}

type SortOption = 
  | 'created-desc' 
  | 'created-asc' 
  | 'due-desc' 
  | 'due-asc' 
  | 'title-asc' 
  | 'title-desc' 
  | 'status' 
  | 'priority';

const AssignedByMe: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'overdue' | 'upcoming' | 'completed' | 'all'>('pending');
  const [sortBy, setSortBy] = useState<SortOption>('created-desc');

  useEffect(() => {
    fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const params: any = { 
        userId: user.id
      };

      // Optimized: Reduced limit from 1000000 to 10000 to prevent CPU spikes
      const response = await axios.get(`${address}/api/tasks/assigned-by-me?limit=10000`, { params });
      
      if (response.data.tasks) {
        setTasks(response.data.tasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching assigned by me tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  // Categorize tasks into: Pending, Overdue, Upcoming, Completed
  const { pendingTasks, overdueTasks, upcomingTasks, completedTasks } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const pending: Task[] = [];
    const overdue: Task[] = [];
    const upcoming: Task[] = [];
    const completed: Task[] = [];

    tasks.forEach(task => {
      const dueDate = new Date(task.dueDate);
      dueDate.setHours(0, 0, 0, 0);
      
      if (task.status === 'completed') {
        completed.push(task);
      } else if (dueDate < today) {
        // Due before today and not completed = overdue
        overdue.push(task);
      } else if (dueDate.getTime() === today.getTime()) {
        // Due today and not completed = pending
        pending.push(task);
      } else {
        // Due in the future = upcoming
        upcoming.push(task);
      }
    });

    return { pendingTasks: pending, overdueTasks: overdue, upcomingTasks: upcoming, completedTasks: completed };
  }, [tasks]);

  // Get tasks to display based on active tab
  const tasksToDisplay = useMemo(() => {
    switch (activeTab) {
      case 'pending':
        return pendingTasks;
      case 'overdue':
        return overdueTasks;
      case 'upcoming':
        return upcomingTasks;
      case 'completed':
        return completedTasks;
      case 'all':
        return tasks;
      default:
        return tasks;
    }
  }, [activeTab, pendingTasks, overdueTasks, upcomingTasks, completedTasks, tasks]);

  // Sort tasks based on selected sort option
  const sortedTasks = useMemo(() => {
    const tasksToSort = [...tasksToDisplay];
    
    switch (sortBy) {
      case 'created-desc':
        return tasksToSort.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'created-asc':
        return tasksToSort.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      case 'due-desc':
        return tasksToSort.sort((a, b) => 
          new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
        );
      case 'due-asc':
        return tasksToSort.sort((a, b) => 
          new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        );
      case 'title-asc':
        return tasksToSort.sort((a, b) => 
          a.title.localeCompare(b.title)
        );
      case 'title-desc':
        return tasksToSort.sort((a, b) => 
          b.title.localeCompare(a.title)
        );
      case 'status':
        return tasksToSort.sort((a, b) => 
          a.status.localeCompare(b.status)
        );
      case 'priority':
        const priorityOrder: Record<string, number> = {
          'high': 3,
          'medium': 2,
          'low': 1
        };
        return tasksToSort.sort((a, b) => 
          (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
        );
      default:
        return tasksToSort;
    }
  }, [tasksToDisplay, sortBy]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--color-text)]">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--color-primary)10' }}>
              <UserCheck size={28} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)]">Assigned By Me</h1>
              <p className="text-[var(--color-textSecondary)] text-sm">Tasks you've assigned to others and yourself</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 flex items-center gap-2 print:hidden"
          >
            <Printer size={18} />
            Print
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-[var(--color-border)] print:hidden overflow-x-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'pending'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Pending ({pendingTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'overdue'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Overdue ({overdueTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'upcoming'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Upcoming ({upcomingTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'completed'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            Completed ({completedTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 font-semibold transition-colors relative whitespace-nowrap ${
              activeTab === 'all'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            All ({tasks.length})
          </button>
        </div>

        {/* Sort */}
        <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
          <div className="flex items-center gap-2">
            <ArrowUpDown size={18} style={{ color: 'var(--color-textSecondary)' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
            >
              <option value="created-desc">Date Created (Newest First)</option>
              <option value="created-asc">Date Created (Oldest First)</option>
              <option value="due-desc">Due Date (Latest First)</option>
              <option value="due-asc">Due Date (Earliest First)</option>
              <option value="title-asc">Title (A-Z)</option>
              <option value="title-desc">Title (Z-A)</option>
              <option value="status">Status</option>
              <option value="priority">Priority</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Total</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">{tasks.length}</p>
              </div>
              <CheckSquare size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingTasks.length}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">Due ≤ Today</p>
              </div>
              <Clock size={24} className="text-yellow-600" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{overdueTasks.length}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">Due &lt; Today</p>
              </div>
              <AlertCircle size={24} className="text-red-600" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Upcoming</p>
                <p className="text-2xl font-bold text-blue-600">{upcomingTasks.length}</p>
                <p className="text-xs text-[var(--color-textSecondary)]">Due &gt; Today</p>
              </div>
              <TrendingUp size={24} className="text-blue-600" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Completed</p>
                <p className="text-2xl font-bold text-green-600">{completedTasks.length}</p>
              </div>
              <CheckSquare size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {sortedTasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-textSecondary)]">No tasks found</p>
            </div>
          ) : (
            sortedTasks.map((task) => (
              <div
                key={task._id}
                className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">{task.title}</h3>
                    <p className="text-sm text-[var(--color-textSecondary)] mb-3">{task.description}</p>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <UserCheck size={14} />
                        Assigned to: <strong>{task.assignedTo.username}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        Due: {formatDate(task.dueDate)}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignedByMe;
