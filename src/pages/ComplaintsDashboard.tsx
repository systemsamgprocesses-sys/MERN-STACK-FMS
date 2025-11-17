import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, AlertCircle, Calendar, ChevronLeft, ChevronRight, RefreshCw, TrendingUp, TrendingDown, CheckSquare } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
  total: number;
  open: number;
  in_progress: number;
  resolved: number;
  closed: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  recentComplaints: Array<{
    _id: string;
    title: string;
    description: string;
    category: string;
    priority: string;
    status: string;
    raisedBy: {
      username: string;
    };
    createdAt: string;
  }>;
  monthlyTrends: Array<{
    month: string;
    total: number;
    resolved: number;
    open: number;
  }>;
}

interface CalendarDay {
  date: string;
  complaints: any[];
  count: number;
  level: number;
}

interface CalendarData {
  year: number;
  month: number;
  calendar: CalendarDay[];
}

const ComplaintsDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar'>('dashboard');
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [searchQuery, setSearchQuery] = useState('');

  // Check if user has permission to view complaints dashboard
  const hasPermission = user && (
    user.role === 'admin' || 
    user.role === 'superadmin' || 
    user.permissions?.canViewAllComplaints
  );

  // Redirect if no permission
  React.useEffect(() => {
    if (user && !hasPermission) {
      navigate('/dashboard');
    }
  }, [user, hasPermission, navigate]);

  useEffect(() => {
    fetchUsers();
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedPerson, selectedCategory, user]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendarData();
    }
  }, [viewMode, calendarYear, calendarMonth, selectedPerson, selectedCategory]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/complaints/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
      // Fallback to common categories if endpoint doesn't exist
      setCategories(['general', 'technical', 'billing', 'hr', 'facilities']);
    }
  };

  const fetchStats = async () => {
    try {
      setError(null);
      setLoading(true);
      const token = localStorage.getItem('token');

      // Build query parameters
      const params = new URLSearchParams({
        role: user?.role || '',
        userId: user?.id || ''
      });

      if (selectedPerson) {
        params.append('assignedTo', selectedPerson);
      }
      if (selectedCategory) {
        params.append('category', selectedCategory);
      }

      const response = await axios.get(`${address}/api/complaints/dashboard?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Check if response has the expected structure
      if (response.data && typeof response.data.total !== 'undefined') {
        setStats(response.data);
      } else {
        // Fallback: fetch from regular complaints and compute stats
        const allComplaintsResponse = await axios.get(`${address}/api/complaints?scope=all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Server returns array directly
        const complaints = Array.isArray(allComplaintsResponse.data) 
          ? allComplaintsResponse.data 
          : (allComplaintsResponse.data?.complaints || []);
        
        const computedStats = computeStatsFromComplaints(complaints);
        setStats(computedStats);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
      
      // Fallback: fetch all complaints and compute basic stats
      try {
        const token = localStorage.getItem('token');
        const allComplaintsResponse = await axios.get(`${address}/api/complaints?scope=all`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // Server returns array directly
        const complaints = Array.isArray(allComplaintsResponse.data) 
          ? allComplaintsResponse.data 
          : (allComplaintsResponse.data?.complaints || []);
        
        const computedStats = computeStatsFromComplaints(complaints);
        setStats(computedStats);
      } catch (fallbackError) {
        console.error('Error fetching fallback data:', fallbackError);
        setError('Failed to load dashboard data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const computeStatsFromComplaints = (complaints: any[]): DashboardStats => {
    const total = complaints.length;
    const open = complaints.filter(c => c.status === 'open').length;
    const in_progress = complaints.filter(c => c.status === 'in_progress').length;
    const resolved = complaints.filter(c => c.status === 'resolved').length;
    const closed = complaints.filter(c => c.status === 'closed').length;

    // Group by category
    const byCategory = complaints.reduce((acc, complaint) => {
      const category = complaint.category || 'uncategorized';
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Group by priority
    const byPriority = complaints.reduce((acc, complaint) => {
      const priority = complaint.priority || 'medium';
      acc[priority] = (acc[priority] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Recent complaints (last 10)
    const recentComplaints = complaints
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    // Monthly trends (last 6 months)
    const monthlyTrends = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthComplaints = complaints.filter(c => {
        const complaintDate = new Date(c.createdAt);
        return complaintDate >= monthStart && complaintDate <= monthEnd;
      });
      
      monthlyTrends.push({
        month: date.toLocaleDateString('en', { month: 'short', year: '2-digit' }),
        total: monthComplaints.length,
        resolved: monthComplaints.filter(c => c.status === 'resolved').length,
        open: monthComplaints.filter(c => c.status === 'open').length,
      });
    }

    return {
      total,
      open,
      in_progress,
      resolved,
      closed,
      byCategory,
      byPriority,
      recentComplaints,
      monthlyTrends,
    };
  };

  const fetchCalendarData = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        year: calendarYear.toString(),
        month: (calendarMonth + 1).toString()
      });
      
      if (selectedPerson) params.append('userId', selectedPerson);
      if (selectedCategory) params.append('category', selectedCategory);

      // For now, we'll generate calendar data from complaints
      // In a real implementation, you'd have an endpoint for this
      const allComplaintsResponse = await axios.get(`${address}/api/complaints?scope=all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      // Server returns array directly
      const complaints = Array.isArray(allComplaintsResponse.data) 
        ? allComplaintsResponse.data 
        : (allComplaintsResponse.data?.complaints || []);
      const calendar = generateCalendarData(complaints);
      
      setCalendarData({
        year: calendarYear,
        month: calendarMonth,
        calendar,
      });
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
  };

  const generateCalendarData = (complaints: any[]): CalendarDay[] => {
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    
    const calendar: CalendarDay[] = [];
    
    // Add empty days for the start of the month
    for (let i = 0; i < firstDay; i++) {
      calendar.push({
        date: '',
        complaints: [],
        count: 0,
        level: 0,
      });
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const dayComplaints = complaints.filter(c => {
        const complaintDate = new Date(c.createdAt).toISOString().split('T')[0] === dateStr;
        return complaintDate;
      });
      
      const count = dayComplaints.length;
      const level = count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : count <= 10 ? 3 : 4;
      
      calendar.push({
        date: dateStr,
        complaints: dayComplaints,
        count,
        level,
      });
    }
    
    return calendar;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[--color-background] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[--color-background] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
            <h2 className="text-2xl font-bold text-red-700 mb-2">Error Loading Dashboard</h2>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null);
                fetchStats();
              }}
              className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const renderCalendarView = () => {
    if (!calendarData) {
      return (
        <div className="bg-[--color-surface] rounded-xl p-8 border border-[--color-border]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-[--color-primary] mx-auto mb-4" />
            <p className="text-[--color-textSecondary]">Loading calendar data...</p>
          </div>
        </div>
      );
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const navigateMonth = (direction: 'prev' | 'next') => {
      let newMonth = calendarMonth;
      let newYear = calendarYear;

      if (direction === 'prev') {
        newMonth--;
        if (newMonth < 0) {
          newMonth = 11;
          newYear--;
        }
      } else {
        newMonth++;
        if (newMonth > 11) {
          newMonth = 0;
          newYear++;
        }
      }

      setCalendarMonth(newMonth);
      setCalendarYear(newYear);
    };

    const getLevelColor = (level: number) => {
      switch (level) {
        case 0: return '#ebedf0';
        case 1: return '#c6e48b';
        case 2: return '#7bc96f';
        case 3: return '#239a3b';
        case 4: return '#196127';
        default: return '#ebedf0';
      }
    };

    const getLevelTooltip = (_level: number, count: number) => {
      if (count === 0) return 'No complaints';
      return `${count} complaint${count > 1 ? 's' : ''}`;
    };

    // Group calendar into weeks
    const weeks = [];
    let currentWeek = Array(0).fill(null);
    
    calendarData.calendar.forEach(day => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    return (
      <div className="bg-[--color-surface] rounded-xl border border-[--color-border] overflow-hidden">
        <div className="p-6 border-b border-[--color-border]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[--color-text] flex items-center gap-2">
              <Calendar className="h-5 w-5 text-[--color-primary]" />
              Complaint Activity Calendar
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigateMonth('prev')}
                className="p-2 hover:bg-[--color-border] rounded-lg transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <h3 className="text-lg font-medium text-[--color-text] min-w-[140px] text-center">
                {monthNames[calendarMonth]} {calendarYear}
              </h3>
              <button
                onClick={() => navigateMonth('next')}
                className="p-2 hover:bg-[--color-border] rounded-lg transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 text-sm text-[--color-textSecondary]">
            <span className="font-medium">Activity:</span>
            <div className="flex items-center gap-1">
              <span className="text-xs">Less</span>
              {[0, 1, 2, 3, 4].map(level => (
                <div
                  key={level}
                  className="w-4 h-4 rounded-sm border border-gray-300"
                  style={{ backgroundColor: getLevelColor(level) }}
                  title={`Level ${level}`}
                />
              ))}
              <span className="text-xs">More</span>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Month Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="bg-[--color-background] rounded-lg p-3 text-center">
              <p className="text-xs text-[--color-textSecondary] mb-1">Total</p>
              <p className="text-2xl font-bold text-[--color-primary]">{stats?.total || 0}</p>
            </div>
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 text-center">
              <p className="text-xs text-[--color-textSecondary] mb-1">Resolved</p>
              <p className="text-2xl font-bold text-green-600">{stats?.resolved || 0}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-center">
              <p className="text-xs text-[--color-textSecondary] mb-1">Open</p>
              <p className="text-2xl font-bold text-yellow-600">{stats?.open || 0}</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-3 text-center">
              <p className="text-xs text-[--color-textSecondary] mb-1">In Progress</p>
              <p className="text-2xl font-bold text-blue-600">{stats?.in_progress || 0}</p>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="mb-6">
            <div className="flex gap-1 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="w-12 text-center text-xs font-medium text-[--color-textSecondary]">
                  {day.slice(0, 1)}
                </div>
              ))}
            </div>

            <div className="space-y-1">
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex gap-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={`${weekIndex}-${dayIndex}`}
                      className="w-12 h-12 group relative"
                      title={day ? getLevelTooltip(day.level, day.count) : ''}
                    >
                      {day && day.date ? (
                        <div
                          className="w-full h-full rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-semibold cursor-pointer transition-all hover:scale-110 hover:shadow-lg"
                          style={{ backgroundColor: getLevelColor(day.level) }}
                          onClick={() => {
                            if (day.complaints.length > 0) {
                              console.log('Day clicked:', day);
                            }
                          }}
                        >
                          <span className={day.level > 2 ? 'text-white' : 'text-gray-700'}>
                            {new Date(day.date).getDate()}
                          </span>
                        </div>
                      ) : (
                        <div className="w-full h-full" />
                      )}
                      
                      {/* Tooltip on hover */}
                      {day && day.count > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {getLevelTooltip(day.level, day.count)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!stats) return null;

  return (
    <div className="min-h-screen bg-[--color-background] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col gap-6 mb-8">
          {/* Top Row: Title + Action Buttons */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-[--color-text] flex items-center gap-2">
                <MessageSquare className="text-[--color-primary]" />
                Complaints Dashboard
              </h1>
              <p className="text-[--color-textSecondary] mt-1">Overview of all complaints across the organization</p>
            </div>

            {/* Action Buttons - Top Right */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/complaints')}
                className="px-4 py-2 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary]/90 transition-colors text-sm font-medium"
              >
                View All Complaints →
              </button>
              <button
                onClick={() => navigate('/complaints')}
                className="px-4 py-2 border border-[--color-border] text-[--color-text] rounded-lg hover:bg-[--color-border] transition-colors text-sm font-medium"
              >
                + New Complaint
              </button>
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search complaints..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-surface] text-[--color-text] placeholder-[--color-textSecondary]"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('dashboard')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'dashboard'
                    ? 'bg-[--color-primary] text-white'
                    : 'bg-[--color-border] text-[--color-text] hover:bg-[--color-border]/80'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  viewMode === 'calendar'
                    ? 'bg-[--color-primary] text-white'
                    : 'bg-[--color-border] text-[--color-text] hover:bg-[--color-border]/80'
                }`}
              >
                Calendar
              </button>
            </div>

            {/* User Filter */}
            <div>
              <select
                value={selectedPerson}
                onChange={(e) => setSelectedPerson(e.target.value)}
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-surface] text-[--color-text] text-sm"
              >
                <option value="">All Users</option>
                {users.map(user => (
                  <option key={user._id} value={user._id}>{user.username}</option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full px-4 py-2 border border-[--color-border] rounded-lg bg-[--color-surface] text-[--color-text] text-sm"
              >
                <option value="">All Categories</option>
                {categories.map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {viewMode === 'dashboard' && (
          <>
            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Total Complaints */}
              <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-[--color-primary]/10 rounded-lg">
                    <MessageSquare className="h-6 w-6 text-[--color-primary]" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[--color-text]">{stats.total}</p>
                    <p className="text-sm text-[--color-textSecondary]">Total</p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-[--color-textSecondary]">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  All complaints
                </div>
              </div>

              {/* Open Complaints */}
              <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
                    <AlertCircle className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[--color-text]">{stats.open}</p>
                    <p className="text-sm text-[--color-textSecondary]">Open</p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-[--color-textSecondary]">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Require attention
                </div>
              </div>

              {/* In Progress */}
              <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <RefreshCw className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[--color-text]">{stats.in_progress}</p>
                    <p className="text-sm text-[--color-textSecondary]">In Progress</p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-[--color-textSecondary]">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Being processed
                </div>
              </div>

              {/* Resolved */}
              <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <CheckSquare className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[--color-text]">{stats.resolved}</p>
                    <p className="text-sm text-[--color-textSecondary]">Resolved</p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-[--color-textSecondary]">
                  <TrendingDown className="h-4 w-4 mr-1" />
                  {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}% resolution rate
                </div>
              </div>
            </div>

            {/* Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* By Category */}
              <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                <h3 className="text-lg font-semibold text-[--color-text] mb-4">Complaints by Category</h3>
                <div className="space-y-3">
                  {Object.entries(stats.byCategory).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-[--color-text] capitalize">{category}</span>
                          <span className="text-sm text-[--color-textSecondary]">{count}</span>
                        </div>
                        <div className="h-2 bg-[--color-background] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[--color-primary] transition-all duration-500"
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* By Priority */}
              <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                <h3 className="text-lg font-semibold text-[--color-text] mb-4">Complaints by Priority</h3>
                <div className="space-y-3">
                  {Object.entries(stats.byPriority).map(([priority, count]) => (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-medium text-[--color-text] capitalize">{priority}</span>
                          <span className="text-sm text-[--color-textSecondary]">{count}</span>
                        </div>
                        <div className="h-2 bg-[--color-background] rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              priority === 'high' ? 'bg-red-500' :
                              priority === 'medium' ? 'bg-yellow-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${(count / stats.total) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Monthly Trends */}
            <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border] mb-8">
              <h3 className="text-lg font-semibold text-[--color-text] mb-4">Monthly Trends (Last 6 Months)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {stats.monthlyTrends.map((trend) => (
                  <div key={trend.month} className="text-center">
                    <p className="text-sm font-medium text-[--color-text] mb-2">{trend.month}</p>
                    <div className="space-y-1">
                      <div className="text-lg font-bold text-[--color-primary]">{trend.total}</div>
                      <div className="text-xs text-[--color-textSecondary]">
                        {trend.resolved} resolved
                      </div>
                      <div className="text-xs text-yellow-600">
                        {trend.open} open
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Complaints */}
            <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
              <h3 className="text-lg font-semibold text-[--color-text] mb-4">Recent Complaints</h3>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {stats.recentComplaints
                  .filter(complaint => 
                    complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    complaint.description.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .slice(0, 10)
                  .map((complaint) => (
                    <div
                      key={complaint._id}
                      className="p-4 bg-[--color-background] rounded-lg border border-[--color-border]/50 hover:bg-[--color-border]/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/complaints`)}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-[--color-text] truncate">{complaint.title}</h4>
                          <p className="text-sm text-[--color-textSecondary] line-clamp-2 mt-1">
                            {complaint.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                            complaint.status === 'resolved' ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                            complaint.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                            complaint.status === 'closed' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-200' :
                            'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}>
                            {complaint.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-[--color-textSecondary]">
                        <span>{complaint.raisedBy?.username}</span>
                        <span>{complaint.category}</span>
                        <span className={`capitalize ${
                          complaint.priority === 'high' ? 'text-red-600' :
                          complaint.priority === 'medium' ? 'text-yellow-600' :
                          'text-green-600'
                        }`}>
                          {complaint.priority}
                        </span>
                        <span>{new Date(complaint.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  ))}
                {stats.recentComplaints.length === 0 && (
                  <p className="text-[--color-textSecondary] text-center py-8">No complaints found</p>
                )}
              </div>
            </div>
          </>
        )}

        {viewMode === 'calendar' && (
          <div className="mb-8">
            {renderCalendarView()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintsDashboard;