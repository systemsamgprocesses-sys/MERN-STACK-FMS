import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  Calendar, Target, CheckCircle, ChevronDown, Award, Star, BarChart3, Trophy,
  Clock4, CalendarDays, RefreshCw, UserCheck, PercentIcon, ClockIcon, User, RotateCcw, Eye,
  TrendingUp, TrendingDown, ArrowUp, ArrowDown, Activity, Zap, Users, PieChart as PieChartIcon,
  CheckSquare, AlertCircle, Timer
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadialBarChart, RadialBar
} from 'recharts';
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
    variant?: 'default' | 'glass' | 'elevated' | 'bordered' | 'gradient';
    hover?: boolean;
  }) => {
    const baseClasses = "relative overflow-hidden transition-all duration-300 ease-out";
    const variants = {
      default: `rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-lg`,
      glass: `rounded-2xl bg-[var(--color-surface)]/80 backdrop-blur-xl border border-[var(--color-border)]/50 shadow-xl`,
      elevated: `rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] shadow-2xl`,
      bordered: `rounded-2xl bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)]/20`,
      gradient: `rounded-2xl bg-gradient-to-br from-[var(--color-primary)]/10 via-[var(--color-accent)]/5 to-[var(--color-primary)]/10 border border-[var(--color-border)] shadow-xl`
    };
    const hoverClasses = hover ? "hover:shadow-xl hover:scale-[1.01] hover:border-[var(--color-primary)]/30" : "";
    return (
      <div className={`${baseClasses} ${variants[variant]} ${hoverClasses} ${className}`}>
        {children}
      </div>
    );
  };

  // --- Stat Card Component ---
  const StatCard = ({ 
    title, 
    value, 
    subtitle, 
    icon, 
    gradient, 
    trend,
    trendValue 
  }: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: React.ReactNode;
    gradient: string;
    trend?: 'up' | 'down' | 'neutral';
    trendValue?: string;
  }) => {
    const trendColors = {
      up: 'text-green-600 dark:text-green-400',
      down: 'text-red-600 dark:text-red-400',
      neutral: 'text-gray-600 dark:text-gray-400'
    };
    const trendIcons = {
      up: <TrendingUp size={14} />,
      down: <TrendingDown size={14} />,
      neutral: <Activity size={14} />
    };

    return (
      <ThemeCard className="p-6" variant="gradient" hover={true}>
        <div className="flex items-start justify-between mb-4">
          <div className={`p-3 rounded-xl ${gradient} shadow-lg`}>
            {icon}
          </div>
          {trend && trendValue && (
            <div className={`flex items-center gap-1 text-sm font-semibold ${trendColors[trend]}`}>
              {trendIcons[trend]}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
        <div>
          <h3 className="text-sm font-medium text-[var(--color-textSecondary)] mb-1">{title}</h3>
          <p className="text-3xl font-bold text-[var(--color-text)] mb-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-[var(--color-textSecondary)]">{subtitle}</p>
          )}
        </div>
      </ThemeCard>
    );
  };

  // --- User Performance Card Component ---
  const UserPerformanceCard = ({ userPerformance }: { userPerformance: NonNullable<DashboardData['userPerformance']>, maxTasks: number }) => {
    const total = userPerformance.totalTasks || 1;
    const completed = userPerformance.completedTasks || 0;
    const pending = userPerformance.pendingTasks || 0;

    const onTimeCompletedTasks = Math.min(
      (userPerformance.onTimeCompletedTasks || 0) + (userPerformance.onTimeRecurringCompleted || 0),
      completed
    );

    const actualCompletionRate = total > 0 ? (completed / total) * 100 : 0;
    const actualOnTimeRate = completed > 0 ? Math.min((onTimeCompletedTasks / completed) * 100, 100) : 0;
    const totalPerformanceRate = userPerformance.performanceScore !== undefined 
      ? userPerformance.performanceScore 
      : ((actualCompletionRate * 0.5) + (actualOnTimeRate * 0.5));

    // Chart data for task types
    const taskTypeData = useMemo(() => [
      { name: 'One-time', total: userPerformance.oneTimeTasks, completed: userPerformance.oneTimeCompleted, pending: userPerformance.oneTimePending, color: '#3b82f6' },
      { name: 'Daily', total: userPerformance.dailyTasks, completed: userPerformance.dailyCompleted, pending: userPerformance.dailyPending, color: '#10b981' },
      { name: 'Weekly', total: userPerformance.weeklyTasks, completed: userPerformance.weeklyCompleted, pending: userPerformance.weeklyPending, color: '#f59e0b' },
      { name: 'Monthly', total: userPerformance.monthlyTasks, completed: userPerformance.monthlyCompleted, pending: userPerformance.monthlyPending, color: '#8b5cf6' },
      { name: 'Quarterly', total: userPerformance.quarterlyTasks, completed: userPerformance.quarterlyCompleted, pending: userPerformance.quarterlyPending, color: '#06b6d4' },
      { name: 'Yearly', total: userPerformance.yearlyTasks, completed: userPerformance.yearlyCompleted, pending: userPerformance.yearlyPending, color: '#ec4899' },
    ], [userPerformance]);

    // Pie chart data
    const pieData = useMemo(() => [
      { name: 'Completed', value: completed, color: '#10b981' },
      { name: 'Pending', value: pending, color: '#f59e0b' },
    ], [completed, pending]);

    // Radial chart data
    const radialData = useMemo(() => [
      { name: 'Performance', value: totalPerformanceRate, fill: '#3b82f6' },
      { name: 'Completion', value: actualCompletionRate, fill: '#10b981' },
      { name: 'On-Time', value: actualOnTimeRate, fill: '#8b5cf6' },
    ], [totalPerformanceRate, actualCompletionRate, actualOnTimeRate]);

    const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

    return (
      <div className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Tasks"
            value={total}
            subtitle={`${completed} completed, ${pending} pending`}
            icon={<CheckSquare size={24} className="text-white" />}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
            trend="neutral"
          />
          <StatCard
            title="Completion Rate"
            value={`${actualCompletionRate.toFixed(1)}%`}
            subtitle={`${completed} of ${total} tasks`}
            icon={<CheckCircle size={24} className="text-white" />}
            gradient="bg-gradient-to-br from-green-500 to-green-600"
            trend={actualCompletionRate >= 80 ? "up" : actualCompletionRate >= 60 ? "neutral" : "down"}
            trendValue={actualCompletionRate >= 80 ? "Excellent" : actualCompletionRate >= 60 ? "Good" : "Needs Improvement"}
          />
          <StatCard
            title="On-Time Rate"
            value={`${actualOnTimeRate.toFixed(1)}%`}
            subtitle={`${onTimeCompletedTasks} tasks completed on time`}
            icon={<Timer size={24} className="text-white" />}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            trend={actualOnTimeRate >= 80 ? "up" : actualOnTimeRate >= 60 ? "neutral" : "down"}
            trendValue={actualOnTimeRate >= 80 ? "Excellent" : actualOnTimeRate >= 60 ? "Good" : "Needs Improvement"}
          />
          <StatCard
            title="Performance Score"
            value={`${totalPerformanceRate.toFixed(1)}%`}
            subtitle="Overall performance metric"
            icon={<Trophy size={24} className="text-white" />}
            gradient="bg-gradient-to-br from-amber-500 to-amber-600"
            trend={totalPerformanceRate >= 80 ? "up" : totalPerformanceRate >= 60 ? "neutral" : "down"}
            trendValue={totalPerformanceRate >= 80 ? "Top Performer" : totalPerformanceRate >= 60 ? "Good" : "Improving"}
          />
        </div>

        {/* Main Performance Card */}
        <ThemeCard className="p-6" variant="glass" hover={false}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 space-y-4 lg:space-y-0">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-400 to-purple-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                  {userPerformance.username.charAt(0).toUpperCase()}
                </div>
                <div className="absolute -top-1 -right-1 bg-blue-50 dark:bg-blue-900/30 rounded-full p-1.5 shadow-md">
                  <User size={20} className="text-blue-700 dark:text-blue-300" />
                </div>
              </div>
              <div>
                <div className="flex items-center space-x-3 mb-1">
                  <h4 className="font-bold text-2xl text-[var(--color-text)]">{userPerformance.username}</h4>
                  <span className="text-sm px-3 py-1 rounded-full font-semibold bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700">
                    Your Performance
                  </span>
                </div>
                <p className="text-base text-[var(--color-textSecondary)]">
                  {total} total tasks • {completed} completed • {pending} pending
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="text-center">
                <div className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
                  {totalPerformanceRate.toFixed(1)}%
                </div>
                <div className="w-32 h-3 bg-[var(--color-border)] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"
                    style={{ width: `${Math.min(totalPerformanceRate, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-[var(--color-textSecondary)] mt-1">Overall Score</p>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Task Type Distribution Bar Chart */}
            <ThemeCard className="p-4" variant="default" hover={false}>
              <h5 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                <BarChart3 size={20} />
                Task Distribution by Type
              </h5>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={taskTypeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="name" stroke="var(--color-textSecondary)" fontSize={12} />
                  <YAxis stroke="var(--color-textSecondary)" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface)', 
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="completed" stackId="a" fill="#10b981" name="Completed" radius={[8, 8, 0, 0]} />
                  <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ThemeCard>

            {/* Completion Status Pie Chart */}
            <ThemeCard className="p-4" variant="default" hover={false}>
              <h5 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                <PieChartIcon size={20} />
                Completion Status
              </h5>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'var(--color-surface)', 
                      border: '1px solid var(--color-border)',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ThemeCard>
          </div>

          {/* Task Type Breakdown Grid */}
          <div className="pt-6 border-t border-[var(--color-border)]">
            <h5 className="text-lg font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
              <Target size={20} />
              Detailed Task Breakdown
            </h5>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {taskTypeData.map((item, index) => {
                const completionRate = item.total > 0 ? (item.completed / item.total) * 100 : 0;
                return (
                  <ThemeCard key={index} className="p-4" variant="default" hover={true}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${item.color}20` }}>
                        <div style={{ color: item.color }}>
                          {index === 0 && <Target size={18} />}
                          {index === 1 && <RefreshCw size={18} />}
                          {index === 2 && <Calendar size={18} />}
                          {index === 3 && <CalendarDays size={18} />}
                          {index === 4 && <RotateCcw size={18} />}
                          {index === 5 && <Star size={18} />}
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-1 rounded-full bg-[var(--color-border)] text-[var(--color-textSecondary)]">
                        {completionRate.toFixed(0)}%
                      </span>
                    </div>
                    <h6 className="text-sm font-semibold text-[var(--color-text)] mb-2">{item.name}</h6>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--color-textSecondary)]">Total</span>
                        <span className="font-bold text-[var(--color-text)]">{item.total}</span>
                      </div>
                      <div className="w-full h-2 bg-[var(--color-border)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000"
                          style={{
                            width: `${completionRate}%`,
                            backgroundColor: item.color
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                          <ClockIcon size={12} />
                          {item.pending}
                        </span>
                        <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                          <CheckCircle size={12} />
                          {item.completed}
                        </span>
                      </div>
                    </div>
                  </ThemeCard>
                );
              })}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700">
                <CheckCircle size={24} className="text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700 dark:text-green-300">{completed}</p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">Completed</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border border-orange-200 dark:border-orange-700">
                <ClockIcon size={24} className="text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{pending}</p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Pending</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border border-blue-200 dark:border-blue-700">
                <RefreshCw size={24} className="text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{userPerformance.recurringTasks}</p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Recurring</p>
              </div>
              <div className="text-center p-4 rounded-xl bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-700">
                <Timer size={24} className="text-purple-600 dark:text-purple-400 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{onTimeCompletedTasks}</p>
                <p className="text-xs text-purple-600 dark:text-purple-400 mt-1">On-Time</p>
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
            <button
              onClick={() => navigate('/performance/details', { 
                state: { userId: user?.id, username: userPerformance.username } 
              })}
              className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              <Eye size={20} />
              View Detailed Performance Analysis
            </button>
          </div>
        </ThemeCard>
      </div>
    );
  };

  // --- TeamMemberCard Component ---
  const TeamMemberCard = ({ member, rank }: {
    member: DashboardData['teamPerformance'][0];
    rank: number;
  }) => {
    const getRankBadge = (rank: number) => {
      const badges = {
        1: { icon: <Trophy size={18} />, gradient: 'from-yellow-400 to-yellow-600', bg: 'bg-yellow-50 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-700' },
        2: { icon: <Award size={18} />, gradient: 'from-gray-300 to-gray-500', bg: 'bg-gray-50 dark:bg-gray-800/30', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
        3: { icon: <Star size={18} />, gradient: 'from-amber-400 to-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-700' },
      };
      return badges[rank as keyof typeof badges] || {
        icon: <UserCheck size={18} />,
        gradient: 'from-blue-400 to-blue-600',
        bg: 'bg-blue-50 dark:bg-blue-900/30',
        text: 'text-blue-700 dark:text-blue-300',
        border: 'border-blue-200 dark:border-blue-700'
      };
    };
    const badge = getRankBadge(rank);
    const total = member.totalTasks || 1;
    const completed = member.completedTasks || 0;
    const pending = member.pendingTasks || 0;

    const onTimeCompletedTasks = Math.min(
      (member.onTimeCompletedTasks || 0) + (member.onTimeRecurringCompleted || 0),
      completed
    );

    const actualCompletionRate = total > 0 ? (completed / total) * 100 : 0;
    const actualOnTimeRate = completed > 0 ? Math.min((onTimeCompletedTasks / completed) * 100, 100) : 0;
    const totalPerformanceRate = member.performanceScore !== undefined 
      ? member.performanceScore 
      : ((actualCompletionRate * 0.5) + (actualOnTimeRate * 0.5));

    return (
      <ThemeCard className="p-6" variant="glass" hover={true}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-4 lg:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${badge.gradient} flex items-center justify-center text-white font-bold text-xl shadow-lg`}>
                {member.username.charAt(0).toUpperCase()}
              </div>
              <div className={`absolute -top-1 -right-1 ${badge.bg} ${badge.border} border-2 rounded-full p-1.5 shadow-md`}>
                <div className={badge.text}>{badge.icon}</div>
              </div>
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-bold text-xl text-[var(--color-text)]">{member.username}</h4>
                <span className={`text-sm px-3 py-1 rounded-full font-semibold ${badge.bg} ${badge.text} ${badge.border} border`}>
                  #{rank}
                </span>
              </div>
              <p className="text-sm text-[var(--color-textSecondary)]">
                {total} tasks • {completed} completed • {pending} pending
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <div className="text-center">
              <div className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-2">
                {totalPerformanceRate.toFixed(1)}%
              </div>
              <div className="w-28 h-2.5 bg-[var(--color-border)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out bg-gradient-to-r from-green-500 via-blue-500 to-purple-500"
                  style={{ width: `${Math.min(totalPerformanceRate, 100)}%` }}
                />
              </div>
              <p className="text-xs text-[var(--color-textSecondary)] mt-1">Performance</p>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-[var(--color-border)]">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'One-time', total: member.oneTimeTasks, pending: member.oneTimePending, completed: member.oneTimeCompleted, icon: <Target size={16} />, color: '#3b82f6' },
              { label: 'Daily', total: member.dailyTasks, pending: member.dailyPending, completed: member.dailyCompleted, icon: <RefreshCw size={16} />, color: '#10b981' },
              { label: 'Weekly', total: member.weeklyTasks, pending: member.weeklyPending, completed: member.weeklyCompleted, icon: <Calendar size={16} />, color: '#f59e0b' },
              { label: 'Monthly', total: member.monthlyTasks, pending: member.monthlyPending, completed: member.monthlyCompleted, icon: <CalendarDays size={16} />, color: '#8b5cf6' },
              { label: 'Quarterly', total: member.quarterlyTasks, pending: member.quarterlyPending, completed: member.quarterlyCompleted, icon: <RotateCcw size={16} />, color: '#06b6d4' },
              { label: 'Yearly', total: member.yearlyTasks, pending: member.yearlyPending, completed: member.yearlyCompleted, icon: <Star size={16} />, color: '#ec4899' },
            ].map((item, index) => {
              const completionRate = item.total > 0 ? (item.completed / item.total) * 100 : 0;
              return (
                <div key={index} className="p-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:shadow-md transition-all">
                  <div className="flex items-center mb-2">
                    <div className="p-1.5 rounded-lg mr-2" style={{ backgroundColor: `${item.color}20` }}>
                      <div style={{ color: item.color }}>{item.icon}</div>
                    </div>
                    <span className="text-xs font-medium text-[var(--color-textSecondary)]">{item.label}</span>
                  </div>
                  <div className="text-center mb-2">
                    <span className="text-lg font-bold text-[var(--color-text)]">{item.total}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[var(--color-border)] rounded-full overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${completionRate}%`, backgroundColor: item.color }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                      <ClockIcon size={12} />
                      {item.pending}
                    </span>
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle size={12} />
                      {item.completed}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-4 pt-4 border-t border-[var(--color-border)] space-y-3 sm:space-y-0">
          <div className="grid grid-cols-3 gap-4 flex-1">
            <div className="text-center">
              <p className="text-xs text-[var(--color-textSecondary)] mb-1">Completion</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">{actualCompletionRate.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[var(--color-textSecondary)] mb-1">On-Time</p>
              <p className="text-lg font-bold text-purple-600 dark:text-purple-400">{actualOnTimeRate.toFixed(1)}%</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[var(--color-textSecondary)] mb-1">Recurring</p>
              <p className="text-lg font-bold text-blue-600 dark:text-blue-400">{member.recurringTasks}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/performance/details', { 
              state: { username: member.username } 
            })}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all flex items-center justify-center gap-2 font-semibold shadow-md hover:shadow-lg"
          >
            <Eye size={16} />
            View Details
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

  // Sort all users by performance
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

        return bPerformance - aPerformance;
      })
      .map((user, idx) => ({ ...user, rank: idx + 1 }))
    : [];

  // Calculate team summary stats
  const teamSummaryStats = useMemo(() => {
    if (!dashboardData?.teamPerformance || dashboardData.teamPerformance.length === 0) {
      return null;
    }

    const totalTasks = dashboardData.teamPerformance.reduce((sum, m) => sum + (m.totalTasks || 0), 0);
    const totalCompleted = dashboardData.teamPerformance.reduce((sum, m) => sum + (m.completedTasks || 0), 0);
    const totalPending = dashboardData.teamPerformance.reduce((sum, m) => sum + (m.pendingTasks || 0), 0);
    const avgCompletionRate = dashboardData.teamPerformance.reduce((sum, m) => {
      const rate = m.totalTasks > 0 ? ((m.completedTasks || 0) / m.totalTasks) * 100 : 0;
      return sum + rate;
    }, 0) / dashboardData.teamPerformance.length;
    const avgOnTimeRate = dashboardData.teamPerformance.reduce((sum, m) => {
      const completed = m.completedTasks || 0;
      const onTime = Math.min((m.onTimeCompletedTasks || 0) + (m.onTimeRecurringCompleted || 0), completed);
      const rate = completed > 0 ? (onTime / completed) * 100 : 0;
      return sum + rate;
    }, 0) / dashboardData.teamPerformance.length;

    return {
      totalTasks,
      totalCompleted,
      totalPending,
      avgCompletionRate,
      avgOnTimeRate,
      teamSize: dashboardData.teamPerformance.length
    };
  }, [dashboardData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[var(--color-primary)] border-t-transparent mx-auto mb-4"></div>
          <p className="text-lg font-semibold text-[var(--color-textSecondary)]">Loading performance data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Enhanced Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-6 lg:space-y-0">
        <div className="flex items-center space-x-4">
          <div className="p-4 rounded-2xl shadow-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500">
            <BarChart3 size={28} className="text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-[var(--color-text)] mb-1">
              Performance Dashboard
            </h1>
            <p className="text-base text-[var(--color-textSecondary)]">
              Welcome back, <span className="font-bold text-[var(--color-text)]">{user?.username}</span>!
              {(user?.role === 'admin' || user?.role === 'manager') 
                ? ' Comprehensive team performance analytics' 
                : ' Your detailed performance insights'}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
          <ThemeCard className="p-1" variant="bordered" hover={false}>
            <div className="flex items-center">
              <button
                onClick={() => {
                  setViewMode('current');
                  setSelectedMonth(new Date());
                }}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${viewMode === 'current'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                  }`}
              >
                Current Month
              </button>
              <button
                onClick={() => setViewMode('all-time')}
                className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${viewMode === 'all-time'
                  ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                  : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
                  }`}
              >
                All Time
              </button>
            </div>
          </ThemeCard>

          {viewMode === 'current' && (
            <div className="relative z-10">
              <button
                onClick={() => setShowMonthFilter(!showMonthFilter)}
                className="flex items-center justify-center px-5 py-2.5 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg hover:shadow-xl transition-all duration-200 text-[var(--color-text)] font-semibold"
              >
                <Calendar size={18} className="mr-2" />
                <span>
                  {isSameMonth(selectedMonth, new Date()) && isSameYear(selectedMonth, new Date())
                    ? 'Current Month'
                    : format(selectedMonth, 'MMMM yyyy')}
                </span>
                <ChevronDown size={18} className="ml-2" />
              </button>
              {showMonthFilter && (
                <div className="absolute left-0 right-0 top-full mt-2 w-full sm:w-56 z-20">
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
                              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                              : 'hover:bg-[var(--color-border)] text-[var(--color-text)]'
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{format(date, 'MMMM yyyy')}</span>
                              {isCurrent && (
                                <div className="w-2 h-2 bg-[var(--color-success)] rounded-full"></div>
                              )}
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

      {/* Team Summary Stats (for admins/managers) */}
      {(user?.role === 'admin' || user?.role === 'manager') && teamSummaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="Team Size"
            value={teamSummaryStats.teamSize}
            subtitle="Active members"
            icon={<Users size={24} className="text-white" />}
            gradient="bg-gradient-to-br from-indigo-500 to-indigo-600"
          />
          <StatCard
            title="Total Tasks"
            value={teamSummaryStats.totalTasks}
            subtitle={`${teamSummaryStats.totalCompleted} completed`}
            icon={<CheckSquare size={24} className="text-white" />}
            gradient="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            title="Avg Completion"
            value={`${teamSummaryStats.avgCompletionRate.toFixed(1)}%`}
            subtitle="Team average"
            icon={<CheckCircle size={24} className="text-white" />}
            gradient="bg-gradient-to-br from-green-500 to-green-600"
            trend={teamSummaryStats.avgCompletionRate >= 80 ? "up" : teamSummaryStats.avgCompletionRate >= 60 ? "neutral" : "down"}
          />
          <StatCard
            title="Avg On-Time"
            value={`${teamSummaryStats.avgOnTimeRate.toFixed(1)}%`}
            subtitle="Team average"
            icon={<Timer size={24} className="text-white" />}
            gradient="bg-gradient-to-br from-purple-500 to-purple-600"
            trend={teamSummaryStats.avgOnTimeRate >= 80 ? "up" : teamSummaryStats.avgOnTimeRate >= 60 ? "neutral" : "down"}
          />
          <StatCard
            title="Pending Tasks"
            value={teamSummaryStats.totalPending}
            subtitle="Across team"
            icon={<AlertCircle size={24} className="text-white" />}
            gradient="bg-gradient-to-br from-orange-500 to-orange-600"
          />
        </div>
      )}

      {/* Performance Content */}
      {(user?.role !== 'admin' && user?.role !== 'manager') && dashboardData?.userPerformance && (
        <UserPerformanceCard userPerformance={dashboardData.userPerformance} maxTasks={maxTasks} />
      )}

      {(user?.role === 'admin' || user?.role === 'manager') && sortedUsers.length > 0 && (
        <ThemeCard className="p-6 lg:p-8" variant="glass">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div className="flex items-center space-x-4">
              <div className="p-4 rounded-2xl text-white bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 shadow-lg">
                <Trophy size={28} />
              </div>
              <div>
                <h3 className="text-2xl lg:text-3xl font-bold text-[var(--color-text)]">Team Performance Leaderboard</h3>
                <p className="text-sm text-[var(--color-textSecondary)] mt-1">
                  Ranked by overall performance score • {sortedUsers.length} team members
                </p>
              </div>
            </div>

            <div className="px-5 py-2.5 rounded-full font-bold text-lg bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-300 border-2 border-amber-200 dark:border-amber-700">
              {sortedUsers.length} Members
            </div>
          </div>
          <div className="space-y-4 max-h-[700px] overflow-y-auto pr-2">
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
