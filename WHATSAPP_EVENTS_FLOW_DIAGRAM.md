# WhatsApp Integration - Complete Event Flow Diagram

## 🔄 COMPLETE TASK LIFECYCLE WITH WhatsApp TOUCHPOINTS

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        TASK CREATION WORKFLOW                               │
└─────────────────────────────────────────────────────────────────────────────┘

                      ┌─────────────────┐
                      │ User Opens      │
                      │ AssignTask Page │
                      └────────┬────────┘
                               │
                    ┌──────────┴──────────┐
                    │                     │
            ┌───────▼────────┐   ┌────────▼──────────┐
            │ Fills Form:    │   │ Select Users      │
            │ - Title        │   │ - Multiple users? │
            │ - Description  │   │ - Role-based?     │
            │ - Priority     │   └────────┬──────────┘
            │ - Type         │            │
            └───────┬────────┘            │
                    │                     │
                    └──────────┬──────────┘
                               │
                ┌──────────────▼──────────────┐
                │ Upload Attachments/Voice    │
                │ (Optional)                  │
                └──────────────┬──────────────┘
                               │
                ┌──────────────▼──────────────┐
                │ Select Dates               │
                │ - One-time (dueDate)      │
                │ - Recurring (start/end)   │
                └──────────────┬──────────────┘
                               │
                ┌──────────────▼──────────────┐
                │ FORM SUBMITTED             │
                └──────────────┬──────────────┘
                               │
                ┌──────────────▼──────────────────────────────┐
                │ Frontend: axios.post                        │
                │ /api/tasks/create-scheduled                │
                └──────────────┬─────────────────────────────┘
                               │
                ┌──────────────▼──────────────────────────────┐
                │ Backend: Route Handler                      │
                │ (server/routes/tasks.js: line 320)         │
                └──────────────┬─────────────────────────────┘
                               │
                ┌──────────────▼──────────────────────────────┐
                │ Process Recurring Logic                     │
                │ - Generate all dates based on type         │
                │ - Handle weekly/monthly/yearly dates       │
                │ - Create individual task instances         │
                └──────────────┬─────────────────────────────┘
                               │
                ┌──────────────▼──────────────────────────────┐
                │ FOR EACH TASK INSTANCE:                     │
                │ 1. Create Task Document                    │
                │ 2. Save to MongoDB                         │
                │ 3. Link via taskGroupId                    │
                └──────────────┬─────────────────────────────┘
                               │
        ┌──────────────────────▼──────────────────────────┐
        │ TASK CREATION COMPLETE - DB SAVED              │
        └──────────────────────┬───────────────────────────┘
        
        🚨 **WHATSAPP TRIGGER POINT #1: TASK_CREATED** 🚨
        
        ┌──────────────────────▼───────────────────────────┐
        │ Event Emitted: 'task:created'                   │
        │ ├─ taskId                                       │
        │ ├─ assignedTo (User ID)                         │
        │ ├─ title                                        │
        │ ├─ dueDate                                      │
        │ ├─ taskType                                     │
        │ ├─ priority                                     │
        │ └─ description                                  │
        └──────────────────────┬───────────────────────────┘
                               │
        ┌──────────────────────▼───────────────────────────┐
        │ WhatsApp Service Listener:                       │
        │ 1. Get User phone from DB                        │
        │ 2. Check whatsappEnabled flag                    │
        │ 3. Format message with data                      │
        │ 4. Send via Twilio API                          │
        │ 5. Log notification to WhatsAppLog              │
        └──────────────────────┬───────────────────────────┘
        
        📱 **USER RECEIVES:**
        "📋 New task assigned: [Title]
         Due: [Date] | Priority: [Level]
         Description: [Preview...]
         👉 View in app"
         
        └──────────────────────────────────────────────────┘
