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

        // Build filter - PC role can see all checklists
        const filter = {};

        // Only filter by assignedTo if user is NOT a PC
        if (userRole !== 'pc') {
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

        // Build filter - PC role can see all pending checklists
        const filter = {
            status: { $in: ['pending', 'in-progress'] },
            dueDate: { $lte: today }
        };

        // Only filter by assignedTo if user is NOT a PC
        if (userRole !== 'pc') {
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

        // Build filter - PC role can see all upcoming checklists
        const filter = {
            status: { $in: ['pending', 'in-progress'] },
            dueDate: { $gt: today }
        };

        // Only filter by assignedTo if user is NOT a PC
        if (userRole !== 'pc') {
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
