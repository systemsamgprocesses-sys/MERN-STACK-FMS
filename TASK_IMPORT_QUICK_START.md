# Quick Start: Import Tasks from CSV

## 🚀 How to Import Your Tasks

### Step 1: Ensure Prerequisites
Make sure:
- ✅ MongoDB is running
- ✅ Your `.env` file has the correct `MONGODB_URI`
- ✅ All users exist in the database (run `npm run seed-users` if needed)

### Step 2: Run the Import

Open your terminal and run:

```bash
npm run import-tasks
```

### Step 3: Review the Results

The script will show you:
- ✅ Number of tasks created
- ⏭️ Number of tasks skipped (duplicates)
- ❌ Any errors encountered
- ⚠️ List of missing users (if any)

## 📋 What Gets Imported

From your CSV file (`assets/Management Dashboard _ Delegation System - MASTER (1).csv`), the script imports:

- **304 total tasks** from the CSV
- Task assignments (GIVEN BY → GIVEN TO)
- Due dates (from PLANNED DATE)
- Task status (Pending, Completed, etc.)
- Department information
- Task frequency (One Time, Monthly, Quarterly, etc.)
- Completion dates
- Revision history
- On-hold and terminated status

## 🔍 User Mapping

The script maps users by:
1. Username (from "GIVEN TO USER ID" column)
2. Phone number (from "Numbers" column)
3. Name (from "GIVEN BY" / "GIVEN TO" columns)

## ⚠️ Important Notes

- **Duplicates are skipped** - Tasks with the same title, assignedTo, and assignedBy won't be imported twice
- **Missing users cause skips** - Tasks assigned to/by non-existent users will be skipped
- **Safe to run multiple times** - The import won't create duplicates

## 📊 Expected Results

Based on your CSV:
- Total rows: 304
- Expected imports: ~250-300 (depending on user availability)
- Potential skips: Users not in database yet

## 🛠️ If You Encounter Issues

### Missing Users?
First, ensure all users from the CSV exist in your database. Check the "GIVEN BY" and "GIVEN TO" columns.

Common users in your CSV:
- Karan Malhotra
- Ajay Kumar Jha
- Pratibha Bedi
- Deepak Kumar Ratra
- Ritesh Chaudhary
- And many more...

### Want to see missing users?
Run the import - it will list all missing users at the end!

### Need to add users?
Update your user database or the `server/utils/seedUsers.js` file.

## 📖 Full Documentation

For detailed information, see: `server/utils/IMPORT_TASKS_README.md`

---

**Ready to import?** Just run: `npm run import-tasks` 🚀

