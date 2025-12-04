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
  // variables can be an array or object
  if (Array.isArray(variables)) {
    // If array, use index directly
    variables.forEach((value, index) => {
      const placeholder = `{{${index + 1}}}`;
      // Escape curly braces in regex
      const escapedPlaceholder = placeholder.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
      message = message.replace(new RegExp(escapedPlaceholder, 'g'), value || '');
    });
  } else {
    // If object, use keys in order (for backward compatibility)
    Object.keys(variables).forEach((key, index) => {
      const placeholder = `{{${index + 1}}}`;
      // Escape curly braces in regex
      const escapedPlaceholder = placeholder.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
      message = message.replace(new RegExp(escapedPlaceholder, 'g'), variables[key] || '');
    });
  }
  
  return message;
}

/**
 * Send WhatsApp template message using Meta API
 */
async function sendWhatsAppTemplateMessage(phoneNumber, templateParams, settings) {
  try {
    const settingsData = await getWhatsAppSettings();
    
    if (!settingsData.enabled) {
      console.log('📱 [WhatsApp] Notifications are disabled');
      return { success: false, error: 'WhatsApp notifications are disabled' };
    }

    if (!phoneNumber) {
      console.log('📱 [WhatsApp] ❌ Phone number is missing');
      return { success: false, error: 'Phone number is required' };
    }

    // Only Meta API supports templates
    if (settingsData.provider !== 'meta') {
      console.log('📱 [WhatsApp] ⚠️ Templates only supported with Meta API');
      return { success: false, error: 'Templates only supported with Meta API' };
    }

    // Clean phone number (remove spaces, ensure it starts with country code)
    const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/^\+?/, '+');
    console.log('📱 [WhatsApp] Cleaned phone number:', cleanPhone);

    return await sendViaMetaTemplate(cleanPhone, templateParams, settingsData);
  } catch (error) {
    console.error('📱 [WhatsApp] ❌ Error sending WhatsApp template message:', error);
    console.error('📱 [WhatsApp] Error details:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp message using configured provider
 */
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const settings = await getWhatsAppSettings();
    
    if (!settings.enabled) {
      console.log('📱 [WhatsApp] Notifications are disabled');
      return { success: false, error: 'WhatsApp notifications are disabled' };
    }

    if (!phoneNumber) {
      console.log('📱 [WhatsApp] ❌ Phone number is missing');
      return { success: false, error: 'Phone number is required' };
    }

    // Clean phone number (remove spaces, ensure it starts with country code)
    const cleanPhone = phoneNumber.replace(/\s+/g, '').replace(/^\+?/, '+');
    console.log('📱 [WhatsApp] Cleaned phone number:', cleanPhone);

    // Use Meta API if configured
    if (settings.provider === 'meta') {
      console.log('📱 [WhatsApp] Using Meta API provider');
      return await sendViaMeta(cleanPhone, message, settings);
    }

    // Use Twilio if configured
    if (settings.provider === 'twilio') {
      console.log('📱 [WhatsApp] Using Twilio provider');
      return await sendViaTwilio(cleanPhone, message, settings);
    }
    
    // Use custom API if configured
    if (settings.provider === 'custom' && settings.apiUrl) {
      console.log('📱 [WhatsApp] Using Custom API provider');
      return await sendViaCustomAPI(cleanPhone, message, settings);
    }

    // Fallback: Log message (for development/testing)
    console.log('📱 [WhatsApp] ⚠️ No provider configured - message logged only:');
    console.log(`📱 [WhatsApp] To: ${cleanPhone}`);
    console.log(`📱 [WhatsApp] Message: ${message.substring(0, 100)}...`);
    return { success: true, message: 'Message logged (no provider configured)' };
  } catch (error) {
    console.error('📱 [WhatsApp] ❌ Error sending WhatsApp message:', error);
    console.error('📱 [WhatsApp] Error details:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send via Meta WhatsApp Business API using Template
 */
async function sendViaMetaTemplate(phoneNumber, templateParams, settings) {
  try {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID || settings.metaPhoneNumberId;
    const accessToken = process.env.META_ACCESS_TOKEN || settings.metaAccessToken;
    const templateName = settings.templateName || 'task_assign';

    console.log('📱 [Meta API] Phone Number ID:', phoneNumberId ? `${phoneNumberId.substring(0, 10)}...` : 'NOT SET');
    console.log('📱 [Meta API] Access Token:', accessToken ? 'SET' : 'NOT SET');
    console.log('📱 [Meta API] Template Name:', templateName);

    if (!phoneNumberId || !accessToken) {
      const missingFields = [];
      if (!phoneNumberId) missingFields.push('Phone Number ID');
      if (!accessToken) missingFields.push('Access Token');
      throw new Error(`Meta WhatsApp credentials not configured. Missing: ${missingFields.join(', ')}`);
    }

    // Meta API endpoint
    const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    console.log('📱 [Meta API] Endpoint:', apiUrl);

    // Format phone number for Meta API
    // Meta requires phone number in E.164 format without + sign: country code + number (e.g., 919915814908)
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // Remove leading + if present
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Check if it's an Indian number and fix country code
    // Indian numbers: 10 digits starting with 6-9, country code is 91
    if (formattedPhone.length === 10 && /^[6-9]/.test(formattedPhone)) {
      console.log('📱 [Meta API] ⚠️ Phone number missing country code, adding India (+91)');
      formattedPhone = '91' + formattedPhone;
    }
    // If 11 digits starting with 99 (wrong country code), replace with 91
    else if (formattedPhone.length === 11 && formattedPhone.startsWith('99')) {
      console.log('📱 [Meta API] ⚠️ Phone number has wrong country code (99), correcting to India (+91)');
      formattedPhone = '91' + formattedPhone.substring(2);
    }
    // If 11 digits starting with 91, it's already correct
    else if (formattedPhone.length === 11 && formattedPhone.startsWith('91')) {
      console.log('📱 [Meta API] ✅ Phone number already has correct India country code');
    }
    // If 10 digits, assume it needs country code
    else if (formattedPhone.length === 10) {
      console.log('📱 [Meta API] ⚠️ Phone number missing country code, adding India (+91)');
      formattedPhone = '91' + formattedPhone;
    }
    
    console.log('📱 [Meta API] Original phone:', phoneNumber);
    console.log('📱 [Meta API] Formatted phone:', formattedPhone);

    // Meta API request body using template
    const requestBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: templateParams.assignedToName || 'User'
              },
              {
                type: 'text',
                text: templateParams.taskTitle || 'New Task'
              },
              {
                type: 'text',
                text: templateParams.taskType || 'One Time'
              },
              {
                type: 'text',
                text: templateParams.assignedByName || 'Admin'
              },
              {
                type: 'text',
                text: templateParams.dueDate || ''
              }
            ]
          }
        ]
      }
    };

    console.log('📱 [Meta API] Sending template request to Meta...');
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout
    });

    console.log('📱 [Meta API] ✅ Response received:', response.status, response.statusText);
    console.log('📱 [Meta API] Message ID:', response.data.messages?.[0]?.id || 'N/A');
    
    return { success: true, messageId: response.data.messages?.[0]?.id || 'sent' };
  } catch (error) {
    console.error('📱 [Meta API] ❌ Error:', error.message);
    if (error.response) {
      console.error('📱 [Meta API] Response status:', error.response.status);
      console.error('📱 [Meta API] Response data:', JSON.stringify(error.response.data, null, 2));
    }
    const errorMessage = error.response?.data?.error?.message || error.message;
    return { success: false, error: errorMessage };
  }
}

