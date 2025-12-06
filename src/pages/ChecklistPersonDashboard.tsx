import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Calendar, CheckCircle, XCircle, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';

interface ChecklistOccurrence {
  _id: string;
  dueDate: string;
  status: 'completed' | 'pending';
  progressPercentage: number;
}

interface ChecklistGroup {
  templateName: string;
  frequency: string;
  category: string;
  occurrences: ChecklistOccurrence[];
  totalCount: number;
  completedCount: number;
  pendingCount: number;
}

interface CalendarDay {
  date: string;
  completed: number;
  pending: number;
  total: number;
}

interface UserData {
  userId: string;
  userName: string;
  email: string;
  checklists: ChecklistGroup[];
  calendar: CalendarDay[];
}

interface DashboardData {
  users: UserData[];
  dateRange: {
    start: string;
    end: string;
  };
}

const ChecklistPersonDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/checklist-occurrences/person-dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(response.data);
      
      // Auto-expand all users initially
      if (response.data?.users) {
        setExpandedUsers(new Set(response.data.users.map((u: UserData) => u.userId)));
      }
    } catch (error) {
      console.error('Error fetching person dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: string) => {
    const newExpanded = new Set(expandedUsers);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedUsers(newExpanded);
  };

  const getFrequencyBadgeColor = (frequency: string) => {
    switch (frequency.toLowerCase()) {
      case 'daily':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'weekly':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'fortnightly':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'monthly':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'quarterly':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'yearly':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };

  const getCalendarIntensity = (day: CalendarDay) => {
    if (day.total === 0) return 0;
    const completionRate = day.completed / day.total;
    if (completionRate === 1) return 4; // All done - darkest green
    if (completionRate >= 0.75) return 3;
    if (completionRate >= 0.5) return 2;
    if (completionRate >= 0.25) return 1;
    return 0; // Mostly pending - lightest/no color
  };

  const getCalendarColor = (day: CalendarDay) => {
    if (day.total === 0) return 'bg-gray-100 dark:bg-gray-800';
    
    const completionRate = day.completed / day.total;
    if (completionRate === 1) {
      // All completed - green shades
      return 'bg-green-600 dark:bg-green-500';
    } else if (completionRate >= 0.5) {
      // Mostly completed - yellow/green
      return 'bg-yellow-400 dark:bg-yellow-500';
    } else if (day.pending > 0) {
      // Has pending items - red shades
      const intensity = Math.min(day.pending, 4);
      const redShades = ['bg-red-100', 'bg-red-300', 'bg-red-500', 'bg-red-700'];
      return `${redShades[Math.min(intensity - 1, 3)]} dark:bg-red-600`;
    }
    return 'bg-gray-100 dark:bg-gray-800';
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days = [];
    
    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Add days of month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day);
    }
    
    return days;
  };

  const getDayData = (userData: UserData, day: number) => {
    if (day === null) return null;
    const date = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), day);
    const dateKey = date.toISOString().split('T')[0];
    return userData.calendar.find(d => d.date === dateKey) || { date: dateKey, completed: 0, pending: 0, total: 0 };
  };

  const formatFrequency = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  const filteredUsers = selectedUser === 'all' 
    ? (data?.users || []) 
    : (data?.users || []).filter(u => u.userId === selectedUser);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-textSecondary)]">Loading checklist dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--color-primary)]/10 rounded-lg">
                <Users size={24} className="text-[var(--color-primary)]" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-[var(--color-text)]">
                  Checklist Person Dashboard
                </h1>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                  View checklist assignments by person with completion tracking
                </p>
              </div>
            </div>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-primary)]/10 transition-colors"
            >
              <RefreshCw size={20} className="text-[var(--color-text)]" />
            </button>
          </div>
        </div>

        {/* User Filter */}
        {data && data.users.length > 0 && (
          <div className="mb-6">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
            >
              <option value="all">All Users ({data.users.length})</option>
              {data.users.map(u => (
                <option key={u.userId} value={u.userId}>
                  {u.userName} ({u.checklists.length} checklists)
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Users List */}
        <div className="space-y-4">
          {filteredUsers.map(userData => {
            const isExpanded = expandedUsers.has(userData.userId);
            const totalChecklists = userData.checklists.length;
            const totalOccurrences = userData.checklists.reduce((sum, c) => sum + c.totalCount, 0);
            const totalCompleted = userData.checklists.reduce((sum, c) => sum + c.completedCount, 0);
            const completionRate = totalOccurrences > 0 ? (totalCompleted / totalOccurrences) * 100 : 0;

            return (
              <div
                key={userData.userId}
                className="bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)] overflow-hidden"
              >
                {/* User Header */}
                <div
                  onClick={() => toggleUser(userData.userId)}
                  className="p-4 cursor-pointer hover:bg-[var(--color-background)] transition-colors flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-full bg-[var(--color-primary)]/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-[var(--color-primary)]">
                        {userData.userName.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-[var(--color-text)] text-lg">
                        {userData.userName}
                      </h3>
                      <p className="text-sm text-[var(--color-textSecondary)]">{userData.email}</p>
                    </div>
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="font-bold text-[var(--color-text)]">{totalChecklists}</div>
                        <div className="text-[var(--color-textSecondary)]">Checklists</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-[var(--color-text)]">{totalOccurrences}</div>
                        <div className="text-[var(--color-textSecondary)]">Total</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-green-600">{totalCompleted}</div>
                        <div className="text-[var(--color-textSecondary)]">Done</div>
                      </div>
                      <div className="text-center">
                        <div className="font-bold text-[var(--color-text)]">{completionRate.toFixed(0)}%</div>
                        <div className="text-[var(--color-textSecondary)]">Rate</div>
                      </div>
                    </div>
                  </div>
                  <button className="ml-4 p-2 hover:bg-[var(--color-primary)]/10 rounded-lg transition-colors">
                    {isExpanded ? (
                      <ChevronRight size={20} className="text-[var(--color-text)] rotate-90" />
                    ) : (
                      <ChevronRight size={20} className="text-[var(--color-text)]" />
                    )}
                  </button>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border)] p-4 space-y-6">
                    {/* GitHub-style Calendar */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="font-semibold text-[var(--color-text)] flex items-center gap-2">
                          <Calendar size={18} />
                          Activity Calendar
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              const prevMonth = new Date(selectedMonth);
                              prevMonth.setMonth(prevMonth.getMonth() - 1);
                              setSelectedMonth(prevMonth);
                            }}
                            className="p-1 rounded hover:bg-[var(--color-background)]"
                          >
                            <ChevronLeft size={18} className="text-[var(--color-text)]" />
                          </button>
                          <span className="text-sm font-medium text-[var(--color-text)] min-w-[120px] text-center">
                            {selectedMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                          </span>
                          <button
                            onClick={() => {
                              const nextMonth = new Date(selectedMonth);
                              nextMonth.setMonth(nextMonth.getMonth() + 1);
                              setSelectedMonth(nextMonth);
                            }}
                            className="p-1 rounded hover:bg-[var(--color-background)]"
                          >
                            <ChevronRight size={18} className="text-[var(--color-text)]" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="bg-[var(--color-background)] p-4 rounded-lg">
                        {/* Calendar Grid */}
                        <div className="grid grid-cols-7 gap-1 mb-2">
                          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                            <div key={day} className="text-xs font-medium text-[var(--color-textSecondary)] text-center py-2">
                              {day}
                            </div>
                          ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                          {getDaysInMonth(selectedMonth).map((day, idx) => {
                            const dayData = getDayData(userData, day);
                            if (day === null) {
                              return <div key={idx} className="aspect-square" />;
                            }
                            return (
                              <div
                                key={idx}
                                className={`aspect-square rounded-sm ${dayData ? getCalendarColor(dayData) : 'bg-gray-100 dark:bg-gray-800'} cursor-pointer hover:ring-2 hover:ring-[var(--color-primary)] transition-all`}
                                title={
                                  dayData
                                    ? `${dayData.date}: ${dayData.completed} done, ${dayData.pending} pending`
                                    : `${day}: No checklists`
                                }
                              />
                            );
                          })}
                        </div>
                        
                        {/* Legend */}
                        <div className="flex items-center gap-4 mt-4 text-xs text-[var(--color-textSecondary)]">
                          <span>Less</span>
                          <div className="flex gap-1">
                            <div className="w-3 h-3 rounded-sm bg-gray-100 dark:bg-gray-800" />
                            <div className="w-3 h-3 rounded-sm bg-red-100 dark:bg-red-900" />
                            <div className="w-3 h-3 rounded-sm bg-red-300 dark:bg-red-700" />
                            <div className="w-3 h-3 rounded-sm bg-red-500 dark:bg-red-600" />
                          </div>
                          <span>More pending</span>
                          <div className="flex gap-1 ml-4">
                            <div className="w-3 h-3 rounded-sm bg-yellow-400 dark:bg-yellow-500" />
                            <div className="w-3 h-3 rounded-sm bg-green-600 dark:bg-green-500" />
                          </div>
                          <span>Done</span>
                        </div>
                      </div>
                    </div>

                    {/* Checklists List */}
                    <div>
                      <h4 className="font-semibold text-[var(--color-text)] mb-4">Assigned Checklists</h4>
                      <div className="space-y-3">
                        {userData.checklists.map((checklist, idx) => (
                          <div
                            key={idx}
                            className="bg-[var(--color-background)] rounded-lg p-4 border border-[var(--color-border)]"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h5 className="font-semibold text-[var(--color-text)]">
                                    {checklist.templateName}
                                  </h5>
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${getFrequencyBadgeColor(checklist.frequency)}`}>
                                    {formatFrequency(checklist.frequency)}
                                  </span>
                                  {checklist.category && (
                                    <span className="px-2 py-1 rounded text-xs bg-gray-100 dark:bg-gray-800 text-[var(--color-textSecondary)]">
                                      {checklist.category}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 text-sm text-[var(--color-textSecondary)]">
                                  <span className="flex items-center gap-1">
                                    <CheckCircle size={14} className="text-green-600" />
                                    {checklist.completedCount} done
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <XCircle size={14} className="text-red-600" />
                                    {checklist.pendingCount} pending
                                  </span>
                                  <span>Total: {checklist.totalCount}</span>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-[var(--color-text)]">
                                  {checklist.totalCount > 0
                                    ? Math.round((checklist.completedCount / checklist.totalCount) * 100)
                                    : 0}%
                                </div>
                                <div className="text-xs text-[var(--color-textSecondary)]">Completion</div>
                              </div>
                            </div>
                            
                            {/* Progress Bar */}
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all"
                                style={{
                                  width: `${checklist.totalCount > 0 ? (checklist.completedCount / checklist.totalCount) * 100 : 0}%`
                                }}
                              />
                            </div>
                          </div>
                        ))}
                        
                        {userData.checklists.length === 0 && (
                          <div className="text-center py-8 text-[var(--color-textSecondary)]">
                            No checklists assigned
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12 bg-[var(--color-surface)] rounded-xl border border-[var(--color-border)]">
              <Users size={48} className="text-[var(--color-textSecondary)] mx-auto mb-4" />
              <p className="text-[var(--color-textSecondary)]">No checklist data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChecklistPersonDashboard;

