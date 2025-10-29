# WhatsApp Integration - Quick Start Guide

## 🚀 5-MINUTE OVERVIEW

Your MERN task system can send WhatsApp messages at **18+ different events**. Here's what needs to happen:

1. **User Setup**: Add phone number to their profile
2. **Event Detection**: Hook into existing task operations  
3. **Message Sending**: Use Twilio API to send WhatsApp message
4. **Logging**: Track what was sent and delivered

---

## 📋 QUICK EVENT CHECKLIST

**Every time ANY of these happens, send a WhatsApp:**

| Event | File | When | To Whom |
|-------|------|------|---------|
| ✅ Task assigned | `AssignTask.tsx` + `tasks.js:320` | Form submitted | Assignee |
| ✅ Task started | `PendingTasks.tsx` + `tasks.js:456` | Status = in-progress | Assignee |
| ✅ Task completed | `tasks.js:477` | Status = completed | Assigner |
| ✅ Overdue detected | Cron job | Daily check | Assignee + Manager |
| ✅ Change approved | `objections.js` | After approval | Requester |
| ✅ Project created | `projects.js` | FMS triggered | All assignees |
| ✅ Step ready | `projects.js` | Prev step done | Next assignee |

---

## 🛠️ IMPLEMENTATION STEPS

### **Step 1: Extend User Model** (5 min)

Add to `server/models/User.js`:

```javascript
// Around line 35, add before isActive:
phoneNumber: {
  type: String,
  // Format: +91XXXXXXXXXX or +1XXXXXXXXXX
  trim: true
},
whatsappNotifications: {
  enabled: { type: Boolean, default: false },
  verifiedAt: Date
},
```

### **Step 2: Create WhatsApp Log Model** (5 min)

New file: `server/models/WhatsAppLog.js`

```javascript
import mongoose from 'mongoose';

const whatsappLogSchema = new mongoose.Schema({
  messageId: String,
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task' },
  projectId: String,
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: String, // 'created', 'completed', 'overdue', etc
  message: String,
  status: { type: String, enum: ['sent', 'failed', 'pending'], default: 'pending' },
  deliveredAt: Date,
  readAt: Date,
  error: String,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('WhatsAppLog', whatsappLogSchema);
```

### **Step 3: Create WhatsApp Service** (10 min)

New file: `server/services/whatsappService.js`

