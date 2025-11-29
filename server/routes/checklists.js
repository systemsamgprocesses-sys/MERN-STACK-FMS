import express from 'express';
import mongoose from 'mongoose';
import auth from '../middleware/auth.js';
import ChecklistOccurrence from '../models/ChecklistOccurrence.js';
import ChecklistTemplate from '../models/ChecklistTemplate.js';

const router = express.Router();

// Get all checklists (occurrences) for logged-in user
router.get('/', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const { status, priority, dueDate } = req.query;

        // Build filter - Admin, Superadmin, and PC roles can see all checklists
        const filter = {};

        // Only filter by assignedTo if user is NOT an admin, superadmin, or PC
        if (!['admin', 'superadmin', 'pc'].includes(userRole)) {
            filter.assignedTo = userId;
        }

        if (status) {
            filter.status = status;
        }

        if (priority) {
            filter.priority = priority;
        }

        if (dueDate) {
            const targetDate = new Date(dueDate);
            const nextDay = new Date(targetDate);
            nextDay.setDate(nextDay.getDate() + 1);
            filter.dueDate = {
                $gte: targetDate,
                $lt: nextDay
            };
        }

        const checklists = await ChecklistOccurrence.find(filter)
            .populate('templateId', 'name description category')
            .populate('assignedBy', 'username email')
            .populate('assignedTo', 'username email')
            .sort({ dueDate: 1 });

        res.json(checklists);
    } catch (error) {
        console.error('Error fetching checklists:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get pending checklists for logged-in user
router.get('/pending', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Build filter - Admin, Superadmin, and PC roles can see all pending checklists
        const filter = {
            status: { $in: ['pending', 'in-progress'] },
            dueDate: { $lte: today }
        };

        // Only filter by assignedTo if user is NOT an admin, superadmin, or PC
        if (!['admin', 'superadmin', 'pc'].includes(userRole)) {
            filter.assignedTo = userId;
        }

        const pendingChecklists = await ChecklistOccurrence.find(filter)
            .populate('templateId', 'name description category')
            .populate('assignedBy', 'username email')
            .populate('assignedTo', 'username email')
            .sort({ dueDate: 1 });

        res.json(pendingChecklists);
    } catch (error) {
        console.error('Error fetching pending checklists:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get upcoming checklists for logged-in user
router.get('/upcoming', auth, async (req, res) => {
    try {
        const userId = req.user._id;
        const userRole = req.user.role;
        const today = new Date();
        today.setHours(23, 59, 59, 999);

        // Build filter - Admin, Superadmin, and PC roles can see all upcoming checklists
        const filter = {
            status: { $in: ['pending', 'in-progress'] },
            dueDate: { $gt: today }
        };

        // Only filter by assignedTo if user is NOT an admin, superadmin, or PC
        if (!['admin', 'superadmin', 'pc'].includes(userRole)) {
            filter.assignedTo = userId;
        }

        const upcomingChecklists = await ChecklistOccurrence.find(filter)
            .populate('templateId', 'name description category')
            .populate('assignedBy', 'username email')
            .populate('assignedTo', 'username email')
            .sort({ dueDate: 1 });

        res.json(upcomingChecklists);
    } catch (error) {
        console.error('Error fetching upcoming checklists:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get dashboard statistics
router.get('/dashboard', auth, async (req, res) => {
    try {
        const { assignedTo, role, userId } = req.query;
        const requestingUser = req.user;
        const requestingUserId = requestingUser?._id?.toString();
        const userRole = requestingUser?.role;
        
        // Determine if user can see all checklists (admin, superadmin, pc)
        const canSeeAll = ['admin', 'superadmin', 'pc'].includes(userRole);
        
        // Build base filter
        let filter = {};
        
        // If assignedTo is provided and user has permission, use it
        if (assignedTo) {
            // Only allow filtering by assignedTo if user can see all OR it's their own ID
            if (canSeeAll || assignedTo === requestingUserId) {
                filter.assignedTo = assignedTo;
            } else {
                // Employee trying to see someone else's data - deny access
                return res.status(403).json({ message: 'Access denied' });
            }
        } else if (!canSeeAll) {
            // Employee without assignedTo filter - show only their own
            filter.assignedTo = requestingUserId;
        }
        // If canSeeAll and no assignedTo, filter is empty (show all)

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get all checklists matching the filter
        // Use lean() for better performance and to avoid Mongoose document issues
        const allChecklists = await ChecklistOccurrence.find(filter)
            .populate('templateId', 'name category frequency')
            .populate('assignedTo', 'username email')
            .lean()
            .sort({ dueDate: -1 });

        // Calculate statistics with safe null checks
        const total = allChecklists.length;
        const completed = allChecklists.filter(c => c && c.status === 'completed').length;
        const pending = allChecklists.filter(c => c && c.status === 'pending').length;
        const overdue = allChecklists.filter(c => {
            if (!c) return false;
            if (c.status === 'completed') return false;
            if (!c.dueDate) return false;
            try {
                const dueDate = new Date(c.dueDate);
                return dueDate < today;
            } catch (e) {
                return false;
            }
        }).length;

        // Group by recurrence (from template or default to 'none')
        const byRecurrence = {};
        allChecklists.forEach(checklist => {
            if (!checklist) return;
            try {
                const template = checklist.templateId;
                let recurrenceType = 'none';
                if (template && typeof template === 'object' && template.frequency) {
                    recurrenceType = template.frequency;
                } else if (checklist.category) {
                    recurrenceType = checklist.category;
                }
                byRecurrence[recurrenceType] = (byRecurrence[recurrenceType] || 0) + 1;
            } catch (e) {
                byRecurrence['none'] = (byRecurrence['none'] || 0) + 1;
            }
        });

        // Group by category (use denormalized category field or template category)
        const byCategory = {};
        allChecklists.forEach(checklist => {
            if (!checklist) return;
            try {
                const template = checklist.templateId;
                const category = checklist.category || 
                               (template && typeof template === 'object' ? template.category : null) || 
                               'General';
                byCategory[category] = (byCategory[category] || 0) + 1;
            } catch (e) {
                byCategory['General'] = (byCategory['General'] || 0) + 1;
            }
        });

        // Group by department (use category as fallback since template doesn't have department)
        const byDepartment = {};
        allChecklists.forEach(checklist => {
            if (!checklist) return;
            try {
                const template = checklist.templateId;
                const category = checklist.category || 
                               (template && typeof template === 'object' ? template.category : null) || 
                               'General';
                // Use category as department since template doesn't have department field
                byDepartment[category] = (byDepartment[category] || 0) + 1;
            } catch (e) {
                byDepartment['General'] = (byDepartment['General'] || 0) + 1;
            }
        });

        // Today's submissions by category
        const todayByCategory = {};
        const todayChecklists = allChecklists.filter(c => {
            if (!c) return false;
            if (!c.updatedAt && !c.createdAt) return false;
            try {
                const updatedAt = new Date(c.updatedAt || c.createdAt);
                return updatedAt >= today && updatedAt < tomorrow;
            } catch (e) {
                return false;
            }
        });
        todayChecklists.forEach(checklist => {
            if (!checklist) return;
            try {
                const template = checklist.templateId;
                const category = checklist.category || 
                               (template && typeof template === 'object' ? template.category : null) || 
                               'General';
                todayByCategory[category] = (todayByCategory[category] || 0) + 1;
            } catch (e) {
                // Skip invalid entries
            }
        });

        // Today's submissions by frequency
        const todayByFrequency = {};
        todayChecklists.forEach(checklist => {
            if (!checklist) return;
            try {
                const template = checklist.templateId;
                const frequency = (template && typeof template === 'object' ? template.frequency : null) || 'none';
                todayByFrequency[frequency] = (todayByFrequency[frequency] || 0) + 1;
            } catch (e) {
                // Skip invalid entries
            }
        });

        // Recent submissions (last 30 days, limit to 50)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const recentSubmissions = allChecklists
            .filter(c => {
                if (!c) return false;
                if (!c.updatedAt && !c.createdAt) return false;
                try {
                    const updatedAt = new Date(c.updatedAt || c.createdAt);
                    return updatedAt >= thirtyDaysAgo;
                } catch (e) {
                    return false;
                }
            })
            .slice(0, 50)
            .map(checklist => {
                try {
                    const items = checklist.items || [];
                    const totalItems = items.length;
                    const itemsSubmitted = items.filter((item) => item && item.checked).length;
                    const template = checklist.templateId;
                    
                    return {
                        _id: checklist._id ? checklist._id.toString() : Math.random().toString(),
                        title: checklist.templateName || 
                              (template && typeof template === 'object' ? template.name : null) || 
                              'Untitled Checklist',
                        updatedAt: checklist.updatedAt || checklist.createdAt || new Date(),
                        status: checklist.status || 'pending',
                        totalItems,
                        itemsSubmitted,
                        itemsPercentage: totalItems > 0 ? Math.round((itemsSubmitted / totalItems) * 100) : 0,
                        category: checklist.category || 
                                 (template && typeof template === 'object' ? template.category : null) || 
                                 'General',
                        recurrence: (template && typeof template === 'object' && template.frequency) ? 
                                   { type: template.frequency } : undefined,
                        items: items.map((item) => ({
                            _id: (item && item._id) ? item._id.toString() : Math.random().toString(),
                            title: (item && item.label) || 'Untitled Item',
                            isDone: (item && item.checked) || false
                        }))
                    };
                } catch (e) {
                    // Return a safe default if mapping fails
                    return {
                        _id: checklist._id ? checklist._id.toString() : Math.random().toString(),
                        title: 'Untitled Checklist',
                        updatedAt: new Date(),
                        status: 'pending',
                        totalItems: 0,
                        itemsSubmitted: 0,
                        itemsPercentage: 0,
                        category: 'General',
                        items: []
                    };
                }
            });

        res.json({
            total,
            completed,
            pending,
            overdue,
            byRecurrence,
            byCategory,
            byDepartment,
            todayByCategory,
            todayByFrequency,
            recentSubmissions
        });
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            message: 'Server error', 
            error: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
});

// Get calendar data for a specific month
router.get('/calendar', auth, async (req, res) => {
    try {
        const { year, month, userId } = req.query;
        const requestingUser = req.user;
        const requestingUserId = requestingUser?._id?.toString();
        const userRole = requestingUser?.role;
        
        // Determine if user can see all checklists (admin, superadmin, pc)
        const canSeeAll = ['admin', 'superadmin', 'pc'].includes(userRole);
        
        if (!year || !month) {
            return res.status(400).json({
                error: 'year and month are required'
            });
        }

        const targetYear = parseInt(year);
        const targetMonth = parseInt(month); // 0-based (0 = January)

        if (Number.isNaN(targetYear) || Number.isNaN(targetMonth) || targetMonth < 0 || targetMonth > 11) {
            return res.status(400).json({
                error: 'Invalid year or month'
            });
        }

        // Build filter based on user permissions
        let filter = {};
        
        // If userId is provided and user has permission, use it
        if (userId) {
            if (canSeeAll || userId === requestingUserId) {
                filter.assignedTo = userId;
            } else {
                // Employee trying to see someone else's data - deny access
                return res.status(403).json({
                    error: 'Access denied'
                });
            }
        } else if (!canSeeAll) {
            // Employee without userId filter - show only their own
            filter.assignedTo = requestingUserId;
        }
        // If canSeeAll and no userId, filter is empty (show all)

        // Get first and last day of the month
        const firstDay = new Date(targetYear, targetMonth, 1);
        const lastDay = new Date(targetYear, targetMonth + 1, 0, 23, 59, 59, 999);

        // Add date range to filter
        filter.dueDate = {
            $gte: firstDay,
            $lte: lastDay
        };

        // Fetch all checklists (occurrences) for this user/role in this month
        const occurrences = await ChecklistOccurrence.find(filter)
            .populate('templateId', 'name category frequency')
            .populate('assignedTo', 'username email')
            .sort({ dueDate: 1 });

        // Group occurrences by date and calculate levels
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const calendar = [];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(targetYear, targetMonth, day);
            const dateString = date.toISOString().split('T')[0];

            // Find all occurrences for this day
            const dayOccurrences = occurrences.filter(occ => {
                if (!occ || !occ.dueDate) return false;
                try {
                    const occDate = new Date(occ.dueDate);
                    return occDate.getDate() === day &&
                        occDate.getMonth() === targetMonth &&
                        occDate.getFullYear() === targetYear;
                } catch (e) {
                    return false;
                }
            });

            const total = dayOccurrences.length;
            const completed = dayOccurrences.filter(occ => occ && occ.status === 'completed').length;
            
            // Calculate level (0-4) based on completion percentage
            // Similar to GitHub contribution graph
            let level = 0;
            if (total > 0) {
                const completionPercentage = completed / total;
                if (completionPercentage === 1.0) {
                    level = 4; // All completed
                } else if (completionPercentage >= 0.75) {
                    level = 3; // Mostly completed
                } else if (completionPercentage >= 0.50) {
                    level = 2; // Half completed
                } else if (completionPercentage > 0) {
                    level = 1; // Some completed
                } else {
                    level = 0; // None completed
                }
            }

            calendar.push({
                date: dateString,
                checklists: dayOccurrences.map(occ => ({
                    _id: occ._id,
                    title: occ.templateName || (occ.templateId && typeof occ.templateId === 'object' ? occ.templateId.name : null) || 'Untitled',
                    status: occ.status || 'pending',
                    completed: occ.status === 'completed'
                })),
                completed,
                total,
                level
            });
        }

        res.json({
            year: targetYear,
            month: targetMonth,
            calendar
        });
    } catch (error) {
        console.error('Error fetching calendar data:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            error: 'Server error', 
            message: error.message,
            stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
        });
    }
});

// Get a specific checklist by ID
router.get('/:id', auth, async (req, res) => {
    try {
        const checklist = await ChecklistOccurrence.findById(req.params.id)
            .populate('templateId', 'name description category items')
            .populate('assignedBy', 'username email')
            .populate('assignedTo', 'username email');

        if (!checklist) {
            return res.status(404).json({ message: 'Checklist not found' });
        }

        // Check if user has access to this checklist
        if (
            checklist.assignedTo._id.toString() !== req.user._id.toString() &&
            req.user.role !== 'admin' &&
            req.user.role !== 'superadmin'
        ) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(checklist);
    } catch (error) {
        console.error('Error fetching checklist:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update checklist status or progress
router.patch('/:id', auth, async (req, res) => {
    try {
        const { status, itemStatuses, completedItems, notes } = req.body;
        const checklist = await ChecklistOccurrence.findById(req.params.id);

        if (!checklist) {
            return res.status(404).json({ message: 'Checklist not found' });
        }

        // Check if user has access to update this checklist
        if (
            checklist.assignedTo.toString() !== req.user._id.toString() &&
            req.user.role !== 'admin' &&
            req.user.role !== 'superadmin'
        ) {
            return res.status(403).json({ message: 'Access denied' });
        }

        if (status) {
            checklist.status = status;
        }

        if (itemStatuses) {
            checklist.itemStatuses = itemStatuses;
        }

        if (completedItems !== undefined) {
            checklist.completedItems = completedItems;
        }

        if (notes) {
            checklist.notes = notes;
        }

        if (status === 'completed') {
            checklist.completedAt = new Date();
        }

        await checklist.save();

        const updatedChecklist = await ChecklistOccurrence.findById(req.params.id)
            .populate('templateId', 'name description category')
            .populate('assignedBy', 'username email')
            .populate('assignedTo', 'username email');

        res.json(updatedChecklist);
    } catch (error) {
        console.error('Error updating checklist:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete a checklist (Super Admin only)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ message: 'Only Super Admins can delete checklists' });
        }

        const checklist = await ChecklistOccurrence.findByIdAndDelete(req.params.id);

        if (!checklist) {
            return res.status(404).json({ message: 'Checklist not found' });
        }

        res.json({ message: 'Checklist deleted successfully' });
    } catch (error) {
        console.error('Error deleting checklist:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
