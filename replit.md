# Overview

AMG Task & FMS Management System is a comprehensive MERN stack application for managing tasks, projects, and field management system (FMS) workflows. The system provides task assignment, tracking, completion scoring, recurring task scheduling, FMS template creation, project management with multi-step workflows, checklists, help tickets, and audit logging capabilities.

The application serves the Ashok Malhotra Group's operational needs with role-based access control (superadmin, admin, manager, employee, PC roles), bulk CSV import/export functionality, and detailed performance analytics.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework**: React 18 with TypeScript, using Vite as the build tool

**Routing**: React Router v6 for client-side navigation with protected routes based on user roles and permissions

**State Management**: Context API for authentication (AuthContext) and theming (ThemeProvider with multiple theme options including light, dark, oceanic, forest, sunset, and royal)

**UI Components**: Custom component library with reusable elements (StatusBadge, PriorityBadge, TaskTypeBadge, SearchableSelect with react-select, VoiceRecorder, TaskCompletionModal). Uses Lucide React for icons and Chart.js/Recharts for data visualization.

**Styling**: Tailwind CSS with PostCSS processing, custom CSS variables for theme support, responsive design with mobile-first approach

**Key Design Patterns**:
- Protected routes with role-based access control
- Error boundaries for graceful error handling
- Context-based global state management
- Compound component pattern for complex UI elements
- Render props pattern for data fetching components

## Backend Architecture

**Framework**: Express.js with ES modules

**Database**: MongoDB with Mongoose ODM for schema validation and data modeling

**Authentication**: bcryptjs for password hashing with simple session management (no JWT implementation visible in routes)

**File Handling**: Multer for multipart/form-data processing with local file storage in uploads directory. Supports images, documents, and audio files (up to 10MB)

**API Structure**: RESTful API with route-based organization:
- `/api/auth` - Authentication endpoints
- `/api/tasks` - Task CRUD and scheduling
- `/api/users` - User management
- `/api/fms` - FMS template management
- `/api/projects` - Project/FMS progress tracking
- `/api/checklists` - Checklist management
- `/api/helpTickets` - Help ticket system
- `/api/objections` - Task objection handling
- `/api/dashboard` - Analytics aggregation
- `/api/auditLogs` - Audit trail
- `/api/scoreLogs` - Performance scoring

**Key Design Decisions**:
- Centralized configuration in `server/config.js` for environment-specific settings
- CORS configuration supports multiple domains including production (hub.amgrealty.in) and Replit environments
- Concurrent development mode runs both frontend and backend with concurrently package
- Separate routes for recurring vs one-time tasks to handle scheduling complexity

## Data Models

**User Model**: Username-based authentication with email, phone number, role (superadmin/admin/manager/employee/pc), granular permissions object (canViewTasks, canAssignTasks, canDeleteTasks, etc.), and isActive flag

**Task Model**: Supports both one-time and recurring tasks with frequency (daily/weekly/monthly/quarterly/yearly), complex scheduling with frequency settings (includeSunday, selectedDays, dayOfMonth), revision history, objections (date changes, hold, terminate), attachments, voice recordings, completion scoring, and status tracking (pending/in-progress/completed)

**FMS (Field Management System) Model**: Template-based workflow system with ordered steps, each step containing what/who/how/when fields, checklist items, attachment requirements, and dependency chains (whenType: fixed/dependent/ask-on-completion). Supports FMS triggering other FMS templates.

**Project Model**: Instances of FMS templates with actual execution tracking, task-level status, date tracking (planned vs actual), objections with approval workflow, and completion scoring

**Checklist Model**: Hierarchical checklist system supporting parent-child relationships, recurring patterns (one-time/daily/weekly/fortnightly/monthly/custom), progress calculation, and submission without full completion

**HelpTicket Model**: Employee support system with priority levels, admin assignment, status tracking, and admin remarks history

**AuditLog Model**: Comprehensive audit trail for task_edit, task_delete, fms_edit, date_change, score_change, user_edit actions with old/new value tracking and metadata

**ScoreLog Model**: Performance tracking with completion scores (0-1 scale), planned vs actual days comparison, score impact flags, and timestamp records

## Task Scheduling System

**Recurring Task Generation**: Complex date calculation helpers (getDailyTaskDates, getWeeklyTaskDates, getMonthlyTaskDates, getQuarterlyTaskDates, getYearlyTaskDates) generate future task instances based on frequency settings

**Sunday Handling**: Optional Sunday skipping for daily tasks, with fallback to Monday if enabled

