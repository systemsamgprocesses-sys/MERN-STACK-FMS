import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, FunnelChart, Funnel, LabelList, Legend, LineChart, Line
} from 'recharts';
import {
    Filter, X, Download,
    AlertCircle, CheckCircle, Clock, PlayCircle, Package, ChevronDown,
    TrendingUp, TrendingDown, Users, Award, Zap, Target, Activity, BarChart3
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';

// Modern color palette
const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6', '#06b6d4'];
const STATUS_COLORS = {
    'Not Started': '#94a3b8',
    'Pending': '#f59e0b',
    'In Progress': '#3b82f6',
    'Done': '#10b981',
    'Awaiting Date': '#6b7280'
};

interface KPIs {
    totalTasks: number;
    openTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    overdueTasks: number;
}

interface DepartmentStat {
    name: string;
    total: number;
    'Not Started': number;
    'Pending': number;
    'In Progress': number;
    'Done': number;
    'Awaiting Date': number;
}

interface CategoryStat {
    name: string;
    count: number;
}

interface StatusFunnel {
    status: string;
    count: number;
}

interface Task {
    id: string;
    projectId: string;
    projectName: string;
    title: string;
    department: string;
    category: string;
    status: string;
    assignedTo: string;
    createdDate: string;
    dueDate: string;
    priority: string;
}

interface DashboardData {
    kpis: KPIs;
    departmentStats: DepartmentStat[];
    categoryStats: CategoryStat[];
    statusFunnel: StatusFunnel[];
    detailedTasks: Task[];
    filters: {
        departments: string[];
        categories: string[];
        statuses: string[];
    };
}

interface ProjectProgress {
    projectId: string;
    projectName: string;
    category: string;
    totalSteps: number;
    completedSteps: number;
    completionPercent: number;
    currentStep?: Task;
    isOverdue: boolean;
}

const FMSDashboard: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const isAdmin = user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager';
    const [data, setData] = useState<DashboardData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    // Filter states
    const [dateRange, setDateRange] = useState<'week' | 'month' | '3months' | 'custom'>('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
    const [showFilters, setShowFilters] = useState(false);

    // Sort states
    const [sortField, setSortField] = useState<keyof Task>('dueDate');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    
    // Filter state for pending tasks
    const [showOnlyPending, setShowOnlyPending] = useState(true);

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dateRange, customStartDate, customEndDate, selectedDepartments, selectedCategories, selectedStatuses]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams();

            // Date range
            if (dateRange === 'week') {
                params.append('startDate', startOfWeek(new Date()).toISOString());
                params.append('endDate', endOfWeek(new Date()).toISOString());
            } else if (dateRange === 'month') {
                params.append('startDate', startOfMonth(new Date()).toISOString());
                params.append('endDate', endOfMonth(new Date()).toISOString());
            } else if (dateRange === '3months') {
                params.append('startDate', startOfMonth(subMonths(new Date(), 3)).toISOString());
                params.append('endDate', endOfMonth(new Date()).toISOString());
            } else if (dateRange === 'custom' && customStartDate && customEndDate) {
                params.append('startDate', new Date(customStartDate).toISOString());
                params.append('endDate', new Date(customEndDate).toISOString());
            }

            // Other filters
            selectedDepartments.forEach(dept => params.append('departments', dept));
            selectedCategories.forEach(cat => params.append('categories', cat));
            selectedStatuses.forEach(status => params.append('statuses', status));

            const response = await axios.get(`/api/fms-dashboard/stats?${params}`);
            if (response.data.success) {
                setData(response.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to fetch dashboard data');
            console.error('Dashboard error:', err);
        } finally {
            setLoading(false);
        }
    };

    const clearFilters = () => {
        setSelectedDepartments([]);
        setSelectedCategories([]);
        setSelectedStatuses([]);
        setDateRange('month');
        setCustomStartDate('');
        setCustomEndDate('');
    };

    const projectProgress = useMemo<ProjectProgress[]>(() => {
        if (!data) return [];
        const map = new Map<string, { projectId: string; projectName: string; category: string; tasks: Task[] }>();
        data.detailedTasks.forEach(task => {
            if (!map.has(task.projectId)) {
                map.set(task.projectId, {
                    projectId: task.projectId,
                    projectName: task.projectName,
                    category: task.category,
                    tasks: []
                });
            }
            map.get(task.projectId).tasks.push(task);
        });

        return Array.from(map.values()).map(project => {
            const sortedTasks = [...project.tasks].sort((a, b) => {
                const dateA = new Date(a.dueDate || a.createdDate || 0).getTime();
                const dateB = new Date(b.dueDate || b.createdDate || 0).getTime();
                return dateA - dateB;
            });

            const totalSteps = sortedTasks.length;
            const completedSteps = sortedTasks.filter(task => task.status === 'Done').length;
            const currentStep = sortedTasks.find(task => task.status !== 'Done') || sortedTasks[sortedTasks.length - 1];
            const completionPercent = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);
            const isOverdue = currentStep?.dueDate && new Date(currentStep.dueDate) < new Date() && currentStep.status !== 'Done';

            return {
                projectId: project.projectId,
                projectName: project.projectName,
                category: project.category,
                totalSteps,
                completedSteps,
                completionPercent,
                currentStep,
                isOverdue
            };
        }).sort((a, b) => a.projectName.localeCompare(b.projectName));
    }, [data]);

    const projectSummary = useMemo(() => {
        if (!projectProgress.length) {
            return {
                totalProjects: 0,
                onTrack: 0,
                atRisk: 0,
                avgCompletion: 0
            };
        }

        const totalProjects = projectProgress.length;
        const atRisk = projectProgress.filter(project => project.isOverdue).length;
        const onTrack = projectProgress.filter(project => !project.isOverdue && project.completionPercent >= 50).length;
        const avgCompletion = Math.round(projectProgress.reduce((sum, project) => sum + project.completionPercent, 0) / totalProjects);

        return { totalProjects, onTrack, atRisk, avgCompletion };
    }, [projectProgress]);

    const completionTrendData = useMemo(() => {
        return projectProgress.map(project => ({
            name: project.projectName.length > 12 ? `${project.projectName.slice(0, 12)}…` : project.projectName,
            completion: project.completionPercent
        }));
    }, [projectProgress]);

    // Task Velocity Metrics
    const taskVelocity = useMemo(() => {
        if (!data?.detailedTasks) return { completionRate: 0, avgDaysToComplete: 0, tasksPerDay: 0 };
        const completed = data.detailedTasks.filter(t => t.status === 'Done');
        const total = data.detailedTasks.length;
        const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : 0;
        
        // Calculate average days to complete (simplified)
        const tasksWithDates = completed.filter(t => t.createdDate && t.dueDate);
        const avgDays = tasksWithDates.length > 0 
            ? Math.round(tasksWithDates.reduce((sum, t) => {
                const days = Math.ceil((new Date(t.dueDate).getTime() - new Date(t.createdDate).getTime()) / (1000 * 60 * 60 * 24));
                return sum + (days > 0 ? days : 0);
            }, 0) / tasksWithDates.length)
            : 0;
        
        // Estimate tasks per day based on date range
        const daysInRange = dateRange === 'week' ? 7 : dateRange === 'month' ? 30 : 90;
        const tasksPerDay = Math.round((completed.length / daysInRange) * 10) / 10;
        
        return { completionRate, avgDaysToComplete: avgDays, tasksPerDay };
    }, [data?.detailedTasks, dateRange]);

    // Department Efficiency Scores
    const departmentEfficiency = useMemo(() => {
        if (!data?.departmentStats) return [];
        return data.departmentStats.map(dept => {
            const total = dept.total || 1;
            const completed = dept.Done || 0;
            const inProgress = dept['In Progress'] || 0;
            const efficiency = Math.round(((completed + inProgress * 0.5) / total) * 100);
            return {
                name: dept.name,
                efficiency,
                total,
                completed,
                pending: (dept.Pending || 0) + (dept['Not Started'] || 0)
            };
        }).sort((a, b) => b.efficiency - a.efficiency);
    }, [data?.departmentStats]);

    // Category Performance Analysis
    const categoryPerformance = useMemo(() => {
        if (!data?.categoryStats || !data?.detailedTasks) return [];
        return data.categoryStats.map(cat => {
            const categoryTasks = data.detailedTasks.filter(t => t.category === cat.name);
            const completed = categoryTasks.filter(t => t.status === 'Done').length;
            const total = categoryTasks.length;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
            const overdue = categoryTasks.filter(t => t.priority === 'High').length;
            return {
                name: cat.name,
                total,
                completed,
                completionRate,
                overdue,
                pending: total - completed
            };
        }).sort((a, b) => b.completionRate - a.completionRate);
    }, [data?.categoryStats, data?.detailedTasks]);

    // Overdue Tasks Breakdown
    const overdueBreakdown = useMemo(() => {
        if (!data?.detailedTasks) return { byDepartment: [], byCategory: [], byPriority: { high: 0, normal: 0 } };
        const overdue = data.detailedTasks.filter(t => t.priority === 'High' || t.status === 'Pending');
        
        const byDept: Record<string, number> = {};
        const byCat: Record<string, number> = {};
        let highPriority = 0;
        let normalPriority = 0;
        
        overdue.forEach(task => {
            byDept[task.department] = (byDept[task.department] || 0) + 1;
            byCat[task.category] = (byCat[task.category] || 0) + 1;
            if (task.priority === 'High') highPriority++;
            else normalPriority++;
        });
        
        return {
            byDepartment: Object.entries(byDept).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
            byCategory: Object.entries(byCat).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
            byPriority: { high: highPriority, normal: normalPriority }
        };
    }, [data?.detailedTasks]);

    // User Performance (for admins)
    const userPerformance = useMemo(() => {
        if (!isAdmin || !data?.detailedTasks) return [];
        const userMap: Record<string, { name: string; total: number; completed: number; overdue: number }> = {};
        
        data.detailedTasks.forEach(task => {
            const users = task.assignedTo.split(', ').filter(Boolean);
            users.forEach(userName => {
                if (!userMap[userName]) {
                    userMap[userName] = { name: userName, total: 0, completed: 0, overdue: 0 };
                }
                userMap[userName].total++;
                if (task.status === 'Done') userMap[userName].completed++;
                if (task.priority === 'High') userMap[userName].overdue++;
            });
        });
        
        return Object.values(userMap)
            .map(user => ({
                ...user,
                completionRate: user.total > 0 ? Math.round((user.completed / user.total) * 100) : 0
            }))
            .sort((a, b) => b.completionRate - a.completionRate)
            .slice(0, 10); // Top 10 performers
    }, [data?.detailedTasks, isAdmin]);

    // Bottleneck Analysis
    const bottlenecks = useMemo(() => {
        if (!data?.detailedTasks) return { statusBottleneck: '', departmentBottleneck: '', categoryBottleneck: '' };
        
        const statusCounts: Record<string, number> = {};
        const deptCounts: Record<string, number> = {};
        const catCounts: Record<string, number> = {};
        
        data.detailedTasks.forEach(task => {
            if (task.status !== 'Done') {
                statusCounts[task.status] = (statusCounts[task.status] || 0) + 1;
                deptCounts[task.department] = (deptCounts[task.department] || 0) + 1;
                catCounts[task.category] = (catCounts[task.category] || 0) + 1;
            }
        });
        
        const maxStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1])[0];
        const maxDept = Object.entries(deptCounts).sort((a, b) => b[1] - a[1])[0];
        const maxCat = Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0];
        
        return {
            statusBottleneck: maxStatus ? `${maxStatus[0]} (${maxStatus[1]} tasks)` : 'None',
            departmentBottleneck: maxDept ? `${maxDept[0]} (${maxDept[1]} tasks)` : 'None',
            categoryBottleneck: maxCat ? `${maxCat[0]} (${maxCat[1]} tasks)` : 'None'
        };
    }, [data?.detailedTasks]);

    const formatDate = (value?: string) => value ? format(new Date(value), 'MMM dd, yyyy') : '-';

    const exportToCSV = () => {
        if (!data) return;

        const headers = ['Project ID', 'Project Name', 'Title', 'Department', 'Category', 'Status', 'Assigned To', 'Created Date', 'Due Date', 'Priority'];
        const rows = data.detailedTasks.map(task => [
            task.projectId,
            task.projectName,
            task.title,
            task.department,
            task.category,
            task.status,
            task.assignedTo,
            task.createdDate ? format(new Date(task.createdDate), 'yyyy-MM-dd') : '',
            task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
            task.priority
        ]);

        const csvContent = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `fms-dashboard-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    const sortTasks = (tasks: Task[]) => {
        return [...tasks].sort((a, b) => {
            let aVal: string | number = a[sortField];
            let bVal: string | number = b[sortField];

            if (sortField === 'dueDate' || sortField === 'createdDate') {
                aVal = aVal ? new Date(aVal as string).getTime() : 0;
                bVal = bVal ? new Date(bVal as string).getTime() : 0;
            }

            if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    // Filter tasks based on pending filter
    const filteredTasks = useMemo(() => {
        if (!data?.detailedTasks) return [];
        let tasks = data.detailedTasks;
        
        // Filter for pending tasks only if enabled (Pending, Not Started, In Progress - all non-completed)
        if (showOnlyPending) {
            tasks = tasks.filter(task => 
                task.status === 'Pending' || 
                task.status === 'Not Started' || 
                task.status === 'In Progress' ||
                task.status === 'Awaiting Date'
            );
        }
        
        return sortTasks(tasks);
    }, [data?.detailedTasks, showOnlyPending, sortField, sortDirection]);

    const handleSort = (field: keyof Task) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                    <p className="font-semibold text-gray-900 dark:text-white">{payload[0].payload.name || payload[0].name}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-sm" style={{ color: entry.color }}>
                            {entry.name}: <span className="font-semibold">{entry.value}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (error && !data) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 space-y-4" style={{ backgroundColor: 'var(--color-background)' }}>
            {/* Header */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3">
                <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        FMS Progress Dashboard
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 text-xs mt-0.5">
                        Comprehensive overview of Facility Management System progress
                    </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                    {/* Date Range Selector */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setDateRange('week')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === 'week'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            This Week
                        </button>
                        <button
                            onClick={() => setDateRange('month')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === 'month'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setDateRange('3months')}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${dateRange === '3months'
                                    ? 'bg-indigo-600 text-white shadow-lg'
                                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                                }`}
                        >
                            Last 3 Months
                        </button>
                    </div>

                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                    >
                        <Filter size={18} />
                        Filters
                        {(selectedDepartments.length + selectedCategories.length + selectedStatuses.length > 0) && (
                            <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {selectedDepartments.length + selectedCategories.length + selectedStatuses.length}
                            </span>
                        )}
                    </button>

                    <button
                        onClick={exportToCSV}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-all shadow-sm"
                    >
                        <Download size={18} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3 space-y-3">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Filters</h3>
                        <button onClick={() => setShowFilters(false)} className="text-gray-500 hover:text-gray-700">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Department Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Departments
                            </label>
                            <select
                                multiple
                                value={selectedDepartments}
                                onChange={(e) => setSelectedDepartments(Array.from(e.target.selectedOptions, option => option.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                size={4}
                            >
                                {data?.filters.departments.map(dept => (
                                    <option key={dept} value={dept}>{dept}</option>
                                ))}
                            </select>
                        </div>

                        {/* Category Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Categories
                            </label>
                            <select
                                multiple
                                value={selectedCategories}
                                onChange={(e) => setSelectedCategories(Array.from(e.target.selectedOptions, option => option.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                size={4}
                            >
                                {data?.filters.categories.map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        {/* Status Filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Status
                            </label>
                            <select
                                multiple
                                value={selectedStatuses}
                                onChange={(e) => setSelectedStatuses(Array.from(e.target.selectedOptions, option => option.value))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                size={4}
                            >
                                {data?.filters.statuses.map(status => (
                                    <option key={status} value={status}>{status}</option>
                                ))}
                            </select>
                        </div>

                        {/* Custom Date Range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Custom Date Range
                            </label>
                            <div className="space-y-2">
                                <input
                                    type="date"
                                    value={customStartDate}
                                    onChange={(e) => {
                                        setCustomStartDate(e.target.value);
                                        setDateRange('custom');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                                <input
                                    type="date"
                                    value={customEndDate}
                                    onChange={(e) => {
                                        setCustomEndDate(e.target.value);
                                        setDateRange('custom');
                                    }}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={clearFilters}
                            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                        >
                            Clear All Filters
                        </button>
                    </div>
                </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                <button
                    onClick={() => navigate('/fms-progress?view=all')}
                    className="bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg p-3 text-white text-left transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-300"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-xs font-medium">Total Tasks</p>
                            <p className="text-2xl font-bold mt-1">{data?.kpis.totalTasks || 0}</p>
                        </div>
                        <Package className="w-8 h-8 opacity-50" />
                    </div>
                </button>

                <button
                    onClick={() => navigate('/fms-progress?view=pending')}
                    className="bg-gradient-to-br from-gray-500 to-gray-700 rounded-xl shadow-lg p-3 text-white text-left transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-100 text-xs font-medium">Open Tasks</p>
                            <p className="text-2xl font-bold mt-1">{data?.kpis.openTasks || 0}</p>
                        </div>
                        <Clock className="w-8 h-8 opacity-50" />
                    </div>
                </button>

                <button
                    onClick={() => navigate('/fms-progress?view=in-progress')}
                    className="bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-xl shadow-lg p-3 text-white text-left transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-xs font-medium">In Progress</p>
                            <p className="text-2xl font-bold mt-1">{data?.kpis.inProgressTasks || 0}</p>
                        </div>
                        <PlayCircle className="w-8 h-8 opacity-50" />
                    </div>
                </button>

                <button
                    onClick={() => navigate('/fms-progress?view=completed')}
                    className="bg-gradient-to-br from-green-500 to-green-700 rounded-xl shadow-lg p-3 text-white text-left transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-300"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-xs font-medium">Completed</p>
                            <p className="text-2xl font-bold mt-1">{data?.kpis.completedTasks || 0}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 opacity-50" />
                    </div>
                </button>

                <button
                    onClick={() => navigate('/fms-progress?view=overdue')}
                    className="bg-gradient-to-br from-red-500 to-red-700 rounded-xl shadow-lg p-3 text-white text-left transition transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-300"
                >
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-red-100 text-xs font-medium">Overdue</p>
                            <p className="text-2xl font-bold mt-1">{data?.kpis.overdueTasks || 0}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 opacity-50" />
                    </div>
                </button>
            </div>

            {/* Project Insights */}
            {projectProgress.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:col-span-2">
                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-3 text-white">
                            <p className="text-xs uppercase tracking-wide opacity-80">Active Projects</p>
                            <div className="mt-2 flex items-end justify-between">
                                <h3 className="text-2xl font-bold">{projectSummary.totalProjects}</h3>
                                <div className="text-right">
                                    <p className="text-sm opacity-80">On Track</p>
                                    <p className="text-xl font-semibold">{projectSummary.onTrack}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Average Completion</p>
                            <div className="mt-2 flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                        <div
                                            className="absolute inset-0 rounded-full"
                                            style={{
                                                background: `conic-gradient(#4f46e5 ${projectSummary.avgCompletion}%, rgba(79,70,229,0.2) ${projectSummary.avgCompletion}% 100%)`
                                            }}
                                        ></div>
                                        <span className="relative z-10 text-xl font-bold text-indigo-600 dark:text-indigo-400">
                                            {projectSummary.avgCompletion}%
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">At Risk</p>
                                    <p className="text-xl font-semibold text-rose-500">{projectSummary.atRisk}</p>
                                    <p className="text-xs text-gray-400 mt-1">Projects with overdue steps</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-3">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Completion Snapshot</h3>
                            <span className="text-sm text-gray-500 dark:text-gray-400">{projectProgress.length} projects</span>
                        </div>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={completionTrendData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                                <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: 'var(--color-surface, #fff)',
                                        borderRadius: '0.5rem',
                                        border: '1px solid rgba(148,163,184,0.3)'
                                    }}
                                />
                                <Line type="monotone" dataKey="completion" stroke="#4f46e5" strokeWidth={3} dot={{ fill: '#4f46e5' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Department Progress Chart */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        FMS Progress by Department
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={data?.departmentStats || []} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis type="number" stroke="#6b7280" />
                            <YAxis dataKey="name" type="category" width={100} stroke="#6b7280" />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="Not Started" stackId="a" fill={STATUS_COLORS['Not Started']} />
                            <Bar dataKey="Pending" stackId="a" fill={STATUS_COLORS['Pending']} />
                            <Bar dataKey="In Progress" stackId="a" fill={STATUS_COLORS['In Progress']} />
                            <Bar dataKey="Done" stackId="a" fill={STATUS_COLORS['Done']} />
                            <Bar dataKey="Awaiting Date" stackId="a" fill={STATUS_COLORS['Awaiting Date']} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                {/* Category Distribution */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        FMS Progress by Category
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie
                                data={data?.categoryStats || []}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }: { name: string; percent: number }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={100}
                                fill="#8884d8"
                                dataKey="count"
                            >
                                {data?.categoryStats.map((_entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Status Funnel */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    FMS Status Pipeline (Steps-wise)
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                    <FunnelChart>
                        <Tooltip content={<CustomTooltip />} />
                        <Funnel
                            dataKey="count"
                            data={data?.statusFunnel || []}
                            isAnimationActive
                        >
                            {data?.statusFunnel.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status as keyof typeof STATUS_COLORS] || COLORS[index % COLORS.length]} />
                            ))}
                            <LabelList position="right" fill="#000" stroke="none" dataKey="status" />
                        </Funnel>
                    </FunnelChart>
                </ResponsiveContainer>
            </div>

            {/* Enhanced Analytics Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Task Velocity Metrics */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Task Velocity</h3>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
                            <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{taskVelocity.completionRate}%</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Completion Rate</p>
                        </div>
                        <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{taskVelocity.avgDaysToComplete}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Avg Days</p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{taskVelocity.tasksPerDay}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Tasks/Day</p>
                        </div>
                    </div>
                </div>

                {/* Department Efficiency */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Department Efficiency</h3>
                    </div>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={departmentEfficiency.slice(0, 5)}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                            <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                            <YAxis tick={{ fill: '#9ca3af', fontSize: 10 }} />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: 'var(--color-surface, #fff)',
                                    borderRadius: '0.5rem',
                                    border: '1px solid rgba(148,163,184,0.3)'
                                }}
                            />
                            <Bar dataKey="efficiency" fill="#6366f1" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Category Performance & Overdue Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Performance */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <Target className="w-5 h-5 text-indigo-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Category Performance</h3>
                    </div>
                    <div className="space-y-3">
                        {categoryPerformance.slice(0, 5).map((cat, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{cat.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">{cat.completed}/{cat.total} completed</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{cat.completionRate}%</p>
                                    {cat.overdue > 0 && (
                                        <p className="text-xs text-red-500">{cat.overdue} overdue</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Overdue Breakdown */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Overdue Analysis</h3>
                    </div>
                    <div className="space-y-4">
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">High Priority</span>
                                <span className="text-xl font-bold text-red-600">{overdueBreakdown.byPriority.high}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Normal Priority</span>
                                <span className="text-xl font-bold text-orange-600">{overdueBreakdown.byPriority.normal}</span>
                            </div>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Top Departments with Overdue</p>
                            <div className="space-y-2">
                                {overdueBreakdown.byDepartment.slice(0, 3).map((dept, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-sm">
                                        <span className="text-gray-600 dark:text-gray-400">{dept.name}</span>
                                        <span className="font-semibold text-red-600">{dept.count}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Admin-Only Analytics */}
            {isAdmin && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* User Performance Leaderboard */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Award className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performers</h3>
                        </div>
                        <div className="space-y-3">
                            {userPerformance.length > 0 ? (
                                userPerformance.map((user, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                idx === 0 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                                idx === 1 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                                idx === 2 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' :
                                                'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400'
                                            }`}>
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{user.completed}/{user.total} tasks</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-indigo-600 dark:text-indigo-400">{user.completionRate}%</p>
                                            {user.overdue > 0 && (
                                                <p className="text-xs text-red-500">{user.overdue} overdue</p>
                                            )}
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">No performance data available</p>
                            )}
                        </div>
                    </div>

                    {/* Bottleneck Analysis */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <Activity className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bottleneck Analysis</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border-l-4 border-yellow-500">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Status Bottleneck</p>
                                <p className="text-lg font-bold text-yellow-700 dark:text-yellow-400">{bottlenecks.statusBottleneck}</p>
                            </div>
                            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border-l-4 border-orange-500">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Department Bottleneck</p>
                                <p className="text-lg font-bold text-orange-700 dark:text-orange-400">{bottlenecks.departmentBottleneck}</p>
                            </div>
                            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-500">
                                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Category Bottleneck</p>
                                <p className="text-lg font-bold text-red-700 dark:text-red-400">{bottlenecks.categoryBottleneck}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Project Step Tracker */}
            {projectProgress.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Project Step Tracker</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Track the latest step for every in-flight project</p>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-rose-500"></span> At Risk
                            </span>
                            <span className="flex items-center gap-1">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span> On Track
                            </span>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                                <tr>
                                    {['Project', 'Current Step', 'Assigned To', 'Status', 'Due Date', 'Progress'].map(header => (
                                        <th
                                            key={header}
                                            className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                                        >
                                            {header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {projectProgress.map(project => (
                                    <tr key={project.projectId} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div>
                                                <p className="font-semibold text-gray-900 dark:text-white">{project.projectName}</p>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">{project.projectId}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="font-medium text-gray-900 dark:text-white">{project.currentStep?.title || 'All steps completed'}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">{project.category}</p>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                                            {project.currentStep?.assignedTo || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                    project.isOverdue
                                                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300'
                                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                }`}
                                            >
                                                {project.currentStep?.status || 'Done'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-300">
                                            {formatDate(project.currentStep?.dueDate)}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full"
                                                        style={{
                                                            width: `${project.completionPercent}%`,
                                                            backgroundColor: project.isOverdue ? '#f43f5e' : '#10b981'
                                                        }}
                                                    ></div>
                                                </div>
                                                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                                                    {project.completionPercent}%
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Detailed Task Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            Detailed FMS Task List
                            <span className="text-gray-500 dark:text-gray-400 text-sm ml-2">
                                ({filteredTasks.length} {showOnlyPending ? 'pending' : ''} tasks)
                            </span>
                        </h3>
                        {showOnlyPending && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Showing only pending tasks (Pending, Not Started, In Progress, Awaiting Date)
                            </p>
                        )}
                    </div>
                    <button
                        onClick={() => setShowOnlyPending(!showOnlyPending)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            showOnlyPending
                                ? 'bg-indigo-600 text-white shadow-lg'
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                    >
                        {showOnlyPending ? 'Show All Tasks' : 'Show Only Pending'}
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                            <tr>
                                {(['projectId', 'title', 'department', 'category', 'status', 'assignedTo', 'dueDate', 'priority'] as (keyof Task)[]).map((field) => (
                                    <th
                                        key={field}
                                        onClick={() => handleSort(field)}
                                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
                                    >
                                        <div className="flex items-center gap-1">
                                            {field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                            {sortField === field && (
                                                <ChevronDown
                                                    size={14}
                                                    className={`transform transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`}
                                                />
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                            {filteredTasks.map((task) => (
                                <tr
                                    key={task.id}
                                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                        {task.projectId}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white max-w-xs truncate">
                                        {task.title}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {task.department}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {task.category}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className="px-2 py-1 text-xs font-semibold rounded-full"
                                            style={{
                                                backgroundColor: `${STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]}20`,
                                                color: STATUS_COLORS[task.status as keyof typeof STATUS_COLORS]
                                            }}
                                        >
                                            {task.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                                        {task.assignedTo}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                        {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span
                                            className={`px-2 py-1 text-xs font-semibold rounded-full ${task.priority === 'High'
                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                                                }`}
                                        >
                                            {task.priority}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default FMSDashboard;
