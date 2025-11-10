import express from 'express';
import FMS from '../models/FMS.js';
import mongoose from 'mongoose';

const router = express.Router();

// Get all FMS templates with category support
router.get('/', async (req, res) => {
  try {
    const { userId, isAdmin, category } = req.query;
    const query = {};

    // If not admin, only show active templates
    if (isAdmin !== 'true') {
      query.status = 'Active';
    }

    // Filter by category if specified
    if (category) {
      query.category = category;
    }

    const fmsList = await FMS.find(query)
      .populate('createdBy', 'username')
      .populate('steps.who', 'username')
      .sort({ createdAt: -1 });

    // Calculate total time for each FMS
    const formattedFMSList = fmsList.map(fms => {
      const totalTime = fms.steps.reduce((acc, step) => {
        let timeInHours = 0;
        if (step.whenUnit === 'days') {
          timeInHours = step.when * 24;
        } else if (step.whenUnit === 'hours') {
          timeInHours = step.when;
        } else if (step.whenUnit === 'days+hours') {
          timeInHours = (step.whenDays || 0) * 24 + (step.whenHours || 0);
        }
        return acc + timeInHours;
      }, 0);

      // Format total time
      const days = Math.floor(totalTime / 24);
      const hours = totalTime % 24;
      const totalTimeFormatted = `${days > 0 ? `${days}d ` : ''}${hours > 0 ? `${hours}h` : ''}`.trim();

      return {
        _id: fms._id,
        fmsId: fms.fmsId,
        fmsName: fms.fmsName,
        category: fms.category || 'Uncategorized',
        stepCount: fms.steps.length,
        createdBy: fms.createdBy.username,
        createdOn: fms.createdAt,
        totalTimeFormatted,
        steps: fms.steps
      };
    });

    res.json({
      success: true,
      fmsList: formattedFMSList
    });
  } catch (error) {
    console.error('Error fetching FMS templates:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Update FMS category (Admin/Superadmin only)
router.put('/:id/category', async (req, res) => {
  try {
    const { category } = req.body;
    if (!category) {
      return res.status(400).json({ success: false, message: 'Category is required' });
    }

    const fms = await FMS.findByIdAndUpdate(
      req.params.id,
      { category },
      { new: true }
    );

    if (!fms) {
      return res.status(404).json({ success: false, message: 'FMS template not found' });
    }

    res.json({
      success: true,
      fms
    });
  } catch (error) {
    console.error('Error updating FMS category:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

// Get available categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await FMS.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $project: {
          name: { $ifNull: ['$_id', 'Uncategorized'] },
          count: 1,
          _id: 0
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);

    res.json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
});

export default router;