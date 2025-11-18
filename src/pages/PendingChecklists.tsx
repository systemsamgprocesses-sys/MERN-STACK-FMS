import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  CheckSquare, 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ListTodo,
  Filter
} from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface ChecklistOccurrence {
  _id: string;
  templateName: string;
  category: string;
  dueDate: string;
  status: 'pending' | 'completed';
  progressPercentage: number;
  items: Array<{
    label: string;
    description?: string;
    checked: boolean;
  }>;
}

const PendingChecklists: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [pendingChecklists, setPendingChecklists] = useState<ChecklistOccurrence[]>([]);
  const [completedChecklists, setCompletedChecklists] = useState<ChecklistOccurrence[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'today' | 'pending' | 'completed' | 'all'>('today');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      fetchChecklists();
    }
  }, [user]);

  const fetchChecklists = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // Fetch pending checklists
      const pendingResponse = await axios.get(`${address}/api/checklist-occurrences`, {
        params: {
          assignedTo: user.id,
          status: 'pending'
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      // Fetch completed checklists
      const completedResponse = await axios.get(`${address}/api/checklist-occurrences`, {
        params: {
          assignedTo: user.id,
          status: 'completed'
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      setPendingChecklists(pendingResponse.data || []);
      setCompletedChecklists(completedResponse.data || []);

      // Extract unique categories
      const allChecklists = [...(pendingResponse.data || []), ...(completedResponse.data || [])];
      const uniqueCategories = Array.from(new Set(allChecklists.map(c => c.category || 'General')));
      setCategories(uniqueCategories);

    } catch (error) {
      console.error('Error fetching checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChecklistClick = (id: string) => {
    navigate(`/checklist-occurrence/${id}`);
  };

  const getDisplayChecklists = () => {
    let checklists: ChecklistOccurrence[] = [];
    
    if (activeTab === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      checklists = [...pendingChecklists, ...completedChecklists].filter(c => {
        const dueDate = new Date(c.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
      });
    } else if (activeTab === 'pending') {
      checklists = pendingChecklists;
    } else if (activeTab === 'completed') {
      checklists = completedChecklists;
    } else {
      checklists = [...pendingChecklists, ...completedChecklists];
    }

    // Apply category filter
    if (filterCategory !== 'all') {
      checklists = checklists.filter(c => c.category === filterCategory);
    }

    // Sort by due date
    return checklists.sort((a, b) => 
      new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
    );
  };

  const displayChecklists = getDisplayChecklists();
  
  // Calculate today's checklists count
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayChecklists = [...pendingChecklists, ...completedChecklists].filter(c => {
    const dueDate = new Date(c.dueDate);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate.getTime() === today.getTime();
  });
  const todayPending = todayChecklists.filter(c => c.status === 'pending').length;
  const todayCompleted = todayChecklists.filter(c => c.status === 'completed').length;

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(date);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Tomorrow';
    if (diffDays === -1) return 'Yesterday';
    if (diffDays < 0) return `${Math.abs(diffDays)} days ago`;
    if (diffDays > 0) return `In ${diffDays} days`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOverdue = (dateString: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(dateString);
    dueDate.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <ListTodo className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
          My Checklists
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-textSecondary)' }}>
          View and complete your assigned checklists
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div 
          className="p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          style={{ backgroundColor: 'var(--color-surface)' }}
          onClick={() => setActiveTab('today')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Today's Tasks
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-info)' }}>
                {todayChecklists.length}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                {todayPending} pending, {todayCompleted} done
              </p>
            </div>
            <CalendarIcon className="w-12 h-12" style={{ color: 'var(--color-info)', opacity: 0.3 }} />
          </div>
        </div>

        <div 
          className="p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          style={{ backgroundColor: 'var(--color-surface)' }}
          onClick={() => setActiveTab('pending')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Pending
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-warning)' }}>
                {pendingChecklists.length}
              </p>
            </div>
            <Clock className="w-12 h-12" style={{ color: 'var(--color-warning)', opacity: 0.3 }} />
          </div>
        </div>

        <div 
          className="p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          style={{ backgroundColor: 'var(--color-surface)' }}
          onClick={() => setActiveTab('completed')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Completed
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-success)' }}>
                {completedChecklists.length}
              </p>
            </div>
            <CheckCircle2 className="w-12 h-12" style={{ color: 'var(--color-success)', opacity: 0.3 }} />
          </div>
        </div>

        <div 
          className="p-6 rounded-lg shadow-md cursor-pointer hover:shadow-lg transition-shadow"
          style={{ backgroundColor: 'var(--color-surface)' }}
          onClick={() => setActiveTab('all')}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                Total
              </p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
                {pendingChecklists.length + completedChecklists.length}
              </p>
            </div>
            <CheckSquare className="w-12 h-12" style={{ color: 'var(--color-primary)', opacity: 0.3 }} />
          </div>
        </div>
      </div>

      {/* Filters and Tabs */}
      <div className="mb-6 p-4 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Tabs */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'today' ? 'shadow-md' : ''
              }`}
              style={{
                backgroundColor: activeTab === 'today' ? 'var(--color-info)' : 'var(--color-background)',
                color: activeTab === 'today' ? 'white' : 'var(--color-text)'
              }}
            >
              Today ({todayChecklists.length})
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'pending' ? 'shadow-md' : ''
              }`}
              style={{
                backgroundColor: activeTab === 'pending' ? 'var(--color-warning)' : 'var(--color-background)',
                color: activeTab === 'pending' ? 'white' : 'var(--color-text)'
              }}
            >
              Pending ({pendingChecklists.length})
            </button>
            <button
              onClick={() => setActiveTab('completed')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'completed' ? 'shadow-md' : ''
              }`}
              style={{
                backgroundColor: activeTab === 'completed' ? 'var(--color-success)' : 'var(--color-background)',
                color: activeTab === 'completed' ? 'white' : 'var(--color-text)'
              }}
            >
              Completed ({completedChecklists.length})
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeTab === 'all' ? 'shadow-md' : ''
              }`}
              style={{
                backgroundColor: activeTab === 'all' ? 'var(--color-primary)' : 'var(--color-background)',
                color: activeTab === 'all' ? 'white' : 'var(--color-text)'
              }}
            >
              All ({pendingChecklists.length + completedChecklists.length})
            </button>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" style={{ color: 'var(--color-textSecondary)' }} />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 rounded border"
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
                borderColor: 'var(--color-border)'
              }}
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Checklists List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
            <p style={{ color: 'var(--color-textSecondary)' }}>Loading checklists...</p>
          </div>
        </div>
      ) : displayChecklists.length === 0 ? (
        <div className="text-center py-12 p-6 rounded-lg" style={{ backgroundColor: 'var(--color-surface)' }}>
          <CheckSquare className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--color-textSecondary)', opacity: 0.5 }} />
          <h3 className="text-xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
            No checklists found
          </h3>
          <p style={{ color: 'var(--color-textSecondary)' }}>
            {activeTab === 'today' && 'No checklists due today. Enjoy your day!'}
            {activeTab === 'pending' && 'You have no pending checklists. Great job!'}
            {activeTab === 'completed' && 'You haven\'t completed any checklists yet.'}
            {activeTab === 'all' && 'No checklists have been assigned to you.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayChecklists.map(checklist => {
            const overdue = checklist.status === 'pending' && isOverdue(checklist.dueDate);
            
            return (
              <div
                key={checklist._id}
                onClick={() => handleChecklistClick(checklist._id)}
                className="p-6 rounded-lg shadow-md hover:shadow-lg transition-all cursor-pointer"
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                        {checklist.templateName}
                      </h3>
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: overdue 
                            ? 'rgba(239, 68, 68, 0.1)' 
                            : checklist.status === 'completed'
                            ? 'rgba(16, 185, 129, 0.1)'
                            : 'rgba(245, 158, 11, 0.1)',
                          color: overdue
                            ? 'var(--color-error)'
                            : checklist.status === 'completed'
                            ? 'var(--color-success)'
                            : 'var(--color-warning)'
                        }}
                      >
                        {overdue ? 'OVERDUE' : checklist.status.toUpperCase()}
                      </span>
                      <span 
                        className="px-2 py-1 rounded text-xs"
                        style={{
                          backgroundColor: 'var(--color-background)',
                          color: 'var(--color-textSecondary)'
                        }}
                      >
                        {checklist.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                      <div className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        <span>Due: {formatDate(checklist.dueDate)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <CheckSquare className="w-4 h-4" />
                        <span>
                          {checklist.items.filter(i => i.checked).length} / {checklist.items.length} items
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-medium" style={{ color: 'var(--color-textSecondary)' }}>
                          Progress
                        </span>
                        <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                          {checklist.progressPercentage}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${checklist.progressPercentage}%`,
                            backgroundColor: checklist.status === 'completed'
                              ? 'var(--color-success)'
                              : overdue
                              ? 'var(--color-error)'
                              : 'var(--color-primary)'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="ml-4">
                    {checklist.status === 'completed' ? (
                      <CheckCircle2 className="w-8 h-8" style={{ color: 'var(--color-success)' }} />
                    ) : overdue ? (
                      <AlertCircle className="w-8 h-8" style={{ color: 'var(--color-error)' }} />
                    ) : (
                      <Clock className="w-8 h-8" style={{ color: 'var(--color-warning)' }} />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PendingChecklists;

