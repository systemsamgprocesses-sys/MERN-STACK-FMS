import React, { useState, useEffect, useMemo } from 'react';
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
    TrendingDown,
    Target,
    Award,
    Activity,
    BarChart3,
    X,
    Eye,
    ArrowRight,
    Zap,
    AlertTriangle,
    Info,
    Users,
    CalendarDays
} from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface ChecklistOccurrence {
    _id: string;
    templateName: string;
    dueDate: string;
    status: 'pending' | 'completed';
    progressPercentage: number;
    assignedTo?: {
        _id: string;
        username: string;
        email: string;
        department?: string;
    };
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
    const [showDayModal, setShowDayModal] = useState(false);
    const [previousMonthData, setPreviousMonthData] = useState<CalendarData | null>(null);
    const [showDistributionModal, setShowDistributionModal] = useState(false);
    const [distributionData, setDistributionData] = useState<{
        departments: Record<string, number>;
        users: Record<string, number>;
    } | null>(null);

    const isAdminOrSuper = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'pc';

    useEffect(() => {
        if (user) {
            fetchCalendarData();
            fetchStats();
            fetchPreviousMonthData();
            calculateDistribution();
        }
    }, [currentDate, user, calendarData]);

    const fetchCalendarData = async () => {
        if (!user) return;

        try {
            setLoading(true);
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth(); // 0-based
            const token = localStorage.getItem('token');
            const params: Record<string, any> = { year, month };
            if (!isAdminOrSuper) {
                params.userId = user.id;
            }

            const response = await axios.get(`${address}/api/checklist-occurrences/calendar`, {
                params,
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
            const params: Record<string, any> = {};
            if (!isAdminOrSuper) {
                params.userId = user.id;
            }
            const response = await axios.get(`${address}/api/checklist-occurrences/stats/dashboard`, {
                params,
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

    const fetchPreviousMonthData = async () => {
        if (!user) return;

        try {
            const prevDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
            const year = prevDate.getFullYear();
            const month = prevDate.getMonth();
            const token = localStorage.getItem('token');
            const params: Record<string, any> = { year, month };
            if (!isAdminOrSuper) {
                params.userId = user.id;
            }

            const response = await axios.get(`${address}/api/checklist-occurrences/calendar`, {
                params,
                headers: { Authorization: `Bearer ${token}` }
            });

            setPreviousMonthData(response.data);
        } catch (error) {
            console.error('Error fetching previous month data:', error);
        }
    };

    const calculateDistribution = () => {
        if (!calendarData) return;

        const departments: Record<string, number> = {};
        const users: Record<string, number> = {};

        calendarData.calendarData.forEach(day => {
            day.occurrences.forEach(occ => {
                if (occ.assignedTo) {
                    const dept = occ.assignedTo.department || 'General';
                    departments[dept] = (departments[dept] || 0) + 1;
                    users[occ.assignedTo.username] = (users[occ.assignedTo.username] || 0) + 1;
                }
            });
        });

        setDistributionData({ departments, users });
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
            setShowDayModal(true);
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

    // Calculate monthly analytics
    const monthlyAnalytics = useMemo(() => {
        if (!calendarData) return null;

        const totalDays = calendarData.calendarData.length;
        const daysWithChecklists = calendarData.calendarData.filter(d => d.total > 0).length;
        const fullyCompletedDays = calendarData.calendarData.filter(d => d.isFullyCompleted).length;
        const totalOccurrences = calendarData.calendarData.reduce((sum, d) => sum + d.total, 0);
        const totalCompletedOccurrences = calendarData.calendarData.reduce((sum, d) => sum + d.completed, 0);
        const monthlyCompletionRate = totalOccurrences > 0 
            ? Math.round((totalCompletedOccurrences / totalOccurrences) * 100) 
            : 0;

        // Calculate weekly breakdown
        const weeks: { week: number; total: number; completed: number; days: number }[] = [];
        let currentWeek = 1;
        let weekTotal = 0;
        let weekCompleted = 0;
        let weekDays = 0;

        calendarData.calendarData.forEach((day, index) => {
            weekTotal += day.total;
            weekCompleted += day.completed;
            if (day.total > 0) weekDays++;

            if ((index + 1) % 7 === 0 || index === calendarData.calendarData.length - 1) {
                weeks.push({
                    week: currentWeek,
                    total: weekTotal,
                    completed: weekCompleted,
                    days: weekDays
                });
                currentWeek++;
                weekTotal = 0;
                weekCompleted = 0;
                weekDays = 0;
            }
        });

        // Calculate previous month comparison
        let monthOverMonthChange = 0;
        if (previousMonthData) {
            const prevTotal = previousMonthData.calendarData.reduce((sum, d) => sum + d.total, 0);
            const prevCompleted = previousMonthData.calendarData.reduce((sum, d) => sum + d.completed, 0);
            const prevRate = prevTotal > 0 ? (prevCompleted / prevTotal) * 100 : 0;
            monthOverMonthChange = monthlyCompletionRate - prevRate;
        }

        return {
            totalDays,
            daysWithChecklists,
            fullyCompletedDays,
            totalOccurrences,
            totalCompletedOccurrences,
            monthlyCompletionRate,
            weeks,
            monthOverMonthChange,
            averagePerDay: daysWithChecklists > 0 ? (totalOccurrences / daysWithChecklists).toFixed(1) : '0'
        };
    }, [calendarData, previousMonthData]);

    // Calculate streak
    const currentStreak = useMemo(() => {
        if (!calendarData) return 0;
        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = calendarData.calendarData.length - 1; i >= 0; i--) {
            const day = calendarData.calendarData[i];
            const dayDate = new Date(day.date);
            if (dayDate > today) continue;
            if (day.isFullyCompleted && day.total > 0) {
                streak++;
            } else if (day.total > 0) {
                break;
            }
        }
        return streak;
    }, [calendarData]);

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

            {/* Distribution Button */}
            {distributionData && isAdminOrSuper && (
                <div className="mb-4">
                    <button
                        onClick={() => setShowDistributionModal(true)}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all hover:shadow-md"
                        style={{ 
                            backgroundColor: 'var(--color-primary)', 
                            color: 'white' 
                        }}
                    >
                        <Users className="w-4 h-4" />
                        View Distribution
                    </button>
                </div>
            )}

            {/* Enhanced Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* Today's Pending */}
                <div className="p-6 rounded-xl shadow-lg border-l-4" style={{ 
                    backgroundColor: 'var(--color-surface)',
                    borderLeftColor: 'var(--color-warning)'
                }}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-textSecondary)' }}>
                            Today's Pending
                        </p>
                        <Clock className="w-5 h-5" style={{ color: 'var(--color-warning)' }} />
                    </div>
                    <p className="text-4xl font-bold mb-1" style={{ color: 'var(--color-warning)' }}>
                        {stats.todayPending}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                        Checklists awaiting completion
                    </p>
                </div>

                {/* Today's Completed */}
                <div className="p-6 rounded-xl shadow-lg border-l-4" style={{ 
                    backgroundColor: 'var(--color-surface)',
                    borderLeftColor: 'var(--color-success)'
                }}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-textSecondary)' }}>
                            Today's Completed
                        </p>
                        <CheckCircle2 className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                    </div>
                    <p className="text-4xl font-bold mb-1" style={{ color: 'var(--color-success)' }}>
                        {stats.todayCompleted}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                        Finished today
                    </p>
                </div>

                {/* Total Pending */}
                <div className="p-6 rounded-xl shadow-lg border-l-4" style={{ 
                    backgroundColor: 'var(--color-surface)',
                    borderLeftColor: 'var(--color-primary)'
                }}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-textSecondary)' }}>
                            Total Pending
                        </p>
                        <ListTodo className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                    </div>
                    <p className="text-4xl font-bold mb-1" style={{ color: 'var(--color-primary)' }}>
                        {stats.totalPending}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                        All pending checklists
                    </p>
                </div>

                {/* Completion Rate */}
                <div className="p-6 rounded-xl shadow-lg border-l-4" style={{ 
                    backgroundColor: 'var(--color-surface)',
                    borderLeftColor: 'var(--color-success)'
                }}>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium uppercase tracking-wide" style={{ color: 'var(--color-textSecondary)' }}>
                            Completion Rate
                        </p>
                        <Target className="w-5 h-5" style={{ color: 'var(--color-success)' }} />
                    </div>
                    <p className="text-4xl font-bold mb-1" style={{ color: 'var(--color-success)' }}>
                        {completionRate}%
                    </p>
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div 
                            className="h-2 rounded-full transition-all" 
                            style={{ 
                                width: `${completionRate}%`,
                                backgroundColor: 'var(--color-success)'
                            }}
                        />
                    </div>
                </div>
            </div>

            {/* Monthly Analytics & Insights */}
            {monthlyAnalytics && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                    {/* Monthly Overview */}
                    <div className="p-6 rounded-xl shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                                <CalendarDays className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                                Monthly Overview
                            </h3>
                            {monthlyAnalytics.monthOverMonthChange !== 0 && (
                                <div className="flex items-center gap-1">
                                    {monthlyAnalytics.monthOverMonthChange > 0 ? (
                                        <TrendingUp className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <TrendingDown className="w-4 h-4 text-red-500" />
                                    )}
                                    <span className={`text-sm font-semibold ${monthlyAnalytics.monthOverMonthChange > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {monthlyAnalytics.monthOverMonthChange > 0 ? '+' : ''}{monthlyAnalytics.monthOverMonthChange.toFixed(1)}%
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Total Checklists</span>
                                <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{monthlyAnalytics.totalOccurrences}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Completed</span>
                                <span className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>{monthlyAnalytics.totalCompletedOccurrences}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Monthly Rate</span>
                                <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>{monthlyAnalytics.monthlyCompletionRate}%</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Avg per Active Day</span>
                                <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>{monthlyAnalytics.averagePerDay}</span>
                            </div>
                        </div>
                    </div>

                    {/* Activity Stats */}
                    <div className="p-6 rounded-xl shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                                <Activity className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                                Activity Stats
                            </h3>
                        </div>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Active Days</span>
                                <span className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                                    {monthlyAnalytics.daysWithChecklists} / {monthlyAnalytics.totalDays}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Perfect Days</span>
                                <span className="text-lg font-bold" style={{ color: 'var(--color-success)' }}>{monthlyAnalytics.fullyCompletedDays}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Current Streak</span>
                                <span className="text-lg font-bold flex items-center gap-1" style={{ color: 'var(--color-success)' }}>
                                    <Zap className="w-4 h-4" />
                                    {currentStreak} days
                                </span>
                            </div>
                            <div className="pt-2 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Activity Rate</span>
                                    <span className="text-lg font-bold" style={{ color: 'var(--color-primary)' }}>
                                        {Math.round((monthlyAnalytics.daysWithChecklists / monthlyAnalytics.totalDays) * 100)}%
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Weekly Breakdown */}
                    <div className="p-6 rounded-xl shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                                <BarChart3 className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                                Weekly Breakdown
                            </h3>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {monthlyAnalytics.weeks.map((week, idx) => {
                                const weekRate = week.total > 0 ? Math.round((week.completed / week.total) * 100) : 0;
                                return (
                                    <div key={idx} className="p-2 rounded-lg" style={{ backgroundColor: 'var(--color-background)' }}>
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-xs font-semibold" style={{ color: 'var(--color-textSecondary)' }}>
                                                Week {week.week}
                                            </span>
                                            <span className="text-xs font-bold" style={{ color: 'var(--color-primary)' }}>
                                                {weekRate}%
                                            </span>
                                        </div>
                                        <div className="flex gap-2 text-xs" style={{ color: 'var(--color-textSecondary)' }}>
                                            <span>{week.completed}/{week.total} completed</span>
                                            <span>•</span>
                                            <span>{week.days} active days</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                                            <div 
                                                className="h-1.5 rounded-full transition-all" 
                                                style={{ 
                                                    width: `${weekRate}%`,
                                                    backgroundColor: weekRate === 100 ? 'var(--color-success)' : 'var(--color-primary)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Calendar Panel */}
                <div className="lg:col-span-2">
                    <div className="p-3 rounded-lg shadow-md" style={{ backgroundColor: 'var(--color-surface)' }}>
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

                {/* Enhanced Details Panel */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="p-6 rounded-xl shadow-md sticky top-6" style={{ backgroundColor: 'var(--color-surface)' }}>
                        {selectedDayData ? (
                            <>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold" style={{ color: 'var(--color-text)' }}>
                                            {new Date(selectedDayData.date).toLocaleDateString('en-US', {
                                                weekday: 'long',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </h3>
                                        <p className="text-sm mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                                            {selectedDayData.total} checklist{selectedDayData.total !== 1 ? 's' : ''} scheduled
                                        </p>
                                    </div>
                                    {selectedDayData.isFullyCompleted && (
                                        <Award className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
                                    )}
                                </div>

                                {/* Day Summary */}
                                <div className="p-4 rounded-lg mb-4" style={{ backgroundColor: 'var(--color-background)' }}>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="text-center p-2 rounded" style={{ backgroundColor: 'var(--color-surface)' }}>
                                            <p className="text-2xl font-bold" style={{ color: 'var(--color-success)' }}>
                                                {selectedDayData.completed}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>Completed</p>
                                        </div>
                                        <div className="text-center p-2 rounded" style={{ backgroundColor: 'var(--color-surface)' }}>
                                            <p className="text-2xl font-bold" style={{ color: 'var(--color-warning)' }}>
                                                {selectedDayData.total - selectedDayData.completed}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--color-textSecondary)' }}>Pending</p>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="flex justify-between text-xs mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                                            <span>Completion Rate</span>
                                            <span className="font-semibold">
                                                {selectedDayData.total > 0 ? Math.round((selectedDayData.completed / selectedDayData.total) * 100) : 0}%
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full transition-all"
                                                style={{
                                                    width: `${selectedDayData.total > 0 ? (selectedDayData.completed / selectedDayData.total) * 100 : 0}%`,
                                                    backgroundColor: selectedDayData.isFullyCompleted 
                                                        ? 'var(--color-success)' 
                                                        : 'var(--color-primary)'
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Checklists List */}
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {selectedDayData.occurrences.map(occurrence => {
                                        const completedItems = occurrence.items.filter(i => i.checked).length;
                                        const totalItems = occurrence.items.length;
                                        return (
                                            <div
                                                key={occurrence._id}
                                                onClick={() => handleOccurrenceClick(occurrence._id)}
                                                className="p-4 rounded-lg border cursor-pointer hover:shadow-lg transition-all group"
                                                style={{
                                                    backgroundColor: 'var(--color-background)',
                                                    borderColor: occurrence.status === 'completed'
                                                        ? 'var(--color-success)'
                                                        : 'var(--color-border)',
                                                    borderWidth: occurrence.status === 'completed' ? '2px' : '1px'
                                                }}
                                            >
                                                <div className="flex items-start justify-between mb-2">
                                                    <h4 className="font-semibold flex-1 group-hover:underline" style={{ color: 'var(--color-text)' }}>
                                                        {occurrence.templateName}
                                                    </h4>
                                                    {occurrence.status === 'completed' ? (
                                                        <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                                                    ) : (
                                                        <Circle className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--color-textSecondary)' }} />
                                                    )}
                                                </div>

                                                <div className="flex items-center justify-between text-sm mb-2" style={{ color: 'var(--color-textSecondary)' }}>
                                                    <span>Progress: {occurrence.progressPercentage}%</span>
                                                    <span className="font-semibold">
                                                        {completedItems} / {totalItems} items
                                                    </span>
                                                </div>

                                                <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
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

                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs flex items-center gap-1" style={{ color: 'var(--color-textSecondary)' }}>
                                                        <Clock className="w-3 h-3" />
                                                        Due: {new Date(occurrence.dueDate).toLocaleTimeString('en-US', { 
                                                            hour: '2-digit', 
                                                            minute: '2-digit' 
                                                        })}
                                                    </span>
                                                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--color-primary)' }} />
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12" style={{ color: 'var(--color-textSecondary)' }}>
                                <CalendarIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                                <p className="font-medium mb-1">No date selected</p>
                                <p className="text-sm">Click on a date with checklists to view details</p>
                            </div>
                        )}
                    </div>

                    {/* Frequency & Date Range Summary */}
                    {calendarData && (
                        <div className="mt-4 p-4 rounded-lg" style={{ backgroundColor: 'var(--color-background)' }}>
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                                <CalendarDays className="w-4 h-4" />
                                Frequency & Date Range
                            </h4>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--color-textSecondary)' }}>Active Templates:</span>
                                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                                        {new Set(calendarData.calendarData.flatMap(d => d.occurrences.map(o => o.templateName))).size}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--color-textSecondary)' }}>Total Occurrences:</span>
                                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                                        {calendarData.calendarData.reduce((sum, d) => sum + d.total, 0)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span style={{ color: 'var(--color-textSecondary)' }}>Month Range:</span>
                                    <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                                        {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Quick Actions */}
                    <div className="space-y-2 mt-4">
                        <button
                            onClick={() => navigate('/checklist-template/create')}
                            className="w-full px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-medium transition-all hover:shadow-md"
                            style={{ backgroundColor: 'var(--color-primary)', color: 'white' }}
                        >
                            <Plus className="w-5 h-5" />
                            Create New Template
                        </button>
                    </div>
                </div>
            </div>

            {/* Enhanced Day Detail Modal */}
            {showDayModal && selectedDayData && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowDayModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        style={{ backgroundColor: 'var(--color-surface)' }}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                            <div>
                                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                                    {new Date(selectedDayData.date).toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                    })}
                                </h2>
                                <p className="text-sm mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                                    {selectedDayData.total} checklist{selectedDayData.total !== 1 ? 's' : ''} • {selectedDayData.completed} completed
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDayModal(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                style={{ color: 'var(--color-text)' }}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            {/* Day Statistics */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-background)' }}>
                                    <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-success)' }}>
                                        {selectedDayData.completed}
                                    </p>
                                    <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Completed</p>
                                </div>
                                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-background)' }}>
                                    <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-warning)' }}>
                                        {selectedDayData.total - selectedDayData.completed}
                                    </p>
                                    <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Pending</p>
                                </div>
                                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--color-background)' }}>
                                    <p className="text-3xl font-bold mb-1" style={{ color: 'var(--color-primary)' }}>
                                        {selectedDayData.total > 0 ? Math.round((selectedDayData.completed / selectedDayData.total) * 100) : 0}%
                                    </p>
                                    <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>Completion Rate</p>
                                </div>
                            </div>

                            {/* Checklists Detail */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                                    Checklists for this day
                                </h3>
                                {selectedDayData.occurrences.map(occurrence => {
                                    const completedItems = occurrence.items.filter(i => i.checked).length;
                                    const totalItems = occurrence.items.length;
                                    return (
                                        <div
                                            key={occurrence._id}
                                            onClick={() => {
                                                setShowDayModal(false);
                                                handleOccurrenceClick(occurrence._id);
                                            }}
                                            className="p-5 rounded-lg border cursor-pointer hover:shadow-lg transition-all"
                                            style={{
                                                backgroundColor: 'var(--color-background)',
                                                borderColor: occurrence.status === 'completed'
                                                    ? 'var(--color-success)'
                                                    : 'var(--color-border)',
                                                borderWidth: occurrence.status === 'completed' ? '2px' : '1px'
                                            }}
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    <h4 className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
                                                        {occurrence.templateName}
                                                    </h4>
                                                    <div className="flex items-center gap-4 text-sm mt-2">
                                                        <span className="flex items-center gap-1" style={{ color: 'var(--color-textSecondary)' }}>
                                                            <Clock className="w-4 h-4" />
                                                            {new Date(occurrence.dueDate).toLocaleTimeString('en-US', { 
                                                                hour: '2-digit', 
                                                                minute: '2-digit' 
                                                            })}
                                                        </span>
                                                        <span className="flex items-center gap-1" style={{ color: 'var(--color-textSecondary)' }}>
                                                            <ListTodo className="w-4 h-4" />
                                                            {completedItems} / {totalItems} items
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {occurrence.status === 'completed' ? (
                                                        <CheckCircle2 className="w-6 h-6" style={{ color: 'var(--color-success)' }} />
                                                    ) : (
                                                        <Circle className="w-6 h-6" style={{ color: 'var(--color-textSecondary)' }} />
                                                    )}
                                                    <ArrowRight className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
                                                </div>
                                            </div>

                                            <div className="mb-3">
                                                <div className="flex justify-between text-sm mb-1" style={{ color: 'var(--color-textSecondary)' }}>
                                                    <span>Progress</span>
                                                    <span className="font-semibold">{occurrence.progressPercentage}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3">
                                                    <div
                                                        className="h-3 rounded-full transition-all"
                                                        style={{
                                                            width: `${occurrence.progressPercentage}%`,
                                                            backgroundColor: occurrence.status === 'completed'
                                                                ? 'var(--color-success)'
                                                                : 'var(--color-primary)'
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Items Preview */}
                                            {occurrence.items.length > 0 && (
                                                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                                    <p className="text-xs font-semibold mb-2 uppercase tracking-wide" style={{ color: 'var(--color-textSecondary)' }}>
                                                        Items ({completedItems}/{totalItems} completed)
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-2 max-h-32 overflow-y-auto">
                                                        {occurrence.items.slice(0, 6).map((item, idx) => (
                                                            <div 
                                                                key={idx}
                                                                className="flex items-center gap-2 text-sm p-2 rounded"
                                                                style={{ 
                                                                    backgroundColor: item.checked 
                                                                        ? 'rgba(16, 185, 129, 0.1)' 
                                                                        : 'transparent'
                                                                }}
                                                            >
                                                                {item.checked ? (
                                                                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-success)' }} />
                                                                ) : (
                                                                    <Circle className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--color-textSecondary)' }} />
                                                                )}
                                                                <span 
                                                                    className={`truncate ${item.checked ? 'line-through' : ''}`}
                                                                    style={{ 
                                                                        color: item.checked 
                                                                            ? 'var(--color-textSecondary)' 
                                                                            : 'var(--color-text)'
                                                                    }}
                                                                >
                                                                    {item.label}
                                                                </span>
                                                            </div>
                                                        ))}
                                                        {occurrence.items.length > 6 && (
                                                            <div className="text-xs col-span-2 text-center pt-2" style={{ color: 'var(--color-textSecondary)' }}>
                                                                +{occurrence.items.length - 6} more items
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t flex justify-end gap-3" style={{ borderColor: 'var(--color-border)' }}>
                            <button
                                onClick={() => setShowDayModal(false)}
                                className="px-4 py-2 rounded-lg border transition-colors"
                                style={{ 
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)',
                                    backgroundColor: 'var(--color-background)'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Distribution Modal */}
            {showDistributionModal && distributionData && (
                <div 
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={() => setShowDistributionModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                        style={{ backgroundColor: 'var(--color-surface)' }}
                    >
                        {/* Modal Header */}
                        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--color-border)' }}>
                            <div>
                                <h2 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
                                    Checklist Distribution
                                </h2>
                                <p className="text-sm mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </p>
                            </div>
                            <button
                                onClick={() => setShowDistributionModal(false)}
                                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                style={{ color: 'var(--color-text)' }}
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Department Distribution */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                                        <Users className="w-5 h-5" />
                                        By Department
                                    </h3>
                                    <div className="space-y-3">
                                        {Object.entries(distributionData.departments)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([dept, count]) => {
                                                const total = Object.values(distributionData.departments).reduce((sum, c) => sum + c, 0);
                                                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                                return (
                                                    <div key={dept} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-background)' }}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-medium" style={{ color: 'var(--color-text)' }}>{dept}</span>
                                                            <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                                                                {count} ({percentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="h-2 rounded-full transition-all"
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                    backgroundColor: 'var(--color-primary)'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>

                                {/* User Distribution */}
                                <div>
                                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
                                        <Users className="w-5 h-5" />
                                        By Person
                                    </h3>
                                    <div className="space-y-3 max-h-96 overflow-y-auto">
                                        {Object.entries(distributionData.users)
                                            .sort(([, a], [, b]) => b - a)
                                            .map(([username, count]) => {
                                                const total = Object.values(distributionData.users).reduce((sum, c) => sum + c, 0);
                                                const percentage = total > 0 ? Math.round((count / total) * 100) : 0;
                                                return (
                                                    <div key={username} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--color-background)' }}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="font-medium" style={{ color: 'var(--color-text)' }}>{username}</span>
                                                            <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                                                                {count} ({percentage}%)
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                                            <div
                                                                className="h-2 rounded-full transition-all"
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                    backgroundColor: 'var(--color-success)'
                                                                }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="p-6 border-t flex justify-end" style={{ borderColor: 'var(--color-border)' }}>
                            <button
                                onClick={() => setShowDistributionModal(false)}
                                className="px-4 py-2 rounded-lg border transition-colors"
                                style={{ 
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)',
                                    backgroundColor: 'var(--color-background)'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChecklistCalendar;
