# FMS Data Import Guide

## 📋 Overview

You have two CSV files to import:
1. **FMS UPDATIONS - FMS_MASTER (4).csv** - FMS Templates with all steps
2. **FMS UPDATIONS - FMS_PROGRESS.csv** - Existing projects with progress

## 🚀 Step-by-Step Import Process

### Step 1: Import FMS Templates

This will import all your FMS templates (Leasing Process, BB Agreement, etc.) into the database.

```bash
npm run import-fms-actual
```

**What it does:**
- ✅ Reads your FMS Master CSV
- ✅ Groups steps by FMS_ID
- ✅ Maps WHO field to user IDs
- ✅ Parses checklist items (JSON)
- ✅ Handles both "days" and "hours" timing
- ✅ Creates or updates FMS templates
- ✅ Maintains all step details

**Expected Output:**
```
🚀 ACTUAL FMS IMPORT UTILITY
📂 CSV File: assets/FMS UPDATIONS - FMS_MASTER (4).csv

✅ Read 154 rows from CSV
✅ Found 10 users in database
✅ Found 15 unique FMS templates

✅ Inserted FMS: Leasing Process (FMS1760010597676) - 7 steps
✅ Inserted FMS: BB Agreement (FMS1759827022663) - 5 steps
...

📊 IMPORT SUMMARY
✅ Successfully inserted: 15 FMS templates
🔄 Successfully updated: 0 FMS templates
❌ Errors: 0 FMS templates
```

### Step 2: Import FMS Progress (Projects)

This will import all your ongoing projects with their current progress.

```bash
npm run import-fms-progress
```

**What it does:**
- ✅ Reads your FMS Progress CSV
- ✅ Groups tasks by Project_ID
- ✅ Maps all users (WHO, Completed_By, Created_By)
- ✅ Links projects to FMS templates
- ✅ **Adds missing steps as "Not Started"**
- ✅ Preserves completion status and dates
- ✅ Parses checklist items with completion status
- ✅ Creates or updates projects

**Expected Output:**
```
🚀 FMS PROGRESS IMPORT UTILITY
📂 CSV File: assets/FMS UPDATIONS - FMS_PROGRESS.csv

✅ Read 22 rows from CSV
✅ Found 10 users in database
✅ Found 15 FMS templates in database
✅ Found 1 unique projects

  ➕ Adding missing step 10 for project Crossword
  ➕ Adding missing step 11 for project Crossword

✅ Inserted Project: Crossword (PRJ1760772790070) - 15 tasks

📊 IMPORT SUMMARY
✅ Successfully inserted: 1 projects
🔄 Successfully updated: 0 projects
❌ Errors: 0 projects
```

## 🎯 Key Features

### FMS Templates Import

1. **Automatic User Mapping**
   - Maps usernames from WHO field to MongoDB user IDs
   - Handles comma-separated multiple users
   - Falls back to first user if username not found

2. **Checklist Support**
   - Parses JSON checklist items
   - Maintains checklist structure
   - Sets all items as uncompleted initially

3. **Timing Information**
   - Supports WHEN, When_Unit, When_Days, When_Hours
   - Handles both "days" and "hours" units
   - Preserves When_Type (fixed/dependent)

4. **Update or Insert**
   - Checks if FMS exists by FMS_ID
   - Updates existing templates
   - Inserts new templates

### FMS Progress Import

1. **Status Handling**
   - Preserves "Done" status from CSV
   - **Marks empty/missing status as "Not Started"**
   - Maintains completion dates and users

2. **Missing Steps Detection**
   - Compares CSV data with FMS template
   - **Automatically adds missing steps as "Not Started"**
   - Ensures all FMS steps are present in project

3. **Date Parsing**
   - Planned_Due_Date → plannedDueDate
   - Actual_Completed_On → completedAt
   - Handles ISO date format

4. **Checklist Progress**
   - Maintains completed status
   - Preserves completedBy user
   - Keeps checklist structure

## 📂 File Locations

Your CSV files should be in:
```
assets/
  ├── FMS UPDATIONS - FMS_MASTER (4).csv
  └── FMS UPDATIONS - FMS_PROGRESS.csv
```

## ⚠️ Before Running

### 1. Ensure Users Exist

