import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Calendar, Target, CheckCircle, ChevronDown, Award, Star, BarChart3, Trophy,
  Clock4, CalendarDays, RefreshCw, UserCheck, PercentIcon, ClockIcon, User, RotateCcw, Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isThisMonth, isSameMonth, isSameYear } from 'date-fns';
import { address } from '../../utils/ipAddress';

// --- Interfaces (focused on performance) ---
interface DashboardData {
  teamPerformance: Array<{
    username: string;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    oneTimeTasks: number;
    oneTimePending: number;
    oneTimeCompleted: number;
    dailyTasks: number;
    dailyPending: number;
    dailyCompleted: number;
    weeklyTasks: number;
    weeklyPending: number;
    weeklyCompleted: number;
    monthlyTasks: number;
    monthlyPending: number;
    monthlyCompleted: number;
    quarterlyTasks: number;
    quarterlyPending: number;
    quarterlyCompleted: number;
    yearlyTasks: number;
    yearlyPending: number;
    yearlyCompleted: number;
    recurringTasks: number;
    recurringPending: number;
    recurringCompleted: number;
    completionRate: number;
    onTimeRate: number;
    onTimeCompletedTasks: number;
    onTimeRecurringCompleted: number;
    averageScore?: number;
    performanceScore?: number;
  }>;
  userPerformance?: {
    username: string;
    totalTasks: number;
    completedTasks: number;
    pendingTasks: number;
    oneTimeTasks: number;
    oneTimePending: number;
    oneTimeCompleted: number;
    dailyTasks: number;
    dailyPending: number;
    dailyCompleted: number;
    weeklyTasks: number;
    weeklyPending: number;
    weeklyCompleted: number;
    monthlyTasks: number;
    monthlyPending: number;
    monthlyCompleted: number;
    quarterlyTasks: number;
    quarterlyPending: number;
    quarterlyCompleted: number;
    yearlyTasks: number;
    yearlyPending: number;
    yearlyCompleted: number;
    recurringTasks: number;
    recurringPending: number;
    recurringCompleted: number;
    completionRate: number;
    onTimeRate: number;
    onTimeCompletedTasks: number;
    onTimeRecurringCompleted: number;
    averageScore?: number;
    performanceScore?: number;
  };
}

