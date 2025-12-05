import express from 'express';
import Project from '../models/Project.js';
import FMS from '../models/FMS.js';
import User from '../models/User.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Get FMS Dashboard Data
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, departments, categories, statuses } = req.query;

        // Build filter query - look for active projects
        const query = {
            status: { $in: ['Active', 'In Progress'] } // Only show active projects
        };

        // Date range filter - use startDate instead of createdAt for more relevant filtering
        // If date range is provided, filter projects that have tasks within that range
        // Otherwise, show all active projects
        if (startDate || endDate) {
            // We'll filter by tasks' dates instead of project creation date
            // This is handled in the aggregation below
        }

        // Category filter (from FMS reference)
        let categoryFilter = {};
        if (categories) {
            const categoriesArray = Array.isArray(categories) ? categories : [categories];
            categoryFilter = { category: { $in: categoriesArray } };
        }

        // Get all projects with populated FMS data
        let projects = await Project.find(query)
            .populate({
                path: 'fmsId',
                match: Object.keys(categoryFilter).length > 0 ? categoryFilter : {},
                select: 'fmsName category'
            })
            .populate('tasks.who', 'username department')
            .populate('createdBy', 'username department')
            .lean()
            .then(projs => {
                // Ensure tasks array exists and handle null/undefined who
                return projs.map(proj => ({
                    ...proj,
                    tasks: (proj.tasks || []).map(task => ({
                        ...task,
                        who: task.who || null
                    }))
                }));
            });

        // Filter out projects where fmsId is null (due to category filtering)
        projects = projects.filter(p => p.fmsId);

        // Apply date range filter on tasks if provided
        if (startDate || endDate) {
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;
            
            projects = projects.map(project => {
                const filteredTasks = project.tasks.filter(task => {
                    // Check if task's plannedDueDate, actualDueDate, or creationDate falls within range
                    const taskDate = task.plannedDueDate || task.actualDueDate || task.creationDate;
                    if (!taskDate) return true; // Include tasks without dates
                    
                    const taskDateObj = new Date(taskDate);
                    if (start && taskDateObj < start) return false;
                    if (end && taskDateObj > end) return false;
                    return true;
                });
                
                return {
                    ...project,
                    tasks: filteredTasks
                };
            }).filter(project => project.tasks.length > 0); // Only keep projects with tasks in date range
        }

        // Department filter (from user assignments)
        if (departments) {
            const departmentsArray = Array.isArray(departments) ? departments : [departments];
            projects = projects.filter(project => {
                return project.tasks.some(task =>
                    task.who && task.who.department && departmentsArray.includes(task.who.department)
                );
            });
        }

        // Status filter
        if (statuses) {
            const statusesArray = Array.isArray(statuses) ? statuses : [statuses];
            projects = projects.map(project => ({
                ...project,
                tasks: project.tasks.filter(task => statusesArray.includes(task.status))
            })).filter(project => project.tasks.length > 0);
        }

        // Calculate KPIs
        let totalTasks = 0;
        let openTasks = 0;
        let inProgressTasks = 0;
        let completedTasks = 0;
        let overdueTasks = 0;

        const departmentStats = {};
        const categoryStats = {};
        const statusFunnel = {
            'Not Started': 0,
            'Pending': 0,
            'In Progress': 0,
            'Done': 0,
            'Awaiting Date': 0
        };

        const now = new Date();

        projects.forEach(project => {
            // Ensure tasks is an array
            const tasks = Array.isArray(project.tasks) ? project.tasks : [];
            tasks.forEach(task => {
                totalTasks++;

                // Status counts
                if (task.status === 'Not Started') openTasks++;
                else if (task.status === 'In Progress') inProgressTasks++;
                else if (task.status === 'Done') completedTasks++;
                else if (task.status === 'Pending') openTasks++;

                // Overdue tasks
                if (task.plannedDueDate && new Date(task.plannedDueDate) < now && task.status !== 'Done') {
                    overdueTasks++;
                }

                // Status funnel
                statusFunnel[task.status] = (statusFunnel[task.status] || 0) + 1;

                // Department stats - who is a single user, not an array
                if (task.who) {
                    const dept = task.who.department || 'Unassigned';
                    if (!departmentStats[dept]) {
                        departmentStats[dept] = {
                            total: 0,
                            'Not Started': 0,
                            'Pending': 0,
                            'In Progress': 0,
                            'Done': 0,
                            'Awaiting Date': 0
                        };
                    }
                    departmentStats[dept].total++;
                    departmentStats[dept][task.status] = (departmentStats[dept][task.status] || 0) + 1;
                }

                // Category stats
                const category = project.fmsId?.category || 'Uncategorized';
                if (!categoryStats[category]) {
                    categoryStats[category] = 0;
                }
                categoryStats[category]++;
            });
        });

        // Get detailed task list
        const detailedTasks = [];
        projects.forEach(project => {
            // Ensure tasks is an array
            const tasks = Array.isArray(project.tasks) ? project.tasks : [];
            tasks.forEach(task => {
                detailedTasks.push({
                    id: task._id,
                    projectId: project.projectId,
                    projectName: project.projectName,
                    title: task.what,
                    department: task.who?.department || 'Unassigned',
                    category: project.fmsId?.category || 'Uncategorized',
                    status: task.status,
                    assignedTo: task.who?.username || 'Unassigned',
                    createdDate: task.creationDate,
                    dueDate: task.plannedDueDate,
                    priority: task.plannedDueDate && new Date(task.plannedDueDate) < now && task.status !== 'Done' ? 'High' : 'Normal'
                });
            });
        });

        // Get all available departments and categories for filters
        const allDepartments = await User.distinct('department', { department: { $ne: null } });
        const allCategories = await FMS.distinct('category');

        res.json({
            success: true,
            kpis: {
                totalTasks,
                openTasks,
                inProgressTasks,
                completedTasks,
                overdueTasks
            },
            departmentStats: Object.entries(departmentStats).map(([name, stats]) => ({
                name,
                ...stats
            })),
            categoryStats: Object.entries(categoryStats).map(([name, count]) => ({
                name,
                count
            })),
            statusFunnel: Object.entries(statusFunnel).map(([status, count]) => ({
                status,
                count
            })),
            detailedTasks,
            filters: {
                departments: allDepartments,
                categories: allCategories,
                statuses: ['Not Started', 'Pending', 'In Progress', 'Done', 'Awaiting Date']
            }
        });
    } catch (error) {
        console.error('FMS Dashboard error:', error);
        res.status(500).json({ success: false, message: 'Server error', error: error.message });
    }
});

export default router;
