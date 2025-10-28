import React, { useState, useEffect, useCallback } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  CheckSquare, Clock, AlertTriangle, TrendingUp, Calendar,
  Target, Activity, CheckCircle, XCircle, Timer,
  ChevronDown, Star, Zap, BarChart3,
  PieChart as PieChartIcon, Users, RotateCcw,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, subMonths, addMonths, isThisMonth, isSameMonth, isSameYear } from 'date-fns';
// import { availableThemes } from '../contexts/ThemeContext';
import { address } from '../../utils/ipAddress';

// --- Interfaces (updated to include quarterly) ---
interface DashboardData {
  statusStats: Array<{ _id: string; count: number }>;
  typeStats: Array<{ _id: string; count: number }>;
  priorityStats: Array<{ _id: string; count: number }>;
  completionTrend: Array<{ _id: { month: number; year: number }; count: number }>;
  plannedTrend: Array<{ _id: { month: number; year: number }; count: number }>;
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
  }>;
  recentActivity: Array<{
    _id: string;
    title: string;
    type: 'assigned' | 'completed' | 'overdue';
    username: string;
    assignedBy?: string;
    date: string;
    taskType: string;
  }>;
  performanceMetrics: {
    onTimeCompletion: number;
    averageCompletionTime: number;
    taskDistribution: Array<{ type: string; count: number; percentage: number }>;
    oneTimeOnTimeRate?: number;
    recurringOnTimeRate?: number;
  };
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
  };
}

