# 🚀 Quick Start: Import Your FMS Data

## Your CSV Files
✅ **FMS UPDATIONS - FMS_MASTER (4).csv** - Ready (154 rows, 15 FMS templates)
✅ **FMS UPDATIONS - FMS_PROGRESS.csv** - Ready (22 rows, projects with progress)

## 📝 Before You Start

### 1. Update .env File
Your backend is at `hub.amgrealty.in`, so update `.env`:

```env
MONGO_URI=mongodb://localhost:27017/task-management-system
# OR if remote MongoDB:
# MONGO_URI=mongodb+srv://user:pass@hub.amgrealty.in/task-management-system
```

### 2. Ensure These Users Exist in Database

From your CSV, these users are referenced:
- Amardeep Singh Bains
- Lalit Chander
- Deepak Kumar Ratra
- Raghav Malhotra
- Jyoti Soni
- Executive - Documentation

**If users don't exist:**
- Login as admin → Admin Panel → Create users
- **OR** Usernames will fall back to first user with a warning

## 🎯 Import Process (2 Commands)

### Step 1: Import FMS Templates (Master Data)

```bash
npm run import-fms-actual
```

**This imports:**
- ✅ Leasing Process (7 steps)
- ✅ BB Agreement (multiple steps)
- ✅ All other FMS templates
- ✅ All step details, checklists, user assignments

### Step 2: Import Projects & Progress

```bash
npm run import-fms-progress
```

**This imports:**
- ✅ Crossword project with all tasks
- ✅ All other projects
- ✅ Current progress (Done/Pending)
- ✅ **Adds missing steps as "Not Started"**
- ✅ Completion dates preserved

## ⚡ That's It!

After running both commands, your data will be in the database and visible in the application:
- FMS Templates → viewable at `/fms-templates`
- Projects → viewable at `/fms-progress`

## 🔍 Verify Import

### Check in Application:
1. Login to app
2. Go to "FMS Templates" - should see all 15 templates
3. Go to "FMS Progress" - should see your projects with progress

### Check in Database:
```bash
mongo task-management-system
> db.fms.countDocuments()  // Should show 15
> db.projects.countDocuments()  // Should show your projects
```

## 🔄 Update Data Later

If you modify your CSV files:
```bash
# Update FMS templates
npm run import-fms-actual

# Update projects
npm run import-fms-progress
```

Existing records will be **updated**, not duplicated.

## ⚠️ Troubleshooting

### "User not found" warnings
→ Create missing users in Admin Panel

### "FMS template not found"
→ Run import-fms-actual before import-fms-progress

### "Cannot connect to MongoDB"
→ Check MONGO_URI in .env file

### "File not found"
→ Ensure CSV files are in `assets/` folder

## 📞 Support

If you see errors, check:
1. MongoDB is running
2. Users exist in database
3. CSV files are in correct location
4. .env MONGO_URI is correct

---

**Ready? Run these two commands:**

```bash
npm run import-fms-actual
npm run import-fms-progress
```

Done! 🎉

