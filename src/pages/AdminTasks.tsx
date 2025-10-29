
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, Calendar, Users, Filter, Search } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import TaskCompletionModal from '../components/TaskCompletionModal';
import { useTaskSettings } from '../hooks/useTaskSettings';

interface Task {
  _id: string;
  title: string;
  description: string;
  taskType: string;
  assignedBy: { username: string };
  assignedTo: { username: string };
  dueDate?: string;
  priority: string;
  status: string;
  createdAt: string;
}

const AdminTasks: React.FC = () => {
  const { user } = useAuth();
  const { settings: taskSettings, loading: settingsLoading } = useTaskSettings();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleteModal, setShowCompleteModal] = useState<string | null>(null);
  const [filter, setFilter] = useState({
    status: '',
    priority: '',
    search: '',
  });

  useEffect(() => {
    fetchAdminTasks();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tasks, filter]);

  const fetchAdminTasks = async () => {
    try {
      const response = await axios.get(`${address}/api/tasks?assignedTo=${user?.id}`);
      // Handle both array response and paginated response
      const tasksData = Array.isArray(response.data) ? response.data : (response.data.tasks || []);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching admin tasks:', error);
      setTasks([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    // Ensure tasks is an array before filtering
    if (!Array.isArray(tasks)) {
      setFilteredTasks([]);
      return;
    }

    let filtered = [...tasks];

    if (filter.status) {
      filtered = filtered.filter(t => t.status === filter.status);
    }

    if (filter.priority) {
      filtered = filtered.filter(t => t.priority === filter.priority);
    }

    if (filter.search) {
      filtered = filtered.filter(t => 
        t.title.toLowerCase().includes(filter.search.toLowerCase()) ||
        t.description.toLowerCase().includes(filter.search.toLowerCase())
      );
    }

    setFilteredTasks(filtered);
  };

  const handleTaskCompletion = () => {
    setShowCompleteModal(null);
    fetchAdminTasks();
  };

  const getTaskToComplete = () => {
    return tasks.find(task => task._id === showCompleteModal);
  };

  const getPriorityColor = (priority: string) => {
    return priority === 'high' ? 'text-red-600 bg-red-50' : 'text-blue-600 bg-blue-50';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'completed': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading || settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)]"></div>
      </div>
    );
  }

  const completingTask = getTaskToComplete();

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">My Tasks</h1>
          <p className="text-[var(--color-textSecondary)]">Tasks assigned to you for completion</p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-[var(--color-surface)] rounded-xl p-4 shadow-sm border border-[var(--color-border)]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-textSecondary)]">
                <Filter size={14} className="inline mr-1" />
                Status
              </label>
              <select
                value={filter.status}
                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)]"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-textSecondary)]">
                Priority
              </label>
              <select
                value={filter.priority}
                onChange={(e) => setFilter({ ...filter, priority: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)]"
              >
                <option value="">All Priorities</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-textSecondary)]">
                <Search size={14} className="inline mr-1" />
                Search
              </label>
              <input
                type="text"
                placeholder="Search tasks..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)]"
              />
            </div>
          </div>
        </div>

        {/* Tasks Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTasks.map((task) => (
            <div
              key={task._id}
              className="bg-[var(--color-surface)] rounded-xl p-6 shadow-sm border border-[var(--color-border)] hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-semibold text-[var(--color-text)]">{task.title}</h3>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                  {task.priority}
                </span>
              </div>
              
              <p className="text-sm text-[var(--color-textSecondary)] mb-4">{task.description}</p>
              
              <div className="space-y-2 text-sm mb-4">
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-textSecondary)]">
                    <Users size={14} className="inline mr-1" />
                    Assigned By:
                  </span>
                  <span className="font-medium text-[var(--color-text)]">{task.assignedBy.username}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-textSecondary)]">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-textSecondary)]">
                    <Calendar size={14} className="inline mr-1" />
                    Due Date:
                  </span>
                  <span className="font-medium text-[var(--color-text)]">
                    {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[var(--color-textSecondary)]">
                    <Users size={14} className="inline mr-1" />
                    Assigned To:
                  </span>
                  <span className="font-medium text-[var(--color-text)]">{task.assignedTo.username}</span>
                </div>
              </div>

              {task.status !== 'completed' && (
                <button
                  onClick={() => setShowCompleteModal(task._id)}
                  className="w-full py-2 px-4 bg-[var(--color-success)] text-white rounded-lg hover:opacity-90 transition-all flex items-center justify-center"
                >
                  <CheckSquare size={16} className="mr-2" />
                  Complete Task
                </button>
              )}
            </div>
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-12">
            <CheckSquare size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)] opacity-50" />
            <p className="text-lg text-[var(--color-textSecondary)]">No tasks found</p>
          </div>
        )}
      </div>

      {/* Task Completion Modal */}
      {showCompleteModal && completingTask && (
        <TaskCompletionModal
          taskId={showCompleteModal}
          taskTitle={completingTask.title}
          isRecurring={false}
          allowAttachments={taskSettings.adminTasks?.allowAttachments ?? true}
          mandatoryAttachments={taskSettings.adminTasks?.mandatoryAttachments ?? false}
          mandatoryRemarks={taskSettings.adminTasks?.mandatoryRemarks ?? false}
          onClose={() => setShowCompleteModal(null)}
          onComplete={handleTaskCompletion}
        />
      )}
    </div>
  );
};

export default AdminTasks;
