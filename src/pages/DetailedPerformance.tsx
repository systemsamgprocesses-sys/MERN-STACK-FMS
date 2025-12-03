import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeft, Award, Filter, Calendar, FileText, CheckCircle, Clock, X } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { formatDate } from '../utils/dateFormat';

interface ScoreLog {
  _id: string;
  entityType: 'task' | 'fms' | 'checklist';
  entityTitle: string;
  taskType: string;
  userId: {
    username: string;
    email?: string;
  };
  score: number;
  scorePercentage: number;
  plannedDate: string;
  completedDate: string;
  plannedDays: number;
  actualDays: number;
  completedAt: string;
  wasOnTime: boolean;
  scoreImpacted: boolean;
  impactReason?: string;
}

const DetailedPerformance: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ScoreLog[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ScoreLog[]>([]);
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');
  const [selectedTaskType, setSelectedTaskType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [users, setUsers] = useState<any[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [summary, setSummary] = useState({
    totalTasks: 0,
    averageScore: 0,
    onTimeTasks: 0,
    lateTasks: 0,
    impactedTasks: 0
  });

  // Get userId and username from location state or use current user
  const [targetUserId, setTargetUserId] = useState<string | null>(location.state?.userId || user?.id || null);
  const [targetUsername, setTargetUsername] = useState<string>(location.state?.username || user?.username || '');

  useEffect(() => {
    if (user?.role === 'superadmin' || user?.role === 'admin') {
      fetchUsers();
    }
  }, [user]);

  useEffect(() => {
    // If we only have username, fetch userId first
    if (!targetUserId && targetUsername) {
      fetchUserIdFromUsername();
    } else if (targetUserId) {
      fetchScoreLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId, targetUsername]);

  useEffect(() => {
    // When selected user changes (for superadmin), update target user
    if (selectedUser && (user?.role === 'superadmin' || user?.role === 'admin')) {
      const selectedUserData = users.find(u => (u._id || u.id) === selectedUser);
      if (selectedUserData) {
        setTargetUserId(selectedUserData._id || selectedUserData.id);
        setTargetUsername(selectedUserData.username);
      }
    }
  }, [selectedUser, users, user]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      const activeUsers = response.data.filter((u: any) => u.isActive);
      setUsers(activeUsers);
      
      // Set initial selected user if coming from navigation
      if (targetUsername && !selectedUser) {
        const foundUser = activeUsers.find((u: any) => u.username === targetUsername);
        if (foundUser) {
          setSelectedUser(foundUser._id || foundUser.id);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchUserIdFromUsername = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      const foundUser = response.data.find((u: any) => u.username === targetUsername);
      if (foundUser) {
        const userId = foundUser._id || foundUser.id;
        setTargetUserId(userId);
        if (user?.role === 'superadmin' || user?.role === 'admin') {
          setSelectedUser(userId);
        }
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching user ID:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [logs, selectedEntityType, selectedTaskType, selectedStatus]);

  const fetchScoreLogs = async () => {
    if (!targetUserId) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      // Ensure we're using the correct userId format
      const userIdToUse = targetUserId.toString();
      const params: any = { userId: userIdToUse, limit: 10000 }; // Get all logs, no pagination
      const response = await axios.get(`${address}/api/score-logs`, { params });
      const fetchedLogs = response.data.logs || [];
      
      // Filter logs to ensure they belong to the target user (double-check)
      const userLogs = fetchedLogs.filter((log: ScoreLog) => {
        if (!log.userId) return false;
        // Handle both populated user object and direct userId
        const logUserId = typeof log.userId === 'object' 
          ? (log.userId._id || log.userId.id) 
          : log.userId;
        if (!logUserId) return false;
        // Compare as strings to handle ObjectId vs string
        return logUserId.toString() === userIdToUse;
      });
      
      setLogs(userLogs);
      
      // Calculate summary from filtered logs
      const total = userLogs.length;
      const average = total > 0 
        ? userLogs.reduce((sum: number, log: ScoreLog) => sum + (log.scorePercentage || 0), 0) / total 
        : 0;
      const onTime = userLogs.filter((log: ScoreLog) => log.wasOnTime).length;
      const late = userLogs.filter((log: ScoreLog) => !log.wasOnTime).length;
      const impacted = userLogs.filter((log: ScoreLog) => log.scoreImpacted).length;

      setSummary({
        totalTasks: total,
        averageScore: average,
        onTimeTasks: onTime,
        lateTasks: late,
        impactedTasks: impacted
      });
    } catch (error) {
      console.error('Error fetching score logs:', error);
      setLogs([]);
      setSummary({
        totalTasks: 0,
        averageScore: 0,
        onTimeTasks: 0,
        lateTasks: 0,
        impactedTasks: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...logs];

    if (selectedEntityType !== 'all') {
      filtered = filtered.filter(log => log.entityType === selectedEntityType);
    }

    if (selectedTaskType !== 'all') {
      filtered = filtered.filter(log => log.taskType === selectedTaskType);
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'on-time') {
        filtered = filtered.filter(log => log.wasOnTime);
      } else if (selectedStatus === 'late') {
        filtered = filtered.filter(log => !log.wasOnTime);
      } else if (selectedStatus === 'impacted') {
        filtered = filtered.filter(log => log.scoreImpacted);
      }
    }

    setFilteredLogs(filtered);
  };

  const getEntityTypeColor = (type: string) => {
    switch (type) {
      case 'task': return 'bg-blue-100 text-blue-700';
      case 'fms': return 'bg-purple-100 text-purple-700';
      case 'checklist': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getEntityTypeLabel = (type: string) => {
    switch (type) {
      case 'task': return 'Task';
      case 'fms': return 'FMS';
      case 'checklist': return 'Checklist';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-textSecondary)]">Loading performance details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-border)] transition-colors"
            >
              <ArrowLeft size={20} className="text-[var(--color-text)]" />
            </button>
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)]">Performance Details</h1>
              <p className="text-[var(--color-textSecondary)] text-sm mt-1">
                Task-wise scoring breakdown for <span className="font-semibold">{targetUsername || 'User'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* User Selector for Superadmin/Admin */}
        {(user?.role === 'superadmin' || user?.role === 'admin') && users.length > 0 && (
          <div className="mb-6 bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-3">
              <User size={18} className="text-[var(--color-textSecondary)]" />
              <span className="font-semibold text-[var(--color-text)]">Select User</span>
            </div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
            >
              <option value="">Select a user...</option>
              {users.map((u) => (
                <option key={u._id || u.id} value={u._id || u.id}>
                  {u.username}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-2">
              <FileText size={18} className="text-[var(--color-primary)]" />
              <span className="text-sm text-[var(--color-textSecondary)]">Total Tasks</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-text)]">{summary.totalTasks}</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-2">
              <Award size={18} className="text-[var(--color-success)]" />
              <span className="text-sm text-[var(--color-textSecondary)]">Average Score</span>
            </div>
            <p className="text-2xl font-bold text-[var(--color-success)]">{summary.averageScore.toFixed(1)}%</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle size={18} className="text-green-600" />
              <span className="text-sm text-[var(--color-textSecondary)]">On Time</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{summary.onTimeTasks}</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-2">
              <Clock size={18} className="text-red-600" />
              <span className="text-sm text-[var(--color-textSecondary)]">Late</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{summary.lateTasks}</p>
          </div>
          <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)]">
            <div className="flex items-center gap-2 mb-2">
              <X size={18} className="text-orange-600" />
              <span className="text-sm text-[var(--color-textSecondary)]">Impacted</span>
            </div>
            <p className="text-2xl font-bold text-orange-600">{summary.impactedTasks}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[var(--color-surface)] rounded-xl p-4 border border-[var(--color-border)] mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-[var(--color-textSecondary)]" />
            <span className="font-semibold text-[var(--color-text)]">Filters</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-textSecondary)]">
                Entity Type
              </label>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)]"
              >
                <option value="all">All Types</option>
                <option value="task">Tasks</option>
                <option value="fms">FMS</option>
                <option value="checklist">Checklists</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-textSecondary)]">
                Task Type
              </label>
              <select
                value={selectedTaskType}
                onChange={(e) => setSelectedTaskType(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)]"
              >
                <option value="all">All Task Types</option>
                <option value="one-time">One-time</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2 text-[var(--color-textSecondary)]">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg bg-[var(--color-background)] text-[var(--color-text)]"
              >
                <option value="all">All Status</option>
                <option value="on-time">On Time</option>
                <option value="late">Late</option>
                <option value="impacted">Score Impacted</option>
              </select>
            </div>
          </div>
        </div>

        {/* Task List */}
        <div className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)]">
            <h2 className="text-xl font-bold text-[var(--color-text)]">
              Task-wise Breakdown ({filteredLogs.length} tasks)
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-[var(--color-background)]">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Task</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Type</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Score</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Planned On</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Completed On</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Days</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--color-text)]">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--color-textSecondary)]">
                      No tasks found matching the filters
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log._id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${getEntityTypeColor(log.entityType)}`}>
                            {getEntityTypeLabel(log.entityType)}
                          </span>
                          <span className="text-sm font-medium text-[var(--color-text)]">{log.entityTitle}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--color-textSecondary)] capitalize">{log.taskType}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span 
                          className={`text-lg font-bold ${log.wasOnTime ? 'text-[var(--color-success)]' : 'text-red-600'}`}
                        >
                          {log.scorePercentage?.toFixed(1) || '0.0'}%
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--color-text)]">
                          {log.plannedDate ? formatDate(log.plannedDate) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--color-text)]">
                          {log.completedDate ? formatDate(log.completedDate) : 'N/A'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-[var(--color-text)]">
                          {log.plannedDays || 0} / {log.actualDays || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                          log.wasOnTime 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {log.wasOnTime ? 'On Time' : 'Late'}
                        </span>
                        {log.scoreImpacted && (
                          <span className="ml-2 px-2 py-1 text-xs rounded-full font-medium bg-orange-100 text-orange-700">
                            Impacted
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetailedPerformance;

