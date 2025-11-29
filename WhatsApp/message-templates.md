# Message Templates

This file contains message templates for various events in the system. These templates can be used for notifications via Email, WhatsApp, SMS, or in-app notifications.

## Template Variables

The following variables can be used in templates:
- `{taskName}` - Name of the task
- `{taskType}` - Type of task (one-time, daily, weekly, monthly, etc.)
- `{assignedBy}` - Username of the person who assigned the task
- `{assignedTo}` - Username of the person assigned to the task
- `{dueDate}` - Due date of the task
- `{dueTime}` - Due time of the task (if applicable)
- `{priority}` - Task priority (normal, high)
- `{description}` - Task description
- `{status}` - Current task status
- `{completionDate}` - Date when task was completed
- `{remarks}` - Remarks or notes
- `{checklistItems}` - Checklist items (if applicable)
- `{projectName}` - Project name (if applicable)
- `{fmsName}` - FMS name (if applicable)
- `{category}` - Task category
- `{department}` - Department name
- `{link}` - Link to view the task
- `{companyName}` - Company name (AMG Realty)

---

## 1. Task Assigned

### Template 1: Simple Format
```
📋 New Task Assigned

Task Name: {taskName}
Task Type: {taskType}
Assigned By: {assignedBy}
Due Date: {dueDate}
Due Time: {dueTime}

Please complete it by {dueDate} {dueTime}

View Task: {link}
```

### Template 2: Detailed Format
```
🎯 NEW TASK ASSIGNED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Task Details:
   • Task Name: {taskName}
   • Task Type: {taskType}
   • Priority: {priority}
   • Category: {category}

👤 Assignment Details:
   • Assigned By: {assignedBy}
   • Assigned To: {assignedTo}
   • Department: {department}

📅 Timeline:
   • Due Date: {dueDate}
   • Due Time: {dueTime}
   • Please complete by: {dueDate} {dueTime}

📝 Description:
{description}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔗 View Task: {link}

Thank you!
{companyName}
```

### Template 3: WhatsApp Friendly Format
```
*📋 New Task Assigned*

*Task Name:* {taskName}
*Task Type:* {taskType}
*Assigned By:* {assignedBy}
*Due Date:* {dueDate}
*Due Time:* {dueTime}

Please complete it by *{dueDate} {dueTime}*

View Task: {link}
```

---

## 2. Task Reminder (Before Due Date)

### Template 1: Simple Reminder
```
⏰ Task Reminder

Task: {taskName}
Due Date: {dueDate}
Due Time: {dueTime}

This task is due soon. Please complete it on time.

View Task: {link}
```

### Template 2: Detailed Reminder
```
⏰ TASK REMINDER

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Task: {taskName}
📅 Due Date: {dueDate}
🕐 Due Time: {dueTime}
⚠️ Priority: {priority}

This task is due soon. Please ensure it's completed on time.

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 3. Task Overdue

### Template 1: Simple Overdue Notice
```
⚠️ Task Overdue

Task: {taskName}
Due Date: {dueDate}
Status: Overdue

This task is now overdue. Please complete it as soon as possible.

View Task: {link}
```

### Template 2: Detailed Overdue Notice
```
🚨 TASK OVERDUE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Task: {taskName}
📅 Due Date: {dueDate}
⏰ Status: OVERDUE

This task is now overdue. Please complete it immediately.

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 4. Task Completed

### Template 1: Simple Completion Notice
```
✅ Task Completed

Task: {taskName}
Completed By: {assignedTo}
Completed On: {completionDate}

Great work! The task has been marked as completed.

View Task: {link}
```

### Template 2: Detailed Completion Notice
```
✅ TASK COMPLETED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Task: {taskName}
👤 Completed By: {assignedTo}
📅 Completed On: {completionDate}
⏰ Completion Time: {dueTime}

Remarks: {remarks}

Great work! The task has been successfully completed.

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 5. Task Status Changed

### Template 1: Status Update
```
🔄 Task Status Updated

Task: {taskName}
Previous Status: {oldStatus}
New Status: {status}
Updated By: {assignedBy}

View Task: {link}
```

### Template 2: Detailed Status Update
```
🔄 TASK STATUS UPDATED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Task: {taskName}
🔄 Status Changed: {oldStatus} → {status}
👤 Updated By: {assignedBy}
📅 Updated On: {completionDate}