/**
 * Send via Meta WhatsApp Business API (legacy - for text messages)
 */
async function sendViaMeta(phoneNumber, message, settings) {
  try {
    const phoneNumberId = process.env.META_PHONE_NUMBER_ID || settings.metaPhoneNumberId;
    const accessToken = process.env.META_ACCESS_TOKEN || settings.metaAccessToken;

    console.log('📱 [Meta API] Phone Number ID:', phoneNumberId ? `${phoneNumberId.substring(0, 10)}...` : 'NOT SET');
    console.log('📱 [Meta API] Access Token:', accessToken ? 'SET' : 'NOT SET');

    if (!phoneNumberId || !accessToken) {
      const missingFields = [];
      if (!phoneNumberId) missingFields.push('Phone Number ID');
      if (!accessToken) missingFields.push('Access Token');
      throw new Error(`Meta WhatsApp credentials not configured. Missing: ${missingFields.join(', ')}`);
    }

    // Meta API endpoint
    const apiUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    console.log('📱 [Meta API] Endpoint:', apiUrl);

    // Format phone number for Meta API
    // Meta requires phone number in E.164 format without + sign: country code + number (e.g., 919915814908)
    let formattedPhone = phoneNumber.replace(/\s+/g, '').replace(/[^\d+]/g, '');
    
    // Remove leading + if present
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Check if it's an Indian number and fix country code
    // Indian numbers: 10 digits starting with 6-9, country code is 91
    // If number starts with 99, 98, 97, 96, 91, 90, 89, 88, 87, 86, 85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, 61, 60
    // But if it's 11 digits starting with 99, it might be wrong (should be 91)
    
    // If 10 digits and starts with 6-9, add India country code (91)
    if (formattedPhone.length === 10 && /^[6-9]/.test(formattedPhone)) {
      console.log('📱 [Meta API] ⚠️ Phone number missing country code, adding India (+91)');
      formattedPhone = '91' + formattedPhone;
    }
    // If 11 digits starting with 99 (wrong country code), replace with 91
    else if (formattedPhone.length === 11 && formattedPhone.startsWith('99')) {
      console.log('📱 [Meta API] ⚠️ Phone number has wrong country code (99), correcting to India (+91)');
      formattedPhone = '91' + formattedPhone.substring(2);
    }
    // If 11 digits starting with 91, it's already correct
    else if (formattedPhone.length === 11 && formattedPhone.startsWith('91')) {
      console.log('📱 [Meta API] ✅ Phone number already has correct India country code');
    }
    // If 10 digits, assume it needs country code
    else if (formattedPhone.length === 10) {
      console.log('📱 [Meta API] ⚠️ Phone number missing country code, adding India (+91)');
      formattedPhone = '91' + formattedPhone;
    }
    
    console.log('📱 [Meta API] Original phone:', phoneNumber);
    console.log('📱 [Meta API] Formatted phone:', formattedPhone);

    // Get template name from settings
    const templateName = settings.templateName || 'task_assign';
    console.log('📱 [Meta API] Using template:', templateName);
    
    // Meta API request body using template
    // Template parameters: {{1}} = assignedToName, {{2}} = taskTitle, {{3}} = taskType, {{4}} = assignedByName, {{5}} = dueDate
    const requestBody = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: 'en'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: assignedToUser.username || 'User'
              },
              {
                type: 'text',
                text: task.title || 'New Task'
              },
              {
                type: 'text',
                text: taskTypeDisplay
              },
              {
                type: 'text',
                text: assignedByUser.username || 'Admin'
              },
              {
                type: 'text',
                text: formattedDueDate
              }
            ]
          }
        ]
      }
    };
    
    console.log('📱 [Meta API] Template parameters:', {
      '{{1}}': assignedToUser.username || 'User',
      '{{2}}': task.title || 'New Task',
      '{{3}}': taskTypeDisplay,
      '{{4}}': assignedByUser.username || 'Admin',
      '{{5}}': formattedDueDate
    });

    console.log('📱 [Meta API] Sending request to Meta...');
    const response = await axios.post(apiUrl, requestBody, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout
    });

    console.log('📱 [Meta API] ✅ Response received:', response.status, response.statusText);
    console.log('📱 [Meta API] Message ID:', response.data.messages?.[0]?.id || 'N/A');
    
    return { success: true, messageId: response.data.messages?.[0]?.id || 'sent' };
  } catch (error) {
    console.error('📱 [Meta API] ❌ Error:', error.message);
    if (error.response) {
      console.error('📱 [Meta API] Response status:', error.response.status);
      console.error('📱 [Meta API] Response data:', JSON.stringify(error.response.data, null, 2));
    }
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
    console.log('📱 [WhatsApp] Starting task assignment notification...');
    console.log('📱 [WhatsApp] Task:', task.title);
    console.log('📱 [WhatsApp] Assigned To:', assignedToUser.username, 'Phone:', assignedToUser.phoneNumber);
    console.log('📱 [WhatsApp] Assigned By:', assignedByUser.username);
    
    // Get WhatsApp settings
    const settings = await getWhatsAppSettings();
    console.log('📱 [WhatsApp] Settings enabled:', settings.enabled);
    console.log('📱 [WhatsApp] Provider:', settings.provider);
    
    if (!settings.enabled) {
      console.log('📱 [WhatsApp] ❌ Notifications are disabled in settings');
      return { success: false, error: 'WhatsApp notifications are disabled' };
    }

    // Check if user has phone number
    if (!assignedToUser.phoneNumber) {
      console.log('📱 [WhatsApp] ❌ User does not have a phone number');
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

    // Prepare template parameters
    // Order: {{1}} = assignedToName, {{2}} = taskTitle, {{3}} = taskType, {{4}} = assignedByName, {{5}} = dueDate
    const templateParams = {
      assignedToName: assignedToUser.username || 'User',
      taskTitle: task.title || 'New Task',
      taskType: taskTypeDisplay,
      assignedByName: assignedByUser.username || 'Admin',
      dueDate: formattedDueDate
    };

    console.log('📱 [WhatsApp] Template parameters:', templateParams);

    // Send WhatsApp message using template
    console.log('📱 [WhatsApp] Sending template message to:', assignedToUser.phoneNumber);
    const result = await sendWhatsAppTemplateMessage(
      assignedToUser.phoneNumber,
      templateParams,
      settings
    );
    
    if (result.success) {
      console.log('📱 [WhatsApp] ✅ Message sent successfully!', result.messageId || '');
    } else {
      console.log('📱 [WhatsApp] ❌ Failed to send message:', result.error);
    }

    return result;
  } catch (error) {
    console.error('📱 [WhatsApp] ❌ Error sending task assignment notification:', error);
    console.error('📱 [WhatsApp] Error stack:', error.stack);
    return { success: false, error: error.message };
  }
}

export { sendWhatsAppMessage, formatTaskMessage, getWhatsAppSettings };

