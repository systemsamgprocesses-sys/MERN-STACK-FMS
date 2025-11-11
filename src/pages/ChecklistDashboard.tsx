
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface DashboardStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  byRecurrence: Record<string, number>;
  recentSubmissions: any[];
}

const ChecklistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
    fetchStats();
  }, [selectedPerson]);

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
      const params = selectedPerson ? `?assignedTo=${selectedPerson}` : '';
      const response = await axios.get(`${address}/api/checklists/dashboard${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[--color-background] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[--color-background] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
              <CheckSquare className="text-[--color-primary]" />
              Checklist Dashboard
            </h1>
            <p className="text-[--color-textSecondary] mt-1">Overview of all checklists</p>
          </div>
          <div className="w-64">
            <select
              value={selectedPerson}
              onChange={(e) => setSelectedPerson(e.target.value)}
              className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-surface] text-[--color-text]"
            >
              <option value="">All Users</option>
              {users.map(user => (
                <option key={user._id} value={user._id}>{user.username}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[--color-textSecondary]">Total Checklists</h3>
              <CheckSquare className="text-[--color-primary]" size={24} />
            </div>
            <p className="text-3xl font-bold text-[--color-text]">{stats.total}</p>
          </div>

          <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[--color-textSecondary]">Completed</h3>
              <CheckCircle className="text-green-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
          </div>

          <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[--color-textSecondary]">Pending</h3>
              <Clock className="text-yellow-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
          </div>

          <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-[--color-textSecondary]">Overdue</h3>
              <AlertCircle className="text-red-500" size={24} />
            </div>
            <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
          </div>
        </div>

        {/* Recurrence Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
            <h2 className="text-xl font-semibold text-[--color-text] mb-4">By Recurrence Type</h2>
            <div className="space-y-3">
              {Object.entries(stats.byRecurrence).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-[--color-text] capitalize">{type}</span>
                  <span className="font-semibold text-[--color-primary]">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
            <h2 className="text-xl font-semibold text-[--color-text] mb-4">Recent Submissions</h2>
            <div className="space-y-3">
              {stats.recentSubmissions.slice(0, 5).map((submission: any) => (
                <div
                  key={submission._id}
                  className="p-3 rounded-lg bg-[--color-background] hover:bg-[--color-border] cursor-pointer transition-colors"
                  onClick={() => navigate(`/checklists/${submission._id}`)}
                >
                  <p className="font-medium text-[--color-text] truncate">{submission.title}</p>
                  <p className="text-sm text-[--color-textSecondary]">
                    {new Date(submission.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              ))}
              {stats.recentSubmissions.length === 0 && (
                <p className="text-[--color-textSecondary] text-center py-4">No recent submissions</p>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/checklists')}
            className="px-6 py-3 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] transition-colors"
          >
            View All Checklists →
          </button>
          <button
            onClick={() => navigate('/checklists/create')}
            className="px-6 py-3 border border-[--color-border] text-[--color-text] rounded-lg hover:bg-[--color-border] transition-colors"
          >
            Create New Checklist
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChecklistDashboard;