interface TaskCounts {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  oneTimeTasks: number;
  oneTimePending: number;
  oneTimeCompleted: number;
  recurringTasks: number;
  recurringPending: number;
  recurringCompleted: number;
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
  overduePercentage: number;
  trends?: {
    totalTasks: { value: number; direction: 'up' | 'down' };
    pendingTasks: { value: number; direction: 'up' | 'down' };
    completedTasks: { value: number; direction: 'up' | 'down' };
    overdueTasks: { value: number; direction: 'up' | 'down' };
  };
}
// window.scrollTo({ top: scrollPosition, behavior: 'instant' });

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  useTheme();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [taskCounts, setTaskCounts] = useState<TaskCounts | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [showMonthFilter, setShowMonthFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'current' | 'all-time'>('current');

  // New states for team member selection
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('all');
  const [showTeamMemberFilter, setShowTeamMemberFilter] = useState(false);
  const [memberTrendData, setMemberTrendData] = useState<any[]>([]);

  // const toggleTooltip = () => {
  //   if (scrollRef?.current) {
  //     const scrollTop = scrollRef.current.scrollTop;

  //     setIsTooltipOpen(prev => !prev);

  //     requestAnimationFrame(() => {
  //       if (scrollRef.current) {
  //         scrollRef.current.scrollTop = scrollTop;
  //       }
  //     });
  //   } else {
  //     setIsTooltipOpen(prev => !prev);
  //   }
  // };
  // --- ThemeCard Component (kept as is, good utility component) ---
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

  // --- MetricCard Component with Real Trends ---
  const MetricCard = ({
    icon,
    title,
    value,
    subtitle,
    percentage,
    sparklineData,
    isMain = false,
    pendingValue,
    completedValue
  }: {
    icon: React.ReactNode;
    title: string;
    value: string | number;
    subtitle?: string;
    percentage?: number;
    sparklineData?: number[];
    isMain?: boolean;
    pendingValue?: number;
    completedValue?: number;
  }) => {
    console.log(`MetricCard ${title}:`, { percentage, value, subtitle }); // Debug log
    const safePercentage = Number.isFinite(percentage) ? percentage : 0; // Ensure valid number

    return (
      <ThemeCard
        className={`p-3 sm:p-4 lg:p-5 rounded-xl transition-shadow duration-300 hover:shadow-xl ${isMain ? 'col-span-2' : ''}`}
        variant="glass"
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-0 mb-3 sm:mb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div
              className="p-2 sm:p-3 rounded-xl sm:rounded-2xl ring-1 ring-white/20 shadow-md backdrop-blur-md"
              style={{
                backgroundColor: `var(--color-primary)15`,
                boxShadow: `0 6px 20px var(--color-primary)25`
              }}
            >
              <div
                style={{ color: 'var(--color-primary)' }}
                className="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center"
              >
                {icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-[var(--color-textSecondary)] mb-0.5">
                {title}
              </p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-[var(--color-text)] truncate">{value}</p>
            </div>
          </div>
          <div className="w-full sm:w-auto"></div>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-xs sm:text-sm text-[var(--color-textSecondary)] mb-3 sm:mb-4">{subtitle}</p>
        )}

        {/* Percentage Display */}
        <div className="mb-3 sm:mb-4" style={{ display: 'block', opacity: 1, minHeight: '2rem' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--color-textSecondary, #6b7280)' }}>
              <div className="flex items-center space-x-1">
                <Activity size={18} className="text-blue-500" />
              </div>
            </span>
            <span className="text-xs font-bold" style={{ color: 'var(--color-primary, #3b82f6)' }}>
              {(safePercentage ?? 0).toFixed(1)}%
            </span>
          </div>
          <div className="w-full h-2 bg-[var(--color-border, #e5e7eb)] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{
                width: `${Math.min(safePercentage ?? 0, 100)}%`,
                backgroundColor: 'var(--color-primary, #3b82f6)',
                minWidth: (safePercentage ?? 0) === 0 ? '1px' : undefined // Ensure visibility for 0%
              }}
            />
          </div>
        </div>

        {/* Pending / Completed Breakdown */}
        {(pendingValue !== undefined || completedValue !== undefined) && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs sm:text-sm text-[var(--color-textSecondary)] mt-2 pt-3 border-t border-[var(--color-border)] gap-2 sm:gap-0">
            {pendingValue !== undefined && (
              <div className="flex items-center">
                <Clock size={12} className="mr-1" style={{ color: 'var(--color-warning)' }} />
                <span className="truncate">
                  <span className="font-bold text-[var(--color-warning)]">{pendingValue}</span>
                </span>
              </div>
            )}
            {completedValue !== undefined && (
              <div className="flex items-center">
                <CheckCircle size={12} className="mr-1" style={{ color: 'var(--color-success)' }} />
                <span className="font-bold text-[var(--color-success)]">{completedValue}</span>
              </div>
            )}
          </div>
        )}

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-3 sm:mt-5 h-12 sm:h-14">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData.map((value, index) => ({ value, index }))}>
                <defs>
                  <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-primary)"
                  strokeWidth={2}
                  fill={`url(#gradient-${title})`}
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ThemeCard>
    );
  };
  // --- CustomTooltip Component (kept as is, good utility component) ---
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <ThemeCard className="p-3" variant="elevated" hover={false}>
          <p className="text-sm font-semibold text-[var(--color-text)] mb-1">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name}: <span className="font-bold">{entry.value}</span>
            </p>
          ))}
        </ThemeCard>
      );
    }
    return null;
  };

  // --- Core Data Fetching Logic ---
  // Using useCallback for memoization of fetch functions
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

  const fetchTaskCounts = useCallback(async (startDate?: string, endDate?: string) => {
    try {
      const params: any = {
        userId: user?.id,
        isAdmin: (user?.role === 'admin' || user?.role === 'manager') ? 'true' : 'false'
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await axios.get(`${address}/api/dashboard/counts`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching task counts:', error);
      return null;
    }
  }, [user]);

  // New function to fetch individual member trend data
  const fetchMemberTrendData = useCallback(async (memberUsername: string, startDate?: string, endDate?: string) => {
    try {
      const params: any = {
        memberUsername,
        isAdmin: 'true'
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await axios.get(`${address}/api/dashboard/member-trend`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching member trend data:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        let analyticsData = null;
        let countsData = null;

        if (viewMode === 'current') {
          // For current month view, use date filters
          const monthStart = startOfMonth(selectedMonth);
          const monthEnd = endOfMonth(selectedMonth);
          analyticsData = await fetchDashboardAnalytics(monthStart.toISOString(), monthEnd.toISOString());
          countsData = await fetchTaskCounts(monthStart.toISOString(), monthEnd.toISOString());
        } else {
          // For all-time view, fetch without date filters
          analyticsData = await fetchDashboardAnalytics();
          countsData = await fetchTaskCounts();
        }

        setDashboardData(analyticsData);
        setTaskCounts(countsData);

      } catch (error) {
        console.error('Error in loadData:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      loadData();
    }
  }, [user, selectedMonth, viewMode, fetchDashboardAnalytics, fetchTaskCounts]);

  // Load member trend data when selected team member changes
  useEffect(() => {
    const loadMemberTrendData = async () => {
      if ((user?.role === 'admin' || user?.role === 'manager') && selectedTeamMember && selectedTeamMember !== 'all') {
        try {
          let memberTrendDataResult = null;

          if (viewMode === 'current') {
            const monthStart = startOfMonth(selectedMonth);
            const monthEnd = endOfMonth(selectedMonth);
            memberTrendDataResult = await fetchMemberTrendData(selectedTeamMember, monthStart.toISOString(), monthEnd.toISOString());
          } else {
            memberTrendDataResult = await fetchMemberTrendData(selectedTeamMember);
          }

          if (memberTrendDataResult) {
            setMemberTrendData(memberTrendDataResult);
          }
        } catch (error) {
          console.error('Error loading member trend data:', error);
        }
      }
    };

    loadMemberTrendData();
  }, [selectedTeamMember, viewMode, selectedMonth, fetchMemberTrendData, user?.role]);

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

  const statusColors = {
    pending: 'var(--color-warning)',
    completed: 'var(--color-success)',
    overdue: 'var(--color-error)',
    'in-progress': 'var(--color-primary)'
  };

  const statusData = dashboardData?.statusStats.map(item => ({
    name: item._id.charAt(0).toUpperCase() + item._id.slice(1),
    value: item.count,
    color: statusColors[item._id as keyof typeof statusColors] || 'var(--color-secondary)'
  })) || [];

  // Generate trend data to always show last 6 months including current month
  const generateTrendData = () => {
    const trendMonths: { month: string; completed: number; planned: number; }[] = [];
    const currentDate = new Date();

    // If a specific team member is selected and we have their data, use it
    if (selectedTeamMember !== 'all' && memberTrendData && memberTrendData.length > 0) {
      return memberTrendData;
    }

    // Otherwise use the overall team data
    // Generate last 6 months including current month
    for (let i = 5; i >= 0; i--) {
      const date = subMonths(currentDate, i);
      const monthName = format(date, 'MMM');
      const monthNum = date.getMonth() + 1;
      const yearNum = date.getFullYear();

      const matchingCompletedData = dashboardData?.completionTrend?.find(item =>
        item._id.month === monthNum && item._id.year === yearNum
      );

      const matchingPlannedData = dashboardData?.plannedTrend?.find(item =>
        item._id.month === monthNum && item._id.year === yearNum
      );

      trendMonths.push({
        month: monthName,
        completed: matchingCompletedData?.count || 0,
        planned: matchingPlannedData?.count || 0,
      });
    }

    return trendMonths;
  };

  const trendData = generateTrendData();

  const displayData = taskCounts;

  // Updated taskTypeData to include quarterly
  const taskTypeData = [
    {
      name: 'One-time',
      value: displayData?.oneTimeTasks || 0,
      pending: displayData?.oneTimePending || 0,
      completed: displayData?.oneTimeCompleted || 0,
      color: 'var(--color-primary)'
    },
    {
      name: 'Daily',
      value: displayData?.dailyTasks || 0,
      pending: displayData?.dailyPending || 0,
      completed: displayData?.dailyCompleted || 0,
      color: 'var(--color-success)'
    },
    {
      name: 'Weekly',
      value: displayData?.weeklyTasks || 0,
      pending: displayData?.weeklyPending || 0,
      completed: displayData?.weeklyCompleted || 0,
      color: 'var(--color-warning)'
    },
    {
      name: 'Monthly',
      value: displayData?.monthlyTasks || 0,
      pending: displayData?.monthlyPending || 0,
      completed: displayData?.monthlyCompleted || 0,
      color: 'var(--color-accent)'
    },
    {
      name: 'Quarterly',
      value: displayData?.quarterlyTasks || 0,
      pending: displayData?.quarterlyPending || 0,
      completed: displayData?.quarterlyCompleted || 0,
      color: 'var(--color-info)'
    },
    {
      name: 'Yearly',
      value: displayData?.yearlyTasks || 0,
      pending: displayData?.yearlyPending || 0,
      completed: displayData?.yearlyCompleted || 0,
      color: 'var(--color-secondary)'
    }
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'assigned': return <Target size={16} style={{ color: 'var(--color-primary)' }} />;
      case 'completed': return <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />;
      case 'overdue': return <XCircle size={16} style={{ color: 'var(--color-error)' }} />;
      default: return <Activity size={16} style={{ color: 'var(--color-secondary)' }} />;
    }
  };

  // Get team members list for the dropdown
  const getTeamMembersList = () => {
    if (!dashboardData?.teamPerformance || (user?.role !== 'admin' && user?.role === 'manager')) return [];

    return dashboardData.teamPerformance.map(member => ({
      username: member.username,
      totalTasks: member.totalTasks,
      completionRate: member.totalTasks > 0 ? (member.completedTasks / member.totalTasks) * 100 : 0
    }));
  };

  const teamMembersList = getTeamMembersList();

  console.log('displayData for Overdue:', {
    overdueTasks: displayData?.overdueTasks,
    totalTasks: displayData?.totalTasks,
    percentage: ((displayData?.overdueTasks ?? 0) / (displayData?.totalTasks || 1)) * 100
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--color-primary)] mx-auto mb-4"></div>
          <p className="text-[var(--color-textSecondary)]">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 space-y-8">
      {/* Professional Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
        <div className="flex items-center space-x-6">
          <div className="p-3 rounded-xl shadow-xl" style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-accent))` }}>
            <BarChart3 size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text)] mb-2">
              Analytics Dashboard
            </h1>
            <p className="text-xs text-[var(--color-textSecondary)]">
              Welcome back, <span className="font-bold text-[var(--color-text)]">{user?.username}</span>!
              {(user?.role === 'admin' || user?.role === 'manager') ? ' Team performance overview' : ' Here\'s your performance overview'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto"> {/* Adjusted for mobile stacking */}
          {/* View Mode Toggle */}
          <ThemeCard className="p-1 w-full sm:w-auto" variant="bordered" hover={false}> {/* Full width on mobile */}
            <div className="flex items-center justify-center"> {/* Centered buttons on mobile */}
              <button
                onClick={() => {
                  setViewMode('current');
                  setSelectedMonth(new Date());
                }}
                className={`px-2 py-2 rounded-xl text-xs font-semibold transition-all duration-200 w-1/2 sm:w-auto ${ /* Half width on mobile */
                  viewMode === 'current'
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                  }`}
              >
                Current Month
              </button>
              <button
                onClick={() => setViewMode('all-time')}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 w-1/2 sm:w-auto ${ /* Half width on mobile */
                  viewMode === 'all-time'
                    ? 'bg-[var(--color-primary)] text-white shadow-md'
                    : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                  }`}
              >
                All Time
              </button>
            </div>
          </ThemeCard>

          {/* Month Filter - Visible only in 'current' view mode */}
          {viewMode === 'current' && (
            <div className="relative z-10 w-full sm:w-auto"> {/* Full width on mobile */}
              <button
                onClick={() => setShowMonthFilter(!showMonthFilter)}
                className="flex items-center justify-center px-2 py-2 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg hover:shadow-xl transition-all duration-200 text-[var(--color-text)] font-md w-full" /* Full width on mobile, centered content */
              >
                <Calendar size={16} className="mr-3" />
                <span>
                  {isSameMonth(selectedMonth, new Date()) && isSameYear(selectedMonth, new Date())
                    ? 'Current Month'
                    : format(selectedMonth, 'MMMM yyyy')}
                </span>
                <ChevronDown size={16} className="ml-3" />
              </button>
              {showMonthFilter && (
                <div className="absolute left-0 right-0 top-full mt-2 w-full sm:w-52 z-20"> {/* Adjusted for full width on mobile, right-0 added for better positioning */}
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
                            className={`w-full text-left px-2 py-3 rounded-xl transition-all duration-200 ${isSelected
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

      {/* Main Metrics Grid with Real Trends */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 p-4 sm:p-6 lg:p-8">
        <MetricCard
          icon={<CheckSquare size={24} className="text-blue-600" />}
          title="Total Tasks"
          value={displayData?.totalTasks || 0}
          subtitle={
            viewMode === 'current' && isSameMonth(selectedMonth, new Date()) && isSameYear(selectedMonth, new Date())
              ? 'Current Month'
              : viewMode === 'current'
                ? format(selectedMonth, 'MMMM yyyy')
                : 'All time'
          }
          percentage={100}
        />
        <MetricCard
          icon={<Clock size={24} className="text-yellow-500" />}
          title="Pending"
          value={displayData?.pendingTasks || 0}
          subtitle="Awaiting completion"
          percentage={((displayData?.pendingTasks || 0) / (displayData?.totalTasks || 1)) * 100}
        />
        <MetricCard
          icon={<CheckCircle size={24} className="text-green-500" />}
          title="Completed"
          value={displayData?.completedTasks || 0}
          subtitle="Successfully finished"
          percentage={((displayData?.completedTasks || 0) / (displayData?.totalTasks || 1)) * 100}
        />
        <MetricCard
          icon={<AlertTriangle size={24} className="text-red-500" />}
          title="Overdue"
          value={displayData?.overdueTasks || 0}
          subtitle={`${displayData?.overduePercentage?.toFixed(1)}% of total`}
          percentage={displayData?.overduePercentage || 0}
        />
      </div>
      {/* Task Type Distribution - Now includes quarterly and updated to 6 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5 lg:gap-6 p-4 sm:p-6 lg:p-8">
        {taskTypeData.map((type) => (
          <MetricCard
            key={type.name}
            icon={
              type.name === 'One-time' ? <Target size={18} className="text-blue-600" /> :
                type.name === 'Daily' ? <Zap size={18} className="text-yellow-500" /> :
                  type.name === 'Weekly' ? <Calendar size={18} className="text-green-500" /> :
                    type.name === 'Monthly' ? <Timer size={18} className="text-purple-500" /> :
                      type.name === 'Quarterly' ? <RotateCcw size={18} className="text-orange-500" /> :
                        <Star size={18} className="text-gray-500" />
            }
            title={type.name}
            value={type.value}
            subtitle={`${((type.value / (displayData?.totalTasks || 1)) * 100).toFixed(1)}% of total`}
            percentage={(type.value / (displayData?.totalTasks || 1)) * 100}
            pendingValue={type.pending}
            completedValue={type.completed}
          />
        ))}
      </div>

      {/* Enhanced Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Task Status Distribution - Enhanced Pie Chart */}
        <ThemeCard className="p-4 sm:p-8 lg:col-span-4" variant="glass">
          <div> {/* Wrap children in a single div */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl text-white" style={{ background: `linear-gradient(135deg, var(--color-primary), var(--color-secondary))` }}>
                  <PieChartIcon size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text)]">
                    {(user?.role === 'admin' || user?.role === 'manager') ? 'Team Task Status' : 'Your Task Status'}
                  </h3>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    {(user?.role === 'admin' || user?.role === 'manager') ? 'Team distribution' : 'Your current distribution'}
                  </p>
                </div>
              </div>
              <div className="text-sm px-3 py-1.5 rounded-full font-bold whitespace-nowrap" style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
                {statusData.reduce((sum, item) => sum + item.value, 0)} Total
              </div>
            </div>

            {/* Pie Chart */}
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <defs>
                  {statusData.map((entry, index) => (
                    <linearGradient key={index} id={`statusGradient-${index}`} x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor={entry.color} stopOpacity={0.8} />
                      <stop offset="100%" stopColor={entry.color} stopOpacity={1} />
                    </linearGradient>
                  ))}
                </defs>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={window.innerWidth > 640 ? 120 : 90}
                  innerRadius={window.innerWidth > 640 ? 50 : 40}
                  fill="#8884d8"
                  dataKey="value"
                  stroke="var(--color-background)"
                  strokeWidth={3}
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#statusGradient-${index})`} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>

            {/* Custom Legend */}
            <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
              {statusData.map((entry, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ background: entry.color }}></div>
                  <span className="text-[var(--color-text)] font-medium">{entry.name}</span>
                  <span className="text-[var(--color-textSecondary)] ml-1">
                    {entry.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </ThemeCard>

        {/* Task Type Breakdown - Enhanced Bar Chart */}
        <ThemeCard className="p-4 sm:p-8 lg:col-span-6" variant="glass">
          <div> {/* Wrap children in a single div */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
              <div className="flex items-center space-x-3">
                <div className="p-3 rounded-2xl text-white" style={{ background: `linear-gradient(135deg, var(--color-success), var(--color-accent))` }}>
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text)]">
                    {(user?.role === 'admin' || user?.role === 'manager') ? 'Team Task Types' : 'Your Task Types'}
                  </h3>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    {(user?.role === 'admin' || user?.role === 'manager') ? 'Team breakdown by category' : 'Your breakdown by category'}
                  </p>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={taskTypeData} margin={{ top: 20, right: 0, left: 0, bottom: 5 }}>
                <defs>
                  {taskTypeData.map((entry, index) => (
                    <linearGradient key={index} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={entry.color} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={entry.color} stopOpacity={0.6} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--color-textSecondary)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="var(--color-textSecondary)"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="value"
                  radius={[8, 8, 0, 0]}
                  stroke="none"
                >
                  {taskTypeData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={`url(#barGradient-${index})`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ThemeCard>
      </div>
      {/* Enhanced Completion Trend and Recent Activity - Split 7:3 for non-admin users */}
      <div className={`grid grid-cols-1 gap-8 xl:grid-cols-10`}>
        {/* Completion Trend */}
        <ThemeCard className="p-4 sm:p-8 xl:col-span-7" variant="glass">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="p-4 rounded-3xl text-white shadow-2xl" style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-secondary))` }}>
                  <TrendingUp size={24} />
                </div>
                <div className="absolute -inset-1 rounded-3xl opacity-30 blur-lg" style={{ background: `linear-gradient(135deg, var(--color-accent), var(--color-secondary))` }}></div>
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text)] mb-1">
                  {(user?.role === 'admin' || user?.role === 'manager') ? 'Team Completion Trend' : 'Your Completion Trend'}
                </h3>
                <p className="text-xs text-[var(--color-textSecondary)]">
                  {(user?.role === 'admin' || user?.role === 'manager') ? 'Team performance insights over the last 6 months' : 'Your performance insights over the last 6 months'}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              {(user?.role === 'admin' || user?.role === 'manager') && teamMembersList.length > 0 && (
                <div className="relative z-10 w-full sm:w-auto">
                  <button
                    onClick={() => setShowTeamMemberFilter(!showTeamMemberFilter)}
                    className="flex items-center justify-center px-4 py-2 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg hover:shadow-xl transition-all duration-200 text-[var(--color-text)] font-semibold w-full"
                  >
                    <Users size={16} className="mr-2" />
                    <span>
                      {selectedTeamMember === 'all' ? 'All Team' : selectedTeamMember}
                    </span>
                    <ChevronDown size={16} className="ml-2" />
                  </button>
                  {showTeamMemberFilter && (
                    <div className="absolute left-0 right-0 top-full mt-2 w-full sm:w-64 z-20">
                      <ThemeCard className="p-3 max-h-80 overflow-y-auto" variant="elevated" hover={false}>
                        <div className="space-y-2">
                          <button
                            onClick={() => {
                              setSelectedTeamMember('all');
                              setShowTeamMemberFilter(false);
                            }}
                            className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 ${selectedTeamMember === 'all'
                              ? 'bg-[var(--color-primary)] text-white shadow-lg'
                              : 'hover:bg-[var(--color-border)] text-[var(--color-text)]'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                  <Users size={16} />
                                </div>
                                <div>
                                  <span className="font-semibold">All Team</span>
                                  <p className="text-xs opacity-75">Overall team data</p>
                                </div>
                              </div>
                            </div>
                          </button>
                          {teamMembersList.map((member, index) => (
                            <button
                              key={member.username}
                              onClick={() => {
                                setSelectedTeamMember(member.username);
                                setShowTeamMemberFilter(false);
                              }}
                              className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 ${selectedTeamMember === member.username
                                ? 'bg-[var(--color-primary)] text-white shadow-lg'
                                : 'hover:bg-[var(--color-border)] text-[var(--color-text)]'
                                }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 rounded-xl bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-sm">
                                    {member.username.charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <span className="font-semibold">{member.username}</span>
                                    <p className="text-xs opacity-75">{member.totalTasks} tasks {member.completionRate.toFixed(1)}% completion</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold opacity-75">{index + 1}</div>
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </ThemeCard>
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-around sm:justify-between flex-wrap gap-2 sm:gap-6 bg-[var(--color-surface)]/50 backdrop-blur-sm rounded-2xl p-3 sm:p-4 border border-[var(--color-border)] w-full sm:w-auto">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="relative">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-lg" style={{ background: `linear-gradient(135deg, var(--color-success), var(--color-primary))` }}></div>
                    <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-pulse opacity-50" style={{ background: `linear-gradient(135deg, var(--color-success), var(--color-primary))` }}></div>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[var(--color-text)]">Completed</span>
                  <div className="text-base sm:text-lg font-bold" style={{ color: 'var(--color-success)' }}>
                    {trendData.reduce((sum, item) => sum + item.completed, 0)}
                  </div>
                </div>
                <div className="w-px h-6 sm:h-8 bg-[var(--color-border)]"></div>
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="relative">
                    <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full shadow-lg" style={{ background: `linear-gradient(135deg, var(--color-warning), var(--color-secondary))` }}></div>
                    <div className="absolute inset-0 w-3 h-3 sm:w-4 sm:h-4 rounded-full animate-pulse opacity-50" style={{ background: `linear-gradient(135deg, var(--color-warning), var(--color-secondary))` }}></div>
                  </div>
                  <span className="text-xs sm:text-sm font-semibold text-[var(--color-text)]">Planned</span>
                  <div className="text-base sm:text-lg font-bold" style={{ color: 'var(--color-warning)' }}>
                    {trendData.reduce((sum, item) => sum + item.planned, 0)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {(user?.role === 'admin' || user?.role === 'manager') && selectedTeamMember !== 'all' && (
            <div className="mb-6 p-4 rounded-2xl border border-[var(--color-primary)]/30" style={{ backgroundColor: 'var(--color-primary)05' }}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold">
                  {selectedTeamMember.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-[var(--color-text)]">
                    {selectedTeamMember}'s Performance Trend
                  </h4>
                  <p className="text-sm text-[var(--color-textSecondary)]">
                    Showing individual completion data for {selectedTeamMember}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="relative">
            <ResponsiveContainer width="100%" height={470}>
              <AreaChart data={trendData} margin={{ top: 30, right: 10, left: 0, bottom: 20 }}>
                <defs>
                  <linearGradient id="completedAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="completedStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-success)" />
                    <stop offset="100%" stopColor="var(--color-primary)" />
                  </linearGradient>
                  <linearGradient id="plannedAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-warning)" stopOpacity={0.6} />
                    <stop offset="95%" stopColor="var(--color-warning)" stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="plannedStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="var(--color-warning)" />
                    <stop offset="100%" stopColor="var(--color-secondary)" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="dropshadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="4" stdDeviation="5" floodOpacity="0.4" />
                  </filter>
                </defs>
                <CartesianGrid
                  strokeDasharray="4 4"
                  stroke="var(--color-border)"
                  strokeOpacity={0.4}
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  stroke="var(--color-textSecondary)"
                  fontSize={11}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  tick={{ fill: 'var(--color-textSecondary)' }}
                />
                <YAxis
                  stroke="var(--color-textSecondary)"
                  fontSize={11}
                  fontWeight={500}
                  tickLine={false}
                  axisLine={false}
                  dx={-5}
                  tick={{ fill: 'var(--color-textSecondary)' }}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-[var(--color-surface)]/95 backdrop-blur-xl border border-[var(--color-border)] rounded-2xl p-4 shadow-2xl">
                          <p className="text-sm font-bold text-[var(--color-text)] mb-3">
                            {label} {new Date().getFullYear()}
                            {selectedTeamMember !== 'all' && (
                              <span className="block text-xs opacity-75">
                                {selectedTeamMember}'s Data
                              </span>
                            )}
                          </p>
                          <div className="space-y-2">
                            {payload.map((entry: any, index: number) => (
                              <div key={index} className="flex items-center justify-between space-x-4">
                                <div className="flex items-center space-x-2">
                                  <div
                                    className="w-3 h-3 rounded-full shadow-sm"
                                    style={{ backgroundColor: entry.color }}
                                  ></div>
                                  <span className="text-sm font-medium text-[var(--color-textSecondary)]">
                                    {entry.name}:
                                  </span>
                                </div>
                                <span className="text-sm font-bold" style={{ color: entry.color }}>
                                  {entry.value}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="planned"
                  stroke="url(#plannedStrokeGradient)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#plannedAreaGradient)"
                  name="Planned Tasks"
                  dot={{
                    fill: 'var(--color-warning)',
                    stroke: 'var(--color-background)',
                    strokeWidth: 2,
                    r: 5,
                  }}
                  activeDot={{
                    r: 7,
                    fill: 'var(--color-warning)',
                    stroke: 'var(--color-background)',
                    strokeWidth: 3,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="completed"
                  stroke="url(#completedStrokeGradient)"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#completedAreaGradient)"
                  name="Completed Tasks"
                  dot={{
                    fill: 'var(--color-success)',
                    stroke: 'var(--color-background)',
                    strokeWidth: 2,
                    r: 5,
                  }}
                  activeDot={{
                    r: 7,
                    fill: 'var(--color-success)',
                    stroke: 'var(--color-background)',
                    strokeWidth: 3,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
            <div className="absolute top-4 right-4 opacity-20">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--color-primary)' }}></div>
            </div>
            <div className="absolute bottom-8 left-8 opacity-15">
              <div className="w-3 h-3 rounded-full animate-pulse delay-1000" style={{ backgroundColor: 'var(--color-accent)' }}></div>
            </div>
          </div>
        </ThemeCard>

        {/* Recent Activity */}
        <ThemeCard className="p-4 sm:p-8 xl:col-span-3" variant="glass">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-2">
            <div className="flex items-center space-x-3">
              <div className="p-3 rounded-2xl text-white" style={{ background: `linear-gradient(135deg, var(--color-success), var(--color-primary))` }}>
                <Activity size={20} />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-[var(--color-text)]">
                  {(user?.role === 'admin' || user?.role === 'manager') ? 'Recent Activity' : 'Your Recent Activity'}
                </h3>
                <p className="text-xs text-[var(--color-textSecondary)]">
                  {(user?.role === 'admin' || user?.role === 'manager') ? 'Latest team task updates' : 'Your latest task updates'}
                </p>
              </div>
            </div>
            <div className="text-sm px-3 py-1.5 rounded-full font-bold whitespace-nowrap" style={{ backgroundColor: 'var(--color-success)20', color: 'var(--color-success)' }}>
              Last {dashboardData?.recentActivity?.slice(0, 10).length || 0}
            </div>
          </div>
          <div className="space-y-3 max-h-[480px] sm:max-h-[480px] overflow-y-auto">
            {dashboardData?.recentActivity?.slice(0, 10).map((activity) => (
              <div
                key={activity._id}
                className="flex items-start space-x-4 p-3 sm:p-4 rounded-2xl border border-[var(--color-border)] hover:border-[var(--color-primary)]/30 transition-all duration-200"
                style={{ backgroundColor: 'var(--color-surface)' }}
              >
                <div className="p-2 rounded-xl shadow-sm" style={{ backgroundColor: 'var(--color-background)' }}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-text)] mb-1">
                    {(user?.role === 'admin' || user?.role === 'manager') ? (
                      <>
                        <span className="font-bold">{activity.username}</span>
                        <span className="mx-1 text-[var(--color-textSecondary)]">
                          {activity.type === 'assigned' && 'was assigned'}
                          {activity.type === 'completed' && 'completed'}
                          {activity.type === 'overdue' && 'has overdue'}
                        </span>
                      </>
                    ) : (
                      <span className="mx-1 text-[var(--color-textSecondary)]">
                        {activity.type === 'assigned' && 'You were assigned'}
                        {activity.type === 'completed' && 'You completed'}
                        {activity.type === 'overdue' && 'You have overdue'}
                      </span>
                    )}
                    <span className="font-bold">{activity.title}</span>
                  </p>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-1 sm:space-y-0 sm:space-x-3">
                    <span className="text-xs px-2 py-0.5 sm:px-3 sm:py-1 rounded-full font-semibold" style={{ backgroundColor: 'var(--color-primary)20', color: 'var(--color-primary)' }}>
                      {activity.taskType}
                    </span>
                    <span className="text-xs text-[var(--color-textSecondary)]">
                      {format(new Date(activity.date), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
              </div>
            )) || (
                <div className="text-center py-12 text-[var(--color-textSecondary)]">
                  <Activity size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold opacity-60">No recent activity</p>
                  <p className="text-sm opacity-40">Activity will appear here as tasks are updated</p>
                </div>
              )}
          </div>
        </ThemeCard>
      </div>
    </div >
  );
};

export default Dashboard;