const Performance: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  useTheme();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'current' | 'all-time'>('current');

  // --- ThemeCard Component ---
  const ThemeCard = ({ children, className = "", variant = "default", hover = true }: {
    children: React.ReactNode;
    className?: string;
    variant?: 'default' | 'glass' | 'elevated' | 'bordered';
    hover?: boolean;
  }) => {
    const baseClasses = "relative overflow-hidden transition-all duration-300 ease-out";
    const variants = {
      default: `rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg`,
      glass: `rounded-2xl bg-[var(--color-surface)]/80 backdrop-blur-xl border border-[var(--color-border)]/50 shadow-xl`,
      elevated: `rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl`,
      bordered: `rounded-2xl bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)]/20`
    };
    const hoverClasses = hover ? "hover:shadow-xl hover:scale-[1.02] hover:border-[var(--color-primary)]/30" : "";
    return (
      <div className={`${baseClasses} ${variants[variant]} ${hoverClasses} ${className}`}>
        {children}
      </div>
    );
  };

  // --- User Performance Card Component ---
  const UserPerformanceCard = ({ userPerformance }: { userPerformance: NonNullable<DashboardData['userPerformance']>, maxTasks: number }) => {
    const total = userPerformance.totalTasks || 1;
    const completed = userPerformance.completedTasks || 0;

    const onTimeCompletedTasks = Math.min(
      (userPerformance.onTimeCompletedTasks || 0) + (userPerformance.onTimeRecurringCompleted || 0),
      completed
    );

    const actualCompletionRate = total > 0 ? (completed / total) * 100 : 0;
    const actualOnTimeRate = completed > 0 ? Math.min((onTimeCompletedTasks / completed) * 100, 100) : 0;
    // Use performanceScore from backend (based on score logs) if available, otherwise calculate weighted average
    const totalPerformanceRate = userPerformance.performanceScore !== undefined 
      ? userPerformance.performanceScore 
      : ((actualCompletionRate * 0.5) + (actualOnTimeRate * 0.5));


    return (
      <ThemeCard className="p-4 sm:p-6 mb-4" variant="glass" hover={false}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="relative">
              <div
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-md"
              >
                {userPerformance.username.charAt(0).toUpperCase()}
              </div>
              <div className="absolute -top-1 -right-1 bg-blue-50 rounded-full p-1 shadow-sm">
                <div className="text-blue-700"><User size={18} /></div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-bold text-lg text-[var(--color-text)]">{userPerformance.username}</h4>
                <span className="text-sm px-2 sm:px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700">
                  {user?.username === userPerformance.username ? 'You' : '#1'}
                </span>
              </div>
              <p className="text-base font-medium text-[var(--color-textSecondary)]">{userPerformance.totalTasks} tasks</p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-2xl font-bold text-[var(--color-success)] mb-1">{totalPerformanceRate.toFixed(1)}%</div>
            <div className="w-20 sm:w-24 h-2 bg-[var(--color-border)] rounded-full overflow-hidden mx-auto sm:mx-0">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(totalPerformanceRate, 100)}%`,
                  background: `linear-gradient(to right, var(--color-success), var(--color-primary))`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--color-border)]">
          {/* Enhanced Grid for better spacing and width */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { label: 'One-time', total: userPerformance.oneTimeTasks, pending: userPerformance.oneTimePending, completed: userPerformance.oneTimeCompleted, icon: <Target size={16} />, color: 'var(--color-primary)' },
              { label: 'Daily', total: userPerformance.dailyTasks, pending: userPerformance.dailyPending, completed: userPerformance.dailyCompleted, icon: <RefreshCw size={16} />, color: 'var(--color-success)' },
              { label: 'Weekly', total: userPerformance.weeklyTasks, pending: userPerformance.weeklyPending, completed: userPerformance.weeklyCompleted, icon: <Calendar size={16} />, color: 'var(--color-warning)' },
              { label: 'Monthly', total: userPerformance.monthlyTasks, pending: userPerformance.monthlyPending, completed: userPerformance.monthlyCompleted, icon: <CalendarDays size={16} />, color: 'var(--color-accent)' },
              { label: 'Quarterly', total: userPerformance.quarterlyTasks, pending: userPerformance.quarterlyPending, completed: userPerformance.quarterlyCompleted, icon: <RotateCcw size={16} />, color: 'var(--color-info)' },
              { label: 'Yearly', total: userPerformance.yearlyTasks, pending: userPerformance.yearlyPending, completed: userPerformance.yearlyCompleted, icon: <Star size={16} />, color: 'var(--color-secondary)' },
            ].map((item, index) => (
              <ThemeCard key={index} className="p-3" variant="default" hover={false}>
                <div className="flex items-center mb-1">
                  <div style={{ color: item.color }} className="mr-1.5">{item.icon}</div>
                  <span className="text-base font-medium text-[var(--color-textSecondary)]">{item.label}</span>
                </div>
                <div className="text-center my-1">
                  <span className="text-lg font-bold text-[var(--color-text)]">{item.total}</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between text-sm font-medium text-[var(--color-textSecondary)]">
                  <span className="flex items-center gap-1">
                    <ClockIcon size={14} className="text-orange-500" />
                    {item.pending}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle size={14} className="text-green-600" />
                    {item.completed}
                  </span>
                </div>
              </ThemeCard>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 pt-4 border-t border-[var(--color-border)] space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
            <div className="flex items-center justify-center sm:justify-start">
              <CheckCircle size={14} style={{ color: 'var(--color-success)' }} className="mr-1.5" />
              <span className="text-base text-[var(--color-textSecondary)]">
                Total: <span className="font-bold">{userPerformance.totalTasks}</span>
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-start">
              <RefreshCw size={14} style={{ color: 'var(--color-info)' }} className="mr-1.5" />
              <span className="text-base text-[var(--color-textSecondary)]">
                Recurring: <span className="font-bold">{userPerformance.recurringTasks}</span>
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-start">
              <Clock4 size={14} style={{ color: 'var(--color-primary)' }} className="mr-1.5" />
              <span className="text-base text-[var(--color-textSecondary)]">
                Done-on-time: <span className="font-bold">{onTimeCompletedTasks}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
            <div className="flex items-center justify-center sm:justify-end">
              <PercentIcon size={14} style={{ color: 'var(--color-success)' }} className="mr-1.5" />
              <span className="text-base text-[var(--color-textSecondary)]">
                Completion: <span className="font-bold">{actualCompletionRate.toFixed(1)}%</span>
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-end">
              <ClockIcon size={14} style={{ color: 'var(--color-warning)' }} className="mr-1.5" />
              <span className="text-base text-[var(--color-textSecondary)]">
                On-time: <span className="font-bold">{actualOnTimeRate.toFixed(1)}%</span>
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <button
            onClick={() => navigate('/performance/details', { 
              state: { userId: user?.id, username: userPerformance.username } 
            })}
            className="w-full sm:w-auto px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            View Detailed Breakdown
          </button>
        </div>
      </ThemeCard>
    );
  };

  // --- TeamMemberCard Component ---
  const TeamMemberCard = ({ member, rank }: {
    member: DashboardData['teamPerformance'][0];
    rank: number;
  }) => {
    const getRankBadge = (rank: number) => {
      const badges = {
        1: { icon: <Trophy size={18} />, gradient: 'from-yellow-400 to-yellow-600', bg: 'bg-yellow-50', text: 'text-yellow-700' },
        2: { icon: <Award size={18} />, gradient: 'from-gray-300 to-gray-500', bg: 'bg-gray-50', text: 'text-gray-700' },
        3: { icon: <Star size={18} />, gradient: 'from-amber-400 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-700' },
      };
      return badges[rank as keyof typeof badges] || {
        icon: <UserCheck size={18} />,
        gradient: 'from-blue-400 to-blue-600',
        bg: 'bg-blue-50',
        text: 'text-blue-700'
      };
    };
    const badge = getRankBadge(rank);
    const total = member.totalTasks || 1;
    const completed = member.completedTasks || 0;

    const onTimeCompletedTasks = Math.min(
      (member.onTimeCompletedTasks || 0) + (member.onTimeRecurringCompleted || 0),
      completed
    );

    const actualCompletionRate = total > 0 ? (completed / total) * 100 : 0;
    const actualOnTimeRate = completed > 0 ? Math.min((onTimeCompletedTasks / completed) * 100, 100) : 0;
    // Use performanceScore from backend (based on score logs) if available, otherwise calculate weighted average
    const totalPerformanceRate = member.performanceScore !== undefined 
      ? member.performanceScore 
      : ((actualCompletionRate * 0.5) + (actualOnTimeRate * 0.5));

    return (
      <ThemeCard className="p-4 sm:p-6 mb-4" variant="glass" hover={false}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 space-y-3 sm:space-y-0">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="relative">
              <div
                className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-r ${badge.gradient} flex items-center justify-center text-white font-bold text-xl shadow-md`}
              >
                {member.username.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute -top-1 -right-1 ${badge.bg} rounded-full p-1 shadow-sm`}>
                <div className={badge.text}>{badge.icon}</div>
              </div>
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-bold text-lg text-[var(--color-text)]">{member.username}</h4>
                <span className={`text-sm px-2 sm:px-2.5 py-0.5 rounded-full font-semibold ${badge.bg} ${badge.text}`}>
                  #{rank}
                </span>
              </div>
              <p className="text-base font-medium text-[var(--color-textSecondary)]">{member.totalTasks} tasks</p>
            </div>
          </div>

          <div className="text-center sm:text-right">
            <div className="text-2xl font-bold text-[var(--color-success)] mb-1">{totalPerformanceRate.toFixed(1)}%</div>
            <div className="w-20 sm:w-24 h-2 bg-[var(--color-border)] rounded-full overflow-hidden mx-auto sm:mx-0">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${Math.min(totalPerformanceRate, 100)}%`,
                  background: `linear-gradient(to right, var(--color-success), var(--color-primary))`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--color-border)]">
          {/* Enhanced Grid for better spacing and width */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
            {[
              { label: 'One-time', total: member.oneTimeTasks, pending: member.oneTimePending, completed: member.oneTimeCompleted, icon: <Target size={16} />, color: 'var(--color-primary)' },
              { label: 'Daily', total: member.dailyTasks, pending: member.dailyPending, completed: member.dailyCompleted, icon: <RefreshCw size={16} />, color: 'var(--color-success)' },
              { label: 'Weekly', total: member.weeklyTasks, pending: member.weeklyPending, completed: member.weeklyCompleted, icon: <Calendar size={16} />, color: 'var(--color-warning)' },
              { label: 'Monthly', total: member.monthlyTasks, pending: member.monthlyPending, completed: member.monthlyCompleted, icon: <CalendarDays size={16} />, color: 'var(--color-accent)' },
              { label: 'Quarterly', total: member.quarterlyTasks, pending: member.quarterlyPending, completed: member.quarterlyCompleted, icon: <RotateCcw size={16} />, color: 'var(--color-info)' },
              { label: 'Yearly', total: member.yearlyTasks, pending: member.yearlyPending, completed: member.yearlyCompleted, icon: <Star size={16} />, color: 'var(--color-secondary)' },
            ].map((item, index) => (
              <ThemeCard key={index} className="p-3" variant="default" hover={false}>
                <div className="flex items-center mb-1">
                  <div style={{ color: item.color }} className="mr-1.5">{item.icon}</div>
                  <span className="text-base font-medium text-[var(--color-textSecondary)]">{item.label}</span>
                </div>
                <div className="text-center my-1">
                  <span className="text-lg font-bold text-[var(--color-text)]">{item.total}</span>
                </div>
                <div className="flex flex-col sm:flex-row justify-between text-sm font-medium text-[var(--color-textSecondary)]">
                  <span className="flex items-center gap-1">
                    <ClockIcon size={14} className="text-orange-500" />
                    {item.pending}
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle size={14} className="text-green-600" />
                    {item.completed}
                  </span>
                </div>
              </ThemeCard>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 pt-4 border-t border-[var(--color-border)] space-y-3 sm:space-y-0">
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
            <div className="flex items-center justify-center sm:justify-start">
              <CheckCircle size={14} style={{ color: 'var(--color-success)' }} className="mr-1.5" />
              <span className="text-base text-[var(--color-textSecondary)]">
                Total: <span className="font-bold">{member.totalTasks}</span>
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-start">
              <RefreshCw size={14} style={{ color: 'var(--color-info)' }} className="mr-1.5" />
              <span className="text-base text-[var(--color-textSecondary)]">
                Recurring: <span className="font-bold">{member.recurringTasks}</span>
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-start">
              <Clock4 size={14} style={{ color: 'var(--color-primary)' }} className="mr-1.5" />
              <span className="text-base text-[var(--color-textSecondary)]">
                Done-on-time: <span className="font-bold">{onTimeCompletedTasks}</span>
              </span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 space-y-2 sm:space-y-0">
            <div className="flex items-center justify-center sm:justify-end">
              <PercentIcon size={14} style={{ color: 'var(--color-success)' }} className="mr-1.5" />
              <span className="text-base text-[var(--color-textSecondary)]">
                Completion: <span className="font-bold">{actualCompletionRate.toFixed(1)}%</span>
              </span>
            </div>
            <div className="flex items-center justify-center sm:justify-end">
              <ClockIcon size={14} style={{ color: 'var(--color-warning)' }} className="mr-1.5" />
              <span className="text-base text-[var(--color-textSecondary)]">
                On-time: <span className="font-bold">{actualOnTimeRate.toFixed(1)}%</span>
              </span>
            </div>
          </div>
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
          <button
            onClick={() => {
              // Get userId from member - we need to fetch it or pass it differently
              // For now, we'll need to get the user ID from the API or pass username
              navigate('/performance/details', { 
                state: { username: member.username } 
              });
            }}
            className="w-full sm:w-auto px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2"
          >
            <Eye size={16} />
            View Detailed Breakdown
          </button>
        </div>
      </ThemeCard>
    );
  };

  // --- Core Data Fetching Logic ---
  const fetchDashboardAnalytics = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      const params: any = {
        userId: user?.id,
        isAdmin: (user?.role === 'admin' || user?.role === 'manager') ? 'true' : 'false',
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await axios.get(`${address}/api/dashboard/analytics`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      return null;
    }
  }, [user]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let analyticsData = null;

        if (viewMode === 'current') {
          const monthStart = startOfMonth(selectedMonth);
          const monthEnd = endOfMonth(selectedMonth);
          analyticsData = await fetchDashboardAnalytics(monthStart.toISOString(), monthEnd.toISOString());
        } else {
          analyticsData = await fetchDashboardAnalytics();
        }

        setDashboardData(analyticsData);
      } catch (error) {
        console.error('Error in loadData:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [user, selectedMonth, viewMode, fetchDashboardAnalytics]);

  // --- Helper Functions ---
  const generateMonthOptions = () => {
    const options = [];
    const currentDate = new Date();

    for (let i = 5; i >= 1; i--) {
      options.push(subMonths(currentDate, i));
    }
    options.push(currentDate);
    for (let i = 1; i <= 5; i++) {
      options.push(addMonths(currentDate, i));
    }

    return options;
  };

  const monthOptions = generateMonthOptions();

  // Find maxTasks for normalization
  const maxTasks = dashboardData?.teamPerformance && dashboardData.teamPerformance.length > 0
    ? Math.max(...dashboardData.teamPerformance.map(m => m.totalTasks || 0), dashboardData.userPerformance?.totalTasks || 0)
    : dashboardData?.userPerformance?.totalTasks || 1;

  // Sort all users by performance (totalTasks then completion rate)
  const sortedUsers = dashboardData?.teamPerformance && dashboardData.teamPerformance.length > 0
    ? [...dashboardData.teamPerformance]
      .sort((a, b) => {
        const aCompleted = a.completedTasks || 0;
        const bCompleted = b.completedTasks || 0;

        const aOnTime = Math.min((a.onTimeCompletedTasks || 0) + (a.onTimeRecurringCompleted || 0), aCompleted);
        const bOnTime = Math.min((b.onTimeCompletedTasks || 0) + (b.onTimeRecurringCompleted || 0), bCompleted);

        const aCompletionRate = a.totalTasks > 0 ? (aCompleted / a.totalTasks) * 100 : 0;
        const bCompletionRate = b.totalTasks > 0 ? (bCompleted / b.totalTasks) * 100 : 0;

        const aOnTimeRate = aCompleted > 0 ? (aOnTime / aCompleted) * 100 : 0;
        const bOnTimeRate = bCompleted > 0 ? (bOnTime / bCompleted) * 100 : 0;

        const aPerformance = (aCompletionRate * 0.5) + (aOnTimeRate * 0.5);
        const bPerformance = (bCompletionRate * 0.5) + (bOnTimeRate * 0.5);

        return bPerformance - aPerformance; // highest first
      })
      .map((user, idx) => ({ ...user, rank: idx + 1 }))
    : [];


  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-textSecondary)]">Loading performance...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 sm:p-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
        <div className="flex items-center space-x-6">
          <div className="p-4 rounded-2xl shadow-xl" style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}>
            <BarChart3 size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">
              Performance Dashboard
            </h1>
            <p className="text-base text-[var(--color-textSecondary)]">
              Welcome back, <span className="font-bold text-[var(--color-text)]">{user?.username}</span>!
              {(user?.role === 'admin' || user?.role === 'manager') ? ' Team performance overview' : ' Here\'s your performance overview'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <ThemeCard className="p-1 w-full sm:w-auto" variant="bordered" hover={false}>
            <div className="flex items-center justify-center">
              <button
                onClick={() => {
                  setViewMode('current');
                  setSelectedMonth(new Date());
                }}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 w-1/2 sm:w-auto ${viewMode === 'current'
                  ? 'bg-[var(--color-primary)] text-white shadow-md'
                  : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                  }`}
              >
                Current Month
              </button>
              <button
                onClick={() => setViewMode('all-time')}
                className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 w-1/2 sm:w-auto ${viewMode === 'all-time'
                  ? 'bg-[var(--color-primary)] text-white shadow-md'
                  : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                  }`}
              >
                All Time
              </button>
            </div>
          </ThemeCard>

          {viewMode === 'current' && (
            <div className="relative z-10 w-full sm:w-auto">
              <button
                onClick={() => setShowMonthFilter(!showMonthFilter)}
                className="flex items-center justify-center px-4 py-2.5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg hover:shadow-xl transition-all duration-200 text-[var(--color-text)] font-md w-full"
              >
                <Calendar size={18} className="mr-3" />
                <span className='font-semibold'>
                  {isSameMonth(selectedMonth, new Date()) && isSameYear(selectedMonth, new Date())
                    ? 'Current Month'
                    : format(selectedMonth, 'MMMM yyyy')}
                </span>
                <ChevronDown size={18} className="ml-3" />
              </button>
              {showMonthFilter && (
                <div className="absolute left-0 right-0 top-full mt-2 w-full sm:w-52 z-20">
                  <ThemeCard className="p-3 max-h-80 overflow-y-auto" variant="elevated" hover={false}>
                    <div className="space-y-2">
                      {monthOptions.map((date, index) => {
                        const isSelected = format(date, 'yyyy-MM') === format(selectedMonth, 'yyyy-MM');
                        const isCurrent = isThisMonth(date);
                        return (
                          <button
                            key={index}
                            onClick={() => {
                              setSelectedMonth(date);
                              setShowMonthFilter(false);
                            }}
                            className={`w-full text-left px-4 py-3 rounded-xl transition-all duration-200 ${isSelected
                              ? 'bg-[var(--color-primary)] text-white shadow-lg'
                              : 'hover:bg-[var(--color-border)] text-[var(--color-text)]'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{format(date, 'MMMM yyyy')}</span>
                              <div className="flex items-center space-x-0">
                                {isCurrent && (
                                  <div className="w-2 h-2 bg-[var(--color-success)] rounded-full"></div>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </ThemeCard>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Performance Content */}
      {(user?.role !== 'admin' && user?.role !== 'manager') && dashboardData?.userPerformance && (
        <UserPerformanceCard userPerformance={dashboardData.userPerformance} maxTasks={maxTasks} />
      )}

      {(user?.role === 'admin' || user?.role === 'manager') && sortedUsers.length > 0 && (
        <ThemeCard className="p-4 sm:p-8" variant="glass">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
            <div className="flex items-center space-x-4">
              <div className="p-4 rounded-2xl text-white" style={{ background: `linear-gradient(135deg, var(--color-warning), var(--color-accent))` }}>
                <Trophy size={24} />
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">Team Performance</h3>
                <p className="text-base text-[var(--color-textSecondary)]">Team performance sorted by completion rate (users with fewer assigned tasks are shown last)</p>
              </div>
            </div>

            <div className="text-base px-4 py-2 rounded-full font-bold whitespace-nowrap" style={{ backgroundColor: 'var(--color-warning)20', color: 'var(--color-warning)' }}>
              Total {sortedUsers.length}
            </div>
          </div>
          <div className="space-y-4 max-h-[600px] sm:max-h-[650px] overflow-y-auto">
            {sortedUsers.map((member, i) => (
              <TeamMemberCard key={`${member.username}-${i}`} member={member} rank={i + 1} />
            ))}
          </div>
        </ThemeCard>
      )}
    </div>
  );
};

export default Performance;