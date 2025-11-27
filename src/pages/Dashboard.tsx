import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import {
  CheckSquare, Clock, AlertTriangle, TrendingUp, Calendar,
  Target, Activity, CheckCircle, XCircle, Timer,
  ChevronDown, Star, Zap, BarChart3,
  PieChart as PieChartIcon, Users, RotateCcw, UserCheck,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
// import { availableThemes } from '../contexts/ThemeContext';
import { address } from '../../utils/ipAddress';
import { formatDate } from '../utils/dateFormat';

// --- Interfaces (updated to include quarterly) ---
interface DashboardData {
  statusStats: Array<{ _id: string; count: number }>;
  typeStats: Array<{ _id: string; count: number }>;
  priorityStats: Array<{ _id: string; count: number }>;
  completionTrend: Array<{ _id: { month: number; year: number }; count: number }>;
  plannedTrend: Array<{ _id: { month: number; year: number }; count: number }>;
  fmsMetrics?: {
    activeProjects: number;
    completedProjects: number;
    totalProjects: number;
    totalFMSTasks: number;
    pendingFMSTasks: number;
    completedFMSTasks: number;
    avgProgress: number;
  };
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
  overallScore?: number;
  currentMonthScore?: number;
  upcomingTasks?: Array<{
    _id: string;
    title: string;
    description: string;
    dueDate: string;
    assignedTo: {
      _id: string;
      username: string;
    };
    status: string;
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
  };
}

interface TaskCounts {
  totalTasks: number;
  pendingTasks: number;
  upcomingTasks: number;
  completedTasks: number;
  overdueTasks: number;
  inProgressTasks: number;
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
  fmsTasks: number;
  fmsPendingTasks: number;
  fmsCompletedTasks: number;
  fmsInProgressTasks: number;
  assignedByMe?: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    overdue: number;
  };
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
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(() => {
    const cached = localStorage.getItem('dashboardData');
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
    return null;
  });
  const [taskCounts, setTaskCounts] = useState<TaskCounts | null>(() => {
    const cached = localStorage.getItem('taskCounts');
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      // Cache for 5 minutes
      if (Date.now() - timestamp < 5 * 60 * 1000) {
        return data;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(!dashboardData || !taskCounts);
  const [selectedMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'current' | 'all-time'>('all-time');
  const avatarSrc = React.useMemo(() => {
    if (!user?.profilePicture) return null;
    if (user.profilePicture.startsWith('http')) return user.profilePicture;
    const normalized = user.profilePicture.startsWith('/') ? user.profilePicture : `/${user.profilePicture}`;
    return `${address}${normalized}`;
  }, [user?.profilePicture]);
  const avatarInitial = user?.username?.charAt(0).toUpperCase() || '?';

  // New states for team member selection
  const [selectedTeamMember, setSelectedTeamMember] = useState<string>('all');
  const [showTeamMemberFilter, setShowTeamMemberFilter] = useState(false);
  const [memberTrendData, setMemberTrendData] = useState<any[]>([]);
  const [teamMemberSearchTerm, setTeamMemberSearchTerm] = useState('');

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
    const safePercentage = Number.isFinite(percentage) ? percentage : 0; // Ensure valid number

    return (
      <ThemeCard
        className={`p-2 sm:p-3 lg:p-3 rounded-lg transition-shadow duration-300 hover:shadow-xl ${isMain ? 'col-span-2' : ''}`}
        variant="glass"
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-0 mb-2 sm:mb-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <div
              className="p-1.5 sm:p-2 rounded-lg sm:rounded-xl ring-1 ring-white/20 shadow-md backdrop-blur-md"
              style={{
                backgroundColor: `var(--color-primary)15`,
                boxShadow: `0 6px 20px var(--color-primary)25`
              }}
            >
              <div
                style={{ color: 'var(--color-primary)' }}
                className="w-3 h-3 sm:w-4 sm:h-4 flex items-center justify-center"
              >
                {icon}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-[var(--color-textSecondary)] mb-0.5">
                {title}
              </p>
              <p className="text-base sm:text-lg lg:text-xl font-bold text-[var(--color-text)] truncate">{value}</p>
            </div>
          </div>
          <div className="w-full sm:w-auto"></div>
        </div>

        {/* Subtitle */}
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-[var(--color-textSecondary)] mb-2 sm:mb-2">{subtitle}</p>
        )}

        {/* Percentage Display */}
        <div className="mb-2 sm:mb-2" style={{ display: 'block', opacity: 1, minHeight: '1.5rem' }}>
          <div className="flex items-center justify-between mb-1">
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
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-[10px] sm:text-xs text-[var(--color-textSecondary)] mt-1 pt-2 border-t border-[var(--color-border)] gap-1 sm:gap-0">
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
  // Team Member Selector Component
  const TeamMemberSelector = () => {
    const [teamMembers, setTeamMembers] = useState<Array<{ id: string, username: string }>>([]);

    useEffect(() => {
      const fetchTeamMembers = async () => {
        try {
          const response = await axios.get(`${address}/api/users`);
          setTeamMembers(response.data.map((user: any) => ({
            id: user._id,
            username: user.username
          })));
        } catch (error) {
          console.error('Error fetching team members:', error);
        }
      };

      fetchTeamMembers();
    }, []);

    const filteredTeamMembers = teamMembers.filter(member =>
      member.username.toLowerCase().includes(teamMemberSearchTerm.toLowerCase())
    );

    return (
      <div className="relative">
        <button
          onClick={() => setShowTeamMemberFilter(!showTeamMemberFilter)}
          className="px-4 py-2 text-sm font-medium rounded-lg border shadow-sm"
          style={{
            backgroundColor: 'var(--color-surface)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)'
          }}
        >
          <div className="flex items-center">
            <Users size={16} className="mr-2" />
            <span>{selectedTeamMember === 'all' ? 'All Team Members' :
              teamMembers.find(m => m.id === selectedTeamMember)?.username || 'Select Member'}</span>
            <ChevronDown size={16} className="ml-2" />
          </div>
        </button>

        {showTeamMemberFilter && (
          <div
            className="absolute z-10 mt-2 w-64 rounded-md shadow-lg"
            style={{
              backgroundColor: 'var(--color-surface)',
              borderColor: 'var(--color-border)',
              color: 'var(--color-text)'
            }}
          >
            <div className="rounded-md ring-1 ring-black ring-opacity-5">
              <div className="p-2">
                <input
                  type="text"
                  placeholder="Search team members..."
                  value={teamMemberSearchTerm}
                  onChange={(e) => setTeamMemberSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 text-sm border rounded-md"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                />
              </div>
              <div className="py-1 max-h-48 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedTeamMember('all');
                    setShowTeamMemberFilter(false);
                    setTeamMemberSearchTerm('');
                  }}
                  className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                  style={{ color: 'var(--color-text)' }}
                >
                  All Team Members
                </button>
                {filteredTeamMembers.map((member) => (
                  <button
                    key={member.id}
                    onClick={() => {
                      setSelectedTeamMember(member.id);
                      setShowTeamMemberFilter(false);
                      setTeamMemberSearchTerm('');
                    }}
                    className="block w-full px-4 py-2 text-sm text-left hover:bg-gray-100"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {member.username}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
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
  // Helper function to generate cache key based on all relevant parameters
  const generateCacheKey = useCallback((type: 'analytics' | 'counts', userId?: string, startDate?: string, endDate?: string) => {
    const keyParts = [
      type,
      userId || 'all',
      viewMode,
      startDate || 'all-time',
      endDate || 'all-time',
      user?.id || 'no-user'
    ];
    return `dashboard_${keyParts.join('_')}`;
  }, [viewMode, user?.id]);

  // Helper function to get cached data
  const getCachedData = useCallback((cacheKey: string) => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        // Cache for 5 minutes
        if (Date.now() - timestamp < 5 * 60 * 1000) {
          return data;
        }
      }
    } catch (error) {
      console.error('Error reading cache:', error);
    }
    return null;
  }, []);

  // Helper function to set cached data
  const setCachedData = useCallback((cacheKey: string, data: any) => {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Error setting cache:', error);
    }
  }, []);

  // Using useCallback for memoization of fetch functions
  const fetchDashboardAnalytics = useCallback(async (startDate?: string, endDate?: string, forceRefresh = false) => {
    try {
      const userId = selectedTeamMember === 'all' ? undefined : selectedTeamMember;
      const cacheKey = generateCacheKey('analytics', userId, startDate, endDate);

      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      const isAdminOrManager = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager';
      const params: any = {
        userId: isAdminOrManager ? userId : user?.id,
        isAdmin: isAdminOrManager ? 'true' : 'false',
        includeTeam: 'true',
        includeAllTimeMetrics: viewMode === 'all-time' ? 'true' : 'false'
      };
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await axios.get(`${address}/api/dashboard/analytics`, { params });

      // Cache the response
      setCachedData(cacheKey, response.data);

      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard analytics:', error);
      return null;
    }
  }, [user, selectedTeamMember, viewMode, generateCacheKey, getCachedData, setCachedData]);

  const fetchTaskCounts = useCallback(async (startDate?: string, endDate?: string, forceRefresh = false) => {
    try {
      const userId = selectedTeamMember === 'all' ? undefined : selectedTeamMember;
      const cacheKey = generateCacheKey('counts', userId, startDate, endDate);

      // Check cache first unless force refresh
      if (!forceRefresh) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData) {
          return cachedData;
        }
      }

      const isAdminOrManager = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager';
      const params: any = {
        userId: isAdminOrManager ? userId : user?.id,
        isAdmin: isAdminOrManager ? 'true' : 'false',
        includeTeam: 'true',
        includeAllTimeMetrics: viewMode === 'all-time' ? 'true' : 'false'
      };
      if (user?.id) {
        params.assignedById = user.id;
      }
      if (startDate && endDate) {
        params.startDate = startDate;
        params.endDate = endDate;
      }

      const response = await axios.get(`${address}/api/dashboard/counts`, { params });

      // Cache the response
      setCachedData(cacheKey, response.data);

      return response.data;
    } catch (error) {
      console.error('Error fetching task counts:', error);
      return null;
    }
  }, [user, selectedTeamMember, viewMode, generateCacheKey, getCachedData, setCachedData]);

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

  // Use ref to track previous values and prevent unnecessary API calls
  const prevParamsRef = useRef<{
    userId?: string;
    viewMode: string;
    monthKey?: string;
  }>({
    userId: undefined,
    viewMode: 'all-time',
    monthKey: undefined
  });

  useEffect(() => {
    const loadData = async () => {
      if (!user?.id) return;

      const userId = selectedTeamMember === 'all' ? undefined : selectedTeamMember;
      const monthKey = viewMode === 'current'
        ? `${selectedMonth.getFullYear()}-${selectedMonth.getMonth()}`
        : 'all-time';

      // Check if parameters actually changed
      const paramsChanged =
        prevParamsRef.current.userId !== userId ||
        prevParamsRef.current.viewMode !== viewMode ||
        prevParamsRef.current.monthKey !== monthKey;

      if (!paramsChanged && dashboardData && taskCounts) {
        // Parameters haven't changed and we have data, skip API call
        return;
      }

      // Update ref with current values
      prevParamsRef.current = { userId, viewMode, monthKey };

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

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, selectedMonth, viewMode, selectedTeamMember]);

  // Load member trend data when selected team member changes
  useEffect(() => {
    const loadMemberTrendData = async () => {
      if ((user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') && selectedTeamMember && selectedTeamMember !== 'all') {
        try {
          // Get username for member-trend API (it expects username, not ID)
          // Since selectedTeamMember might be ID or username, we need to handle both
          // If it's an ID, we need to find the username from teamPerformance
          let memberUsername = selectedTeamMember;

          // Check if selectedTeamMember is an ID (MongoDB ObjectId format) or username
          // If it looks like an ID (24 hex chars), we can't use it for member-trend API
          // The member-trend API expects username, not ID
          if (memberUsername.length === 24 && /^[0-9a-fA-F]{24}$/.test(memberUsername)) {
            // It's an ID, skip member trend data fetch
            // TODO: Properly map ID to username when TeamMemberSelector uses IDs
            setMemberTrendData([]);
            return;
          }

          let memberTrendDataResult = null;

          if (viewMode === 'current') {
            const monthStart = startOfMonth(selectedMonth);
            const monthEnd = endOfMonth(selectedMonth);
            memberTrendDataResult = await fetchMemberTrendData(memberUsername, monthStart.toISOString(), monthEnd.toISOString());
          } else {
            memberTrendDataResult = await fetchMemberTrendData(memberUsername);
          }

          if (memberTrendDataResult) {
            setMemberTrendData(memberTrendDataResult);
          }
        } catch (error) {
          console.error('Error loading member trend data:', error);
        }
      } else {
        setMemberTrendData([]);
      }
    };

    loadMemberTrendData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTeamMember, viewMode, selectedMonth, fetchMemberTrendData, user?.role]);

  // --- Helper Functions ---

  const statusColors = {
    pending: 'var(--color-warning)',
    completed: 'var(--color-success)',
    overdue: 'var(--color-error)',
    'in-progress': 'var(--color-primary)',
    'in progress': 'var(--color-primary)'
  };

  const statusData = dashboardData?.statusStats.map(item => ({
    name: item._id === 'in-progress' ? 'In Progress' : item._id.charAt(0).toUpperCase() + item._id.slice(1),
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
    if (!dashboardData?.teamPerformance || (user?.role !== 'admin' && user?.role !== 'superadmin' && user?.role !== 'manager')) return [];

    return dashboardData.teamPerformance.map(member => ({
      username: member.username,
      totalTasks: member.totalTasks,
      completionRate: member.totalTasks > 0 ? (member.completedTasks / member.totalTasks) * 100 : 0
    }));
  };

  const teamMembersList = getTeamMembersList();

  // Helper to get username for display when selectedTeamMember is an ID or username
  const getDisplayName = useCallback(() => {
    if (selectedTeamMember === 'all') return 'All Team';
    // If selectedTeamMember is already a username (not an ID), return it
    // Check if it's an ID format (24 hex chars)
    if (selectedTeamMember.length === 24 && /^[0-9a-fA-F]{24}$/.test(selectedTeamMember)) {
      // It's an ID, try to find username from teamPerformance
      // Since teamPerformance doesn't have IDs, we can't directly map
      // Return the ID for now (will be improved with proper data structure)
      return selectedTeamMember;
    }
    // It's a username, return it
    return selectedTeamMember;
  }, [selectedTeamMember]);

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
    <div className="min-h-screen" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Main Content */}
      <div className="px-4 sm:px-6 lg:px-8 py-4">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Page Header */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
            {/* Welcome Section */}
            <div className="w-full">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <div className="relative">
                  {avatarSrc ? (
                    <img
                      src={avatarSrc}
                      alt="User avatar"
                      className="w-12 h-12 rounded-xl object-cover border-2 border-[var(--color-surface)] shadow-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                      {avatarInitial}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-[220px]">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--color-primary)10' }}>
                        <BarChart3 size={20} style={{ color: 'var(--color-primary)' }} />
                      </div>
                      <div>
                        <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
                        <p className="text-[var(--color-textSecondary)] text-sm mt-1">
                          Welcome back, <span className="font-semibold">{user?.username}</span>!
                          {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') ? ' 👥 Team Overview' : ' 📊 Your Performance'}
                        </p>
                      </div>
                    </div>
                    {/* Quick Action Button */}
                    {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager' || user?.role === 'pc') && (
                      <button
                        onClick={() => navigate('/assign-task', { replace: true })}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-xl font-semibold hover:shadow-lg transition-all duration-300 hover:scale-105"
                      >
                        <UserCheck size={18} />
                        <span className="hidden sm:inline">Assign Task</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Controls Section */}
            <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
              {/* View Mode Toggle */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                <button
                  onClick={() => setViewMode('all-time')}
                  className={`px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 text-sm ${viewMode === 'all-time'
                      ? 'text-white shadow-lg'
                      : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                    }`}
                  style={{
                    backgroundColor: viewMode === 'all-time' ? 'var(--color-primary)' : 'transparent'
                  }}
                >
                  All Time
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats Section - Updated with new metrics */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-[var(--color-text)]">📊 Quick Stats</h2>
                <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">Overview of your tasks and performance</p>
              </div>
              {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') && <TeamMemberSelector />}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div
                onClick={() => navigate('/master-tasks', { replace: true })}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-950 dark:to-blue-900 p-1.5 border border-blue-300 dark:border-blue-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[100px]">
                  <div className="flex items-start justify-between mb-0.5">
                    <div className="p-1 rounded-lg bg-white/20">
                      <CheckSquare size={16} className="text-white" />
                    </div>
                  </div>
                  <p className="text-white/80 text-[10px] font-medium mb-0.5">Total Tasks</p>
                  <p className="text-lg font-bold text-white">{displayData?.totalTasks || 0}</p>
                  <p className="text-xs text-white/70 mt-0.5 group-hover:text-white transition-colors">Click to view all →</p>
                </div>
              </div>

              <div
                onClick={() => navigate('/pending-tasks', { replace: true })}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-600 dark:from-yellow-950 dark:to-yellow-900 p-1.5 border border-yellow-300 dark:border-yellow-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[100px]">
                  <div className="flex items-start justify-between mb-0.5">
                    <div className="p-1 rounded-lg bg-white/20">
                      <Clock size={16} className="text-white" />
                    </div>
                  </div>
                  <p className="text-white/80 text-[10px] font-medium mb-0.5">Pending (≤ Today)</p>
                  <p className="text-lg font-bold text-white">{displayData?.pendingTasks || 0}</p>
                  <div className="w-full h-1 bg-white/30 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: `${((displayData?.pendingTasks || 0) / (displayData?.totalTasks || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5 group-hover:text-white transition-colors">Click to view all →</p>
                </div>
              </div>

              <div
                onClick={() => navigate('/master-tasks?status=completed', { replace: true })}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 dark:from-green-950 dark:to-green-900 p-1.5 border border-green-300 dark:border-green-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[100px]">
                  <div className="flex items-start justify-between mb-0.5">
                    <div className="p-1 rounded-lg bg-white/20">
                      <CheckCircle size={16} className="text-white" />
                    </div>
                  </div>
                  <p className="text-white/80 text-[10px] font-medium mb-0.5">Completed</p>
                  <p className="text-lg font-bold text-white">{displayData?.completedTasks || 0}</p>
                  <div className="w-full h-1 bg-white/30 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-500"
                      style={{ width: `${((displayData?.completedTasks || 0) / (displayData?.totalTasks || 1)) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-white/70 mt-0.5 group-hover:text-white transition-colors">Click to view all →</p>
                </div>
              </div>

              <div
                onClick={() => navigate('/pending-tasks', { replace: true })}
                className="group cursor-pointer"
              >
                <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-red-500 to-red-600 dark:from-red-950 dark:to-red-900 p-1.5 border border-red-300 dark:border-red-800 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 min-h-[100px]">
                  <div className="flex items-start justify-between mb-0.5">
                    <div className="p-1 rounded-lg bg-white/20">
                      <AlertTriangle size={16} className="text-white" />
                    </div>
                  </div>
                  <p className="text-white/80 text-[10px] font-medium mb-0.5">Overdue (&lt; Today)</p>
                  <p className="text-lg font-bold text-white">{displayData?.overdueTasks || 0}</p>
                  <p className="text-xs text-white/80 font-medium mt-0.5">⚠️ {displayData?.overduePercentage?.toFixed(1)}% of total</p>
                  <p className="text-xs text-white/70 mt-0.5 group-hover:text-white transition-colors">Click to view all →</p>
                </div>
              </div>
            </div>

            {/* Additional Quick Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mt-4">
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-950 dark:to-purple-900 p-1.5 border border-purple-300 dark:border-purple-800 min-h-[100px]">
                <div className="flex items-start justify-between mb-0.5">
                  <div className="p-1 rounded-lg bg-white/20">
                    <Timer size={16} className="text-white" />
                  </div>
                </div>
                <p className="text-white/80 text-[10px] font-medium mb-0.5">Upcoming (&gt; Today)</p>
                <p className="text-lg font-bold text-white">{displayData?.upcomingTasks || 0}</p>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 dark:from-orange-950 dark:to-orange-900 p-1.5 border border-orange-300 dark:border-orange-800 min-h-[100px]">
                <div className="flex items-start justify-between mb-0.5">
                  <div className="p-1 rounded-lg bg-white/20">
                    <RotateCcw size={16} className="text-white" />
                  </div>
                </div>
                <p className="text-white/80 text-[10px] font-medium mb-0.5">In Progress</p>
                <p className="text-lg font-bold text-white">{displayData?.inProgressTasks || 0}</p>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-950 dark:to-emerald-900 p-1.5 border border-emerald-300 dark:border-emerald-800 min-h-[100px]">
                <div className="flex items-start justify-between mb-0.5">
                  <div className="p-1 rounded-lg bg-white/20">
                    <UserCheck size={16} className="text-white" />
                  </div>
                </div>
                <p className="text-white/80 text-[10px] font-medium mb-0.5">Assigned By Me</p>
                <p className="text-lg font-bold text-white">{displayData?.assignedByMe?.total || 0}</p>
                <p className="text-[10px] text-white/80 font-medium mt-0.5">
                  Pending: {displayData?.assignedByMe?.pending || 0} • Completed: {displayData?.assignedByMe?.completed || 0}
                </p>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 dark:from-indigo-950 dark:to-indigo-900 p-1.5 border border-indigo-300 dark:border-indigo-800 min-h-[100px]">
                <div className="flex items-start justify-between mb-0.5">
                  <div className="p-1 rounded-lg bg-white/20">
                    <Target size={16} className="text-white" />
                  </div>
                </div>
                <p className="text-white/80 text-[10px] font-medium mb-0.5">FMS Tasks</p>
                <p className="text-lg font-bold text-white">{displayData?.fmsTasks || 0}</p>
              </div>

              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 dark:from-teal-950 dark:to-teal-900 p-1.5 border border-teal-300 dark:border-teal-800 min-h-[100px]">
                <div className="flex items-start justify-between mb-0.5">
                  <div className="p-1 rounded-lg bg-white/20">
                    <Activity size={16} className="text-white" />
                  </div>
                </div>
                <p className="text-white/80 text-[10px] font-medium mb-0.5">FMS In Progress</p>
                <p className="text-lg font-bold text-white">{displayData?.fmsInProgressTasks || 0}</p>
              </div>
            </div>
          </div>

          {/* PC Role: Tasks by Status Section */}
          {user?.role === 'pc' && (
            <div className="mt-4">
              <div className="mb-3">
                <h2 className="text-xl font-bold text-[var(--color-text)]">📋 Tasks by Status</h2>
                <p className="text-xs text-[var(--color-textSecondary)] mt-0.5">Overview of all tasks grouped by their current status</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-yellow-200 dark:bg-yellow-800/50">
                      <Clock size={20} className="text-yellow-700 dark:text-yellow-300" />
                    </div>
                    <span className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">{displayData?.pendingTasks || 0}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Pending (≤ Today)</h3>
                  <p className="text-xs text-yellow-600 dark:text-yellow-400">Tasks awaiting action</p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-300 dark:border-blue-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-blue-200 dark:bg-blue-800/50">
                      <RotateCcw size={20} className="text-blue-700 dark:text-blue-300" />
                    </div>
                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-300">{displayData?.inProgressTasks || 0}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-1">In Progress</h3>
                  <p className="text-xs text-blue-600 dark:text-blue-400">Currently being worked on</p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-300 dark:border-green-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-green-200 dark:bg-green-800/50">
                      <CheckCircle size={20} className="text-green-700 dark:text-green-300" />
                    </div>
                    <span className="text-2xl font-bold text-green-700 dark:text-green-300">{displayData?.completedTasks || 0}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-green-800 dark:text-green-200 mb-1">Completed</h3>
                  <p className="text-xs text-green-600 dark:text-green-400">Successfully finished</p>
                </div>

                <div className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-2 border-red-300 dark:border-red-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-red-200 dark:bg-red-800/50">
                      <AlertTriangle size={20} className="text-red-700 dark:text-red-300" />
                    </div>
                    <span className="text-2xl font-bold text-red-700 dark:text-red-300">{displayData?.overdueTasks || 0}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-red-800 dark:text-red-200 mb-1">Overdue (&lt; Today)</h3>
                  <p className="text-xs text-red-600 dark:text-red-400">{displayData?.overduePercentage?.toFixed(1)}% of total</p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-300 dark:border-purple-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-purple-200 dark:bg-purple-800/50">
                      <Timer size={20} className="text-purple-700 dark:text-purple-300" />
                    </div>
                    <span className="text-2xl font-bold text-purple-700 dark:text-purple-300">{displayData?.upcomingTasks || 0}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-1">Upcoming (&gt; Today)</h3>
                  <p className="text-xs text-purple-600 dark:text-purple-400">Scheduled for later</p>
                </div>

                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-2 border-indigo-300 dark:border-indigo-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-indigo-200 dark:bg-indigo-800/50">
                      <Target size={20} className="text-indigo-700 dark:text-indigo-300" />
                    </div>
                    <span className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">{displayData?.fmsTasks || 0}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-1">FMS Tasks</h3>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400">Project workflow tasks</p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-teal-100 dark:from-teal-900/20 dark:to-teal-800/20 border-2 border-teal-300 dark:border-teal-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-teal-200 dark:bg-teal-800/50">
                      <Activity size={20} className="text-teal-700 dark:text-teal-300" />
                    </div>
                    <span className="text-2xl font-bold text-teal-700 dark:text-teal-300">{displayData?.fmsInProgressTasks || 0}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-teal-800 dark:text-teal-200 mb-1">FMS In Progress</h3>
                  <p className="text-xs text-teal-600 dark:text-teal-400">Active FMS tasks</p>
                </div>

                <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900/20 dark:to-gray-800/20 border-2 border-gray-300 dark:border-gray-700 rounded-xl p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 rounded-lg bg-gray-200 dark:bg-gray-800/50">
                      <CheckSquare size={20} className="text-gray-700 dark:text-gray-300" />
                    </div>
                    <span className="text-2xl font-bold text-gray-700 dark:text-gray-300">{displayData?.totalTasks || 0}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1">Total Tasks</h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400">All tasks combined</p>
                </div>
              </div>
            </div>
          )}

          {/* Task Type Distribution - Now includes quarterly and updated to 6 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-4 p-2 sm:p-3 lg:p-4">
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

          {/* Hierarchical Task Metrics - Treemap-like structure */}
          <div className="p-2 sm:p-3 lg:p-4">
            <div className="mb-3">
              <h2 className="text-xl font-bold text-[var(--color-text)] mb-1">Task Hierarchy Overview</h2>
              <p className="text-xs text-[var(--color-textSecondary)]">Total Tasks → One-off Tasks → FMS Tasks</p>
            </div>

            {/* Total Tasks Level */}
            <div className="mb-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ThemeCard className="p-3" variant="glass">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white">
                      <CheckSquare size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-text)]">Total Tasks</h3>
                      <p className="text-xs text-[var(--color-textSecondary)]">All tasks in the system</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="text-center p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <p className="text-xl font-bold text-[var(--color-primary)]">{displayData?.totalTasks || 0}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">Total</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <p className="text-xl font-bold text-[var(--color-success)]">{displayData?.completedTasks || 0}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">Completed</p>
                    </div>
                  </div>
                </ThemeCard>

                <ThemeCard className="p-3" variant="glass">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 rounded-xl bg-gradient-to-r from-green-500 to-green-600 text-white">
                      <Target size={18} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[var(--color-text)]">One-off Tasks</h3>
                      <p className="text-xs text-[var(--color-textSecondary)]">Non-recurring tasks</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="text-center p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <p className="text-base font-bold text-[var(--color-primary)]">{displayData?.oneTimeTasks || 0}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">Total</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <p className="text-base font-bold text-[var(--color-warning)]">{displayData?.oneTimePending || 0}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">Pending</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                      <p className="text-base font-bold text-[var(--color-success)]">{displayData?.oneTimeCompleted || 0}</p>
                      <p className="text-xs text-[var(--color-textSecondary)]">Completed</p>
                    </div>
                  </div>
                </ThemeCard>
              </div>
            </div>

            {/* FMS Tasks Level */}
            <div>
              <ThemeCard className="p-3" variant="glass">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="p-2 rounded-xl bg-gradient-to-r from-indigo-500 to-indigo-600 text-white">
                    <Activity size={18} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[var(--color-text)]">FMS Tasks</h3>
                    <p className="text-xs text-[var(--color-textSecondary)]">Project-based tasks</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="text-center p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <p className="text-lg font-bold text-[var(--color-primary)]">{displayData?.fmsTasks || 0}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">Total FMS</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <p className="text-lg font-bold text-[var(--color-warning)]">{displayData?.fmsPendingTasks || 0}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">Pending</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <p className="text-lg font-bold text-[var(--color-success)]">{displayData?.fmsCompletedTasks || 0}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">Completed</p>
                  </div>
                  <div className="text-center p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <p className="text-lg font-bold text-[var(--color-accent)]">{displayData?.fmsInProgressTasks || 0}</p>
                    <p className="text-xs text-[var(--color-textSecondary)]">In Progress</p>
                  </div>
                </div>
              </ThemeCard>
            </div>
          </div>

          {/* Overall Score and Current Month Score */}
          {(user?.role === 'admin' || user?.role === 'superadmin') && (
            <div className="p-2 sm:p-3 lg:p-4">
              <div className="mb-3">
                <h2 className="text-xl font-bold text-[var(--color-text)] mb-1">Performance Scores</h2>
                <p className="text-xs text-[var(--color-textSecondary)]">Team performance metrics and scoring</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <MetricCard
                  icon={<Star size={24} className="text-yellow-600" />}
                  title="Overall Score"
                  value={`${dashboardData?.overallScore || 0}%`}
                  subtitle="Average performance score"
                  percentage={dashboardData?.overallScore || 0}
                />
                <MetricCard
                  icon={<Calendar size={24} className="text-blue-600" />}
                  title="Current Month Score"
                  value={`${dashboardData?.currentMonthScore || 0}%`}
                  subtitle="This month's performance"
                  percentage={dashboardData?.currentMonthScore || 0}
                />
              </div>
            </div>
          )}

          {/* FMS Project Metrics */}
          {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') && (
            <div className="p-4 sm:p-6 lg:p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">FMS Project Metrics</h2>
                <p className="text-sm text-[var(--color-textSecondary)]">Overview of ongoing FMS projects</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div onClick={() => navigate('/fms-progress', { replace: true })} className="cursor-pointer">
                  <MetricCard
                    icon={<Activity size={24} className="text-indigo-600" />}
                    title="Active Projects"
                    value={dashboardData?.fmsMetrics?.activeProjects || 0}
                    subtitle="Currently running"
                    percentage={100}
                  />
                </div>
                <div onClick={() => navigate('/fms-progress', { replace: true })} className="cursor-pointer">
                  <MetricCard
                    icon={<CheckCircle size={24} className="text-green-600" />}
                    title="Completed Projects"
                    value={dashboardData?.fmsMetrics?.completedProjects || 0}
                    subtitle="Successfully finished"
                    percentage={((dashboardData?.fmsMetrics?.completedProjects || 0) / ((dashboardData?.fmsMetrics?.totalProjects || 1))) * 100}
                  />
                </div>
                <div onClick={() => navigate('/fms-progress', { replace: true })} className="cursor-pointer">
                  <MetricCard
                    icon={<Clock size={24} className="text-amber-600" />}
                    title="Pending Tasks"
                    value={dashboardData?.fmsMetrics?.pendingFMSTasks || 0}
                    subtitle="Across all projects"
                    percentage={((dashboardData?.fmsMetrics?.pendingFMSTasks || 0) / (dashboardData?.fmsMetrics?.totalFMSTasks || 1)) * 100}
                  />
                </div>
                <div onClick={() => navigate('/fms-progress', { replace: true })} className="cursor-pointer">
                  <MetricCard
                    icon={<Target size={24} className="text-purple-600" />}
                    title="Avg Progress"
                    value={`${(dashboardData?.fmsMetrics?.avgProgress || 0).toFixed(1)}%`}
                    subtitle="Overall completion"
                    percentage={dashboardData?.fmsMetrics?.avgProgress || 0}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Upcoming Tasks Section */}
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">Upcoming Tasks</h2>
              <p className="text-sm text-[var(--color-textSecondary)]">Tasks due in the future (both cyclic and one-time)</p>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {dashboardData?.upcomingTasks && dashboardData.upcomingTasks.length > 0 ? (
                dashboardData.upcomingTasks.map((task: any) => (
                  <div
                    key={task._id}
                    className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">{task.title}</h3>
                        <p className="text-sm text-[var(--color-textSecondary)] mb-3">{task.description}</p>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            Assigned to: <strong>{task.assignedTo?.username}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            Due: {formatDate(task.dueDate)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${task.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                              task.status === 'completed' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                            }`}>
                            {task.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-[var(--color-textSecondary)]">
                  <Calendar size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold opacity-60">No upcoming tasks</p>
                  <p className="text-sm opacity-40">Tasks due in the future will appear here</p>
                </div>
              )}
            </div>
          </div>

          {/* Completed Tasks Section */}
          <div className="p-4 sm:p-6 lg:p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">Completed Tasks</h2>
              <p className="text-sm text-[var(--color-textSecondary)]">Recently completed tasks</p>
            </div>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {dashboardData?.recentActivity && dashboardData.recentActivity.filter(activity => activity.type === 'completed').length > 0 ? (
                dashboardData.recentActivity.filter(activity => activity.type === 'completed').slice(0, 10).map((activity) => (
                  <div
                    key={activity._id}
                    className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">{activity.title}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm">
                          <span className="flex items-center gap-1">
                            <Users size={14} />
                            Completed by: <strong>{activity.username}</strong>
                          </span>
                          <span className="flex items-center gap-1">
                            <CheckCircle size={14} />
                            Completed: {format(new Date(activity.date), 'MMM d, yyyy')}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800`}>
                            {activity.taskType}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <CheckCircle size={24} className="text-green-500" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-[var(--color-textSecondary)]">
                  <CheckCircle size={48} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg font-semibold opacity-60">No completed tasks</p>
                  <p className="text-sm opacity-40">Completed tasks will appear here</p>
                </div>
              )}
            </div>
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
                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') ? 'Team Task Status' : 'Your Task Status'}
                      </h3>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') ? 'Team distribution' : 'Your current distribution'}
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
                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') ? 'Team Task Types' : 'Your Task Types'}
                      </h3>
                      <p className="text-xs text-[var(--color-textSecondary)]">
                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') ? 'Team breakdown by category' : 'Your breakdown by category'}
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
                      {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') ? 'Team Completion Trend' : 'Your Completion Trend'}
                    </h3>
                    <p className="text-xs text-[var(--color-textSecondary)]">
                      {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') ? 'Team performance insights over the last 6 months' : 'Your performance insights over the last 6 months'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
                  {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') && teamMembersList.length > 0 && (
                    <div className="relative z-10 w-full sm:w-auto">
                      <button
                        onClick={() => setShowTeamMemberFilter(!showTeamMemberFilter)}
                        className="flex items-center justify-center px-4 py-2 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg hover:shadow-xl transition-all duration-200 text-[var(--color-text)] font-semibold w-full"
                      >
                        <Users size={16} className="mr-2" />
                        <span>
                          {selectedTeamMember === 'all' ? 'All Team' : getDisplayName()}
                        </span>
                        <ChevronDown size={16} className="ml-2" />
                      </button>
                      {showTeamMemberFilter && (
                        <div className="absolute left-0 right-0 top-full mt-2 w-full sm:w-64 z-20">
                          <ThemeCard className="p-3 max-h-80 overflow-y-auto" variant="elevated" hover={false}>
                            <div className="space-y-2">
                              <div className="px-3 py-2">
                                <input
                                  type="text"
                                  placeholder="Search team members..."
                                  value={teamMemberSearchTerm}
                                  onChange={(e) => setTeamMemberSearchTerm(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border rounded-md"
                                  style={{
                                    backgroundColor: 'var(--color-background)',
                                    borderColor: 'var(--color-border)',
                                    color: 'var(--color-text)'
                                  }}
                                />
                              </div>
                              <button
                                onClick={() => {
                                  setSelectedTeamMember('all');
                                  setShowTeamMemberFilter(false);
                                  setTeamMemberSearchTerm('');
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
                              {teamMembersList
                                .filter(member => member.username.toLowerCase().includes(teamMemberSearchTerm.toLowerCase()))
                                .map((member, index) => {
                                  // Find the corresponding team member ID from dashboardData
                                  // Since teamMembersList only has username, we need to match it
                                  // For now, we'll use username as the identifier for this dropdown
                                  // This creates inconsistency but is needed for member-trend API
                                  const isSelected = selectedTeamMember === member.username ||
                                    (selectedTeamMember !== 'all' && getDisplayName() === member.username);

                                  return (
                                    <button
                                      key={member.username}
                                      onClick={() => {
                                        // Use username here since member-trend API needs it
                                        // This creates inconsistency with TeamMemberSelector which uses ID
                                        // TODO: Refactor to use consistent ID-based system
                                        setSelectedTeamMember(member.username);
                                        setShowTeamMemberFilter(false);
                                        setTeamMemberSearchTerm('');
                                      }}
                                      className={`w-full text-left px-3 py-3 rounded-xl transition-all duration-200 ${isSelected
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
                                  );
                                })}
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

              {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') && selectedTeamMember !== 'all' && (
                <div className="mb-6 p-4 rounded-2xl border border-[var(--color-primary)]/30" style={{ backgroundColor: 'var(--color-primary)05' }}>
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold">
                      {getDisplayName()?.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-[var(--color-text)]">
                        {getDisplayName() || selectedTeamMember}'s Performance Trend
                      </h4>
                      <p className="text-sm text-[var(--color-textSecondary)]">
                        Showing individual completion data for {getDisplayName() || selectedTeamMember}
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
                                    {getDisplayName() || selectedTeamMember}'s Data
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
                      {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') ? 'Recent Activity' : 'Your Recent Activity'}
                    </h3>
                    <p className="text-xs text-[var(--color-textSecondary)]">
                      {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') ? 'Latest team task updates' : 'Your latest task updates'}
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
                        {(user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') ? (
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
        </div>
      </div>
    </div>
  );
};

export default Dashboard;