```

---

## 🔄 TASK STATUS CHANGE LIFECYCLE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    TASK STATUS TRANSITIONS & EVENTS                         │
└─────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │ Task Created │
                    │ Status:      │
                    │ PENDING      │
                    └────────┬─────┘
                             │
                    ┌────────▼─────────────┐
         🚨 WA #1 ──│ User views task     │─── ✅ WELCOME SENT
         (CREATED)  │ in PendingTasks     │
                    └────────┬─────────────┘
                             │
                    ┌────────▼─────────────┐
                    │ User Clicks Start   │
                    │ Changes Status to   │
                    │ IN-PROGRESS         │
                    └────────┬─────────────┘
                    
        🚨 **WHATSAPP TRIGGER POINT #2: TASK_STARTED** 🚨
        
                    ┌────────▼─────────────┐
         🚨 WA #2 ──│ Event: task:started │──── 📱 MESSAGE:
         (STARTED)  │ Emit with:          │     "⏳ You started: [Title]"
                    │ - userId            │     "Due: [Date]"
                    │ - taskId            │     "Time started: [Now]"
                    │ - startedAt         │
                    └────────┬─────────────┘
                             │
                    ┌────────▼──────────────────────┐
                    │ User Works on Task           │
                    │ (Can add notes, files, etc)  │
                    └────────┬──────────────────────┘
                             │
                    ┌────────▼──────────────────────┐
                    │ User Completes Task          │
                    │ Adds completion remarks      │
                    │ Uploads proof (optional)     │
                    └────────┬──────────────────────┘
                    
        🚨 **WHATSAPP TRIGGER POINT #3: TASK_COMPLETED** 🚨
        
                    ┌────────▼──────────────────────┐
         🚨 WA #3 ──│ Event: task:completed        │──── 📱 MESSAGE:
         (COMPLETED)│ Emit with:                   │     "✅ Completed: [Title]"
                    │ - taskId                     │     "Completed on time!"
                    │ - completedBy                │     "Score: +10 points"
                    │ - completedAt                │     "Remarks: [Preview]"
                    │ - remarks                    │
                    │ - completionAttachments      │
                    └────────┬──────────────────────┘
                             │
                    ┌────────▼──────────────────────┐
                    │ SCORING CALCULATED          │
                    │ - Planned Days: 7            │
                    │ - Actual Days: 5             │
                    │ - Score Impact: +10          │
                    └────────┬──────────────────────┘
                    
        🚨 **WHATSAPP TRIGGER POINT #4: SCORE_CALCULATED** 🚨
        
                    ┌────────▼──────────────────────┐
         🚨 WA #4 ──│ Event: task:scored          │──── 📱 MESSAGE:
         (SCORED)   │ Emit with:                   │     "⭐ Excellent work!"
                    │ - taskId                     │     "Completed 2 days early"
                    │ - finalScore                 │     "Total Score: 450pts"
                    │ - efficiency                 │
                    │ - daysEarly/Late             │
                    └────────┬──────────────────────┘
                             │
                    ┌────────▼──────────────────────┐
                    │ Final State: COMPLETED       │
                    │ Task Archive                 │
                    └──────────────────────────────┘
```

---

## ⚠️ OVERDUE TASK DETECTION FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              AUTOMATED OVERDUE DETECTION & NOTIFICATIONS                    │
└─────────────────────────────────────────────────────────────────────────────┘

    CRON JOB (Every 1 hour or daily):
    
    ┌──────────────────────────────────────┐
    │ GET all tasks with:                  │
    │ - status ≠ 'completed'               │
    │ - dueDate < Now                      │
    │ - status ≠ 'overdue' (prevent spam)  │
    └──────────────────┬───────────────────┘
                       │
    ┌──────────────────▼───────────────────┐
    │ FOR EACH OVERDUE TASK:               │
    │ 1. Update status → 'overdue'         │
    │ 2. Calculate days overdue            │
    │ 3. Check if already notified today   │
    └──────────────────┬───────────────────┘
    
    🚨 **WHATSAPP TRIGGER POINT #5: TASK_OVERDUE** 🚨
    
    ┌──────────────────▼───────────────────┐
    │ Event: task:overdue                 │
    │ Emit with:                          │
    │ - taskId                            │
    │ - assignedTo (User ID)              │
    │ - daysOverdue                       │
    │ - manager/supervisor (escalation)   │
    └──────────────────┬───────────────────┘
    
    ┌──────────────────▼───────────────────┐
    │ Send 2 Messages:                    │
    └──────────────────┬───────────────────┘
    
    📱 TO ASSIGNED USER:
    "⚠️ OVERDUE: [Title]
     Due: [Date] ([X] days ago)
     Priority: [Level]
     ⚡ Please complete ASAP"
    
    📱 TO MANAGER:
    "🚨 ESCALATION: [User] has [Title] 
     overdue by [X] days
     Priority: [Level]
     Action: Follow up required"
    
    └────────────────────────────────────────┘
