import React, { useState, useEffect } from 'react';
import { FileText, Download, Filter, Search, Calendar, User, RefreshCw, Activity } from 'lucide-react';
import axios from 'axios';
import { address } from '../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface AdjustmentLog {
  _id: string;
  adjustedBy: {
    _id: string;
    username: string;
    email: string;
    role: string;
  };
  affectedUser: {
    _id: string;
    username: string;
    email: string;
    role: string;
  };
  adjustmentType: string;
  description: string;
  oldValue: any;
  newValue: any;
  ipAddress?: string;
  timestamp: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
  role: string;
}

interface Stats {
  totalAdjustments: number;
  adjustmentsByType: Array<{ _id: string; count: number }>;
  topAdjusters: Array<{ _id: string; username: string; email: string; count: number }>;
  recentActivity: AdjustmentLog[];
}

const AdjustmentLogs: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [logs, setLogs] = useState<AdjustmentLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    adjustmentType: '',
    affectedUser: '',
    adjustedBy: '',
    startDate: '',
    endDate: '',
    search: ''
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchLogs();
    fetchUsers();
    fetchStats();
  }, [filters, page]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      });

      const response = await axios.get(`${address}/api/adjustment-logs?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setLogs(response.data.logs);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Error fetching adjustment logs:', error);
      setMessage({ type: 'error', text: 'Failed to fetch adjustment logs.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await axios.get(`${address}/api/adjustment-logs/stats?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data.stats);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (filters.adjustmentType) params.append('adjustmentType', filters.adjustmentType);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);

      const response = await axios.get(`${address}/api/adjustment-logs/export?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Convert to CSV
      const data = response.data.data;
      if (!data || data.length === 0) {
        setMessage({ type: 'error', text: 'No data to export.' });
        return;
      }

      const headers = Object.keys(data[0]);
      const csvContent = [
        headers.join(','),
        ...data.map((row: any) => 
          headers.map(header => {
            const value = row[header];
            // Escape quotes and wrap in quotes if contains comma or quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          }).join(',')
        )
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `adjustment_logs_${new Date().toISOString()}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      setMessage({ type: 'success', text: 'Logs exported successfully!' });
    } catch (error) {
      console.error('Error exporting logs:', error);
      setMessage({ type: 'error', text: 'Failed to export logs.' });
    }
  };

  const clearFilters = () => {
    setFilters({
      adjustmentType: '',
      affectedUser: '',
      adjustedBy: '',
      startDate: '',
      endDate: '',
      search: ''
    });
    setPage(1);
  };

  const getAdjustmentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      user_created: 'User Created',
      user_updated: 'User Updated',
      user_deleted: 'User Deleted',
      role_changed: 'Role Changed',
      permission_changed: 'Permission Changed',
      status_changed: 'Status Changed',
      password_reset: 'Password Reset',
      profile_updated: 'Profile Updated',
      phone_updated: 'Phone Updated',
      email_updated: 'Email Updated'
    };
    return labels[type] || type;
  };

  const getAdjustmentTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      user_created: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      user_updated: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      user_deleted: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      role_changed: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      permission_changed: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      status_changed: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      password_reset: 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300',
      profile_updated: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      phone_updated: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
      email_updated: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300'
    };
    return colors[type] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[--color-text] flex items-center gap-2">
              <Activity className="text-[--color-primary]" size={28} />
              Adjustment Logs
            </h1>
            <p className="text-sm text-[--color-textSecondary] mt-1">
              Track all administrative changes and user modifications
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-[--color-surface] text-[--color-text] rounded-lg border border-[--color-border] hover:bg-[--color-background] flex items-center gap-2"
            >
              <Filter size={16} />
              Filters
            </button>
            <button
              onClick={handleExport}
              className="px-4 py-2 bg-[--color-primary] text-white rounded-lg hover:opacity-90 flex items-center gap-2"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Message */}
      {message.text && (
        <div
          className={`p-3 rounded-lg text-sm mb-4 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200 dark:bg-green-900/20 dark:text-green-300'
              : 'bg-red-50 text-red-800 border border-red-200 dark:bg-red-900/20 dark:text-red-300'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-[--color-surface] rounded-lg p-4 border border-[--color-border]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-textSecondary]">Total Adjustments</p>
                <p className="text-2xl font-bold text-[--color-text] mt-1">{stats.totalAdjustments}</p>
              </div>
              <FileText className="text-[--color-primary]" size={32} />
            </div>
          </div>

          <div className="bg-[--color-surface] rounded-lg p-4 border border-[--color-border]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-textSecondary]">Top Adjuster</p>
                <p className="text-lg font-semibold text-[--color-text] mt-1 truncate">
                  {stats.topAdjusters[0]?.username || 'N/A'}
                </p>
                <p className="text-xs text-[--color-textSecondary]">
                  {stats.topAdjusters[0]?.count || 0} changes
                </p>
              </div>
              <User className="text-[--color-primary]" size={32} />
            </div>
          </div>

          <div className="bg-[--color-surface] rounded-lg p-4 border border-[--color-border]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-textSecondary]">Most Common</p>
                <p className="text-sm font-semibold text-[--color-text] mt-1">
                  {getAdjustmentTypeLabel(stats.adjustmentsByType[0]?._id || 'N/A')}
                </p>
                <p className="text-xs text-[--color-textSecondary]">
                  {stats.adjustmentsByType[0]?.count || 0} times
                </p>
              </div>
              <Activity className="text-[--color-primary]" size={32} />
            </div>
          </div>

          <div className="bg-[--color-surface] rounded-lg p-4 border border-[--color-border]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[--color-textSecondary]">Recent Activity</p>
                <p className="text-2xl font-bold text-[--color-text] mt-1">{stats.recentActivity.length}</p>
                <p className="text-xs text-[--color-textSecondary]">Last 10 logs</p>
              </div>
              <RefreshCw className="text-[--color-primary]" size={32} />
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="bg-[--color-surface] rounded-lg p-4 mb-6 border border-[--color-border]">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-1">
                <Search size={14} className="inline mr-1" />
                Search Description
              </label>
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search in descriptions..."
                className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-1">Adjustment Type</label>
              <select
                value={filters.adjustmentType}
                onChange={(e) => setFilters({ ...filters, adjustmentType: e.target.value })}
                className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] text-sm"
              >
                <option value="">All Types</option>
                <option value="user_created">User Created</option>
                <option value="user_updated">User Updated</option>
                <option value="user_deleted">User Deleted</option>
                <option value="role_changed">Role Changed</option>
                <option value="permission_changed">Permission Changed</option>
                <option value="status_changed">Status Changed</option>
                <option value="password_reset">Password Reset</option>
                <option value="profile_updated">Profile Updated</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-1">Affected User</label>
              <select
                value={filters.affectedUser}
                onChange={(e) => setFilters({ ...filters, affectedUser: e.target.value })}
                className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] text-sm"
              >
                <option value="">All Users</option>
                {users.map((u) => (
                  <option key={u._id} value={u._id}>
                    {u.username} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-1">
                <Calendar size={14} className="inline mr-1" />
                Start Date
              </label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[--color-text] mb-1">
                <Calendar size={14} className="inline mr-1" />
                End Date
              </label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text] text-sm"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full px-4 py-2 bg-[--color-accent] text-white rounded-lg hover:opacity-90 text-sm"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logs Table */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="bg-[--color-surface] rounded-lg p-12 text-center border border-[--color-border]">
          <FileText className="mx-auto text-[--color-textSecondary] mb-4" size={48} />
          <p className="text-[--color-textSecondary]">No adjustment logs found.</p>
        </div>
      ) : (
        <>
          <div className="bg-[--color-surface] rounded-lg border border-[--color-border] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[--color-background] border-b border-[--color-border]">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                      Adjusted By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-[--color-textSecondary] uppercase tracking-wider">
                      Affected User
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[--color-border]">
                  {logs.map((log) => (
                    <tr key={log._id} className="hover:bg-[--color-background] transition-colors">
                      <td className="px-4 py-3 text-sm text-[--color-text] whitespace-nowrap">
                        {formatDate(log.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${getAdjustmentTypeColor(
                            log.adjustmentType
                          )}`}
                        >
                          {getAdjustmentTypeLabel(log.adjustmentType)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[--color-text]">
                        {log.description}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="text-[--color-text] font-medium">{log.adjustedBy?.username}</p>
                          <p className="text-[--color-textSecondary] text-xs">{log.adjustedBy?.role}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div>
                          <p className="text-[--color-text] font-medium">{log.affectedUser?.username}</p>
                          <p className="text-[--color-textSecondary] text-xs">{log.affectedUser?.email}</p>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 bg-[--color-surface] text-[--color-text] rounded-lg border border-[--color-border] hover:bg-[--color-background] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-[--color-text]">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 bg-[--color-surface] text-[--color-text] rounded-lg border border-[--color-border] hover:bg-[--color-background] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdjustmentLogs;

