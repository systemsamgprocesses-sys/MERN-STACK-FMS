
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { UserCheck, Calendar, CheckSquare, Clock, Filter, Printer } from 'lucide-react';
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

const AssignedByMe: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchTasks();
  }, [user, filterStatus]);

  const fetchTasks = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const params: any = { 
        userId: user.id,
        status: filterStatus !== 'all' ? filterStatus : undefined
      };

      // Optimized: Reduced limit from 1000000 to 10000 to prevent CPU spikes
      const response = await axios.get(`${address}/api/tasks/assigned-by-me?limit=10000`, { params });
      
      if (response.data.tasks) {
        // Sort tasks by creation date descending
        const sortedTasks = [...response.data.tasks].sort((a: Task, b: Task) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setTasks(sortedTasks);
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching assigned by me tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

        {/* Filters */}
        <div className="mb-6 flex items-center gap-3 print:hidden">
          <Filter size={18} style={{ color: 'var(--color-textSecondary)' }} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Total Assigned</p>
                <p className="text-2xl font-bold text-[var(--color-text)]">{tasks.length}</p>
              </div>
              <CheckSquare size={24} style={{ color: 'var(--color-primary)' }} />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{tasks.filter(t => t.status === 'pending').length}</p>
              </div>
              <Clock size={24} className="text-yellow-600" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Completed</p>
                <p className="text-2xl font-bold text-green-600">{tasks.filter(t => t.status === 'completed').length}</p>
              </div>
              <CheckSquare size={24} className="text-green-600" />
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--color-textSecondary)]">Overdue</p>
                <p className="text-2xl font-bold text-red-600">{tasks.filter(t => t.status === 'overdue').length}</p>
              </div>
              <Calendar size={24} className="text-red-600" />
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-[var(--color-textSecondary)]">No tasks found</p>
            </div>
          ) : (
            tasks.map((task) => (
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
                        Due: {new Date(task.dueDate).toLocaleDateString()}
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