```

---

## 🔄 OBJECTION/CHANGE REQUEST FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              OBJECTION WORKFLOW WITH WHATSAPP                               │
└─────────────────────────────────────────────────────────────────────────────┘

              ┌──────────────────────┐
              │ Task in Progress     │
              │ User Has Issues      │
              └──────────┬───────────┘
                         │
              ┌──────────▼──────────┐
              │ Types of Objections:│
              │ 1. Date Change      │
              │ 2. Hold Request     │
              │ 3. Terminate Task   │
              └──────────┬──────────┘
                         │
              ┌──────────▼──────────┐
              │ User submits        │
              │ objection request   │
              │ with remarks        │
              └──────────┬──────────┘
              
    🚨 **WHATSAPP TRIGGER POINT #6: OBJECTION_CREATED** 🚨
    
              ┌──────────▼──────────┐
    🚨 WA #6 ─│ Event:              │─── 📱 TO MANAGER:
    (OBJECTION)│ objection:created   │     "🔔 Change Request: [Type]"
              │ Emit with:          │     "From: [User]"
              │ - taskId            │     "Reason: [Preview]"
              │ - objectionType     │     "⚡ Review needed"
              │ - requestedBy       │
              │ - remarks           │
              │ - requestedDate     │
              └──────────┬──────────┘
                         │
         ┌───────────────┴──────────────┐
         │                              │
    ┌────▼─────────────┐     ┌──────────▼────────────┐
    │ APPROVED         │     │ REJECTED             │
    │ by Manager       │     │ by Manager           │
    └────┬─────────────┘     └──────────┬───────────┘
         │                             │
    
    🚨 **WHATSAPP TRIGGER POINT #7: OBJECTION_APPROVED** 🚨
    
    ┌────▼─────────────────────────────────┐
    │ Event: objection:approved            │─── 📱 TO REQUESTER:
    │ Emit with:                           │     "✅ Request Approved!"
    │ - taskId                             │     "New deadline: [Date]"
    │ - approval remarks                   │     "Status: [Updated]"
    │ - newData (if applicable)            │
    └────┬─────────────────────────────────┘
         │
         │ UPDATE TASK:
         │ - New dueDate (if date change)
         │ - Task on hold (if hold request)
         │ - Task terminated (if terminate)
         │
    🚨 **WHATSAPP TRIGGER POINT #8: TASK_STATUS_UPDATED** 🚨
    
    ┌────▼─────────────────────────────────┐
    │ Send Follow-up Notification          │
    │                                      │
    │ "🔄 Task Status Updated:             │
    │  [Title]                             │
    │  New Status: [Hold/Active/Archived]  │
    │  New Date: [If applicable]"          │
    └──────────────────────────────────────┘
    
    
    ┌────▼──────────────────────────────────┐
    │ Event: objection:rejected             │─── 📱 TO REQUESTER:
    │ Emit with:                            │     "❌ Request Denied"
    │ - taskId                              │     "Reason: [Remarks]"
    │ - rejectionRemarks                    │     "Must complete by:"
    │ - approvedBy                          │     "[Original date]"
    └────┬───────────────────────────────────┘
         │
         │ TASK STATUS UNCHANGED
         │ Continue with original timeline
         │
         └──────────────────────────────────┘
```

---

