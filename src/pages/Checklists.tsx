
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Plus, Filter, Calendar, User, Users, Clock, Archive } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface Checklist {
  _id: string;
  title: string;
  assignedTo: { _id: string; username: string };
  recurrence: {
    type: string;
    customInterval?: { unit: string; n: number };
  };
  status: string;
  startDate: string;
  nextRunDate?: string;
  items: Array<{ _id: string; title: string; isDone: boolean }>;
  createdAt: string;
}

const Checklists: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    assignedTo: '',
    recurrence: '',
    dateFrom: '',
    dateTo: '',
  });

  useEffect(() => {
    fetchChecklists();
  }, [filters]);

  const fetchChecklists = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      const response = await axios.get(`${address}/api/checklists?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setChecklists(response.data);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (checklist: Checklist) => {
    if (!checklist.items.length) return 0;
    const completed = checklist.items.filter(item => item.isDone).length;
    return Math.round((completed / checklist.items.length) * 100);
  };

  const getRecurrenceLabel = (recurrence: Checklist['recurrence']) => {
    if (recurrence.type === 'custom') {
      return `Every ${recurrence.customInterval?.n} ${recurrence.customInterval?.unit}`;
    }
    return recurrence.type.charAt(0).toUpperCase() + recurrence.type.slice(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Submitted': return 'bg-blue-100 text-blue-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-[--color-background] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
              <CheckSquare className="text-[--color-primary]" />
              Checklists
            </h1>
            <p className="text-[--color-textSecondary] mt-1">Manage and track your checklists</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="px-4 py-2 bg-[--color-surface] text-[--color-text] rounded-lg hover:bg-[--color-border] transition-colors flex items-center gap-2"
            >
              <Filter size={18} />
              Filters
            </button>
            <button
              onClick={() => navigate('/checklists/create')}
              className="px-4 py-2 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark] transition-colors flex items-center gap-2"
            >
              <Plus size={18} />
              Create Checklist
            </button>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-[--color-surface] rounded-xl p-4 mb-6 border border-[--color-border]">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                >
                  <option value="">All</option>
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1">Recurrence</label>
                <select
                  value={filters.recurrence}
                  onChange={(e) => setFilters({ ...filters, recurrence: e.target.value })}
                  className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                >
                  <option value="">All</option>
                  <option value="one-time">One-time</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="fortnightly">Fortnightly</option>
                  <option value="monthly">Monthly</option>
                  <option value="custom">Custom</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1">Date From</label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                  className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[--color-text] mb-1">Date To</label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                  className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setFilters({ status: '', assignedTo: '', recurrence: '', dateFrom: '', dateTo: '' })}
                  className="w-full px-3 py-2 bg-[--color-accent] text-white rounded-lg hover:bg-[--color-accent]/80"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Checklists Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
          </div>
        ) : checklists.length === 0 ? (
          <div className="text-center py-12 bg-[--color-surface] rounded-xl border border-[--color-border]">
            <CheckSquare size={48} className="mx-auto text-[--color-textSecondary] mb-4" />
            <p className="text-[--color-textSecondary] text-lg">No checklists found</p>
            <button
              onClick={() => navigate('/checklists/create')}
              className="mt-4 px-6 py-2 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary-dark]"
            >
              Create Your First Checklist
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {checklists.map((checklist) => (
              <div
                key={checklist._id}
                onClick={() => navigate(`/checklists/${checklist._id}`)}
                className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border] hover:shadow-lg transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-[--color-text] line-clamp-2">{checklist.title}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(checklist.status)}`}>
                    {checklist.status}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[--color-textSecondary]">
                    <User size={14} />
                    {checklist.assignedTo.username}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[--color-textSecondary]">
                    <Clock size={14} />
                    {getRecurrenceLabel(checklist.recurrence)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[--color-textSecondary]">
                    <Calendar size={14} />
                    {new Date(checklist.startDate).toLocaleDateString()}
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-sm text-[--color-textSecondary] mb-1">
                    <span>Progress</span>
                    <span>{getProgressPercentage(checklist)}%</span>
                  </div>
                  <div className="w-full bg-[--color-border] rounded-full h-2">
                    <div
                      className="bg-[--color-primary] h-2 rounded-full transition-all"
                      style={{ width: `${getProgressPercentage(checklist)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-sm text-[--color-textSecondary]">
                  {checklist.items.filter(i => i.isDone).length} of {checklist.items.length} items completed
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Checklists;