Remarks: {remarks}

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 6. Task In Progress

### Template 1: In Progress Notification
```
🔄 Task In Progress

Task: {taskName}
Status: In Progress
Started By: {assignedTo}

The task has been marked as in progress.

View Task: {link}
```

### Template 2: Detailed In Progress
```
🔄 TASK IN PROGRESS

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Task: {taskName}
🔄 Status: IN PROGRESS
👤 Started By: {assignedTo}
📅 Started On: {completionDate}

Remarks: {remarks}

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 7. Task Due Today

### Template 1: Due Today Reminder
```
📅 Task Due Today

Task: {taskName}
Due Date: Today ({dueDate})
Due Time: {dueTime}

This task is due today. Please complete it before {dueTime}.

View Task: {link}
```

### Template 2: Detailed Due Today
```
📅 TASK DUE TODAY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Task: {taskName}
📅 Due Date: Today ({dueDate})
🕐 Due Time: {dueTime}
⚠️ Priority: {priority}

This task is due today. Please ensure it's completed before {dueTime}.

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 8. Recurring Task Created

### Template 1: Recurring Task Notification
```
🔄 Recurring Task Created

Task: {taskName}
Task Type: {taskType}
Frequency: {taskType}
Assigned By: {assignedBy}
Next Due Date: {dueDate}

This is a recurring task. It will be automatically assigned based on the schedule.

View Task: {link}
```

### Template 2: Detailed Recurring Task
```
🔄 RECURRING TASK CREATED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Task: {taskName}
🔄 Type: Recurring ({taskType})
📅 Next Due Date: {dueDate}
👤 Assigned By: {assignedBy}
👤 Assigned To: {assignedTo}

This is a recurring task. It will be automatically assigned based on the schedule.

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 9. Task With Checklist Assigned

### Template 1: Checklist Task
```
📋 Task with Checklist Assigned

Task: {taskName}
Checklist Items: {checklistItems}

Please complete all checklist items:
{checklistItems}

Due Date: {dueDate}
View Task: {link}
```

### Template 2: Detailed Checklist Task
```
📋 TASK WITH CHECKLIST ASSIGNED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Task: {taskName}
📋 Checklist Items:
{checklistItems}

👤 Assigned By: {assignedBy}
📅 Due Date: {dueDate}
🕐 Due Time: {dueTime}

Please complete all checklist items by {dueDate} {dueTime}.

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 10. Task Forwarded

### Template 1: Task Forwarded
```
↪️ Task Forwarded

Task: {taskName}
Forwarded From: {assignedBy}
Forwarded To: {assignedTo}
Forwarded On: {completionDate}

This task has been forwarded to you.

View Task: {link}
```

### Template 2: Detailed Task Forwarded
```
↪️ TASK FORWARDED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Task: {taskName}
↪️ Forwarded From: {assignedBy}
↪️ Forwarded To: {assignedTo}
📅 Forwarded On: {completionDate}

Remarks: {remarks}

This task has been forwarded to you. Please review and complete it.

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 11. Task Rejected/On Hold

### Template 1: Task On Hold
```
⏸️ Task On Hold

Task: {taskName}
Status: On Hold
Reason: {remarks}

This task has been put on hold.

View Task: {link}
```

### Template 2: Detailed Task On Hold
```
⏸️ TASK ON HOLD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 Task: {taskName}
⏸️ Status: ON HOLD
👤 Updated By: {assignedBy}
📅 Updated On: {completionDate}

Reason: {remarks}

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 12. Daily Task Summary

### Template 1: Daily Summary
```
📊 Daily Task Summary

Date: {dueDate}

Tasks Assigned: {totalTasks}
Tasks Completed: {completedTasks}
Tasks Pending: {pendingTasks}
Tasks Overdue: {overdueTasks}

View Dashboard: {link}
```

### Template 2: Detailed Daily Summary
```
📊 DAILY TASK SUMMARY

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Date: {dueDate}
👤 User: {assignedTo}

📊 Statistics:
   • Total Tasks: {totalTasks}
   • Completed: {completedTasks}
   • Pending: {pendingTasks}
   • Overdue: {overdueTasks}
   • In Progress: {inProgressTasks}

View Dashboard: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 13. Weekly Task Summary

### Template 1: Weekly Summary
```
📊 Weekly Task Summary