## 🎬 FMS PROJECT TRIGGER FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│          FMS PROJECT CREATION & STEP-BASED NOTIFICATIONS                    │
└─────────────────────────────────────────────────────────────────────────────┘

              ┌────────────────────┐
              │ FMS Template       │
              │ Triggered          │
              │ (By another task)  │
              └────────┬───────────┘
                       │
              ┌────────▼───────────┐
              │ NEW PROJECT        │
              │ Created in DB      │
              │ with steps         │
              └────────┬───────────┘
              
    🚨 **WHATSAPP TRIGGER POINT #9: FMS_PROJECT_CREATED** 🚨
    
              ┌────────▼───────────────┐
    🚨 WA #9 ─│ Event:                │─── 📱 TO ALL STEP ASSIGNEES:
    (PROJECT  │ fmsProject:created    │     "🎬 New Project: [FMS_Name]"
     CREATED) │ Emit with:            │     "Project ID: [ID]"
              │ - projectId           │     "Your role: [Step Description]"
              │ - fmsName             │     "Start Date: [Date]"
              │ - steps               │
              │ - assignees           │
              └────────┬───────────────┘
                       │
              ┌────────▼───────────────┐
              │ STEP 1 BEGINS         │
              │ (Automatically)       │
              │ Timer starts          │
              └────────┬───────────────┘
              
    🚨 **WHATSAPP TRIGGER POINT #10: PROJECT_STEP_STARTED** 🚨
    
              ┌────────▼───────────────────────────┐
    🚨 WA #10 │ Event: projectStep:started        │─── 📱 MESSAGE:
    (STEP     │ Emit with:                         │     "⏱️ Step Started: [Step]"
     STARTED) │ - stepNo                           │     "What: [Description]"
              │ - stepDescription                  │     "Due: [DateTime]"
              │ - expectedDuration                 │     "Timer: [H hours M mins]"
              │ - assignedTo                       │
              └────────┬───────────────────────────┘
                       │
         ┌─────────────┴──────────────────────┐
         │                                    │
         │  STEP IN PROGRESS...               │
         │                                    │
         └─────────────┬──────────────────────┘
                       │
              ┌────────▼───────────────┐
              │ User Completes Step 1  │
              │ Marks as Done          │
              └────────┬───────────────┘
              
    🚨 **WHATSAPP TRIGGER POINT #11: PROJECT_STEP_COMPLETED** 🚨
    
              ┌────────▼───────────────────┐
    🚨 WA #11 │ Event:                    │─── 📱 TO STEP 1 ASSIGNEE:
    (STEP     │ projectStep:completed     │     "✅ Step 1 Complete!"
     COMPLETE)│ Emit with:                │     "Submitted at: [Time]"
              │ - stepNo                  │     "Score: [X]/100"
              │ - completedAt             │     ""
              │ - completionScore         │
              └────────┬───────────────────┘
                       │
              ┌────────▼──────────────────────┐
    🚨 WA #12 │ Event:                       │─── 📱 TO STEP 2 ASSIGNEE:
    (NEXT     │ projectStep:readyForStart   │     "🟢 Your turn: Step 2"
     STEP)    │ Emit with:                   │     "Title: [Description]"
              │ - stepNo (2)                 │     "Start now!"
              │ - stepDescription           │
              │ - assignedTo                │
              └────────┬──────────────────────┘
                       │
              ┌────────▼──────────────────────┐
              │ STEP 2 BEGINS                │
              │ (Automatically triggered)    │
              │ Timer resets                 │
              └────────┬──────────────────────┘
                       │
                  ... Repeat for all steps ...
                       │
              ┌────────▼──────────────────────┐
              │ ALL STEPS COMPLETED          │
              │ Project Final                │
              └────────┬──────────────────────┘
              
    🚨 **WHATSAPP TRIGGER POINT #13: PROJECT_COMPLETED** 🚨
    
              ┌────────▼──────────────────────┐
    🚨 WA #13 │ Event:                       │─── 📱 TO PROJECT OWNER + TEAM:
    (PROJECT  │ fmsProject:completed        │     "🎉 Project Complete!"
     COMPLETE)│ Emit with:                   │     "[FMS_Name]"
              │ - projectId                  │     "Total Score: 85/100"
              │ - totalScore                 │     "On-time: 8/10 steps"
              │ - onTimeCount                │     "Status: Success ✅"
              │ - lateCount                  │
              │ - completedAt                │
              └────────────────────────────────┘
