# Task Import Utility

This utility allows you to bulk import tasks from the CSV file into your MongoDB database.

## Prerequisites

- MongoDB must be running
- All users referenced in the CSV must already exist in the database
- The CSV file must be located at: `assets/Management Dashboard _ Delegation System - MASTER (1).csv`

## CSV Format

The import script expects the following columns:

| Column Name | Description | Required |
|------------|-------------|----------|
| Task Id | Unique task identifier (e.g., AT-1, AT-2) | Yes |
| GIVEN BY | Username of person assigning the task | Yes |
| GIVEN TO | Name of person receiving the task | Yes |
| GIVEN TO USER ID | Username of person receiving the task | Yes |
| Numbers | Phone number of assignee | No |
| TASK DESCRIPTION | Title/description of the task | Yes |
| HOW TO DO- TUTORIAL LINKS (OPTIONAL) | Additional instructions | No |
| DEPARTMENT | Department name | No |
| TASK FREQUENCY | One Time Only, MONTHLY, QUARTERLY, YEARLY | Yes |
| PLANNED DATE | Due date in DD/MM/YYYY format | No |
| Task Status | Pending, Completed, On-Hold, Terminated, HOLD BY MD | No |
| completed on | Completion date in DD/MM/YYYY format | No |
| Revision Status & Log | JSON array of revision history | No |
| Revision Count | Number of revisions | No |
| Scoring Impact | Yes/No - whether score is impacted | No |
| On time or not? | On Time / Not On Time | No |

## How to Run

### Method 1: Using npm script (Recommended)

```bash
npm run import-tasks
```

### Method 2: Using node directly

```bash
node server/utils/importTasks.js
```

## What the Script Does

1. **Connects to MongoDB** - Uses the connection string from your `.env` file
2. **Reads CSV** - Parses all tasks from the CSV file
3. **Maps Users** - Builds a mapping of usernames and phone numbers to User IDs
4. **Validates Data** - Checks if users exist and if tasks are duplicates
5. **Creates Tasks** - Imports valid tasks into the database
6. **Reports Results** - Shows a summary of created, skipped, and failed imports

## Features

- ✅ **Duplicate Detection** - Skips tasks that already exist
- ✅ **User Mapping** - Maps by username or phone number
- ✅ **Date Parsing** - Handles DD/MM/YYYY format
- ✅ **Status Mapping** - Converts CSV statuses to database statuses
- ✅ **Revision History** - Imports revision logs if present
- ✅ **Error Handling** - Reports missing users and errors
- ✅ **Progress Tracking** - Shows progress every 50 tasks

## Expected Output

```
========================================
🚀 Starting Task Import Process
========================================

✓ Connected to MongoDB
✓ Read 304 tasks from CSV
✓ Built mapping for 45 users

📊 Processing tasks...

   Progress: 50/304 tasks processed...
   Progress: 100/304 tasks processed...
   Progress: 150/304 tasks processed...
   Progress: 200/304 tasks processed...
   Progress: 250/304 tasks processed...
   Progress: 300/304 tasks processed...

========================================
📊 Import Summary
========================================
Total tasks in CSV:     304
✓ Successfully created: 285
⏭️  Skipped:             15
❌ Errors:              4

⚠️  Missing Users:
   - Test User
   - John Doe

✓ Import process completed!
========================================

✓ Database connection closed
Import completed successfully!
```

## Troubleshooting

### Issue: "Could not find user"
**Solution:** Make sure all users in the CSV exist in your database. Run `npm run seed-users` first if needed.

### Issue: "Failed to parse date"
**Solution:** Ensure dates are in DD/MM/YYYY format (e.g., 30/10/2025)

### Issue: "Connection refused"
**Solution:** Make sure MongoDB is running and the connection string in `.env` is correct

### Issue: Tasks are being skipped as duplicates
**Solution:** The script checks for existing tasks with the same title, assignedTo, and assignedBy. This prevents duplicate imports.

## Modifying the Import

If you need to customize the import process, edit `server/utils/importTasks.js`:

- **Frequency Mapping** - Update `FREQUENCY_MAP` object
- **Status Mapping** - Update `STATUS_MAP` object
- **Date Format** - Modify `parseDate()` function
- **Duplicate Detection** - Modify the duplicate check logic

## Safety Features

- ✅ Does NOT delete existing tasks
- ✅ Skips duplicates automatically
- ✅ Validates users before creating tasks
- ✅ Provides detailed error reporting
- ✅ Closes database connection properly

## Notes

- The import is **idempotent** - you can run it multiple times safely
- Tasks with missing users will be skipped
- Invalid dates will default to current date
- The script preserves revision history from the CSV

