import express from 'express';
import ChecklistTemplate from '../models/ChecklistTemplate.js';
import ChecklistOccurrence from '../models/ChecklistOccurrence.js';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';
import multer from 'multer';
import csv from 'csv-parser';
import { Readable } from 'stream';

const router = express.Router();

const csvUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.toLowerCase().endsWith('.csv')) {
      return cb(null, true);
    }
    cb(new Error('Only CSV files are allowed'));
  }
});

const weekdayMap = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6
};

const parseCsvRows = async (buffer) => {
  const rows = [];
  const readable = Readable.from(buffer.toString('utf-8'));

  await new Promise((resolve, reject) => {
    readable
      .pipe(csv())
      .on('data', (row) => rows.push(row))
      .on('end', resolve)
      .on('error', reject);
  });

  return rows;
};

const normalizeWeeklyDays = (value = '') => {
  return value
    .split(/[,|]/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const numeric = Number(entry);
      if (!isNaN(numeric) && numeric >= 0 && numeric <= 6) {
        return numeric;
      }
      const mapped = weekdayMap[entry.toLowerCase()];
      return typeof mapped === 'number' ? mapped : null;
    })
    .filter((day) => day !== null);
};

const normalizeMonthlyDates = (value = '') => {
  return value
    .split(/[,|]/)
    .map((entry) => parseInt(entry.trim(), 10))
    .filter((num) => !isNaN(num) && num >= 1 && num <= 31);
};

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
        const dayOfWeek = currentDate.getDay();
        // Skip Sunday if excludeSunday is true
        if (!template.excludeSunday || dayOfWeek !== 0) {
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

    case 'fortnightly':
      // Generate occurrences every 2 weeks
      let fortnightCounter = 0;
      while (currentDate <= endDate) {
        const dayOfWeek = currentDate.getDay();
        // Skip Sunday if excludeSunday is true
        if (!template.excludeSunday || dayOfWeek !== 0) {
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
        currentDate.setDate(currentDate.getDate() + 14);
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

    case 'quarterly':
      // Generate occurrences every 3 months on the same date
      let quarterlyDate = new Date(startDate);
      while (quarterlyDate <= endDate) {
        if (quarterlyDate >= startDate && quarterlyDate <= endDate) {
          occurrences.push({
            templateId: template._id,
            templateName: template.name,
            category: template.category || 'General',
            dueDate: new Date(quarterlyDate),
            assignedTo: template.assignedTo,
            items: template.items.map(item => ({
              label: item.label,
              description: item.description,
              checked: false
            })),
            status: 'pending'
          });
        }
        quarterlyDate.setMonth(quarterlyDate.getMonth() + 3);
      }
      break;

    case 'yearly':
      // Generate occurrences every year on the same date
      let yearlyDate = new Date(startDate);
      while (yearlyDate <= endDate) {
        if (yearlyDate >= startDate && yearlyDate <= endDate) {
          occurrences.push({
            templateId: template._id,
            templateName: template.name,
            category: template.category || 'General',
            dueDate: new Date(yearlyDate),
            assignedTo: template.assignedTo,
            items: template.items.map(item => ({
              label: item.label,
              description: item.description,
              checked: false
            })),
            status: 'pending'
          });
        }
        yearlyDate.setFullYear(yearlyDate.getFullYear() + 1);
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

// Provide downloadable CSV example
router.get('/sample-csv', authenticateToken, (req, res) => {
  if (!['admin', 'superadmin'].includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'Only Admins can download the sample.' });
  }

  const sample = [
    'name,category,frequency,assignedTo,startDate,endDate,items,weeklyDays,monthlyDates',
    'Daily Site Audit,Operations,daily,john.doe,2025-01-01,2025-03-31,"Entrance Check:Doors locked|Lobby Cleanliness:No dust","",',
    'Weekly Fire Safety,Compliance,weekly,jane.smith,2025-01-01,2025-03-31,"Extinguisher Pressure|Alarm Test",Mon|Thu,',
    'Monthly Asset Review,Finance,monthly,super.admin,2025-01-01,2025-06-30,"Verify Asset Tag|Capture Photos","",1|15'
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="checklist_import_sample.csv"');
  return res.send(sample);
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

    if (!['daily', 'weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly'].includes(templateData.frequency)) {
      return res.status(400).json({
        error: 'Invalid frequency. Must be daily, weekly, fortnightly, monthly, quarterly, or yearly'
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

    // Handle FMS configuration if provided
    if (templateData.fmsConfiguration && templateData.fmsConfiguration.enabled && templateData.fmsConfiguration.fmsId) {
      const FMS = (await import('../models/FMS.js')).default;
      const fms = await FMS.findById(templateData.fmsConfiguration.fmsId);
      if (!fms) {
        return res.status(404).json({
          error: 'FMS template not found'
        });
      }
      templateData.fmsConfiguration.fmsName = fms.fmsName;
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

// Bulk import checklist templates via CSV
router.post('/import', authenticateToken, csvUpload.single('file'), async (req, res) => {
  try {
    if (!['admin', 'superadmin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only Admins can import checklists.' });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'CSV file is required.' });
    }

    const rows = await parseCsvRows(req.file.buffer);
    if (!rows.length) {
      return res.status(400).json({ success: false, message: 'Uploaded file is empty.' });
    }

    const importSummary = [];
    const importErrors = [];

    for (const [index, row] of rows.entries()) {
      try {
        const name = row.name?.trim();
        if (!name) throw new Error('Checklist name is required.');

        const assignedIdentifier = row.assignedTo?.trim();
        if (!assignedIdentifier) throw new Error('assignedTo column is required (username or email).');

        const assignee = await User.findOne({
          $or: [{ username: assignedIdentifier }, { email: assignedIdentifier }]
        });

        if (!assignee) throw new Error(`Unable to find user "${assignedIdentifier}".`);

        const frequency = (row.frequency || 'daily').toLowerCase();
        if (!['daily', 'weekly', 'monthly'].includes(frequency)) {
          throw new Error('frequency must be daily, weekly, or monthly.');
        }

        const startDate = row.startDate ? new Date(row.startDate) : new Date();
        const endDate = row.endDate ? new Date(row.endDate) : new Date(startDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          throw new Error('Invalid startDate or endDate.');
        }

        if (startDate > endDate) {
          throw new Error('startDate must be before endDate.');
        }

        const parsedItems = (row.items || '')
          .split('|')
          .map((item, itemIndex) => {
            const [label, description] = item.split(':');
            return {
              label: (label || `Item ${itemIndex + 1}`).trim(),
              description: (description || '').trim()
            };
          })
          .filter((item) => item.label);

        if (parsedItems.length === 0) {
          throw new Error('Each row must contain at least one item separated by "|".');
        }

        const templatePayload = {
          name,
          category: row.category?.trim() || 'General',
          frequency,
          assignedTo: assignee._id,
          createdBy: req.user._id,
          items: parsedItems,
          dateRange: {
            startDate,
            endDate
          },
          weeklyDays: [],
          monthlyDates: []
        };

        if (frequency === 'weekly') {
          const weeklyDays = normalizeWeeklyDays(row.weeklyDays || row.weekdays || '');
          if (!weeklyDays.length) {
            throw new Error('weeklyDays column is required for weekly frequency.');
          }
          templatePayload.weeklyDays = weeklyDays;
        }

        if (frequency === 'monthly') {
          const monthlyDates = normalizeMonthlyDates(row.monthlyDates || '');
          if (!monthlyDates.length) {
            throw new Error('monthlyDates column is required for monthly frequency.');
          }
          templatePayload.monthlyDates = monthlyDates;
        }

        const template = new ChecklistTemplate(templatePayload);
        await template.save();
        const occurrenceCount = await generateOccurrences(template);

        importSummary.push({
          name: template.name,
          occurrences: occurrenceCount
        });
      } catch (error) {
        importErrors.push({
          row: index + 2, // considering header row
          message: error.message || 'Unknown error'
        });
      }
    }

    res.json({
      success: true,
      imported: importSummary.length,
      failed: importErrors.length,
      details: importSummary,
      errors: importErrors
    });
  } catch (error) {
    console.error('Checklist import error:', error);
    res.status(500).json({ success: false, message: 'Failed to import checklists.', error: error.message });
  }
});

// Configure FMS for checklist template (Superadmin only)
router.put('/:id/fms-config', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only Super Admins can configure FMS for checklists' });
    }

    const { enabled, fmsId, triggerOnSubmission } = req.body;
    const template = await ChecklistTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    // If enabling FMS, validate FMS exists
    if (enabled && fmsId) {
      const FMS = (await import('../models/FMS.js')).default;
      const fms = await FMS.findById(fmsId);
      if (!fms) {
        return res.status(404).json({ error: 'FMS template not found' });
      }

      template.fmsConfiguration = {
        enabled: true,
        fmsId: fms._id,
        fmsName: fms.fmsName,
        triggerOnSubmission: triggerOnSubmission !== false // Default to true
      };
    } else {
      // Disable FMS configuration
      template.fmsConfiguration = {
        enabled: false,
        fmsId: null,
        fmsName: null,
        triggerOnSubmission: false
      };
    }

    await template.save();
    await template.populate('assignedTo createdBy');

    res.json({
      template,
      message: enabled ? 'FMS configuration updated successfully' : 'FMS configuration disabled'
    });
  } catch (error) {
    console.error('Error configuring FMS for checklist template:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Get available FMS templates for configuration (Superadmin only)
router.get('/fms/available', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Only Super Admins can view FMS templates' });
    }

    const FMS = (await import('../models/FMS.js')).default;
    const fmsList = await FMS.find({ status: 'Active' })
      .select('_id fmsId fmsName category steps')
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({ fmsList });
  } catch (error) {
    console.error('Error fetching FMS templates:', error);
    res.status(500).json({ error: 'Server error', message: error.message });
  }
});

// Download sample CSV
export default router;