```

---

## ⏰ REMINDER CRON JOB FLOW

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                  AUTOMATED REMINDER SYSTEM (CRON JOB)                       │
└─────────────────────────────────────────────────────────────────────────────┘

    EVERY 6 HOURS (or configurable interval):
    
    ┌─────────────────────────────────────┐
    │ Cron Job Triggers                   │
    │ Check all pending/in-progress tasks│
    └────────────┬────────────────────────┘
                 │
    ┌────────────▼────────────────────────┐
    │ Query Database:                    │
    │ Find tasks where:                  │
    │ - status = pending/in-progress     │
    │ - dueDate within next 48 hours     │
    │ - lastReminderSent < 24h ago       │
    └────────────┬────────────────────────┘
                 │
    ┌────────────▼────────────────────────────────┐
    │ Categorize by time to due:                 │
    └────────────┬────────────────────────────────┘
                 │
         ┌───────┼───────┬───────────┐
         │       │       │           │
    ┌────▼──┐ ┌──▼──┐ ┌──▼───┐ ┌────▼────┐
    │ 48h+  │ │ 24h │ │ <24h │ │OVERDUE  │
    │ahead  │ │ahead│ │ left │ │already  │
    └────┬──┘ └──┬──┘ └──┬───┘ └────┬────┘
         │       │       │          │
    
    🚨 **WHATSAPP TRIGGER POINT #14: TASK_REMINDER_48H** 🚨
    
    ┌────▼──────────────────────────────┐
    │ Event: reminder:48hBefore         │─── 📱 (Optional - Low priority)
    │ Emit with:                         │     "📅 Upcoming: [Title]"
    │ - taskId                           │     "Due in 2 days"
    │ - hoursUntilDue (48)               │     "Ready to start?"
    └────┬──────────────────────────────┘
         │
    
    🚨 **WHATSAPP TRIGGER POINT #15: TASK_REMINDER_24H** 🚨
    
    ┌────▼──────────────────────────────┐
    │ Event: reminder:24hBefore         │─── 📱 (Medium priority)
    │ Emit with:                         │     "⏰ Tomorrow: [Title]"
    │ - taskId                           │     "Due: [Date] [Time]"
    │ - hoursUntilDue (24)               │     "Get started today!"
    └────┬──────────────────────────────┘
         │
    
    🚨 **WHATSAPP TRIGGER POINT #16: TASK_REMINDER_FINAL** 🚨
    
    ┌────▼──────────────────────────────┐
    │ Event: reminder:dueTodayOrSoon    │─── 📱 (HIGH priority)
    │ Emit with:                         │     "🔴 DUE TODAY: [Title]"
    │ - taskId                           │     "Due: [Time]"
    │ - hoursUntilDue (<24)              │     "⚡ Complete NOW!"
    │ - priority (high/normal)           │
    └────┬──────────────────────────────┘
         │
    
    🚨 **WHATSAPP TRIGGER POINT #5 (AGAIN): TASK_OVERDUE** 🚨
    
    ┌────▼──────────────────────────────┐
    │ If Due Date Passed:               │
    │                                   │
    │ Event: reminder:overdue           │─── 📱 (CRITICAL)
    │ Emit with:                         │     "🚨 OVERDUE: [Title]"
    │ - taskId                           │     "Due: [Date] ([X]h ago)"
    │ - hoursOverdue                     │     "URGENT: Complete NOW!"
    │ - escalationRequired               │
    └────────────────────────────────────┘
```

---

## 📊 COMPLETE EVENT MATRIX

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    ALL WHATSAPP EVENTS & TRIGGERS                           │
└─────────────────────────────────────────────────────────────────────────────┘

