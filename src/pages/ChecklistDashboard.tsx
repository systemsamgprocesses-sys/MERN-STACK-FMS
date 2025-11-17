
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, AlertCircle, Calendar, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface DashboardStats {
   total: number;
   completed: number;
   pending: number;
   overdue: number;
   byRecurrence: Record<string, number>;
   byCategory: Record<string, number>;
   recentSubmissions: Array<{
     _id: string;
     title: string;
     updatedAt: string;
     status: string;
     totalItems: number;
     itemsSubmitted: number;
     itemsPercentage: number;
     category?: string;
     recurrence?: { type: string };
   }>;
}

interface CalendarDay {
   date: string;
   checklists: any[];
   completed: number;
   total: number;
   level: number;
}

interface CalendarData {
   year: number;
   month: number;
   calendar: CalendarDay[];
}

const ChecklistDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPerson, setSelectedPerson] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'dashboard' | 'calendar'>('dashboard');
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    fetchStats();
  }, [selectedPerson, user]);

  useEffect(() => {
    if (viewMode === 'calendar') {
      fetchCalendarData();
    }
  }, [viewMode, calendarYear, calendarMonth, selectedPerson]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to fetch users');
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

      const response = await axios.get(`${address}/api/checklists/dashboard?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = selectedPerson ? `?userId=${selectedPerson}` : '';

      const response = await axios.get(`${address}/api/checklists/calendar?year=${calendarYear}&month=${calendarMonth}${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setCalendarData(response.data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    }
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

    const getLevelTooltip = (_level: number, total: number, completed: number) => {
      if (total === 0) return 'No activity';
      return `${completed}/${total} completed (${Math.round((completed/total)*100)}%)`;
    };

    // Group calendar into weeks
    const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
    const weeks = [];
    let currentWeek = Array(firstDay).fill(null);
    
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
              Checklist Activity Calendar
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
              <p className="text-xs text-[--color-textSecondary] mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats?.completed || 0}</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-3 text-center">
              <p className="text-xs text-[--color-textSecondary] mb-1">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats?.pending || 0}</p>
            </div>
            <div className="bg-red-50 dark:bg-red-950 rounded-lg p-3 text-center">
              <p className="text-xs text-[--color-textSecondary] mb-1">Overdue</p>
              <p className="text-2xl font-bold text-red-600">{stats?.overdue || 0}</p>
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
                      title={day ? getLevelTooltip(day.level, day.total, day.completed) : ''}
                    >
                      {day ? (
                        <div
                          className="w-full h-full rounded-lg border border-gray-300 dark:border-gray-600 flex items-center justify-center text-xs font-semibold cursor-pointer transition-all hover:scale-110 hover:shadow-lg"
                          style={{ backgroundColor: getLevelColor(day.level) }}
                          onClick={() => {
                            if (day.checklists.length > 0) {
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
                      {day && day.total > 0 && (
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                          {getLevelTooltip(day.level, day.total, day.completed)}
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
                <CheckSquare className="text-[--color-primary]" />
                Checklist Dashboard
              </h1>
              <p className="text-[--color-textSecondary] mt-1">Overview of all checklists</p>
            </div>

            {/* Action Buttons - Top Right */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => navigate('/checklists')}
                className="px-4 py-2 bg-[--color-primary] text-white rounded-lg hover:bg-[--color-primary]/90 transition-colors text-sm font-medium"
              >
                View All Checklists →
              </button>
              <button
                onClick={() => navigate('/checklists/create')}
                className="px-4 py-2 border border-[--color-border] text-[--color-text] rounded-lg hover:bg-[--color-border] transition-colors text-sm font-medium"
              >
                + New Checklist
              </button>
            </div>
          </div>

          {/* Filter Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <input
                type="text"
                placeholder="Search checklists..."
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
          </div>
        </div>

        {viewMode === 'dashboard' && (
          <>
            {/* Layout: Left Panel | Calendar (Middle) | Right Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
              {/* Left Panel - Checklist Completion Status */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                  <h3 className="text-lg font-semibold text-[--color-text] mb-4">Checklist Status</h3>
                  <div className="space-y-3">
                    {/* Total */}
                    <div className="p-3 rounded-lg bg-[--color-background] border-l-4 border-[--color-primary]">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-[--color-text]">Total</span>
                        <span className="text-xl font-bold text-[--color-primary]">{stats.total}</span>
                      </div>
                    </div>

                    {/* Completed */}
                    <div className="p-3 rounded-lg bg-green-50 dark:bg-green-950 border-l-4 border-green-500">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-[--color-text]">Completed</span>
                        <span className="text-xl font-bold text-green-600">{stats.completed}</span>
                      </div>
                      <p className="text-xs text-green-600">{stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0}% complete</p>
                    </div>

                    {/* Pending */}
                    <div className="p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950 border-l-4 border-yellow-500">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-[--color-text]">Pending</span>
                        <span className="text-xl font-bold text-yellow-600">{stats.pending}</span>
                      </div>
                    </div>

                    {/* Overdue */}
                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border-l-4 border-red-500">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-[--color-text]">Overdue</span>
                        <span className="text-xl font-bold text-red-600">{stats.overdue}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center - Calendar */}
              <div className="lg:col-span-2">
                {renderCalendarView()}
              </div>

              {/* Right Panel - Checklist Items Breakdown */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                  <h3 className="text-lg font-semibold text-[--color-text] mb-4">Checklist Items</h3>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {stats.recentSubmissions.slice(0, 10).map((checklist: any) => {
                      const itemsChecked = checklist.itemsSubmitted || 0;
                      const totalItems = checklist.totalItems || 0;
                      const percentage = totalItems > 0 ? Math.round((itemsChecked / totalItems) * 100) : 0;
                      
                      return (
                        <div
                          key={checklist._id}
                          className="p-3 rounded-lg bg-[--color-background] hover:bg-[--color-border] cursor-pointer transition-colors"
                          onClick={() => navigate(`/checklists/${checklist._id}`)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[--color-text] truncate text-sm">{checklist.title}</p>
                              <p className="text-xs text-[--color-textSecondary]">
                                {itemsChecked}/{totalItems} items
                              </p>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ml-2 ${
                              percentage === 100 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                              percentage >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' :
                              'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {percentage}%
                            </span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all duration-500"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: percentage === 100 ? '#16a34a' : percentage >= 50 ? '#eab308' : '#ef4444'
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    {stats.recentSubmissions.length === 0 && (
                      <p className="text-[--color-textSecondary] text-center py-4 text-sm">No checklists</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Checklist Progress - Per Day, Per Item */}
            <div className="mt-8 bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
              <h2 className="text-xl font-semibold text-[--color-text] mb-6">Checklist Progress (This Month)</h2>
              
              <div className="space-y-6">
                {/* Filter checklists by search query and category */}
                {(stats.recentSubmissions || [])
                  .filter((checklist: any) => 
                    checklist.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
                    (!categoryFilter || checklist.category === categoryFilter)
                  )
                  .slice(0, 5)
                  .map((checklist: any) => {
                    const itemsChecked = checklist.itemsSubmitted || 0;
                    const totalItems = checklist.totalItems || 0;
                    const percentage = totalItems > 0 ? Math.round((itemsChecked / totalItems) * 100) : 0;
                    
                    // Generate day cells for current month (1-31)
                    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                    const dayArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
                    
                    return (
                      <div key={checklist._id} className="p-4 bg-[--color-background] rounded-lg border border-[--color-border]/50">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex-1">
                            <h3 className="font-semibold text-[--color-text]">{checklist.title}</h3>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-[--color-textSecondary]">
                                {checklist.recurrence?.type || 'One-time'} • {itemsChecked}/{totalItems} items
                              </span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                percentage === 100 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200' :
                                percentage >= 75 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200' :
                                percentage >= 50 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200' :
                                'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200'
                              }`}>
                                {percentage}%
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => navigate(`/checklists/${checklist._id}`)}
                            className="px-3 py-1 text-sm text-[--color-primary] hover:bg-[--color-border] rounded transition-colors"
                          >
                            View Details →
                          </button>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-4">
                          <div
                            className="h-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: percentage === 100 ? '#16a34a' : percentage >= 75 ? '#3b82f6' : percentage >= 50 ? '#eab308' : '#ef4444'
                            }}
                          />
                        </div>

                        {/* Daily Grid */}
                        <div className="grid grid-cols-7 gap-1">
                          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day) => (
                            <div key={day} className="text-center text-xs font-medium text-[--color-textSecondary]">
                              {day}
                            </div>
                          ))}
                          
                          {/* Day cells for current month */}
                          {dayArray.map((day) => {
                            // Color based on whether items were checked that day
                            // This is placeholder - in real implementation, track daily submissions
                            const isToday = new Date().getDate() === day && 
                                          new Date().getMonth() === calendarMonth &&
                                          new Date().getFullYear() === calendarYear;
                            
                            return (
                              <div
                                key={day}
                                className={`aspect-square flex items-center justify-center rounded text-xs font-medium cursor-pointer transition-all ${
                                  isToday 
                                    ? 'border-2 border-[--color-primary] bg-[--color-primary]/10' 
                                    : 'bg-[--color-border]/30 hover:bg-[--color-border]/50'
                                }`}
                                title={`${checklist.title} - Day ${day}`}
                              >
                                {day}
                              </div>
                            );
                          })}
                        </div>

                        {/* Items List */}
                        <div className="mt-4 pt-4 border-t border-[--color-border]/50">
                          <p className="text-xs font-medium text-[--color-textSecondary] mb-2">Items ({itemsChecked}/{totalItems})</p>
                          {checklist.items && checklist.items.length > 0 ? (
                            <div className="grid grid-cols-2 gap-2 text-xs max-h-24 overflow-y-auto">
                              {checklist.items.slice(0, 8).map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-2 p-1 rounded bg-[--color-surface]">
                                  <input
                                    type="checkbox"
                                    checked={item.isDone}
                                    readOnly
                                    className="w-3 h-3"
                                  />
                                  <span className={`truncate ${item.isDone ? 'line-through text-[--color-textSecondary]' : 'text-[--color-text]'}`}>
                                    {item.title}
                                  </span>
                                </div>
                              ))}
                              {checklist.items.length > 8 && (
                                <p className="text-[--color-textSecondary] col-span-2">+{checklist.items.length - 8} more...</p>
                              )}
                            </div>
                          ) : (
                            <p className="text-[--color-textSecondary] text-xs">No items yet</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
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

export default ChecklistDashboard;
