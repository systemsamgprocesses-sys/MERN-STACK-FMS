
# AMG Task & Flow Monitoring System
## Technical Documentation & User Guide

---

## Executive Summary

The **AMG Task & Flow Monitoring System** is a comprehensive MERN-stack application designed for enterprise task management, workflow automation, and performance tracking. Built for Ashok Malhotra Group, this system provides role-based access control, FMS (Flow Management System) templates, recurring task automation, and real-time analytics.

**Version:** 1.1.0  
**Stack:** MongoDB, Express.js, React, Node.js  
**Deployment:** Hostinger VPS (Production: https://hub.amgrealty.in)  
**Last Major Update:** January 2025 (Dynamic Scoring System)

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Database Design (ER Diagram)](#database-design-er-diagram)
3. [Technology Stack](#technology-stack)
4. [Core Features](#core-features)
5. [User Roles & Permissions](#user-roles--permissions)
6. [Frontend User Guide](#frontend-user-guide)
7. [Backend API Documentation](#backend-api-documentation)
8. [Security & Authentication](#security--authentication)
9. [Deployment Architecture](#deployment-architecture)

---

## 1. System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT LAYER (React)                     │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Dashboard  │  │   Tasks     │  │  FMS Management  │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ Checklists  │  │   Reports   │  │   Admin Panel    │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ HTTPS/REST API
┌─────────────────────────────────────────────────────────────┐
│              APPLICATION LAYER (Express.js)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              Route Handlers                          │   │
│  │  /api/auth  /api/tasks  /api/fms  /api/users       │   │
│  │  /api/checklists  /api/projects  /api/objections   │   │
│  └─────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │           Middleware Layer                           │   │
│  │  Authentication | Validation | File Upload          │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↕ Mongoose ODM
┌─────────────────────────────────────────────────────────────┐
│                   DATA LAYER (MongoDB)                       │
│  ┌──────┐ ┌──────┐ ┌─────────┐ ┌──────────┐ ┌─────────┐  │
│  │Users │ │Tasks │ │Projects │ │Checklists│ │AuditLog │  │
│  └──────┘ └──────┘ └─────────┘ └──────────┘ └─────────┘  │
│  ┌──────┐ ┌──────────┐ ┌────────────┐ ┌──────────────┐  │
│  │ FMS  │ │ScoreLog  │ │HelpTickets │ │   Settings   │  │
│  └──────┘ └──────────┘ └────────────┘ └──────────────┘  │
│                                                           │
│  Note: ScoreLogs are now dynamically calculated from    │
│  Tasks, Projects, and Checklists rather than stored      │
└─────────────────────────────────────────────────────────────┘
```

### Component Flow Diagram

```
User Authentication Flow:
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Login   │─────→│   Auth   │─────→│  Verify  │─────→│Dashboard │
│  Page    │      │  API     │      │   User   │      │  Access  │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
                        │
                        ↓
                  ┌──────────┐
                  │ MongoDB  │
                  │  Users   │
                  └──────────┘

Task Creation Flow:
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│ Assign   │─────→│  Task    │─────→│ Schedule │─────→│  Notify  │
│  Task    │      │  API     │      │ Generator│      │  Users   │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
                        │
                        ↓
                  ┌──────────┐
                  │ MongoDB  │
                  │  Tasks   │
                  └──────────┘

FMS Project Flow:
┌──────────┐      ┌──────────┐      ┌──────────┐      ┌──────────┐
│  Start   │─────→│ Project  │─────→│  Create  │─────→│ Activate │
│ Project  │      │   API    │      │  Tasks   │      │ First    │
└──────────┘      └──────────┘      └──────────┘      └──────────┘
                        │
                        ↓
                  ┌──────────┐
                  │ MongoDB  │
                  │ Projects │
                  └──────────┘
```

---

## 2. Database Design (ER Diagram)

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USERS                                    │
├─────────────────────────────────────────────────────────────────┤
│ PK: _id (ObjectId)                                              │
│ username (String, unique)                                       │
│ email (String, unique)                                          │
│ phoneNumber (String, unique, sparse)                            │
│ password (String, hashed)                                       │
│ role (String: superadmin|admin|manager|employee|pc)             │
│ permissions (Object: {                                          │
│   canViewTasks, canViewAllTeamTasks, canAssignTasks,           │
│   canDeleteTasks, canEditTasks, canManageUsers,                │
│   canEditRecurringTaskSchedules, canCompleteTasksOnBehalf      │
│ })                                                              │
│ isActive (Boolean)                                              │
│ createdAt, updatedAt (Timestamps)                              │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         │ 1:N                │ 1:N                │ 1:N
         ↓                    ↓                    ↓
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│      TASKS       │  │    CHECKLISTS    │  │   HELPTICKETS    │
├──────────────────┤  ├──────────────────┤  ├──────────────────┤
│ PK: _id          │  │ PK: _id          │  │ PK: _id          │
│ title            │  │ title            │  │ title            │
│ description      │  │ FK: parentTaskId │  │ description      │
│ taskType         │  │ FK: createdBy    │  │ FK: raisedBy     │
│ FK: assignedBy   │  │ FK: assignedTo   │  │ FK: assignedTo   │
│ FK: assignedTo   │  │ recurrence       │  │ FK: relatedTask  │
│ dueDate          │  │ status           │  │ status           │
│ priority         │  │ items []         │  │ priority         │
│ status           │  │ progressPercent  │  │ adminRemarks []  │
│ attachments []   │  │ submittedAt      │  │ createdAt        │
│ objections []    │  │ createdAt        │  │ updatedAt        │
│ completionScore  │  │ updatedAt        │  └──────────────────┘
│ taskGroupId      │  └──────────────────┘
│ parentTaskInfo   │
│ createdAt        │
│ updatedAt        │
└──────────────────┘
         │
         │ N:1
         ↓
┌──────────────────────────────────────────────────────────────┐
│                       SCORELOGS                               │
│              (Dynamically Calculated)                        │
├──────────────────────────────────────────────────────────────┤
│ PK: _id                                                       │
│ entityType (String: 'task'|'fms'|'checklist')                │
│ entityId (ObjectId: ref to Task/Project/Checklist)           │
│ entityTitle (String: display name)                            │
│ FK: userId (ref: User)                                        │
│ taskType (String: for tasks only)                             │
│ taskCategory (String: for tasks only)                          │
│ score (Number, 0-1)                                           │
│ scorePercentage (Number)                                      │
│ plannedDate (Date: original planned completion)               │
│ completedDate (Date: actual completion)                       │
│ plannedDays (Number)                                          │
│ actualDays (Number)                                           │
│ completedAt (Date: alias for completedDate)                  │
│ wasOnTime (Boolean)                                           │
│ scoreImpacted (Boolean)                                       │
│ impactReason (String)                                         │
│ isCalculated (Boolean: always true)                           │
│ createdAt, updatedAt                                          │
│                                                               │
│ Note: ScoreLogs are generated dynamically from source data    │
│ and not permanently stored. The model structure supports     │
│ both legacy stored logs and new calculated logs.             │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                          FMS                                  │
├──────────────────────────────────────────────────────────────┤
│ PK: _id                                                       │
│ fmsId (String, unique, auto-generated)                        │
│ fmsName (String)                                              │
│ category (String)                                             │
│ FK: createdBy (ref: User)                                     │
│ status (String: Active|Inactive)                              │
│ frequency (String: one-time|daily|weekly|monthly|quarterly|   │
│            yearly)                                            │
│ frequencySettings (Object: {                                  │
│   includeSunday, shiftSundayToMonday,                         │
│   weeklyDays[], monthlyDay, yearlyDuration                    │
│ })                                                            │
│ steps [] (Array of Step Objects: {                            │
│   stepNo, what, who[], how, when, whenUnit, whenType,        │
│   requiresChecklist, checklistItems[], attachments[],         │
│   triggersFMSId, requireAttachments, mandatoryAttachments     │
│ })                                                            │
│ createdAt, updatedAt                                          │
└──────────────────────────────────────────────────────────────┘
         │
         │ 1:N
         ↓
┌──────────────────────────────────────────────────────────────┐
│                       PROJECTS                                │
├──────────────────────────────────────────────────────────────┤
│ PK: _id                                                       │
│ projectId (String, unique, auto-generated)                    │
│ FK: fmsId (ref: FMS)                                          │
│ projectName (String)                                          │
│ startDate (Date)                                              │
│ FK: createdBy (ref: User)                                     │
│ status (String: Active|Completed|On Hold)                     │
│ totalScore (Number)                                           │
│ tasksOnTime (Number)                                          │
│ tasksLate (Number)                                            │
│ averageCompletionTime (Number)                                │
│ tasks [] (Array of Task Objects: {                            │
│   stepNo, what, who[], how, plannedDueDate, actualDueDate,   │
│   status, notes, completedBy, completedAt, requiresChecklist, │
│   checklistItems[], attachments[], whenType, objections[],    │
│   completionScore, scoreImpacted                              │
│ })                                                            │
│ createdAt, updatedAt                                          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                      AUDITLOGS                                │
├──────────────────────────────────────────────────────────────┤
│ PK: _id                                                       │
│ actionType (String: task_edit|task_delete|fms_edit|etc.)      │
│ FK: performedBy (ref: User)                                   │
│ targetType (String: task|fms|user|project|score)              │
│ targetId (String)                                             │
│ reason (String)                                               │
│ oldValue (Mixed)                                              │
│ newValue (Mixed)                                              │
│ metadata (Mixed)                                              │
│ timestamp (Date)                                              │
│ createdAt, updatedAt                                          │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                       SETTINGS                                │
├──────────────────────────────────────────────────────────────┤
│ PK: _id                                                       │
│ type (String, unique)                                         │
│ data (Mixed - JSON configuration)                             │
│ createdAt, updatedAt                                          │
└──────────────────────────────────────────────────────────────┘
```

### Relationship Summary

| Parent      | Child           | Relationship | Description                          |
|-------------|-----------------|--------------|--------------------------------------|
| Users       | Tasks           | 1:N          | User can be assigned multiple tasks  |
| Users       | Checklists      | 1:N          | User can create/be assigned checklists |
| Users       | HelpTickets     | 1:N          | User can raise multiple tickets      |
| Users       | Projects        | 1:N          | User can create multiple projects    |
| Tasks       | ScoreLogs       | 1:N          | Task completion generates score logs |
| FMS         | Projects        | 1:N          | FMS template used for multiple projects |
| Tasks       | Checklists      | 1:N          | Task can have associated checklists  |

---

## 3. Technology Stack

### Frontend Technologies

| Technology        | Version  | Purpose                                |
|-------------------|----------|----------------------------------------|
| React             | 18.3.1   | UI Framework                           |
| TypeScript        | 5.x      | Type-safe JavaScript                   |
| Vite              | 5.4.8    | Build tool & dev server                |
| React Router      | 6.8.1    | Client-side routing                    |
| Tailwind CSS      | 3.x      | Utility-first CSS framework            |
| Axios             | 1.6.7    | HTTP client                            |
| Chart.js          | 4.5.0    | Data visualization                     |
| Recharts          | 2.12.7   | React charting library                 |
| Lucide React      | 0.344.0  | Icon library                           |
| date-fns          | 3.6.0    | Date manipulation                      |
| React Toastify    | 11.0.5   | Toast notifications                    |
| SweetAlert2       | 11.22.0  | Modal dialogs                          |

### Backend Technologies

| Technology        | Version  | Purpose                                |
|-------------------|----------|----------------------------------------|
| Node.js           | 20.x     | JavaScript runtime                     |
| Express           | 4.21.2   | Web framework                          |
| MongoDB           | 7.x      | NoSQL database                         |
| Mongoose          | 8.0.3    | MongoDB ODM                            |
| bcryptjs          | 2.4.3    | Password hashing                       |
| Multer            | 1.4.5    | File upload handling                   |
| CORS              | 2.8.5    | Cross-origin resource sharing          |
| dotenv            | 16.6.1   | Environment variable management        |

### DevOps & Deployment

| Tool              | Purpose                                  |
|-------------------|------------------------------------------|
| PM2               | Process manager for Node.js              |
| Nginx             | Reverse proxy & web server               |
| MongoDB Atlas     | Cloud database (optional)                |
| Git               | Version control                          |
| Replit            | Development & testing environment        |

---

## 4. Core Features

### 4.1 Task Management System

**One-Time Tasks:**
- Create single-instance tasks with due dates
- Assign to individual users
- Set priority (Normal/High)
- Attach files and voice recordings
- Track completion status

**Recurring Tasks:**
- **Daily**: Auto-generate tasks every day (option to exclude Sundays)
- **Weekly**: Select specific days (Mon-Sat or include Sunday)
- **Monthly**: Choose specific day of month (1-31)
- **Quarterly**: Generate 4 tasks per year (every 3 months)
- **Yearly**: Define duration (3, 5, or 10 years)

**Task Lifecycle:**
```
┌─────────┐     ┌─────────────┐     ┌───────────┐     ┌───────────┐
│Assigned │────→│   Pending   │────→│In Progress│────→│ Completed │
└─────────┘     └─────────────┘     └───────────┘     └───────────┘
                       │                                      ↑
                       ↓                                      │
                 ┌─────────┐                                  │
                 │ Overdue │──────────────────────────────────┘
                 └─────────┘
```

### 4.2 FMS (Flow Management System)

**FMS Template Creation:**
- Define multi-step workflows
- Assign users to each step
- Set dependencies (Fixed time | Dependent on previous step | Ask on completion)
- Attach checklists to steps
- Configure triggers to auto-start other FMS projects

**FMS Project Execution:**
- Create project instances from templates
- Automatic task activation based on dependencies
- Real-time progress tracking
- Completion scoring

**Step Types:**
- **Fixed**: Due date calculated from project start
- **Dependent**: Due date calculated from previous step completion
- **Ask on Completion**: User provides due date when previous step completes

### 4.3 Scoring & Performance System

**Dynamic Scoring Architecture:**

The scoring system has been redesigned to calculate scores dynamically from source data (Tasks, FMS Projects, Checklists) rather than storing pre-calculated scores. This ensures scores are always accurate and update automatically when dates are modified.

**Core Scoring Logic:**
```javascript
// Score calculation formula
if (completedDay <= plannedDay) {
  score = 1.0 (100%)  // On-time completion
} else {
  score = plannedDays / actualDays  // Late completion penalty
}
```

**Key Features:**
- **Dynamic Calculation**: Scores calculated on-the-fly from planned and actual dates
- **Real-time Updates**: Automatically reflects date changes from backend edits
- **Multi-Entity Support**: Calculates scores for Tasks, FMS Project Tasks, and Checklists
- **Date Normalization**: All dates normalized to start of day for accurate day calculations
- **Same-Day Handling**: Tasks completed on planned date receive 100% score

**Score Calculation Utility (`server/utils/calculateScore.js`):**

The system uses a centralized utility for consistent score calculations across all entity types:

1. **`calculateScore(plannedDate, completedDate, startDate)`**
   - Core scoring function
   - Normalizes dates to start of day
   - Calculates planned days and actual days
   - Returns: `score`, `scorePercentage`, `plannedDays`, `actualDays`, `wasOnTime`

2. **`calculateTaskScore(task)`**
   - Calculates score for regular tasks
   - Handles date-range tasks (startDate/endDate) and standard tasks (dueDate)
   - Uses `originalPlannedDate` for recurring tasks

3. **`calculateFMSTaskScore(project, taskIndex)`**
   - Calculates score for FMS project tasks
   - Uses `plannedDueDate` or `originalPlannedDate`
   - Extracts task title from FMS step

4. **`calculateChecklistScore(checklist)`**
   - Calculates score for checklist submissions
   - Uses `nextRunDate` or `startDate` as planned date
   - Uses `submittedAt` as completed date

**ScoreLog Model Updates:**

The ScoreLog model now includes additional metadata fields:
- `entityType`: 'task', 'fms', or 'checklist'
- `entityId`: Reference to the source entity
- `entityTitle`: Display name for the entity
- `plannedDate`: Original planned completion date
- `completedDate`: Actual completion date
- `isCalculated`: Flag indicating dynamic calculation (always true)

**Score Categories:**
- Task completion score (per task)
- FMS task completion score (per project step)
- Checklist submission score (per checklist)
- On-time completion rate (percentage)
- Average completion time (days)
- Team performance rankings
- Overall performance percentage (based on completed tasks only)

### 4.4 Checklist System

**Features:**
- Create standalone or task-linked checklists
- Recurring checklists (daily, weekly, monthly, fortnightly, custom)
- Progress tracking (percentage completion)
- Partial submission allowed
- Auto-generate next instance on submission

### 4.5 Help Ticket System

**Workflow:**
```
Employee ────→ Raise Ticket ────→ Admin Review ────→ Resolution
   ↑                                    │
   └────────────── Admin Remark ────────┘
```

**Features:**
- Priority levels (Low, Medium, High)
- Link to related tasks
- Admin remarks history
- Status tracking (Open, In Progress, Closed)

### 4.6 Objection Management

**Objection Types:**
- **Date Change**: Request due date extension
- **Hold**: Temporarily pause task
- **Terminate**: Cancel task

**Approval Flow:**
```
User Request ────→ Admin Review ────→ Approve/Reject
                          │
                          ├── Approved ────→ Score Impact Decision
                          │
                          └── Rejected ────→ Notify User
```

---

## 5. User Roles & Permissions

### Role Hierarchy

```
┌────────────────┐
│  Super Admin   │  (All Permissions + User Management)
└───────┬────────┘
        │
┌───────▼────────┐
│     Admin      │  (All Task Permissions + User Management)
└───────┬────────┘
        │
┌───────▼────────┐
│    Manager     │  (View All Tasks + Assign + Edit)
└───────┬────────┘
        │
┌───────▼────────┐
│   Employee     │  (View Own Tasks + Assign)
└────────────────┘

┌────────────────┐
│       PC       │  (Process Coordinator - Complete Tasks on Behalf)
└────────────────┘
```

### Permission Matrix

| Permission                        | Super Admin | Admin | Manager | Employee | PC |
|-----------------------------------|-------------|-------|---------|----------|----|
| View Own Tasks                    | ✓           | ✓     | ✓       | ✓        | ✓  |
| View All Team Tasks               | ✓           | ✓     | ✓       | ✗        | ✓  |
| Assign Tasks                      | ✓           | ✓     | ✓       | ✓        | ✗  |
| Delete Tasks                      | ✓           | ✓     | ✓       | ✗        | ✗  |
| Edit Tasks                        | ✓           | ✓     | ✓       | ✗        | ✗  |
| Manage Users                      | ✓           | ✓     | ✗       | ✗        | ✗  |
| Edit Recurring Task Schedules     | ✓           | ✓     | ✓       | ✗        | ✗  |
| Complete Tasks on Behalf          | ✓           | ✗     | ✗       | ✗        | ✓  |
| View Audit Logs                   | ✓           | ✓     | ✗       | ✗        | ✗  |
| View Score Logs                   | ✓           | ✓     | ✗       | ✗        | ✗  |
| Approve Objections                | ✓           | ✓     | ✓       | ✗        | ✗  |

---

## 6. Frontend User Guide

### 6.1 Dashboard Page (`/dashboard`)

**Purpose:** Overview of all tasks, metrics, and performance

**Available to:** All Users

**Key Sections:**

1. **Quick Stats Cards:**
   - Total Tasks (click to view Master Tasks)
   - Pending Tasks ≤ Today (click to view Pending Tasks)
   - Completed Tasks (filtered view)
   - Overdue Tasks (tasks past due date)

2. **Additional Metrics:**
   - Upcoming Tasks (> Today)
   - In Progress Tasks
   - Assigned By Me (for users who assign tasks)
   - FMS Tasks, FMS In Progress
   - Today's Tasks

3. **Task Type Distribution:**
   - Breakdown by: One-time, Daily, Weekly, Monthly, Quarterly, Yearly
   - Shows pending vs completed for each type

4. **Charts & Visualizations:**
   - Task Status Pie Chart (Pending, Completed, In Progress, Overdue)
   - Task Type Bar Chart
   - Completion Trend (last 6 months)

5. **Team Performance (Admin/Manager Only):**
   - Team member selector
   - Individual completion rates
   - Performance scores

**User Actions:**
- Click on stat cards to navigate to filtered views
- Select team members to view individual performance
- Toggle between "All Time" and "Current Month" views

---

### 6.2 Pending Tasks (`/pending-tasks`)

**Purpose:** View and complete tasks due today or overdue

**Available to:** All Users

**Features:**

1. **Task List:**
   - Sorted by due date (oldest first)
   - Color-coded by status (Pending: Yellow, Overdue: Red, In Progress: Blue)
   - Shows: Title, Description, Due Date, Assigned By, Priority, Type

2. **Actions:**
   - **View Details**: Click task card to expand
   - **Mark In Progress**: Start working on task
   - **Complete Task**: 
     - Add completion remarks (optional/mandatory based on settings)
     - Upload attachments (optional/mandatory based on settings)
     - Voice recording option
   - **Raise Objection**:
     - Request date change
     - Put on hold
     - Request termination

3. **Filters:**
   - Task Type (One-time, Daily, Weekly, Monthly, etc.)
   - Priority (Normal, High)
   - Status (Pending, In Progress, Overdue)

**Process to Complete a Task:**
```
1. Click on task card
2. Review task details
3. Click "Mark as In Progress" (optional)
4. When done, click "Complete Task"
5. Fill completion remarks (if mandatory)
6. Upload proof/attachments (if mandatory)
7. Submit completion
```

---

### 6.3 Pending Repetitive Tasks (`/pending-recurring`)

**Purpose:** Manage recurring tasks due within next 5 days

**Available to:** All Users

**Difference from Pending Tasks:**
- Shows only recurring tasks (Daily, Weekly, Monthly, Quarterly, Yearly)
- Extended view window (next 5 days vs only today/overdue)
- Auto-generates next instance upon completion

**Completion Behavior:**
- When you complete a recurring task, the system automatically creates the next instance based on the recurrence pattern
- Example: Complete today's daily task → Tomorrow's task is auto-created

---

### 6.4 Master Tasks (`/master-tasks`)

**Purpose:** View all tasks ever created

**Available to:** All Users (see own tasks), Admin/Manager (see all tasks)

**Features:**

1. **Comprehensive List:**
   - All tasks regardless of status
   - Completed, Pending, In Progress, Overdue

2. **Advanced Filters:**
   - Status
   - Task Type
   - Priority
   - Date Range
   - Assigned To (Admin only)

3. **Actions:**
   - View task history
   - Edit tasks (if permission)
   - Delete tasks (if permission)
   - View completion details

4. **Export Options:**
   - Download filtered tasks as CSV
   - Print view

---

### 6.5 Master Repetitive Tasks (`/master-recurring`)

**Purpose:** Manage recurring task schedules

**Available to:** All Users (own tasks), Admin/Manager (all recurring tasks)

**Features:**

1. **Grouped View:**
   - Tasks grouped by task group ID
   - Shows original task and all generated instances

2. **Schedule Information:**
   - Recurrence pattern
   - Next due date
   - Total instances created
   - Completion rate

3. **Actions (Admin/Manager Only):**
   - Edit recurrence schedule
   - Pause/Resume recurring generation
   - Delete entire recurring series

---

### 6.6 Assign Task (`/assign-task`)

**Purpose:** Create new tasks (one-time or recurring)

**Available to:** Users with "canAssignTasks" permission

**Step-by-Step Process:**

**One-Time Task:**
```
1. Select "One-Time" task type
2. Enter task title
3. Enter description
4. Select assigned user
5. Choose due date
6. Set priority (Normal/High)
7. Upload attachments (optional)
8. Record voice note (optional)
9. Set attachment requirements:
   - Allow attachments on completion
   - Make attachments mandatory
10. Click "Assign Task"
```

**Recurring Task:**
```
1. Select recurrence type: Daily/Weekly/Monthly/Quarterly/Yearly
2. Enter task details (title, description, assigned user)
3. Choose start date
4. Configure recurrence:
   
   DAILY:
   - Select end date OR check "Forever" (generates 1 year)
   - Choose "Include Sunday" or exclude
   
   WEEKLY:
   - Select which days of week
   - Start and end date
   - Sunday handling
   
   MONTHLY:
   - Select day of month (1-31)
   - Start and end date
   - Sunday shift to Monday option
   
   QUARTERLY:
   - Automatically creates 4 tasks (every 3 months)
   - Based on start date
   
   YEARLY:
   - Select duration (3, 5, or 10 years)
   - Creates one task per year

5. Set priority and attachments
6. Click "Assign Task"
```

**System Behavior:**
- One-time task creates 1 task
- Daily "Forever" creates ~365 tasks (1 year)
- Weekly creates tasks for selected days within date range
- Monthly creates 1 task per month
- Quarterly creates 4 tasks
- Yearly creates tasks based on duration

---

### 6.7 Assigned By Me (`/assigned-by-me`)

**Purpose:** Track tasks you assigned to others

**Available to:** Users with "canAssignTasks" permission

**Features:**

1. **Task Overview:**
   - Total assigned
   - Pending count
   - Completed count
   - In Progress count
   - Overdue count

2. **Task List:**
   - Sorted by creation date (newest first)
   - Shows: Title, Assigned To, Due Date, Status, Type

3. **Actions:**
   - View task details
   - Edit task (if permission)
   - Delete task (if permission)
   - Check completion status

4. **Filters:**
   - By status
   - By assigned user
   - By task type
   - Date range

---

### 6.8 FMS Templates (`/fms-templates`)

**Purpose:** View and create FMS workflow templates

**Available to:** Users with "canAssignTasks" permission

**Template List View:**
- FMS ID (auto-generated: FMS-0001, FMS-0002, etc.)
- FMS Name
- Number of steps
- Created by
- Creation date
- Total estimated time

**Actions:**
- View template details
- Create new FMS template
- Use template to start project

---

### 6.9 Create FMS (`/create-fms`)

**Purpose:** Design multi-step workflow templates

**Available to:** Users with "canAssignTasks" permission

**Step-by-Step Guide:**

```
1. Enter FMS Name (e.g., "Property Onboarding Process")

2. Add Steps:
   For each step, configure:
   
   a) Step Number (auto-incremented)
   
   b) What (Step description)
      Example: "Verify property documents"
   
   c) Who (Select users)
      - Can assign multiple users to same step
      - All assigned users see the step
   
   d) How (Instructions)
      Example: "Check title deed, sale agreement, NOC"
   
   e) When (Duration/Timing)
      - Duration number (e.g., 2)
      - Duration unit: Days / Hours / Days+Hours
      - If Days+Hours, specify both
   
   f) When Type:
      ├─ Fixed: Calculated from project start date
      ├─ Dependent: Calculated from previous step completion
      └─ Ask on Completion: User provides date after previous step
   
   g) Checklist (Optional):
      - Add checklist items for this step
      - Each item is a checkbox task
   
   h) Attachments:
      - Upload reference files
      - Documents, images, instructions
   
   i) Triggers (Optional):
      - Select another FMS to auto-start
      - Triggered when this step completes
   
   j) Attachment Requirements:
      - Require attachments on step completion
      - Make attachments mandatory

3. Configure Recurrence (Optional):
   - One-time (default)
   - Daily/Weekly/Monthly/Quarterly/Yearly
   - Set frequency settings

4. Click "Create FMS Template"
```

**Example FMS Structure:**
```
FMS: Property Sale Process
├── Step 1: Document Verification (2 days, Fixed)
│   ├── Assigned to: Legal Team
│   ├── Checklist: [Title Deed, Sale Agreement, Tax Receipts]
│   └── Triggers: FMS-0005 (Payment Processing)
│
├── Step 2: Site Inspection (1 day, Dependent on Step 1)
│   └── Assigned to: Field Agent
│
├── Step 3: Client Meeting (Ask on Completion)
│   └── Assigned to: Sales Manager
│
└── Step 4: Final Approval (3 hours, Dependent on Step 3)
    └── Assigned to: Branch Manager
```

---

### 6.10 Start Project (`/start-project`)

**Purpose:** Create project instance from FMS template

**Available to:** All Users (as per latest update)

**Process:**

```
1. Select FMS Template from dropdown
   - Shows all available FMS templates
   - Displays FMS name and step count

2. Enter Project Name
   - Example: "ABC Tower Sale - Unit 205"

3. Select Start Date
   - Project timeline begins from this date

4. Review Auto-Generated Tasks:
   - System shows all steps that will be created
   - Displays calculated due dates
   - Shows assigned users for each step

5. Click "Start Project"

System Actions:
- Generates unique Project ID (PRJ-0001, PRJ-0002, etc.)
- Creates all project tasks
- Activates first step (status: Pending)
- Other steps set to "Not Started" or "Awaiting Date"
```

**Project Task Activation:**
- **Step 1**: Always activated immediately (Pending status)
- **Fixed Steps**: Due date calculated from start date
- **Dependent Steps**: Activated when previous step completes
- **Ask on Completion Steps**: User provides date when previous completes

---

### 6.11 FMS Progress (`/fms-progress`)

**Purpose:** Track ongoing FMS projects

**Available to:** All Users (see own projects), Admin/Manager (see all)

**Features:**

1. **Project List:**
   - Project ID and Name
   - FMS Template used
   - Start date
   - Status (Active, Completed, On Hold)
   - Progress percentage

2. **Project Details:**
   - All steps with status
   - Completed steps (green)
   - Current step (yellow)
   - Upcoming steps (gray)

3. **Step Actions:**
   - View step details
   - Mark in progress
   - Complete step (if it's your turn)
   - Provide planned date (for "Ask on Completion" steps)

4. **Completion:**
   - Add notes
   - Upload attachments (if required)
   - Check off checklist items (if step has checklist)
   - PC users can complete on behalf with confirmation attachment

5. **Project Metrics:**
   - Tasks on time
   - Tasks late
   - Total score
   - Average completion time

---

### 6.12 Performance (`/performance`)

**Purpose:** View team and individual performance metrics and scores

**Available to:** All Users (own performance), Admin/Superadmin (team performance)

**Features:**

1. **Team Performance View (Admin/Superadmin):**
   - Team member cards showing:
     - Total tasks count
     - Overall performance percentage
     - Task type breakdown (One-time, Daily, Weekly, Monthly, Quarterly, Yearly)
     - Completion rate
     - On-time completion rate
   - Sorted by performance score (highest first)
   - "View Detailed Breakdown" button for each team member

2. **Individual Performance View:**
   - Total tasks
   - Average score (calculated from completed tasks only)
   - Completion rate
   - On-time rate
   - Task type breakdown

3. **Performance Calculation:**
   - **Performance Score**: Average of all completed task scores (Tasks, FMS, Checklists)
   - **Completion Rate**: (Completed Tasks / Total Tasks) × 100
   - **On-Time Rate**: (On-Time Completions / Completed Tasks) × 100
   - Only includes tasks completed up to current date (excludes future tasks)

4. **Navigation:**
   - Click "View Detailed Breakdown" to see task-wise scoring details
   - Links to `/performance/details` page

---

### 6.12.1 Detailed Performance (`/performance/details`)

**Purpose:** View task-wise scoring breakdown for individual users

**Available to:** All Users (own data), Admin/Superadmin (any user's data)

**Features:**

1. **Summary Cards:**
   - Total Tasks: Count of all completed tasks with scores
   - Average Score: Mean of all task scores
   - On Time: Count of tasks completed on or before planned date
   - Late: Count of tasks completed after planned date
   - Impacted: Count of tasks with score impact flag

2. **Filters:**
   - **Entity Type**: All Types, Tasks, FMS, Checklists
   - **Task Type**: All Types, One-time, Daily, Weekly, Monthly, Quarterly, Yearly
   - **Status**: All, On Time, Late, Impacted
   - **User Selector** (Admin/Superadmin only): Select any user to view their performance

3. **Detailed Task Table:**
   - **Task**: Entity title and type
   - **Type**: Task type (for tasks) or entity type
   - **Score**: Percentage score (e.g., 96.0%)
   - **Planned On**: Original planned completion date
   - **Completed On**: Actual completion date
   - **Days**: Planned days / Actual days (e.g., 24 / 25)
   - **Status**: On Time, Late, or Impacted

4. **Data Source:**
   - Dynamically calculated from completed tasks, FMS tasks, and checklists
   - Updates automatically when dates are modified
   - Filters by selected user (or all users for superadmin)

5. **Superadmin Access:**
   - Can view all users' detailed performance
   - User dropdown selector at top of page
   - Can filter by any user in the system

---

### 6.13 Checklists (`/checklists`)

**Purpose:** Manage personal and team checklists

**Available to:** All Users

**Features:**

1. **Checklist List:**
   - My Checklists (created by or assigned to you)
   - Status: Draft, Active, Submitted, Archived

2. **Create New Checklist:**
   - Title
   - Assign to user
   - Link to parent task (optional)
   - Add checklist items
   - Set recurrence (one-time, daily, weekly, fortnightly, monthly, custom)

3. **Working on Checklist:**
   - Check off items as completed
   - Add remarks to items
   - Track progress percentage
   - Submit when done

4. **Recurring Checklists:**
   - Auto-generates next instance on submission
   - Maintains checklist structure
   - Resets completion status

---

### 6.14 Checklist Dashboard (`/checklist-dashboard`)

**Purpose:** Overview of checklist metrics

**Available to:** All Users

**Metrics:**
- Total checklists
- Completed checklists
- Pending checklists
- Overdue checklists
- Breakdown by recurrence type
- Recent submissions

---

### 6.15 Help Tickets (`/help-tickets`)

**Purpose:** Raise support requests

**Available to:** All Users (non-admin)

**Process:**

```
1. Click "Create New Ticket"

2. Fill Details:
   - Title (brief description)
   - Description (detailed explanation)
   - Priority (Low, Medium, High)
   - Related Task (optional - link to specific task)

3. Submit Ticket

4. Track Status:
   - Open (newly created)
   - In Progress (admin reviewing)
   - Closed (resolved)

5. View Admin Remarks:
   - Admin responses appear in ticket thread
   - Receive notifications
```

---

### 6.16 Manage Tickets (`/admin-help-tickets`)

**Purpose:** Admin interface for ticket management

**Available to:** Admin, Super Admin

**Features:**

1. **Ticket List:**
   - All tickets from all users
   - Filter by status, priority
   - Sort by creation date

2. **Actions:**
   - View ticket details
   - Add admin remark
   - Change status (Open → In Progress → Closed)
   - Assign to specific admin

3. **Remarks System:**
   - Add multiple remarks
   - Timestamp and author tracking
   - Visible to ticket creator

---

### 6.17 Objection Approvals (`/objection-approvals`)

**Purpose:** Review and approve/reject objections

**Available to:** Admin, Super Admin, Manager

**Workflow:**

```
1. View Pending Objections:
   - Regular tasks
   - FMS project tasks
   - Grouped by type (Date Change, Hold, Terminate)

2. For Each Objection:
   - Review original due date
   - Review requested changes
   - Check user's remarks/reason
   - View extra days requested (for date changes)

3. Make Decision:
   
   APPROVE:
   - Select if score should be impacted
   - Add approval remarks
   - Click "Approve"
   
   REJECT:
   - Add rejection reason
   - Click "Reject"

4. System Actions:
   - Date Change (Approved): Updates due date
   - Date Change (Score Impact): Reduces completion score
   - Hold (Approved): Pauses task, no scoring
   - Terminate (Approved): Cancels task
```

**Objection Types Explained:**

- **Date Change**: 
  - User requests new due date
  - Can impact score if admin chooses
  - Example: Original due: Jan 10, Requested: Jan 15 (5 extra days)

- **Hold**: 
  - Temporarily pause task
  - No completion expected
  - Can resume later
  - No score impact

- **Terminate**: 
  - Permanently cancel task
  - Task marked as terminated
  - No score impact

---

### 6.18 Audit Logs (`/audit-logs`)

**Purpose:** View system activity history

**Available to:** Super Admin, Admin

**Logged Events:**
- Task edits (what changed, who changed, when)
- Task deletions
- FMS edits/deletions
- User modifications
- Date changes
- Score adjustments
- Frequency changes

**Log Details:**
- Action type
- Performed by (user)
- Target (task/FMS/user ID)
- Reason (if provided)
- Old value
- New value
- Timestamp

**Filters:**
- Date range
- Action type
- User
- Target type

---

### 6.19 Score Logs (`/score-logs`)

**Purpose:** View comprehensive scoring history across all entity types

**Available to:** Super Admin, Admin (all logs), Regular Users (own logs)

**Features:**

1. **Dynamic Score Calculation:**
   - Scores calculated in real-time from source data
   - Automatically updates when dates are modified
   - No pre-stored scores (all calculated on-demand)

2. **Multi-Entity Support:**
   - **Tasks**: Regular one-time and recurring tasks
   - **FMS**: FMS project tasks/steps
   - **Checklists**: Checklist submissions

3. **Information Displayed:**
   - **User**: Who completed the task/checklist
   - **Entity Title**: Task name, FMS step name, or checklist title
   - **Entity Type**: Task, FMS, or Checklist
   - **Task Type**: One-time, Daily, Weekly, Monthly, Quarterly, Yearly (for tasks)
   - **Score**: Percentage score (e.g., 96.0%)
   - **Planned On**: Original planned completion date
   - **Completed On**: Actual completion date
   - **Planned/Actual Days**: Planned days / Actual days (e.g., 24 / 25)
   - **Status**: On Time, Late, or Impacted

4. **Filters:**
   - **User Filter**: 
     - Admin/Superadmin: Can select "All Users" or specific user
     - Regular users: Only see own logs
   - **Entity Type Filter**: All Types, Tasks, FMS, Checklists
   - **Date Range**: Filter by completion date (optional)

5. **Pagination:**
   - Default: 50 logs per page
   - Superadmin: Can view all logs (increased limit)

6. **Use Cases:**
   - Performance reviews and evaluations
   - Identify bottlenecks and delays
   - Reward high performers
   - Training needs identification
   - Track improvement over time
   - Audit compliance and accountability

7. **Technical Details:**
   - Uses `fetchAllScoreLogs()` function for dynamic calculation
   - Fetches completed tasks, FMS tasks, and checklists
   - Applies score calculation utility to each entity
   - Sorts by completion date (newest first)

---

### 6.20 Admin Panel (`/admin`)

**Purpose:** User and system management

**Available to:** Admin, Super Admin

**Sections:**

**1. User Management:**
- View all users in table/card format
- User details: Username, Email, Phone, Role, Status
- Permissions breakdown

**Actions:**
- Create new user
- Edit user (username, email, phone, role, permissions)
- Delete user (soft delete)
- Update password
- Activate/deactivate user

**2. Task Completion Settings:**

Configure requirements for task completion:

**Pending Tasks:**
- Allow attachments: Enable/disable file upload on completion
- Mandatory attachments: Force users to upload files
- Mandatory remarks: Require completion notes

**Pending Recurring Tasks:**
- Same settings as above, but specifically for recurring tasks

**Role Creation:**
```
1. Click "Create User"
2. Enter: Username, Email, Phone, Password
3. Select Role:
   - Employee (basic access)
   - Manager (team oversight)
   - Admin (full access)
   - Super Admin (system control)
   - PC (process coordinator)
4. Set Permissions (auto-configured based on role)
5. Click "Create User"
```

**Permission Customization:**
- Some permissions locked per role
- Others can be toggled
- Grayed out = not available for selected role

---

### 6.21 Purchase Dashboard (`/purchase-dashboard`)

**Purpose:** Purchase team specific metrics

**Available to:** All Users

**Features:**
- Purchase-specific task tracking
- Vendor management tasks
- PO (Purchase Order) tracking
- Procurement metrics

---

### 6.22 Sales Dashboard (`/sales-dashboard`)

**Purpose:** Sales team specific metrics

**Available to:** All Users

**Features:**
- Sales task tracking
- Deal pipeline
- Client interaction tasks
- Sales performance metrics

---

## 7. Backend API Documentation

### API Base URL
- **Development:** `http://localhost:3000/api`
- **Production:** `https://hub.amgrealty.in/api`

### Authentication

All API requests (except login) require authentication.

**Headers:**
```
Content-Type: application/json
```

### API Endpoints Summary

| Endpoint                  | Method | Purpose                          |
|---------------------------|--------|----------------------------------|
| `/api/auth/login`         | POST   | User authentication              |
| `/api/users`              | GET    | Get all users                    |
| `/api/users`              | POST   | Create user                      |
| `/api/users/:id`          | PUT    | Update user                      |
| `/api/users/:id/password` | PUT    | Update user password             |
| `/api/tasks`              | GET    | Get tasks with filters           |
| `/api/tasks`              | POST   | Create one-time task             |
| `/api/tasks/create-scheduled` | POST | Create recurring tasks      |
| `/api/tasks/:id`          | PUT    | Update task                      |
| `/api/tasks/:id/complete` | POST   | Complete task                    |
| `/api/tasks/pending`      | GET    | Get pending tasks                |
| `/api/tasks/assigned-by-me` | GET  | Get tasks assigned by user       |
| `/api/fms`                | GET    | Get FMS templates                |
| `/api/fms`                | POST   | Create FMS template              |
| `/api/fms/:fmsId`         | GET    | Get single FMS                   |
| `/api/projects`           | GET    | Get all projects                 |
| `/api/projects`           | POST   | Create project from FMS          |
| `/api/projects/:projectId/tasks/:taskIndex` | PUT | Update project task |
| `/api/checklists`         | GET    | Get checklists                   |
| `/api/checklists`         | POST   | Create checklist                 |
| `/api/checklists/:id/submit` | POST | Submit checklist              |
| `/api/help-tickets`       | GET    | Get help tickets                 |
| `/api/help-tickets`       | POST   | Create ticket                    |
| `/api/objections/pending/:userId` | GET | Get pending objections      |
| `/api/audit-logs`         | GET    | Get audit logs                   |
| `/api/score-logs`         | GET    | Get score logs (dynamically calculated) |
| `/api/score-logs/user/:userId/summary` | GET | Get user score summary |
| `/api/dashboard/analytics`| GET    | Get dashboard analytics          |
| `/api/dashboard/counts`   | GET    | Get task counts                  |

### Key API Examples

**Login:**
```http
POST /api/auth/login
{
  "username": "admin",
  "password": "123456"
}

Response:
{
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@taskmanagement.com",
    "role": "admin",
    "permissions": {...}
  }
}
```

**Create Recurring Task:**
```http
POST /api/tasks/create-scheduled
{
  "title": "Daily Report Submission",
  "description": "Submit daily work report",
  "taskType": "daily",
  "assignedBy": "userId123",
  "assignedTo": "userId456",
  "startDate": "2025-01-01",
  "isForever": true,
  "includeSunday": false,
  "priority": "normal"
}

Response:
{
  "message": "Successfully created 365 tasks",
  "tasksCreated": 365,
  "taskGroupId": "...",
  "tasks": [first 5 tasks]
}
```

**Complete Task:**
```http
POST /api/tasks/:id/complete
{
  "completionRemarks": "All documents verified and approved",
  "completionAttachments": [...],
  "completedBy": "userId123"
}

Response:
{
  "_id": "...",
  "status": "completed",
  "completedAt": "2025-01-15T10:30:00Z",
  "completionScore": 1.0,
  ...
}
```

---

## 8. Security & Authentication

### Password Security

- **Hashing:** bcryptjs with salt rounds (10)
- **Storage:** Only hashed passwords stored in database
- **Validation:** Minimum 6 characters enforced

### Access Control

**Route Protection:**
- Frontend: ProtectedRoute component checks user authentication
- Backend: Middleware validates user session
- Role-based rendering of UI components

**RBAC Implementation:**
```javascript
// Frontend
{user?.permissions?.canManageUsers && (
  <AdminPanelLink />
)}

// Backend
if (!user.permissions.canDeleteTasks) {
  return res.status(403).json({ message: 'Unauthorized' });
}
```

### Data Validation

- Input sanitization on all forms
- File upload restrictions (type, size)
- SQL injection prevention (MongoDB)
- XSS protection (React escaping)

### File Upload Security

- Max file size: 10MB
- Allowed types: JPEG, PNG, PDF, DOCX, XLSX, WebM, MP3, WAV
- Unique filename generation
- Server-side validation

---

## 9. Deployment Architecture

### Production Environment (Hostinger VPS)

```
┌─────────────────────────────────────────────┐
│         Nginx (Reverse Proxy)               │
│         Port 80/443 (HTTPS)                 │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│         PM2 Process Manager                 │
│         Node.js App (Port 3000)             │
│         Instances: 2 (Cluster Mode)         │
└──────────────┬──────────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────────┐
│         MongoDB (Port 27017)                │
│         Database: task-management-system    │
└─────────────────────────────────────────────┘
```

### Process Management

**PM2 Configuration:**
```javascript
{
  name: 'task-management',
  script: './server/index.js',
  instances: 2,
  exec_mode: 'cluster',
  env: {
    NODE_ENV: 'production',
    BACKEND_PORT: 3000
  }
}
```

**Commands:**
- Start: `pm2 start ecosystem.config.js`
- Restart: `pm2 restart task-management`
- Logs: `pm2 logs task-management`
- Monitor: `pm2 monit`

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name hub.amgrealty.in;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### File Structure in Production

```
/var/www/task-management/
├── server/
│   ├── models/
│   ├── routes/
│   ├── uploads/          # User uploaded files
│   └── index.js
├── dist/                 # Built frontend
│   ├── index.html
│   └── assets/
├── logs/
│   ├── out.log
│   ├── err.log
│   └── combined.log
├── .env                  # Environment variables
└── ecosystem.config.js   # PM2 config
```

### Environment Variables

```env
MONGO_URI=mongodb://admin:password@localhost:27017/task-management-system?authSource=admin
BACKEND_PORT=3000
NODE_ENV=production
JWT_SECRET=your-secret-key
CORS_ORIGIN=https://hub.amgrealty.in
```

### Backup Strategy

**Automated MongoDB Backup:**
```bash
# Daily cron job at 2 AM
0 2 * * * /home/deploy/backup-mongodb.sh

# Backup script
mongodump --uri="mongodb://admin:password@localhost:27017/task-management-system?authSource=admin" \
  --out="/home/deploy/mongodb-backups/backup_$(date +%Y%m%d_%H%M%S)"

# Keep last 7 days
find /home/deploy/mongodb-backups -type d -mtime +7 -exec rm -rf {} +
```

### Monitoring

**Health Checks:**
- Endpoint: `GET /health`
- Returns: Server status, uptime, environment

**Logs:**
- Application: PM2 logs
- Nginx: `/var/log/nginx/access.log`, `/var/log/nginx/error.log`
- MongoDB: `/var/log/mongodb/mongod.log`

---

## Appendix A: Common User Workflows

### Workflow 1: Daily Task Completion

```
1. Login to system
2. Navigate to Dashboard
3. Click "Pending Tasks" card
4. Review tasks due today
5. Click on task to expand
6. Click "Mark as In Progress"
7. Complete the work
8. Click "Complete Task"
9. Add remarks (if required)
10. Upload proof (if required)
11. Submit completion
12. System calculates score
13. Task moves to completed
```

### Workflow 2: Creating a Recurring Weekly Report

```
1. Navigate to "Assign Task"
2. Select "Weekly" task type
3. Enter title: "Weekly Sales Report"
4. Enter description
5. Select assigned user
6. Select days: Monday to Friday
7. Set start date
8. Set end date (or select Forever)
9. Uncheck "Include Sunday"
10. Set priority: Normal
11. Enable "Allow attachments on completion"
12. Enable "Make attachments mandatory"
13. Click "Assign Task"
14. System creates 52+ tasks (1 year)
```

### Workflow 3: FMS Project Execution

```
1. Admin creates FMS template "Property Sale Process"
2. Admin adds 5 steps with dependencies
3. Sales manager starts project "Unit 205 Sale"
4. System creates project PRJ-0001
5. Step 1 becomes "Pending" automatically
6. Legal team completes Step 1
7. System activates Step 2 (dependent)
8. Field agent receives notification
9. Step 2 completed
10. Step 3 requires date (ask-on-completion)
11. Sales manager provides date
12. Process continues until all steps done
13. Project marked "Completed"
14. Performance score calculated
```

---

## Appendix B: Troubleshooting Guide

### Common Issues

**Issue: Cannot login**
- Verify username and password
- Check if user is active
- Contact admin to reset password

**Issue: Task not appearing in Pending Tasks**
- Check due date (must be ≤ today)
- Verify task is assigned to you
- Check task status (must be Pending or Overdue)

**Issue: Cannot complete task**
- Ensure task is assigned to you
- Check if mandatory attachments required
- Verify task is not on hold or terminated
- Check if previous FMS step is completed

**Issue: Recurring tasks not generating**
- Verify recurrence settings
- Check if end date has passed
- Ensure task is active

**Issue: Score showing as 0**
- Task must be completed to have score
- Score calculated based on timing
- Check if objection impacted score

---

## Appendix C: System Limits

| Resource                  | Limit          |
|---------------------------|----------------|
| File upload size          | 10 MB          |
| Concurrent users          | Unlimited      |
| Tasks per user            | Unlimited      |
| FMS steps                 | Unlimited      |
| Checklist items           | Unlimited      |
| Attachments per task      | 10             |
| Recurring task duration   | 10 years max   |

---

## Glossary

- **FMS**: Flow Management System - Multi-step workflow template
- **One-Time Task**: Single instance task with specific due date
- **Recurring Task**: Auto-generated tasks based on schedule
- **Task Group ID**: Unique identifier linking recurring task instances
- **Objection**: Request to modify task (date, hold, terminate)
- **Score**: Performance metric (0-1 scale) based on completion timing
- **PC Role**: Process Coordinator - Can complete tasks on behalf of others
- **Checklist**: Sub-tasks that can be tracked independently
- **Audit Log**: System activity history

---

## Contact & Support

**Development Team:** Ashok Malhotra Group IT Department  
**Production URL:** https://hub.amgrealty.in  
**Version:** 1.1.0  
**Last Updated:** January 2025  
**Recent Updates:** Dynamic Scoring System, Detailed Performance Page, Multi-Entity Score Calculation

---

---

## 10. Scoring System Architecture (Updated)

### 10.1 Dynamic Scoring System

**Overview:**

The scoring system has been completely redesigned to calculate scores dynamically from source data rather than storing pre-calculated values. This ensures:

- **Accuracy**: Scores always reflect current data
- **Consistency**: Same calculation logic across all entity types
- **Real-time Updates**: Automatically updates when dates are modified
- **Flexibility**: Easy to modify calculation logic in one place

### 10.2 Score Calculation Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Score Request Flow                        │
└─────────────────────────────────────────────────────────────┘

1. User requests score logs (/api/score-logs)
   │
   ↓
2. Backend calls fetchAllScoreLogs()
   │
   ↓
3. Fetches completed entities:
   ├── Tasks (status: 'completed', completedAt exists)
   ├── FMS Project Tasks (status: 'Done', completedAt exists)
   └── Checklists (status: 'Submitted', submittedAt exists)
   │
   ↓
4. For each entity, calls appropriate calculator:
   ├── calculateTaskScore(task)
   ├── calculateFMSTaskScore(project, taskIndex)
   └── calculateChecklistScore(checklist)
   │
   ↓
5. Each calculator calls calculateScore(plannedDate, completedDate, startDate)
   │
   ↓
6. Returns score data:
   ├── score (0-1)
   ├── scorePercentage (0-100)
   ├── plannedDays
   ├── actualDays
   ├── wasOnTime (boolean)
   └── metadata (userId, entityTitle, etc.)
   │
   ↓
7. Frontend displays formatted score logs
```

### 10.3 Score Calculation Algorithm

**Date Normalization:**
```javascript
// All dates normalized to start of day (00:00:00)
function normalizeDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}
```

**Day Calculation:**
```javascript
// Calculate days between dates
const plannedDay = normalizeDate(plannedDate);
const completedDay = normalizeDate(completedDate);
const startDay = startDate ? normalizeDate(startDate) : null;

// Calculate planned days
const plannedDays = startDay 
  ? Math.round((plannedDay - startDay) / (1000 * 60 * 60 * 24))
  : 0;

// Calculate actual days
let actualDays;
if (plannedDay.getTime() === completedDay.getTime()) {
  // Same day completion
  actualDays = plannedDays || 0;
} else {
  actualDays = startDay
    ? Math.round((completedDay - startDay) / (1000 * 60 * 60 * 24))
    : Math.round((completedDay - plannedDay) / (1000 * 60 * 60 * 24));
}
```

**Score Calculation:**
```javascript
if (completedDay <= plannedDay) {
  // On-time completion
  score = 1.0;
  scorePercentage = 100;
  wasOnTime = true;
} else {
  // Late completion
  if (plannedDays > 0) {
    score = plannedDays / actualDays;
  } else {
    // Penalty for tasks with no planned days
    score = Math.max(0, 1 - (actualDays - plannedDays) * 0.1);
  }
  scorePercentage = score * 100;
  wasOnTime = false;
}
```

### 10.4 Entity-Specific Score Calculation

**1. Regular Tasks:**
```javascript
// Date-range tasks (recurring with startDate/endDate)
if (task.startDate && task.endDate) {
  plannedDate = task.endDate;
  startDate = task.startDate;
}
// Standard tasks
else if (task.originalPlannedDate) {
  plannedDate = task.originalPlannedDate;
  startDate = task.creationDate || task.createdAt;
}
else {
  plannedDate = task.dueDate;
  startDate = task.creationDate || task.createdAt;
}

completedDate = task.completedAt;
```

**2. FMS Project Tasks:**
```javascript
// Get task from project.tasks array
const task = project.tasks[taskIndex];

// Determine planned date
plannedDate = task.plannedDueDate || task.originalPlannedDate;
startDate = project.creationDate || project.startDate;

completedDate = task.completedAt;
```

**3. Checklists:**
```javascript
// Determine planned date
plannedDate = checklist.nextRunDate || checklist.startDate;
startDate = checklist.startDate || checklist.createdAt;

completedDate = checklist.submittedAt;
```

### 10.5 Performance Metrics Calculation

**Individual User Performance:**
```javascript
// Fetch all score logs for user
const scoreLogs = await fetchAllScoreLogs({ userId: user._id });

// Calculate metrics
const totalTasks = scoreLogs.length;
const averageScore = scoreLogs.reduce((sum, log) => sum + log.scorePercentage, 0) / totalTasks;
const onTimeCount = scoreLogs.filter(log => log.wasOnTime).length;
const onTimeRate = (onTimeCount / totalTasks) * 100;
const lateCount = totalTasks - onTimeCount;
const impactedCount = scoreLogs.filter(log => log.scoreImpacted).length;

// Performance score (used for ranking)
const performanceScore = averageScore; // Direct average of all scores
```

**Team Performance:**
```javascript
// For each user in team
for (const user of teamUsers) {
  const userLogs = await fetchAllScoreLogs({ userId: user._id });
  
  // Calculate user metrics
  const userPerformance = {
    username: user.username,
    totalTasks: userLogs.length,
    averageScore: calculateAverage(userLogs),
    performanceScore: calculateAverage(userLogs), // Used for sorting
    completionRate: calculateCompletionRate(user),
    onTimeRate: calculateOnTimeRate(userLogs)
  };
  
  teamPerformance.push(userPerformance);
}

// Sort by performance score
teamPerformance.sort((a, b) => b.performanceScore - a.performanceScore);
```

### 10.6 API Endpoints

**GET `/api/score-logs`**
- **Purpose**: Fetch dynamically calculated score logs
- **Query Parameters**:
  - `userId` (optional): Filter by user ID
  - `entityType` (optional): 'task', 'fms', 'checklist', or 'all'
  - `startDate` (optional): Filter by completion date range
  - `endDate` (optional): Filter by completion date range
  - `page` (optional): Page number for pagination
  - `limit` (optional): Items per page (default: 50)
- **Response**:
```json
{
  "logs": [
    {
      "_id": "task_690f150258284167441dc185",
      "entityType": "task",
      "entityId": "690f150258284167441dc185",
      "entityTitle": "Pantry Expense",
      "userId": { "_id": "...", "username": "..." },
      "taskType": "daily",
      "score": 0.96,
      "scorePercentage": 96.0,
      "plannedDate": "2025-02-12T00:00:00.000Z",
      "completedDate": "2025-02-12T00:00:00.000Z",
      "plannedDays": 24,
      "actualDays": 25,
      "wasOnTime": false,
      "scoreImpacted": false,
      "isCalculated": true
    }
  ],
  "total": 150,
  "page": 1,
  "limit": 50,
  "totalPages": 3
}
```

**GET `/api/score-logs/user/:userId/summary`**
- **Purpose**: Get performance summary for a user
- **Response**:
```json
{
  "summary": {
    "totalTasks": 35,
    "averageScore": 99.9,
    "onTimeTasks": 33,
    "lateTasks": 2,
    "impactedTasks": 0
  },
  "logs": [...]
}
```

### 10.7 Frontend Components

**ScoreLogs.tsx:**
- Displays all score logs in table format
- Filters: User, Entity Type
- Shows: User, Entity Title, Type, Score, Planned On, Completed On, Days, Status
- Pagination support

**Performance.tsx:**
- Team performance cards (Admin/Superadmin)
- Individual performance metrics
- Links to detailed breakdown
- Sorted by performance score

**DetailedPerformance.tsx:**
- Task-wise scoring breakdown
- Summary cards (Total, Average, On Time, Late, Impacted)
- Filters: Entity Type, Task Type, Status
- User selector (Admin/Superadmin)
- Detailed table with all score information

### 10.8 Key Improvements

1. **Real-time Accuracy**: Scores always reflect current data
2. **Automatic Updates**: No manual recalculation needed when dates change
3. **Unified Logic**: Single source of truth for score calculation
4. **Multi-Entity Support**: Consistent scoring across Tasks, FMS, and Checklists
5. **Better Performance Tracking**: Only completed tasks included in performance metrics
6. **Enhanced Filtering**: Filter by entity type, user, date range
7. **Superadmin Access**: Full visibility into all users' scores

### 10.9 Migration Notes

**Legacy ScoreLogs:**
- Old stored ScoreLogs remain in database for historical reference
- New system calculates scores dynamically
- `isCalculated` flag distinguishes new vs old logs
- Both can coexist in the system

**Backward Compatibility:**
- API endpoints maintain same structure
- Frontend components updated to handle new data format
- Existing score logs still accessible for historical data

---

**End of Technical Documentation**