┌────┬──────────────────────┬─────────────────┬──────────────┬─────────────┐
│ # │ EVENT NAME           │ TRIGGER POINT   │ RECIPIENT    │ FREQUENCY  │
├────┼──────────────────────┼─────────────────┼──────────────┼─────────────┤
│ 1  │ TASK_CREATED         │ Task saved      │ Assignee     │ Once       │
│ 2  │ TASK_STARTED         │ Status→Progress │ Manager      │ Once       │
│ 3  │ TASK_COMPLETED       │ Status→Complete │ Assigner+Mgr │ Once       │
│ 4  │ SCORE_CALCULATED     │ After complete  │ Assignee     │ Once       │
│ 5  │ TASK_OVERDUE         │ Cron/Schedule   │ Both*        │ Daily      │
│ 6  │ OBJECTION_CREATED    │ Objection save  │ Manager      │ Once       │
│ 7  │ OBJECTION_APPROVED   │ After approval  │ Requester    │ Once       │
│ 8  │ OBJECTION_REJECTED   │ After rejection │ Requester    │ Once       │
│ 9  │ FMS_PROJECT_CREATED  │ Project create  │ All assignees│ Once       │
│ 10 │ PROJECT_STEP_STARTED │ Previous done   │ Step owner   │ Per step   │
│ 11 │ PROJECT_STEP_DONE    │ Step complete   │ Completer    │ Per step   │
│ 12 │ NEXT_STEP_READY      │ After #11       │ Next owner   │ Per step   │
│ 13 │ PROJECT_COMPLETED    │ All steps done  │ Team+Owner   │ Once       │
│ 14 │ REMINDER_48H_BEFORE  │ Cron 48h check  │ Assignee     │ Once/opt   │
│ 15 │ REMINDER_24H_BEFORE  │ Cron 24h check  │ Assignee     │ Once       │
│ 16 │ REMINDER_DUE_TODAY   │ Cron final      │ Assignee+Mgr │ Once       │
│ 17 │ TASK_REASSIGNED      │ Task reassign   │ Both users   │ Once       │
│ 18 │ ESCALATION_NEEDED    │ Overdue+High    │ Manager+Team │ Once       │
└────┴──────────────────────┴─────────────────┴──────────────┴─────────────┘

* Both = Assignee + Manager/Supervisor
Frequency: Once = one-time only, Daily = can repeat daily, Per step = for each step
```

---

## 🔀 DECISION TREE FOR WHATSAPP SENDING

```
┌─────────────────────────────────────────────────────────────────────────────┐
│              LOGIC FLOW: WHEN TO SEND WHATSAPP MESSAGE                      │
└─────────────────────────────────────────────────────────────────────────────┘

                    EVENT OCCURS
                       │
                       ▼
            ┌──────────────────────┐
            │ Is WA Enabled for    │
            │ this User?           │
            │ (Check DB flag)      │
            └────────┬─────────────┘
                     │
            ┌────────▼────────┐
            │ NO → SKIP       │
            │ YES → Continue  │
            └────────┬────────┘
                     │
            ┌────────▼────────────────┐
            │ Does User have          │
            │ Phone Number stored?    │
            └────────┬────────────────┘
                     │
            ┌────────▼────────┐
            │ NO → SKIP       │
            │ YES → Continue  │
            └────────┬────────┘
                     │
            ┌────────▼────────────────────┐
            │ Is Phone Valid Format?      │
            │ (E.164: +91/+1 etc)        │
            └────────┬────────────────────┘
                     │
            ┌────────▼────────┐
            │ NO → LOG ERROR  │
            │ YES → Continue  │
            └────────┬────────┘
                     │
            ┌────────▼────────────────────┐
            │ Check Quiet Hours:          │
            │ User preferences set?       │
            │ Currently in quiet hours?   │
            └────────┬────────────────────┘
                     │
            ┌────────▼────────┐
            │ YES → QUEUE     │
            │ (Send later)    │
            │ NO → CONTINUE   │
            └────────┬────────┘
                     │
            ┌────────▼────────────────────┐
            │ Check Rate Limit:           │
            │ Messages today < Limit?     │
            └────────┬────────────────────┘
                     │
            ┌────────▼────────┐
            │ NO → QUEUE      │
            │ (Send tomorrow) │
            │ YES → CONTINUE  │
            └────────┬────────┘
                     │
            ┌────────▼─────────────────────┐
            │ Message Already Sent for    │
            │ this Event Today?           │
            │ (Check WhatsAppLog)         │
            └────────┬───────────────────┘
                     │
            ┌────────▼────────┐
            │ YES → SKIP      │
            │ NO → CONTINUE   │
            └────────┬────────┘
                     │
            ┌────────▼────────────────────┐
            │ Format Message from         │
            │ Template with Task data     │
            └────────┬────────────────────┘
                     │
            ┌────────▼────────────────────┐
            │ Send via Twilio API         │
            │ with error handling         │
            └────────┬────────────────────┘
                     │
            ┌────────▼────────────────┐
            │ Log Result:             │
            │ ✓ Sent / ✗ Failed       │
            │ Store in WhatsAppLog    │
            └────────────────────────┘
