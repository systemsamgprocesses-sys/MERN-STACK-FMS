import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  CheckSquare, TrendingUp, Clock, CheckCircle, AlertCircle, 
  Calendar, Users, Filter, Search, ChevronDown, ChevronUp, 
  Eye, Edit3, Archive, Plus, RefreshCw, BarChart3,
  ArrowRight, CalendarDays, Target, CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface ChecklistItem {
  _id: string;
  title: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate?: string;
  assignedTo?: { _id: string; username: string; email: string };
  assignedBy?: { _id: string; username: string };
  createdAt: string;
  completedAt?: string;
  category: string;
  progress: number;
  attachments: any[];
  notes?: string;
  recurrence?: {
    type: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'none';
    nextDue?: string;
  };
}

interface DashboardStats {
  total: number;
  completed: number;
  pending: number;
  overdue: number;
  active: number;
  upcoming: number;
  byRecurrence: Record<string, number>;
  recentSubmissions: ChecklistItem[];
  completionRate: number;
  averageCompletionTime: number;
}

interface SectionData {
  title: string;
  count: number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  items: ChecklistItem[];
}

const EnhancedChecklistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allChecklists, setAllChecklists] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['upcoming', 'active', 'overdue', 'completed']));
  const [viewMode, setViewMode] = useState<'dashboard' | 'list'>('dashboard');

  useEffect(() => {
    fetchUsers();
    fetchChecklists();
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

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = selectedPerson ? `?assignedTo=${selectedPerson}` : '';
      
      const response = await axios.get(`${address}/api/checklists${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      const checklists = response.data;
      setAllChecklists(checklists);
      
      // Calculate dashboard statistics
      const calculatedStats = calculateDashboardStats(checklists);
      setStats(calculatedStats);
    } catch (error) {
      console.error('Error fetching checklists:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateDashboardStats = (checklists: ChecklistItem[]): DashboardStats => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // Categorize tasks
    const upcomingTasks = checklists.filter(item => {
      if (!item.dueDate || item.status === 'completed') return false;
      const dueDate = new Date(item.dueDate);
      return dueDate > today;
    });
    
    const activeTasks = checklists.filter(item => {
      if (!item.dueDate || item.status === 'completed') return false;
      const dueDate = new Date(item.dueDate);
      return dueDate <= today && item.status !== 'overdue';
    });
    
    const overdueTasks = checklists.filter(item => {
      if (!item.dueDate || item.status === 'completed') return false;
      const dueDate = new Date(item.dueDate);
      return dueDate < today;
    });
    
    const completedTasks = checklists.filter(item => item.status === 'completed');
    
    const pendingTasks = checklists.filter(item => item.status === 'pending');
    
    // Calculate completion rate
    const completionRate = checklists.length > 0 ? (completedTasks.length / checklists.length) * 100 : 0;
    
    // Calculate average completion time
    const completedWithDates = completedTasks.filter(item => item.completedAt);
    const averageCompletionTime = completedWithDates.length > 0 
      ? completedWithDates.reduce((sum, item) => {
          const created = new Date(item.createdAt);
          const completed = new Date(item.completedAt!);
          return sum + (completed.getTime() - created.getTime());
        }, 0) / completedWithDates.length / (1000 * 60 * 60 * 24) // Convert to days
      : 0;

    // Group by recurrence type
    const byRecurrence = checklists.reduce((acc, item) => {
      const type = item.recurrence?.type || 'none';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Get recent submissions (last 7 days)
    const recentCutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSubmissions = checklists
      .filter(item => new Date(item.createdAt) > recentCutoff)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    return {
      total: checklists.length,
      completed: completedTasks.length,
      pending: pendingTasks.length,
      overdue: overdueTasks.length,
      active: activeTasks.length,
      upcoming: upcomingTasks.length,
      byRecurrence,
      recentSubmissions,
      completionRate: Math.round(completionRate),
      averageCompletionTime: Math.round(averageCompletionTime * 10) / 10
    };
  };

  const filteredChecklists = useMemo(() => {
    return allChecklists.filter(item => {
      const matchesSearch = !searchTerm || 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesPriority = !priorityFilter || item.priority === priorityFilter;
      const matchesCategory = !categoryFilter || item.category === categoryFilter;
      
      return matchesSearch && matchesPriority && matchesCategory;
    });
  }, [allChecklists, searchTerm, priorityFilter, categoryFilter]);

  const taskSections = useMemo((): SectionData[] => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Apply filters to all tasks
    const filtered = filteredChecklists;

    // Upcoming Tasks - future-dated items
    const upcomingTasks = filtered.filter(item => {
      if (!item.dueDate || item.status === 'completed') return false;
      const dueDate = new Date(item.dueDate);
      return dueDate > today;
    });

    // Active Tasks - current assignments (not overdue, not completed, due today or earlier)
    const activeTasks = filtered.filter(item => {
      if (!item.dueDate || item.status === 'completed') return false;
      const dueDate = new Date(item.dueDate);
      return dueDate <= today && item.status !== 'overdue';
    });

    // Overdue Tasks - past due date, incomplete
    const overdueTasks = filtered.filter(item => {
      if (!item.dueDate || item.status === 'completed') return false;
      const dueDate = new Date(item.dueDate);
      return dueDate < today;
    });

    // Completed Tasks
    const completedTasks = filtered.filter(item => item.status === 'completed');

    return [
      {
        title: 'Upcoming Tasks',
        count: upcomingTasks.length,
        icon: <CalendarDays className="h-5 w-5" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        items: upcomingTasks.sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
      },
      {
        title: 'Active Tasks',
        count: activeTasks.length,
        icon: <Target className="h-5 w-5" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        items: activeTasks.sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0;
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        })
      },
      {
        title: 'Overdue Tasks',
        count: overdueTasks.length,
        icon: <AlertCircle className="h-5 w-5" />,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200',
        items: overdueTasks.sort((a, b) => {
          if (!a.dueDate || !b.dueDate) return 0;
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        })
      },
      {
        title: 'Completed Tasks',
        count: completedTasks.length,
        icon: <CheckCircle2 className="h-5 w-5" />,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        borderColor: 'border-purple-200',
        items: completedTasks.sort((a, b) => {
          if (!a.completedAt || !b.completedAt) return 0;
          return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
        })
      }
    ];
  }, [filteredChecklists]);

  const toggleSection = (sectionTitle: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionTitle)) {
      newExpanded.delete(sectionTitle);
    } else {
      newExpanded.add(sectionTitle);
    }
    setExpandedSections(newExpanded);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'urgent': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'completed': return 'bg-green-100 text-green-800 border-green-200';
      case 'overdue': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderTaskCard = (item: ChecklistItem, sectionColor: string) => (
    <div 
      key={item._id}
      className={`bg-white rounded-lg border-l-4 ${sectionColor} p-4 hover:shadow-md transition-all duration-200 cursor-pointer`}
      onClick={() => navigate(`/checklists/${item._id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <h4 className="font-medium text-gray-900 line-clamp-2 flex-1">{item.title}</h4>
        {item.priority === 'urgent' && (
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse ml-2"></div>
        )}
      </div>
      
      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{item.description}</p>
      
      <div className="flex flex-wrap gap-2 mb-3">
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(item.priority)}`}>
          {item.priority.toUpperCase()}
        </span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.status)}`}>
          {item.status.replace('-', ' ').toUpperCase()}
        </span>
        {item.category && (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
            {item.category}
          </span>
        )}
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}
        </div>
        {item.assignedTo && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {item.assignedTo.username}
          </div>
        )}
      </div>
      
      {item.progress !== undefined && item.progress > 0 && item.progress < 100 && (
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>Progress</span>
            <span>{item.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className={`h-1.5 rounded-full ${sectionColor.includes('blue') ? 'bg-blue-500' : 
                sectionColor.includes('green') ? 'bg-green-500' : 
                sectionColor.includes('red') ? 'bg-red-500' : 'bg-purple-500'}`}
              style={{ width: `${item.progress}%` }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSection = (section: SectionData) => {
    const isExpanded = expandedSections.has(section.title.toLowerCase().replace(' ', ''));
    
    return (
      <div key={section.title} className={`bg-white rounded-xl border ${section.borderColor} shadow-sm overflow-hidden`}>
        <div 
          className={`${section.bgColor} p-4 cursor-pointer hover:opacity-80 transition-opacity`}
          onClick={() => toggleSection(section.title.toLowerCase().replace(' ', ''))}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${section.bgColor} ${section.color}`}>
                {section.icon}
              </div>
              <div>
                <h3 className={`font-semibold ${section.color} flex items-center gap-2`}>
                  {section.title}
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${section.color} bg-white/50`}>
                    {section.count}
                  </span>
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {section.count === 0 
                    ? 'No tasks' 
                    : section.count === 1 
                      ? '1 task' 
                      : `${section.count} tasks`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  navigate('/checklists/create', { state: { category: section.title.toLowerCase() } });
                }}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-white/50 rounded-lg transition-colors"
                title={`Add new ${section.title.toLowerCase().slice(0, -1)}`}
              >
                <Plus className="h-4 w-4" />
              </button>
              {isExpanded ? (
                <ChevronUp className={`h-5 w-5 ${section.color}`} />
              ) : (
                <ChevronDown className={`h-5 w-5 ${section.color}`} />
              )}
            </div>
          </div>
        </div>
        
        {isExpanded && (
          <div className="p-4">
            {section.items.length === 0 ? (
              <div className="text-center py-8">
                <div className={`w-12 h-12 mx-auto rounded-full ${section.bgColor} flex items-center justify-center mb-3`}>
                  {section.icon}
                </div>
                <p className="text-gray-500">No {section.title.toLowerCase()} found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {section.items.slice(0, 5).map(item => renderTaskCard(item, section.borderColor))}
                {section.items.length > 5 && (
                  <div className="text-center pt-3 border-t border-gray-100">
                    <button 
                      onClick={() => navigate('/checklists', { state: { filter: section.title.toLowerCase().replace(' ', '') } })}
                      className={`text-sm ${section.color} hover:underline flex items-center gap-1 mx-auto`}
                    >
                      View {section.items.length - 5} more
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading checklist dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <CheckSquare className="h-6 w-6 text-blue-600" />
              </div>
              Checklist Dashboard
            </h1>
            <p className="text-gray-600 mt-2">
              Comprehensive view of all checklists and tasks • {stats.total} total items
            </p>
          </div>
          
          <div className="flex items-center gap-4 mt-6 lg:mt-0">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search checklists..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
                />
              </div>
              
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Priorities</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
              
              <select
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>{user.username}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/checklists/create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                New Checklist
              </button>
              
              <button
                onClick={fetchChecklists}
                className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                title="Refresh"
              >
                <RefreshCw className="h-4 w-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Checklists</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stats.total}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <CheckSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-green-600">
              <TrendingUp className="h-4 w-4 mr-1" />
              {stats.completionRate}% completion rate
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600 mt-1">{stats.completed}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Clock className="h-4 w-4 mr-1" />
              Avg. {stats.averageCompletionTime} days
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active & Upcoming</p>
                <p className="text-3xl font-bold text-blue-600 mt-1">{stats.active + stats.upcoming}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Clock className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-gray-500">
              <Calendar className="h-4 w-4 mr-1" />
              {stats.upcoming} upcoming
            </div>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-600 mt-1">{stats.overdue}</p>
              </div>
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm text-red-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              Needs attention
            </div>
          </div>
        </div>

        {/* Task Sections */}
        <div className="space-y-6">
          {taskSections.map(section => renderSection(section))}
        </div>

        {/* Recent Activity */}
        {stats.recentSubmissions.length > 0 && (
          <div className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Recent Activity
              </h3>
              <p className="text-sm text-gray-600 mt-1">Latest checklist submissions and updates</p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats.recentSubmissions.map((submission) => (
                  <div key={submission._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                       onClick={() => navigate(`/checklists/${submission._id}`)}>
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <CheckSquare className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{submission.title}</p>
                      <p className="text-sm text-gray-600">
                        {submission.status === 'completed' ? 'Completed' : 'Created'} by {submission.assignedTo?.username || 'Unknown'} • {new Date(submission.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(submission.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <button 
                  onClick={() => navigate('/checklists')}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1 mx-auto"
                >
                  View All Checklists
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EnhancedChecklistDashboard;