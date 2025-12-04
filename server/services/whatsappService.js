import axios from 'axios';
import User from '../models/User.js';
import Settings from '../models/Settings.js';

/**
 * WhatsApp Service for sending task assignment notifications
 * Supports multiple providers (Twilio, custom API, etc.)
 */

/**
 * Get WhatsApp settings from database
 */
async function getWhatsAppSettings() {
  try {
    const settings = await Settings.findOne({ type: 'whatsapp' });
    if (!settings) {
      // Default settings
      return {
        enabled: false,
        provider: 'meta', // 'meta', 'twilio', or 'custom'
        apiUrl: process.env.WHATSAPP_API_URL || '',
        apiKey: process.env.WHATSAPP_API_KEY || '',
        templateName: 'task_assign',
        // Meta API fields
        metaPhoneNumberId: process.env.META_PHONE_NUMBER_ID || '',
        metaBusinessAccountId: process.env.META_BUSINESS_ACCOUNT_ID || '',
        metaAccessToken: process.env.META_ACCESS_TOKEN || '',
        // Twilio fields (optional)
        twilioAccountSid: '',
        twilioAuthToken: '',
        twilioWhatsAppNumber: ''
      };
    }
    return settings.data;
  } catch (error) {
    console.error('Error fetching WhatsApp settings:', error);
    return { enabled: false };
  }
}

/**
 * Format task assignment message with template variables
 */
function formatTaskMessage(template, variables) {
  let message = template;
  
  // Replace template variables {{1}}, {{2}}, etc.
  Object.keys(variables).forEach((key, index) => {
    const placeholder = `{{${index + 1}}}`;
    message = message.replace(new RegExp(placeholder, 'g'), variables[key] || '');
  });
  
  return message;
}

/**
 * Send WhatsApp message using configured provider
 */
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const settings = await getWhatsAppSettings();
    
    if (!settings.enabled) {
      console.log('WhatsApp notifications are disabled');
      return { success: false, error: 'WhatsApp notifications are disabled' };
    }

    if (!phoneNumber) {
      return { success: false, error: 'Phone number is required' };
    }

    // Clean phone number (remove spaces, ensure it starts with country code)
    const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/^\+?/, '+');

    // Use Meta API if configured
    if (settings.provider === 'meta') {
      return await sendViaMeta(cleanPhone, message, settings);
    }

    // Use Twilio if configured
    if (settings.provider === 'twilio') {
      return await sendViaTwilio(cleanPhone, message, settings);
    }
    
    // Use custom API if configured
    if (settings.provider === 'custom' && settings.apiUrl) {
      return await sendViaCustomAPI(cleanPhone, message, settings);
    }

    // Fallback: Log message (for development/testing)
    console.log('WhatsApp message (not sent - no provider configured):');
    console.log(`To: ${cleanPhone}`);
    console.log(`Message: ${message}`);
    return { success: true, message: 'Message logged (no provider configured)' };
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send via Meta WhatsApp Business API
 */
async function sendViaMeta(phoneNumber, message, settings) {
  try {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID || settings.metaPhoneNumberId;
    const accessToken = process.env.META_ACCESS_TOKEN || settings.metaAccessToken;

    if (!phoneNumberId || !accessToken) {
      throw new Error('Meta WhatsApp credentials not configured. Please provide Phone Number ID and Access Token.');
    }

    // Meta API endpoint
    const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;

    // Format phone number for Meta API (remove + and spaces, keep only digits)
    // Meta requires phone number in format: country code + number (e.g., 1234567890)
    const formattedPhone = phoneNumber.replace(/^\+/, '').replace(/\s+/g, '').replace(/[^\d]/g, '');

    // Meta API request body
    const requestBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'text',
      text: {
        body: message
      }
    };

    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout
    });

    return { success: true, messageId: response.data.messages?.[0]?.id || 'sent' };
  } catch (error) {
    console.error('Meta WhatsApp API error:', error.response?.data || error.message);
    const errorMessage = error.response?.data?.error?.message || error.message;
    return { success: false, error: errorMessage };
  }
}

/**
 * Send via Twilio WhatsApp API
 */
async function sendViaTwilio(phoneNumber, message, settings) {
  try {
    // Try to import Twilio (optional dependency)
    let twilio;
    try {
      twilio = (await import('twilio')).default;
    } catch (importError) {
      throw new Error('Twilio package not installed. Run: npm install twilio');
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID || settings.twilioAccountSid;
    const authToken = process.env.TWILIO_AUTH_TOKEN || settings.twilioAuthToken;
    const fromNumber = process.env.TWILIO_WHATSAPP_NUMBER || settings.twilioWhatsAppNumber;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    const client = twilio(accountSid, authToken);

    const result = await client.messages.create({
      from: `whatsapp:${fromNumber}`,
      to: `whatsapp:${phoneNumber}`,
      body: message
    });

    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('Twilio WhatsApp error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send via Custom HTTP API
 */
async function sendViaCustomAPI(phoneNumber, message, settings) {
  try {
    const response = await axios.post(settings.apiUrl, {
      phone: phoneNumber,
      message: message,
      template: settings.templateName || 'task_assign'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.apiKey}`
      },
      timeout: 10000 // 10 second timeout
    });

    return { success: true, response: response.data };
  } catch (error) {
    console.error('Custom WhatsApp API error:', error.response?.data || error.message);
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

/**
 * Send task assignment notification
 */
export async function sendTaskAssignmentNotification(task, assignedToUser, assignedByUser) {
  try {
    // Get WhatsApp settings
    const settings = await getWhatsAppSettings();
    
    if (!settings.enabled) {
      return { success: false, error: 'WhatsApp notifications are disabled' };
    }

    // Check if user has phone number
    if (!assignedToUser.phoneNumber) {
      return { success: false, error: 'User does not have a phone number' };
    }

    // Format task type for display
    const taskTypeMap = {
      'one-time': 'One Time',
      'daily': 'Daily',
      'weekly': 'Weekly',
      'monthly': 'Monthly',
      'quarterly': 'Quarterly',
      'yearly': 'Yearly'
    };
    const taskTypeDisplay = taskTypeMap[task.taskType] || task.taskType;

    // Format due date
    const dueDate = new Date(task.dueDate);
    const formattedDueDate = dueDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Template message
    const template = `Hi *{{1}}*

👉A new task has been assigned to you.

*{{2}}*

Task Type: *{{3}}*

Assigned By: *{{4}}*

Due Date: *{{5}}*

Please complete the task on or before the due date.

Regards 

Task Management System`;

    // Prepare variables
    const variables = {
      assignedToName: assignedToUser.username || 'User',
      taskTitle: task.title || 'New Task',
      taskType: taskTypeDisplay,
      assignedByName: assignedByUser.username || 'Admin',
      dueDate: formattedDueDate
    };

    // Format message
    const message = formatTaskMessage(template, variables);

    // Send WhatsApp message
    const result = await sendWhatsAppMessage(assignedToUser.phoneNumber, message);

    return result;
  } catch (error) {
    console.error('Error sending task assignment notification:', error);
    return { success: false, error: error.message };
  }
}

export { sendWhatsAppMessage, formatTaskMessage, getWhatsAppSettings };

