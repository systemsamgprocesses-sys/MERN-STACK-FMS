# Tasks CSV Import Utility

## Overview
This utility imports task data from a CSV file directly into MongoDB, bypassing the frontend. This is much faster for bulk task data migration.

## Files
- `importTasksData.js` - Main import function
- CSV Source: `assets/tasks.csv`

## How to Use

### Quick Start
Run this command from the project root:

```bash
npm run import-tasks
```

### What It Does
1. **Reads CSV File** - Parses the CSV file from the assets folder
2. **Parses Dates** - Converts DD/MM/YYYY dates to MongoDB Date objects
3. **Maps Users** - Links usernames in CSV to actual MongoDB user IDs
4. **Converts Status** - Maps CSV status values to valid task statuses
5. **Validates** - Checks for duplicates to prevent re-importing
6. **Inserts** - Saves new tasks to MongoDB

### CSV Format Expected
```
Task Id, GIVEN BY, GIVEN TO, GIVEN TO USER ID, TASK DESCRIPTION, HOW TO DO- TUTORIAL LINKS (OPTIONAL),
DEPARTMENT, TASK FREQUENCY, PLANNED DATE, Task Status, Revision Date, Reason for Revision, completed on,
Revision Status, Revision 1 Date, Revision 2 Date, Revision Status & Log, Revision Count, Scoring Impact, On time or not?
```

### Supported Mappings

**Task Frequency → Task Type:**
- `One Time Only` → `one-time`
- `DAILY` → `daily`
- `WEEKLY` → `weekly`
- `MONTHLY` → `monthly`
- `QUARTERLY` → `quarterly`
- `YEARLY` → `yearly`

**Task Status:**
- `Pending` → `pending`
- `In Progress` → `in-progress`
- `Completed` → `completed`
- `Overdue` → `overdue`

### Features
✅ **Date Parsing** - Converts DD/MM/YYYY format to ISO dates  
✅ **User Mapping** - Automatically maps CSV usernames to MongoDB user IDs  
✅ **Duplicate Prevention** - Won't re-import existing tasks  
✅ **Status Conversion** - Maps CSV status to valid task states  
✅ **Error Handling** - Logs detailed error messages for troubleshooting  
✅ **Summary Report** - Shows how many records were inserted/skipped  

### Example Output
```
📁 CSV File Path: C:\...\assets\tasks.csv

========================================
🚀 Starting Tasks CSV Import
========================================

📍 MongoDB URI: mongodb://localhost:27017/task-management-system
🔄 Connecting to MongoDB...
✅ Successfully connected to MongoDB

📖 Reading CSV file...
✅ Parsed 261 rows from CSV

👥 Fetching users from database...
✅ Found 2 users in database

📝 Converting to MongoDB documents...
✅ Converted 261 tasks

🔍 Checking for duplicates and inserting...

⚠️  User "Karan Malhotra" not found, using first user
⚠️  User "AJAY KUMAR JHA" not found, using first user
✅ INSERTED: AT-1 - Provisional Balance Sheet (completed)
✅ INSERTED: AT-2 - Final Balance Sheet (completed)
✅ INSERTED: AT-3 - Final Balance Sheet (completed)
...

📊 IMPORT SUMMARY
========================================
✅ Inserted: 261
⏭️  Skipped: 0
❌ Errors: 0
📁 Total Processed: 261
========================================

✅ Disconnected from MongoDB

🎉 Import completed successfully!
```

### Requirements
- MongoDB server running and configured
- CSV file at `assets/tasks.csv`
- Users in database (or first user will be used as fallback)

### Troubleshooting

**Error: "CSV file not found"**
- Check that the CSV file exists at: `assets/tasks.csv`

**Error: "No users found in database"**
- Create at least one user before importing tasks
- Tasks will be assigned to the first user by default

**Duplicate Prevention**
- If some records fail to import, the script won't re-process them on next run
- To re-import, delete existing tasks from MongoDB first

**Date Parsing Issues**
- Ensure dates are in DD/MM/YYYY format (e.g., 01/09/2025)
- Tasks with invalid dates will be skipped

### Direct Function Usage

You can also import this in your code:

```javascript
import { importTasksFromCSV } from './server/utils/importTasksData.js';

const result = await importTasksFromCSV('/path/to/csv/file.csv');
console.log(result); // { inserted: 261, skipped: 0, errors: 0, total: 261 }
```

---

**Performance:** Imports entire CSV (261+ records) in seconds!