The WHO, Created_By, and Completed_By fields reference usernames. Make sure these users exist in your database:

```bash
# Check users in your database
mongo task-management-system
> db.users.find({}, {username: 1})
```

Users mentioned in your CSV:
- Amardeep Singh Bains
- Lalit Chander
- Deepak Kumar Ratra
- Raghav Malhotra
- Jyoti Soni
- etc.

If users are missing, create them via Admin Panel or seed script.

### 2. Database Connection

Update your `.env` file with production MongoDB URI:

```env
MONGO_URI=mongodb://localhost:27017/task-management-system
# OR for remote MongoDB
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/task-management-system
```

## 🔍 Troubleshooting

### Issue: User not found warnings

**Warning:**
```
⚠️  User "John Doe" not found, using first user
```

**Solution:**
- Check username spelling in CSV matches database exactly
- Create missing users via Admin Panel
- Case-insensitive matching is applied

### Issue: FMS template not found

**Error:**
```
⚠️  FMS template FMS1234567890 not found, skipping project ABC
```

**Solution:**
- Run `npm run import-fms-actual` first
- Ensure FMS_ID in progress CSV matches master CSV

### Issue: Invalid date format

**Warning:**
```
⚠️  Invalid planned due date for step 5
```

**Solution:**
- Dates should be in ISO format: `2025-10-20T02:00:00.000Z`
- Or standard format: `2025-10-20`

## 📊 Data Verification

After import, verify your data:

### Check FMS Templates

```bash
mongo task-management-system
> db.fms.countDocuments()
> db.fms.find({}, {fmsName: 1, stepCount: 1})
```

### Check Projects

```bash
> db.projects.countDocuments()
> db.projects.find({}, {projectName: 1, status: 1})
```

### Check Missing Steps

```bash
> db.projects.aggregate([
  { $unwind: "$tasks" },
  { $match: { "tasks.status": "Not Started" } },
  { $group: { _id: "$projectName", notStartedCount: { $sum: 1 } } }
])
```

## 🎉 Expected Results

After successful import:

### FMS Templates
- All 15 FMS templates imported
- All steps preserved with correct details
- Checklists imported correctly
- User assignments mapped

### Projects
- All projects imported with current progress
- Completed tasks maintain status and dates
- **Missing steps added as "Not Started"**
- All checklist items preserved

## 🔄 Re-running Imports

### Update FMS Templates
If you modify the FMS Master CSV, re-run:
```bash
npm run import-fms-actual
```
- Existing templates will be **updated**
- New templates will be **inserted**

### Update Projects
If you modify the FMS Progress CSV, re-run:
```bash
npm run import-fms-progress
```
- Existing projects will be **updated**
- New projects will be **inserted**
- Missing steps will be added

## 📝 CSV Format Reference

### FMS Master CSV Columns:
- FMS_ID
- FMS_Name
- Step_No
- WHAT
- WHO (comma-separated usernames)
- HOW
- WHEN
- When_Unit (days/hours)
- When_Days
- When_Hours
- Created_By
- Requires_Checklist (TRUE/FALSE)
- Checklist_Items (JSON array)
- When_Type (fixed/dependent)

### FMS Progress CSV Columns:
- Project_ID
- FMS_ID
- Project_Name
- Step_No
- WHAT
- WHO (comma-separated usernames)
- HOW
- Planned_Due_Date (ISO date)
- Actual_Completed_On (ISO date)
- Status (Done/Not Started/etc.)
- Completed_By (username)
- Created_By (username)
- Requires_Checklist (TRUE/FALSE)
- Checklist_Items (JSON array with completed status)

## 🚀 Quick Start

Complete import process:

```bash
# 1. Import FMS Templates
npm run import-fms-actual

# 2. Import Projects with Progress
npm run import-fms-progress

# Done! Your data is now in the database
```

## ✅ Success Criteria

- [x] All FMS templates imported
- [x] All steps present in each template
- [x] User mappings correct
- [x] Checklists preserved
- [x] All projects imported
- [x] Completed tasks maintain status
- [x] Missing steps added as "Not Started"
- [x] Dates parsed correctly
- [x] All user assignments mapped

Your FMS data is now ready to use in the application! 🎊