```javascript
import twilio from 'twilio';
import User from '../models/User.js';
import WhatsAppLog from '../models/WhatsAppLog.js';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER;

export async function sendWhatsAppMessage(userId, message, eventType, taskId = null) {
  try {
    // 1. Get user details
    const user = await User.findById(userId);
    
    if (!user) {
      console.error(`User not found: ${userId}`);
      return { success: false, error: 'User not found' };
    }

    // 2. Check if WhatsApp is enabled & phone exists
    if (!user.whatsappNotifications?.enabled || !user.phoneNumber) {
      console.log(`WhatsApp disabled for user: ${user.username}`);
      return { success: false, error: 'WhatsApp not enabled for user' };
    }

    // 3. Validate phone number format (E.164)
    if (!/^\+\d{1,15}$/.test(user.phoneNumber)) {
      console.error(`Invalid phone format: ${user.phoneNumber}`);
      return { success: false, error: 'Invalid phone format' };
    }

    // 4. Send message via Twilio
    const result = await client.messages.create({
      from: `whatsapp:${TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${user.phoneNumber}`,
      body: message
    });

    // 5. Log the sent message
    await WhatsAppLog.create({
      messageId: result.sid,
      taskId: taskId,
      recipient: userId,
      event: eventType,
      message: message,
      status: 'sent'
    });

    console.log(`WhatsApp sent to ${user.phoneNumber}: ${message.substring(0, 30)}...`);
    return { success: true, messageId: result.sid };

  } catch (error) {
    console.error(`WhatsApp send error: ${error.message}`);
    
    // Log failed attempt
    await WhatsAppLog.create({
      taskId: taskId,
      recipient: userId,
      event: eventType,
      message: message,
      status: 'failed',
      error: error.message
    });

    return { success: false, error: error.message };
  }
}

// Message template formatter
export function formatTaskMessage(task, eventType) {
  const date = new Date(task.dueDate).toLocaleDateString();
  
  const templates = {
    'created': `📋 New task: ${task.title}\nDue: ${date}\nPriority: ${task.priority}`,
    'started': `⏳ You started: ${task.title}\nDue: ${date}`,
    'completed': `✅ Completed: ${task.title}\nGreat work!`,
    'overdue': `⚠️ OVERDUE: ${task.title}\nDue: ${date}\nPlease complete ASAP`
  };
  
  return templates[eventType] || templates['created'];
}
```

### **Step 4: Hook into Task Creation** (10 min)

In `server/routes/tasks.js` around line 408:

```javascript
// After task.save() - EXISTING CODE
// import { sendWhatsAppMessage, formatTaskMessage } from '../services/whatsappService.js';

// EXISTING: const task = new Task(individualTaskData);
// EXISTING: await task.save();

// ADD THIS:
sendWhatsAppMessage(
  task.assignedTo,
  formatTaskMessage(task, 'created'),
  'created',
  task._id
).catch(err => console.error('WhatsApp send failed:', err));
```

### **Step 5: Add Environment Variables** (2 min)

Add to `.env`:

```
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_WHATSAPP_NUMBER=+1234567890
```

### **Step 6: Create Cron Job for Reminders** (10 min)

New file: `server/jobs/reminderJob.js`

```javascript
import Task from '../models/Task.js';
import { sendWhatsAppMessage, formatTaskMessage } from '../services/whatsappService.js';

export async function checkOverdueTasks() {
  try {
    const now = new Date();
    
    // Find tasks that are overdue and not yet notified today
    const overdueTasks = await Task.find({
      status: { $ne: 'completed' },
      dueDate: { $lt: now },
      'whatsappNotifications.overdueSentToday': { $ne: new Date().toDateString() }
    });

    for (const task of overdueTasks) {
      const message = formatTaskMessage(task, 'overdue');
      
      await sendWhatsAppMessage(
        task.assignedTo,
        message,
        'overdue',
        task._id
      );
      
      // Mark as notified today
      if (!task.whatsappNotifications) task.whatsappNotifications = {};
      task.whatsappNotifications.overdueSentToday = new Date().toDateString();
      await task.save();
    }
    
    console.log(`Checked ${overdueTasks.length} overdue tasks`);
  } catch (error) {
    console.error('Reminder job error:', error);
  }
}

// Schedule in server/index.js:
// import cron from 'node-cron';
// cron.schedule('0 * * * *', checkOverdueTasks); // Every hour
```

---

## 🎯 ALL HOOK POINTS - WHERE TO ADD WHATSAPP CALLS

```
┌─────────────────────────────────────────────────────────────────┐
│                  FILE & LINE LOCATIONS                          │
└─────────────────────────────────────────────────────────────────┘

1. TASK CREATED
   File: server/routes/tasks.js
   Line: 408 (after task.save())
   Event: 'task:created'
   Code: sendWhatsAppMessage(task.assignedTo, message, 'created', task._id)

2. TASK STARTED (Status changed to in-progress)
   File: server/routes/tasks.js
   Line: 134-159 (in PUT route, check for in-progress)
   Event: 'task:started'
   Code: if (status === 'in-progress') { sendWhatsApp... }

3. TASK COMPLETED
   File: server/routes/tasks.js
   Line: 505 (status = 'completed')
   Event: 'task:completed'
   Code: sendWhatsAppMessage(task.assignedBy, message, 'completed', task._id)

4. TASK OVERDUE (Cron job)
   File: server/jobs/reminderJob.js (NEW FILE)
   Schedule: Every 1 hour
   Event: 'task:overdue'
   Trigger: Daily check

5. OBJECTION CREATED
   File: server/routes/objections.js
   Line: After objection.save()
   Event: 'objection:created'
   Recipient: Manager
   
6. OBJECTION APPROVED
   File: server/routes/objections.js
   Line: 104 (after task.save())
   Event: 'objection:approved'
   Recipient: Requester

7. FMS PROJECT CREATED
   File: server/routes/projects.js
   Line: After project.save()
   Event: 'fmsProject:created'
   Recipient: All step assignees

8. PROJECT STEP READY
   File: server/routes/projects.js
   Line: When previous step done
   Event: 'projectStep:ready'
   Recipient: Next step assignee
```

---

## 📱 EXAMPLE MESSAGES TO SEND

```javascript
// Task Created
"📋 New task assigned: Complete Report
Due: Jan 15, 2024 | Priority: High
Description: Please complete by end of day
👉 View: [deep_link]"

// Task Started
"⏳ Task started: Complete Report
Expected completion: Jan 15, 2024
Good luck! 💪"

// Task Completed
"✅ Task completed: Complete Report
Completed on time! ⭐
Score: +10 points"

// Task Overdue
"⚠️ OVERDUE: Complete Report
Due: Jan 12, 2024 (2 days ago)
Priority: High
⚡ Please complete ASAP!"

// Change Request Approved
"✅ Request approved!
Task: Complete Report
New deadline: Jan 20, 2024
Proceed with updated timeline"

// FMS Project Started
"🎬 New project: Q1 Sales Process
Project ID: PRJ-0001
Your role: Lead Generation
Start: Jan 15, 2024"

// Step Ready
"🟢 Your turn!
Step 2: Qualify Leads
Previous step completed ✅
Expected time: 2 days
Go ahead! 🚀"
```

---

## ✅ CHECKLIST FOR IMPLEMENTATION

**Phase 1: Setup (Day 1)**
- [ ] Sign up for Twilio account
- [ ] Get Twilio WhatsApp credentials
- [ ] Add credentials to .env
- [ ] Test Twilio connection

**Phase 2: Data & Models (Day 2)**
- [ ] Extend User schema with phone + whatsappNotifications
- [ ] Create WhatsAppLog model
- [ ] Create whatsappService.js
- [ ] Create message template formatter

**Phase 3: First Integration (Day 3)**
- [ ] Hook into task creation (tasks.js:408)
- [ ] Test task creation → WhatsApp message
- [ ] Add error handling
- [ ] Log success/failure

**Phase 4: Expand (Day 4-5)**
- [ ] Add task completion notification
- [ ] Add task started notification
- [ ] Add overdue cron job
- [ ] Add objection notifications

**Phase 5: Polish (Day 6+)**
- [ ] Create UI for phone number entry
- [ ] Add notification preferences (enable/disable)
- [ ] Create notification history dashboard
- [ ] Monitor Twilio usage and costs

---

## 🧪 TESTING

### Test Task Creation:
```bash
# Create a test task with AssignTask form
# Should receive WhatsApp message within 5 seconds
```

### Test Manually (Node REPL):
```javascript
import { sendWhatsAppMessage } from './server/services/whatsappService.js';

await sendWhatsAppMessage(
  'USER_ID_HERE',
  '🧪 Test message from WhatsApp integration',
  'test'
);
```

### Check Logs:
```javascript
// In MongoDB:
db.whatsappLogs.find({ status: 'sent' }).pretty()
db.whatsappLogs.find({ status: 'failed' }).pretty()
```

---

## 🐛 TROUBLESHOOTING

| Problem | Solution |
|---------|----------|
| Messages not sending | Check: phone number format, user enabled, Twilio creds |
| Invalid phone error | Ensure format: +91XXXXXXXXXX or +1XXXXXXXXXX |
| Twilio rate limit | Implement queue system, batch messages |
| User not on WhatsApp | Graceful error handling, suggest SMS fallback |
| Quota exceeded | Get Twilio paid plan, upgrade API limit |

---

## 💡 NEXT OPTIMIZATION IDEAS

1. **Two-Way Chat**: Allow users to reply to update status
2. **Media Files**: Send task attachments as WhatsApp media
3. **Group Chats**: Auto-create groups for team tasks
4. **Reminders**: Set recurring reminders before due date
5. **Analytics**: Dashboard showing delivery rates
6. **Smart Timing**: Don't send during quiet hours
7. **Priority Routing**: High-priority = SMS + WhatsApp

---

## 📞 TWILIO GETTING STARTED

1. **Sign Up**: https://www.twilio.com/console/sms/try-twilio
2. **Get Number**: Get a Twilio WhatsApp number
3. **Get Credentials**: Account SID, Auth Token
4. **Format**: TWILIO_WHATSAPP_NUMBER = +1XXXXXXXXXX
5. **Test**: Send test message from console

---

## 📊 COST ESTIMATION (Twilio)

- **Setup**: FREE (trial account)
- **Per Message**: $0.01 - $0.02 (depends on region)
- **For 100 tasks/day**: ~$1-2/day = ~$30-60/month
- **Pro Tip**: Use trial credits first, then pay-as-you-go

---

## 🎓 LEARNING RESOURCES

- Twilio Docs: https://www.twilio.com/docs/whatsapp
- Node.js Twilio: https://www.twilio.com/docs/libraries/node
- Message Templates: https://www.twilio.com/docs/messaging/whatsapp/api/message-templates

---

**Quick Start Version**: Complete in **2-3 hours**
**Full Implementation**: Complete in **1 week**
**Status**: Ready to implement - All analysis done ✅