```

---

## 📱 MESSAGE FLOW DIAGRAM

```
FRONTEND                          BACKEND                         WHATSAPP

User Action
   │
   ├─ Create Task ────────────────► POST /api/tasks ──────────────►  (Validate)
   │                                      │
   │                                      ├─► Save to DB
   │                                      │
   │                                      ├─► Emit Event
   │                                      │
   │                    EVENT LISTENER    │
   │                    (WhatsApp Service)│
   │                         │            │
   │                         └────────────┤─► Get User Phone
   │                                      │
   │                                      ├─► Format Message
   │                                      │
   │                                      ├─► Call Twilio API ──────► SEND
   │                                      │                           │
   │                                      │                           ▼
   │                                      │                    WhatsApp Server
   │                                      │                           │
   │                                      │◄─── Delivery Status ─────┘
   │                                      │
   │                                      ├─► Log to DB
   │                                      │
   │◄─── Success Response ─────────────────
   │
   └─► UI Shows "Task Created"
       User Gets WA Notification
       after 0-5 seconds


MESSAGE STRUCTURE (JSON):
{
  "to": "+919876543210",
  "body": "📋 New task: Complete Report\nDue: Jan 15, 2024\nPriority: High",
  "media": ["url/to/attachment"],
  "deepLink": "app://tasks/123"
}

TWILIO RESPONSE:
{
  "sid": "SM1234567890abcdef",
  "accountSid": "AC...",
  "status": "queued",
  "to": "+919876543210",
  "dateSent": "2025-01-15T10:30:00Z"
}
```

---

## 🎯 SUMMARY: ALL 16+ WHATSAPP TOUCHPOINTS

| # | When | What | Who Gets It | Example |
|---|------|------|------------|---------|
| 1 | Task Created | Assignment notification | Assignee | "📋 New task: [Title]" |
| 2 | Task Started | Work started confirmation | Manager | "⏳ Task started: [Title]" |
| 3 | Task Completed | Completion notification | Assigner | "✅ Completed: [Title]" |
| 4 | Score Calculated | Performance feedback | Assignee | "⭐ Great job! +10 pts" |
| 5 | Task Overdue | Alert (repeats daily) | Both | "⚠️ OVERDUE: [Title]" |
| 6 | Objection Created | Change request | Manager | "🔔 Review needed: [Type]" |
| 7 | Objection Approved | Request accepted | Requester | "✅ Approved: New date" |
| 8 | Objection Rejected | Request denied | Requester | "❌ Denied: Reason..." |
| 9 | Project Created | FMS triggered | All assignees | "🎬 New project: [Name]" |
| 10 | Step Started | Task ready | Step owner | "⏱️ Your turn: [Step]" |
| 11 | Step Completed | Completion | Completer | "✅ Step complete!" |
| 12 | Next Step Ready | Previous done | Next owner | "🟢 Ready for you!" |
| 13 | Project Done | All complete | Team+Owner | "🎉 Project complete!" |
| 14 | 48h Reminder | Advance notice | Assignee | "📅 Due in 2 days" |
| 15 | 24h Reminder | Day before | Assignee | "⏰ Tomorrow!" |
| 16 | Due Today | Final push | Assignee | "🔴 DUE TODAY!" |

---

**Diagram Set Generated**: January 2025
**Status**: Complete - Ready for Implementation