**Frequency Settings**: Configurable per task type - daily tasks can exclude Sundays, weekly tasks allow multiple day selection, monthly/quarterly/yearly tasks use specific day-of-month

**Date Shifting**: FMS projects can shift Sunday due dates to Monday when shiftSundayToMonday is enabled

## Scoring and Performance System

**Completion Scoring**: Automatic score calculation based on planned vs actual completion time. Score = 1 for on-time completion, decreases proportionally for delays.

**Score Impact Tracking**: Objections can be marked to not impact scores (impactScore flag), allowing deadline extensions without penalty

**ScoreLog Creation**: Every task completion creates a ScoreLog entry with task details, user reference, score percentage, and timing metadata

**Dashboard Analytics**: Aggregated metrics by user or team-wide, filterable by date ranges, showing completion rates, average scores, overdue counts, and FMS project statistics

## Import/Export System

**CSV Import Utilities**: Dedicated scripts for bulk importing tasks (`importTasks.js`), FMS templates, and projects from CSV files with duplicate detection and user mapping

**Data Validation**: CSV imports include field validation, date parsing (DD/MM/YYYY format), frequency mapping, and error reporting with detailed logs

**User Matching**: Imports match users by username, phone number, or name with fallback strategies

**Template Management**: Sample CSV templates available for download to ensure correct format

## File Upload and Storage

**Storage Strategy**: Local file system storage in `server/uploads` directory with unique filename generation (timestamp + random suffix)

**File Types**: Supports JPEG, PNG, PDF, DOCX, XLSX, WebM, MP3, WAV with MIME type validation

**Size Limits**: 10MB maximum file size enforced at upload time

**File Organization**: Task attachments and voice recordings stored with references in MongoDB, FMS step attachments embedded in step schema

**Voice Recording**: Browser-based audio recording with MediaRecorder API, saved as audio files and uploaded via multipart form data

# External Dependencies

## Core Framework Dependencies

- **React 18.3.1**: Frontend UI library
- **React Router DOM 6.8.1**: Client-side routing
- **Express 4.21.2**: Backend web framework
- **Mongoose 8.0.3**: MongoDB ODM

## Database

- **MongoDB**: Primary data store (connection string configurable via MONGO_URI environment variable)
- **Default Connection**: mongodb://localhost:27017/task-management-system

## Authentication & Security

- **bcryptjs 2.4.3**: Password hashing
- **cors 2.8.5**: Cross-origin resource sharing
- **express-validator 7.0.1**: Input validation

## File Handling

- **multer 1.4.5-lts.1**: Multipart form data processing
- **csv-parser 3.0.0**: CSV file parsing for imports
- **xlsx 0.18.5**: Excel file handling

## UI Components & Visualization

- **lucide-react 0.344.0**: Icon library
- **chart.js 4.5.0**: Chart rendering
- **react-chartjs-2 5.3.0**: React wrapper for Chart.js
- **recharts 2.12.7**: Alternative charting library
- **react-select 5.10.2**: Searchable dropdown component
- **react-datepicker 4.25.0**: Date selection component
- **react-toastify 11.0.5**: Toast notifications
- **sweetalert2 11.22.0**: Modal dialogs
- **mermaid 11.12.1**: Diagram rendering

## Utilities

- **axios 1.6.7**: HTTP client
- **date-fns 3.6.0**: Date manipulation
- **dotenv 16.6.1**: Environment variable management
- **concurrently 8.2.2**: Run multiple npm scripts simultaneously
- **nodemon 3.1.10**: Development server auto-restart

## Build Tools

- **Vite 4.x**: Frontend build tool and dev server
- **TypeScript**: Type checking (tsconfig files present)
- **Tailwind CSS 3.x**: Utility-first CSS framework
- **PostCSS 8.4.35**: CSS processing
- **ESLint 9.x**: Code linting
- **@vitejs/plugin-react 4.3.1**: React integration for Vite

## Development Tools

- **cross-env 10.1.0**: Cross-platform environment variables
- **googleapis 150.0.1**: Google API client (likely for future integrations)

## Deployment Configuration

- **Production Domain**: https://hub.amgrealty.in
- **PM2**: Process manager (ecosystem.config.js referenced in deployment docs)
- **Build Commands**: Separate production build script with VITE_BACKEND_URL environment variable
- **Port Configuration**: Backend defaults to port 3000 (BACKEND_PORT), frontend dev server on port 5000
- **CORS Origins**: Configured for localhost development and production domain