Week: {weekStart} to {weekEnd}

Tasks Completed: {completedTasks}
Tasks Pending: {pendingTasks}
Completion Rate: {completionRate}%

View Dashboard: {link}
```

---

## 14. Monthly Task Summary

### Template 1: Monthly Summary
```
📊 Monthly Task Summary

Month: {month}
Year: {year}

Tasks Completed: {completedTasks}
Tasks Pending: {pendingTasks}
Completion Rate: {completionRate}%

View Dashboard: {link}
```

---

## 15. Checklist Assigned

### Template 1: Checklist Assignment
```
📋 Checklist Assigned

Checklist: {taskName}
Category: {category}
Due Date: {dueDate}

Please complete the checklist by {dueDate}.

View Checklist: {link}
```

### Template 2: Detailed Checklist
```
📋 CHECKLIST ASSIGNED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Checklist: {taskName}
📂 Category: {category}
👤 Assigned By: {assignedBy}
📅 Due Date: {dueDate}
🕐 Due Time: {dueTime}

Please complete all items in the checklist by {dueDate} {dueTime}.

View Checklist: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 16. Checklist Completed

### Template 1: Checklist Completion
```
✅ Checklist Completed

Checklist: {taskName}
Completed By: {assignedTo}
Completed On: {completionDate}

All items have been completed. Great work!

View Checklist: {link}
```

---

## 17. FMS Task Assigned

### Template 1: FMS Task
```
🏗️ FMS Task Assigned

FMS: {fmsName}
Task: {taskName}
Project: {projectName}
Due Date: {dueDate}

Please complete the FMS task by {dueDate}.

View Task: {link}
```

### Template 2: Detailed FMS Task
```
🏗️ FMS TASK ASSIGNED

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🏗️ FMS: {fmsName}
📌 Task: {taskName}
📁 Project: {projectName}
👤 Assigned By: {assignedBy}
📅 Due Date: {dueDate}
🕐 Due Time: {dueTime}

Please complete the FMS task by {dueDate} {dueTime}.

View Task: {link}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 18. Project Task Assigned

### Template 1: Project Task
```
📁 Project Task Assigned

Project: {projectName}
Task: {taskName}
Step: {stepNo}
Due Date: {dueDate}

Please complete the project task by {dueDate}.

View Task: {link}
```

---

## 19. High Priority Task Alert

### Template 1: High Priority
```
🚨 HIGH PRIORITY TASK

Task: {taskName}
Priority: HIGH
Due Date: {dueDate}
Due Time: {dueTime}

This is a high priority task. Please complete it urgently.

View Task: {link}
```

---

## 20. Task Deadline Approaching

### Template 1: Deadline Warning
```
⏰ Deadline Approaching

Task: {taskName}
Due Date: {dueDate}
Time Remaining: {timeRemaining}

The deadline for this task is approaching. Please complete it soon.

View Task: {link}
```

---

## Usage Notes

1. **Variable Replacement**: Replace all `{variableName}` placeholders with actual values when sending messages.

2. **Format Selection**: Choose the template format (Simple or Detailed) based on the notification channel:
   - **Simple Format**: Best for SMS, short notifications
   - **Detailed Format**: Best for Email, WhatsApp
   - **WhatsApp Friendly**: Optimized for WhatsApp with markdown

3. **Customization**: You can customize these templates by:
   - Adding/removing fields
   - Changing the formatting
   - Adding emojis or special characters
   - Adjusting the tone (formal/informal)

4. **Multi-language Support**: These templates can be translated to other languages by replacing the English text while keeping the variable placeholders.

5. **Channel-Specific Templates**: Some templates may need adjustments based on the notification channel:
   - **Email**: Can include HTML formatting
   - **WhatsApp**: Use markdown formatting (*bold*, _italic_)
   - **SMS**: Keep it short and simple
   - **In-app**: Can include interactive elements

---

## Template Configuration

To configure these templates in the system:

1. Store templates in database or configuration file
2. Create a template engine to replace variables
3. Add template selection logic based on event type
4. Implement channel-specific formatting
5. Add template versioning for updates

---

**Last Updated**: {currentDate}
**Version**: 1.0.0

