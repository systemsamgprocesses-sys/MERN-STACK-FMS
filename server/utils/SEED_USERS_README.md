# Users Seeding Utility

## Overview
This utility seeds user accounts into MongoDB from a CSV file. It handles password hashing, role mapping, and permission assignment automatically.

## Files
- `seedUsers.js` - Main seeding function
- CSV Source: `assets/users.csv`

## How to Use

### Quick Start
Run this command from the project root:

```bash
npm run seed-users
```

### What It Does
1. **Reads CSV File** - Parses the users CSV file from the assets folder
2. **Hashes Passwords** - Uses bcryptjs to securely hash all passwords
3. **Maps Roles** - Converts `user` → `employee`, `Super Admin` → `admin`
4. **Sets Permissions** - Automatically assigns permissions based on role
5. **Validates** - Checks for duplicates to prevent re-creating users
6. **Inserts** - Saves new users to MongoDB with full details

### CSV Format Expected
```
Username,Password,Name,Role,Department
Ajay Kumar Jha,Ajay@123,Ajay Kumar Jha,user,ACCOUNTS
Deepak Kumar,MIS@123,Deepak Kumar,Super Admin,MIS
...
```

### Role Mapping

**CSV Role → System Role:**
- `user` → `employee`
- `Super Admin` → `admin`

**Permission Assignment:**

**Employee Permissions:**
- ✅ Can view assigned tasks
- ✅ Can edit own tasks
- ❌ Cannot view all team tasks
- ❌ Cannot assign tasks
- ❌ Cannot delete tasks
- ❌ Cannot manage users

**Admin Permissions:**
- ✅ Can view all team tasks
- ✅ Can assign tasks
- ✅ Can delete tasks
- ✅ Can manage users
- ✅ Can edit recurring task schedules
- ✅ Can edit tasks

### Features
✅ **Password Hashing** - Uses bcryptjs for secure password storage  
✅ **Email Generation** - Auto-generates email from username (format: firstname.lastname@amg.com)  
✅ **Role Mapping** - Converts CSV roles to system-compliant roles  
✅ **Automatic Permissions** - Sets permissions based on role  
✅ **Duplicate Prevention** - Won't create duplicate users  
✅ **Error Handling** - Logs detailed error messages  
✅ **Summary Report** - Shows how many users were created/skipped  

### Example Output
```
📁 CSV File Path: C:\...\assets\users.csv

========================================
🚀 Starting Users Seeding
========================================

📍 MongoDB URI: mongodb://localhost:27017/task-management-system
🔄 Connecting to MongoDB...
✅ Successfully connected to MongoDB

📖 Reading CSV file...
✅ Parsed 40 users from CSV

📝 Converting to MongoDB documents...
✅ Converted 40 users

🔍 Checking for duplicates and inserting...

✅ INSERTED: Ajay Kumar Jha - Ajay Kumar Jha (employee)
✅ INSERTED: Akanksha Jaggi - Akanksha Jaggi (employee)
✅ INSERTED: Amardeep Singh Bains - Amardeep Singh Bains (employee)
✅ INSERTED: Deepak Kumar - Deepak Kumar (admin)
✅ INSERTED: Karan Malhotra - Karan Malhotra (admin)
...

📊 SEEDING SUMMARY
========================================
✅ Inserted: 40
⏭️  Skipped: 0
❌ Errors: 0
📁 Total Processed: 40
========================================

✅ Disconnected from MongoDB

🎉 User seeding completed successfully!
```

### Requirements
- MongoDB server running and configured
- CSV file at `assets/users.csv`
- bcryptjs package installed (already included)

### User Data Created

**40 users will be created including:**
- 2 Super Admins (Deepak Kumar as MIS, Karan Malhotra as MD, MD as generic admin)
- 37 Employees across various departments:
  - ACCOUNTS (5 users)
  - LEASING (4 users)
  - MALL OPERATIONS (3 users)
  - MARKETING (3 users)
  - CIVIL & CONSTRUCTION (3 users)
  - LEGAL & LIAISONING (4 users)
  - ADMIN (4 users)
  - And more...

### Troubleshooting

**Error: "CSV file not found"**
- Check that the CSV file exists at: `assets/users.csv`

**Error: "No users found in database"**
- This is expected on first run - users are being created
- On second run, existing users will be skipped

**Password Not Working**
- Passwords are hashed using bcryptjs
- Use the plain text password from the CSV file to login
- Example: Username: `Ajay Kumar Jha`, Password: `Ajay@123`

**Email Format**
- Auto-generated emails: `firstname.lastname@amg.com` (spaces replaced with dots)
- Example: Ajay Kumar Jha → `ajay.kumar.jha@amg.com`

### Direct Function Usage

You can also import this in your code:

```javascript
import { seedUsersFromCSV } from './server/utils/seedUsers.js';

const result = await seedUsersFromCSV('/path/to/users/csv');
console.log(result); // { inserted: 40, skipped: 0, errors: 0, total: 40 }
```

### User Credentials Quick Reference

**Admin Users:**
- Username: `Deepak Kumar` | Password: `MIS@123` | Role: Super Admin
- Username: `Karan Malhotra` | Password: `Karan@123` | Role: Super Admin
- Username: `MD` | Password: `111111` | Role: Super Admin

**Sample Employee Users:**
- Username: `Ajay Kumar Jha` | Password: `Ajay@123` | Role: Employee
- Username: `Jyoti Soni` | Password: `JYOTI123` | Role: Employee
- Username: `Avinash Kumar` | Password: `Avinash@123` | Role: Employee

---

**Performance:** Creates 40 users in seconds!
**Security:** All passwords are hashed with bcryptjs before storage
