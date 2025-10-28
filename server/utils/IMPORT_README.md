# FMS CSV Import Utility

## Overview
This utility imports FMS template data from a CSV file directly into MongoDB, bypassing the frontend. This is much faster for bulk data migration.

## Files
- `importFMSData.js` - Main import function
- CSV Source: `assets/FMS UPDATIONS - FMS_MASTER (3).csv`

## How to Use

### Quick Start
Run this command from the project root:

```bash
npm run import-fms
```

### What It Does
1. **Reads CSV File** - Parses the CSV file from the assets folder
2. **Groups Data** - Organizes rows by FMS_ID to create complete FMS templates
3. **Maps Users** - Links usernames in CSV to actual MongoDB user IDs
4. **Validates** - Checks for duplicates to prevent re-importing
5. **Inserts** - Saves new FMS templates to MongoDB

### CSV Format Expected
```
FMS_ID, FMS_Name, Step_No, WHAT, WHO, HOW, WHEN, When_Unit, When_Days, When_Hours, 
Created_By, Created_On, Last_Updated_By, Last_Updated_On, Requires_Checklist, 
Checklist_Items, Attachments, Triggers_FMS_ID, When_Type
```

### Features
✅ **Duplicate Prevention** - Won't re-import existing FMS templates  
✅ **User Mapping** - Automatically maps CSV usernames to MongoDB user IDs  
✅ **Nested Data** - Properly handles steps, checklists, and attachments  
✅ **Error Handling** - Logs detailed error messages for troubleshooting  
✅ **Summary Report** - Shows how many records were inserted/skipped  

### Example Output
```
🔄 Connecting to MongoDB...
✅ Connected to MongoDB
📖 Reading CSV file...
✅ Parsed 150 rows from CSV
✅ Grouped data into 5 FMS templates
👥 Fetching users...
✅ Found 15 users
📝 Converting to MongoDB documents...
🔍 Checking for duplicates...
✅ Inserted FMS1760010597676 - Leasing Process
✅ Inserted FMS1759827022663 - BB Agreement
⏭️  Skipping FMS1759901828598 - already exists
✅ Inserted FMS1759987654321 - Transfer Paper

📊 Import Summary:
   ✅ Inserted: 3
   ⏭️  Skipped: 1
   📁 Total: 4

✅ Disconnected from MongoDB
🎉 Import completed successfully!
```

### Requirements
- MongoDB server running and configured
- CSV file at `assets/FMS UPDATIONS - FMS_MASTER (3).csv`
- Users in database with matching usernames from CSV

### Troubleshooting

**Error: "CSV file not found"**
- Check that the CSV file exists at: `assets/FMS UPDATIONS - FMS_MASTER (3).csv`

**Error: "User not found"**
- The script will use the first user in the database as fallback
- To fix, ensure user names in CSV match MongoDB user names

**Duplicate Prevention**
- If some records fail to import, the script won't re-process them on next run
- To re-import, delete existing records from MongoDB first

### Direct Function Usage

You can also import this in your code:

```javascript
import { importFMSFromCSV } from './server/utils/importFMSData.js';

const result = await importFMSFromCSV('/path/to/csv/file.csv');
console.log(result); // { inserted: 5, skipped: 2, total: 7 }
```

---

**Performance:** Imports entire CSV (100+ records) in seconds!
