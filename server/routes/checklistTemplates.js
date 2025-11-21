import express from 'express';
import ChecklistTemplate from '../models/ChecklistTemplate.js';
import ChecklistOccurrence from '../models/ChecklistOccurrence.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Helper function to generate occurrences based on frequency and date range
async function generateOccurrences(template) {
  const occurrences = [];
  const startDate = new Date(template.dateRange.startDate);
  const endDate = new Date(template.dateRange.endDate);

  // Normalize to start of day
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  const currentDate = new Date(startDate);

  switch (template.frequency) {
    case 'daily':
      // Generate one occurrence for each day
      while (currentDate <= endDate) {
        occurrences.push({
          templateId: template._id,
          templateName: template.name,
          category: template.category || 'General',
          dueDate: new Date(currentDate),
          assignedTo: template.assignedTo,
          items: template.items.map(item => ({
            label: item.label,
            description: item.description,
            checked: false
          })),
          status: 'pending'
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;

    case 'weekly':
      // Generate occurrences for selected weekdays
      if (!template.weeklyDays || template.weeklyDays.length === 0) {
        throw new Error('Weekly frequency requires weeklyDays to be specified');
      }

      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        if (template.weeklyDays.includes(dayOfWeek)) {
          occurrences.push({
            templateId: template._id,
            templateName: template.name,
            category: template.category || 'General',
            dueDate: new Date(currentDate),
            assignedTo: template.assignedTo,
            items: template.items.map(item => ({
              label: item.label,
              description: item.description,
              checked: false
            })),
            status: 'pending'
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }
      break;

    case 'monthly':
      // Generate occurrences for selected dates of each month
      if (!template.monthlyDates || template.monthlyDates.length === 0) {
        throw new Error('Monthly frequency requires monthlyDates to be specified');
      }

      const monthStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
      const monthEnd = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0);

      let currentMonth = new Date(monthStart);

      while (currentMonth <= monthEnd) {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        for (const dateNum of template.monthlyDates) {
          if (dateNum <= daysInMonth) {
            const occurrenceDate = new Date(year, month, dateNum);

            // Only include if within the specified date range
            if (occurrenceDate >= startDate && occurrenceDate <= endDate) {
              occurrences.push({
                templateId: template._id,
                templateName: template.name,
                category: template.category || 'General',
                dueDate: new Date(occurrenceDate),
                assignedTo: template.assignedTo,
                items: template.items.map(item => ({
                  label: item.label,
                  description: item.description,
                  checked: false
                })),
                status: 'pending'
              });
            }
          }
        }

        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
      break;
  }

  // Delete existing occurrences for this template (if regenerating)
  await ChecklistOccurrence.deleteMany({ templateId: template._id });

  // Bulk insert all occurrences
  if (occurrences.length > 0) {
    await ChecklistOccurrence.insertMany(occurrences);
  }

  return occurrences.length;
}

// Get all checklist templates
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { status, assignedTo } = req.query;

    let query = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    const templates = await ChecklistTemplate.find(query)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email')
      .sort({ createdAt: -1 });

    res.json(templates);
  } catch (error) {
    console.error('Error fetching checklist templates:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get template by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await ChecklistTemplate.findById(req.params.id)
      .populate('assignedTo', 'username email')
      .populate('createdBy', 'username email');

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Get occurrence count
    const occurrenceCount = await ChecklistOccurrence.countDocuments({
      templateId: template._id
    });

    res.json({ ...template.toObject(), occurrenceCount });
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Create checklist template and generate occurrences
router.post('/', authenticateToken, async (req, res) => {
  try {
    const templateData = req.body;

    // Comprehensive validation
    if (!templateData.name || !templateData.name.trim()) {
      return res.status(400).json({
        error: 'Template name is required'
      });
    }

    if (!templateData.assignedTo) {
      return res.status(400).json({
        error: 'Assigned user is required'
      });
    }

    if (!templateData.createdBy) {
      return res.status(400).json({
        error: 'Creator information is required'
      });
    }

    if (!templateData.items || templateData.items.length === 0) {
      return res.status(400).json({
        error: 'At least one checklist item is required'
      });
    }

    // Validate items structure
    for (let i = 0; i < templateData.items.length; i++) {
      const item = templateData.items[i];
      if (!item.label || !item.label.trim()) {
        return res.status(400).json({
          error: `Item ${i + 1} must have a label`
        });
      }
    }

    if (!templateData.frequency) {
      return res.status(400).json({
        error: 'Frequency is required'
      });
    }

    if (!['daily', 'weekly', 'monthly'].includes(templateData.frequency)) {
      return res.status(400).json({
        error: 'Invalid frequency. Must be daily, weekly, or monthly'
      });
    }

    // Validate frequency-specific fields
    if (templateData.frequency === 'weekly') {
      if (!templateData.weeklyDays || templateData.weeklyDays.length === 0) {
        return res.status(400).json({
          error: 'Weekly frequency requires at least one weekday to be selected'
        });
      }
    }

    if (templateData.frequency === 'monthly') {
      if (!templateData.monthlyDates || templateData.monthlyDates.length === 0) {
        return res.status(400).json({
          error: 'Monthly frequency requires at least one date to be selected'
        });
      }
    }

    // Validate date range
    if (!templateData.dateRange || !templateData.dateRange.startDate || !templateData.dateRange.endDate) {
      return res.status(400).json({
        error: 'Start date and end date are required'
      });
    }

    const startDate = new Date(templateData.dateRange.startDate);
    const endDate = new Date(templateData.dateRange.endDate);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format'
      });
    }

    if (startDate > endDate) {
      return res.status(400).json({
        error: 'Start date must be before or equal to end date'
      });
    }

    // Create template
    const template = new ChecklistTemplate(templateData);
    await template.save();

    // Generate occurrences
    const occurrenceCount = await generateOccurrences(template);

    await template.populate('assignedTo createdBy');

    res.json({
      template,
      occurrenceCount,
      message: `Template created successfully with ${occurrenceCount} occurrences`
    });
  } catch (error) {
    console.error('Error creating checklist template:', error);
    console.error('Error stack:', error.stack);
    console.error('Request body:', req.body);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Update checklist template
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await ChecklistTemplate.findByIdAndUpdate(
      req.params.id,
      { ...req.body, updatedAt: new Date() },
      { new: true, runValidators: true }
    ).populate('assignedTo createdBy');

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Regenerate occurrences
    const occurrenceCount = await generateOccurrences(template);

    res.json({
      template,
      occurrenceCount,
      message: `Template updated successfully. Regenerated ${occurrenceCount} occurrences`
    });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Delete checklist template (and all its occurrences)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const template = await ChecklistTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // Delete all occurrences
    const deleteResult = await ChecklistOccurrence.deleteMany({
      templateId: req.params.id
    });

    res.json({
      success: true,
      message: `Template deleted along with ${deleteResult.deletedCount} occurrences`
    });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Regenerate occurrences for a template
router.post('/:id/regenerate', authenticateToken, async (req, res) => {
  try {
    const template = await ChecklistTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const occurrenceCount = await generateOccurrences(template);

    res.json({
      success: true,
      occurrenceCount,
      message: `Regenerated ${occurrenceCount} occurrences`
    });
  } catch (error) {
    console.error('Error regenerating occurrences:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

export default router;

