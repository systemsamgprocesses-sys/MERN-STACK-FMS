import express from 'express';
import Settings from '../models/Settings.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Super admin check middleware
const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'superadmin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Super admin only.' });
  }
};

// Get task completion settings
router.get('/task-completion', async (req, res) => {
  try {
    let settings = await Settings.findOne({ type: 'taskCompletion' });
    
    if (!settings) {
      // Create default settings if none exist
      settings = new Settings({
        type: 'taskCompletion',
        data: {
          pendingTasks: {
            allowAttachments: false,
            mandatoryAttachments: false,
            mandatoryRemarks: false,
          },
          pendingRecurringTasks: {
            allowAttachments: false,
            mandatoryAttachments: false,
            mandatoryRemarks: false,
          }
        }
      });
      await settings.save();
    }

    res.json(settings.data);
  } catch (error) {
    console.error('Error fetching task completion settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save task completion settings
router.post('/task-completion', async (req, res) => {
  try {
    const settingsData = req.body;

    let settings = await Settings.findOne({ type: 'taskCompletion' });
    
    if (settings) {
      settings.data = settingsData;
      settings.updatedAt = new Date();
    } else {
      settings = new Settings({
        type: 'taskCompletion',
        data: settingsData
      });
    }

    await settings.save();
    res.json({ message: 'Settings saved successfully', data: settings.data });
  } catch (error) {
    console.error('Error saving task completion settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get WhatsApp settings (Super Admin only)
router.get('/whatsapp', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    let settings = await Settings.findOne({ type: 'whatsapp' });
    
    if (!settings) {
      // Create default settings if none exist
      settings = new Settings({
        type: 'whatsapp',
        data: {
          enabled: false,
          provider: 'meta', // 'meta', 'twilio', or 'custom'
          apiUrl: '',
          apiKey: '',
          templateName: 'task_assign',
          // Meta API fields
          metaPhoneNumberId: '',
          metaBusinessAccountId: '',
          metaAccessToken: '',
          // Twilio specific (optional)
          twilioAccountSid: '',
          twilioAuthToken: '',
          twilioWhatsAppNumber: ''
        }
      });
      await settings.save();
    }

    res.json(settings.data);
  } catch (error) {
    console.error('Error fetching WhatsApp settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Save WhatsApp settings (Super Admin only)
router.post('/whatsapp', authenticateToken, isSuperAdmin, async (req, res) => {
  try {
    const settingsData = req.body;

    let settings = await Settings.findOne({ type: 'whatsapp' });
    
    if (settings) {
      settings.data = settingsData;
      settings.updatedAt = new Date();
    } else {
      settings = new Settings({
        type: 'whatsapp',
        data: settingsData
      });
    }

    await settings.save();
    res.json({ message: 'WhatsApp settings saved successfully', data: settings.data });
  } catch (error) {
    console.error('Error saving WhatsApp settings:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;