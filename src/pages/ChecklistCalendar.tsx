import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock,
  ListTodo,
  TrendingUp,
  Target
} from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface ChecklistOccurrence {
  _id: string;
  templateName: string;
  dueDate: string;
  status: 'pending' | 'completed';
  progressPercentage: number;
  items: Array<{
    label: string;
    description?: string;
    checked: boolean;
  }>;
}

interface CalendarDay {
  date: string;
  day: number;
  occurrences: ChecklistOccurrence[];
  total: number;
  completed: number;
  isFullyCompleted: boolean;
}

interface CalendarData {
  year: number;
  month: number;
  calendarData: CalendarDay[];
}

const ChecklistCalendar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarData | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedDayData, setSelectedDayData] = useState<CalendarDay | null>(null);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalCompleted: 0,
    todayPending: 0,
    todayCompleted: 0
  });

  useEffect(() => {
    if (user) {
      fetchCalendarData();
      fetchStats();
    }
  }, [currentDate, user]);

  const fetchCalendarData = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth(); // 0-based
      const token = localStorage.getItem('token');

      const response = await axios.get(`${address}/api/checklist-occurrences/calendar`, {
        params: {
          year,
          month,
          userId: user.id
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      setCalendarData(response.data);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${address}/api/checklist-occurrences/stats/dashboard`, {
        params: { userId: user.id },
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setStats({
        totalPending: response.data.totalPending || 0,
        totalCompleted: response.data.totalCompleted || 0,
        todayPending: response.data.todayPending || 0,
        todayCompleted: response.data.todayCompleted || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    setSelectedDate(null);
    setSelectedDayData(null);
  };

  const handleNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    setSelectedDate(null);
    setSelectedDayData(null);
  };

  const handleDateClick = (dayData: CalendarDay) => {
    if (dayData.total > 0) {
      setSelectedDate(dayData.date);
      setSelectedDayData(dayData);
    }
  };

  const handleOccurrenceClick = (occurrenceId: string) => {
    navigate(`/checklist-occurrence/${occurrenceId}`);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Calculate first day of month (0 = Sunday, 6 = Saturday)
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  // Create calendar grid with empty cells for days before month starts
  const calendarGrid: (CalendarDay | null)[] = Array(firstDayOfMonth).fill(null);
  if (calendarData) {
    calendarGrid.push(...calendarData.calendarData);
  }

  const completionRate = stats.totalCompleted + stats.totalPending > 0 
    ? Math.round((stats.totalCompleted / (stats.totalCompleted + stats.totalPending)) * 100) 
    : 0;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
          <CalendarIcon className="w-8 h-8" style={{ color: 'var(--color-primary)' }} />
          Individual Checklist Calendar
        </h1>
        <p className="mt-2" style={{ color: 'var(--color-textSecondary)' }}>
          View and complete your daily checklists
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Today's Pending</p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-warning)' }}>
                {stats.todayPending}
              </p>
            </div>
            <Clock className="w-12 h-12" style={{ color: 'var(--color-warning)', opacity: 0.3 }} />
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Today's Completed</p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-success)' }}>
                {stats.todayCompleted}
              </p>
            </div>
            <CheckCircle2 className="w-12 h-12" style={{ color: 'var(--color-success)', opacity: 0.3 }} />
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Total Pending</p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-primary)' }}>
                {stats.totalPending}
              </p>
            </div>
            <ListTodo className="w-12 h-12" style={{ color: 'var(--color-primary)', opacity: 0.3 }} />
          </div>
        </div>

        <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Completion Rate</p>
              <p className="text-3xl font-bold mt-1" style={{ color: 'var(--color-success)' }}>
                {completionRate}%
              </p>
            </div>
            <Target className="w-12 h-12" style={{ color: 'var(--color-success)', opacity: 0.3 }} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Panel */}
        <div className="lg:col-span-2">
          <div className="p-6 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
            {/* Month Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={handlePreviousMonth}
                className="p-2 rounded hover:bg-gray-100"
                style={{ color: 'var(--color-text)' }}
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              
              <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>
              
              <button
                onClick={handleNextMonth}
                className="p-2 rounded hover:bg-gray-100"
                style={{ color: 'var(--color-text)' }}
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
              </div>
            ) : (
              <>
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 gap-2 mb-2">
                  {weekDays.map(day => (
                    <div
                      key={day}
                      className="text-center font-semibold py-2"
                      style={{ color: 'var(--color-textSecondary)' }}
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Grid */}
                <div className="grid grid-cols-7 gap-2">
                  {calendarGrid.map((dayData, index) => {
                    if (!dayData) {
                      return (
                        <div
                          key={`empty-${index}`}
                          className="aspect-square"
                        />
                      );
                    }

                    const isSelected = selectedDate === dayData.date;
                    const hasChecklists = dayData.total > 0;
                    const isFullyCompleted = dayData.isFullyCompleted;

                    return (
                      <button
                        key={dayData.date}
                        onClick={() => handleDateClick(dayData)}
                        disabled={!hasChecklists}
                        className="min-h-[120px] p-2 rounded-lg border-2 transition-all relative flex flex-col items-start"
                        style={{
                          backgroundColor: isFullyCompleted
                            ? 'var(--color-success)'
                            : hasChecklists
                            ? 'var(--color-warning-light)'
                            : 'var(--color-background)',
                          borderColor: isSelected
                            ? 'var(--color-primary)'
                            : 'transparent',
                          color: isFullyCompleted
                            ? 'white'
                            : 'var(--color-text)',
                          cursor: hasChecklists ? 'pointer' : 'default',
                          opacity: hasChecklists ? 1 : 0.5
                        }}
                      >
                        <div className="font-semibold text-lg mb-1">{dayData.day}</div>
                        {hasChecklists && (
                          <>
                            <div className="text-xs font-medium mb-2">
                              {dayData.completed}/{dayData.total} done
                            </div>
                            <div className="text-xs space-y-1 w-full overflow-hidden">
                              {dayData.occurrences.slice(0, 3).map((occ, idx) => (
                                <div 
                                  key={occ._id}
                                  className="truncate px-1 py-0.5 rounded"
                                  style={{
                                    backgroundColor: occ.status === 'completed' 
                                      ? 'rgba(16, 185, 129, 0.2)' 
                                      : 'rgba(245, 158, 11, 0.2)',
                                    fontSize: '0.65rem'
                                  }}
                                >
                                  {occ.status === 'completed' ? '✓' : '○'} {occ.templateName}
                                </div>
                              ))}
                              {dayData.occurrences.length > 3 && (
                                <div className="text-xs font-medium">
                                  +{dayData.occurrences.length - 3} more
                                </div>
                              )}
                            </div>
                          </>
                        )}
                        {isFullyCompleted && (
                          <CheckCircle2 className="w-4 h-4 absolute top-1 right-1" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-6 flex gap-4 justify-center flex-wrap text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: 'var(--color-success)' }}></div>
                    <span style={{ color: 'var(--color-text)' }}>Fully Completed</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded" style={{ backgroundColor: 'var(--color-warning-light)' }}></div>
                    <span style={{ color: 'var(--color-text)' }}>Pending</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded opacity-50" style={{ backgroundColor: 'var(--color-background)', border: '1px solid var(--color-border)' }}></div>
                    <span style={{ color: 'var(--color-text)' }}>No Checklists</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-1">
          <div className="p-6 rounded-lg shadow-md sticky top-6" style={{ backgroundColor: 'var(--color-surface)' }}>
            {selectedDayData ? (
              <>
                <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
                  {new Date(selectedDayData.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric'
                  })}
                </h3>

                <div className="space-y-3">
                  {selectedDayData.occurrences.map(occurrence => (
                    <div
                      key={occurrence._id}
                      onClick={() => handleOccurrenceClick(occurrence._id)}
                      className="p-4 rounded-lg border cursor-pointer hover:shadow-md transition-shadow"
                      style={{
                        backgroundColor: 'var(--color-background)',
                        borderColor: occurrence.status === 'completed'
                          ? 'var(--color-success)'
                          : 'var(--color-border)'
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold" style={{ color: 'var(--color-text)' }}>
                          {occurrence.templateName}
                        </h4>
                        {occurrence.status === 'completed' ? (
                          <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                        ) : (
                          <Circle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-textSecondary)' }} />
                        )}
                      </div>

                      <div className="text-sm mb-2" style={{ color: 'var(--color-textSecondary)' }}>
                        Progress: {occurrence.progressPercentage}%
                      </div>

                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${occurrence.progressPercentage}%`,
                            backgroundColor: occurrence.status === 'completed'
                              ? 'var(--color-success)'
                              : 'var(--color-primary)'
                          }}
                        />
                      </div>

                      <div className="mt-2 text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                        {occurrence.items.filter(i => i.checked).length} / {occurrence.items.length} items completed
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-12" style={{ color: 'var(--color-textSecondary)' }}>
                <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Click on a date with checklists to view details</p>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="mt-4">
            <button
              onClick={() => navigate('/checklist-template/create')}
              className="w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
            >
              <Plus className="w-5 h-5" />
              Create New Template
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChecklistCalendar;

