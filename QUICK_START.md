# 🚀 Quick Start Guide - Stationery System

## Step 1: Install HR Portal Dependencies

```bash
cd hr-admin-portal
npm install
cd ..
```

## Step 2: Create HR User

```bash
npm run seed-hr-user
```

**HR Login Credentials:**
- Email: `hr@amgrealty.in`
- Password: `hrpassword123`

## Step 3: Start Everything

```bash
npm run dev
```

This will start:
- ✅ Backend API: http://localhost:3000
- ✅ Employee App: http://localhost:5173
- ✅ HR Portal: http://localhost:5174

## Access the Applications

### Employee App (http://localhost:5173)
- Login with any employee account
- Go to **"New Stationery Request"** in sidebar
- Submit requests and track them

### HR Portal (http://localhost:5174)
- Login with `hr@amgrealty.in` / `hrpassword123`
- Manage inventory, approve requests

## New Features Added ✨

### 1. Search in Request Form
- Search bar to filter items by name or category
- Real-time filtering as you type

### 2. CSV Import in HR Portal
- **Download Sample CSV** button to get template
- **Import CSV** button to bulk upload items
- Automatic validation and error reporting

### 3. Fixed Duplicate Menu Items
- Removed duplicate stationery items from sidebar

## Sample CSV Format

```csv
name,category,quantity,unit,description
Blue Pen,Writing,100,pieces,Standard blue ballpoint pen
A4 Paper,Paper,500,reams,White A4 printing paper
Paper Clips,General,200,boxes,Standard metal paper clips
```

## Troubleshooting

### If backend doesn't start:
1. Check if MongoDB is running
2. Check `.env` file exists in root
3. Run `npm install` in root directory

### If HR portal doesn't start:
1. Run `cd hr-admin-portal && npm install`
2. Make sure port 5174 is not in use

### If you get CORS errors:
- The backend is already configured for ports 5173 and 5174
- Just make sure all three services are running

## Testing the Complete Flow

1. **Add Inventory (HR Portal):**
   - Login to HR portal
   - Go to Inventory Master
   - Click "Add New Item" or "Import CSV"
   - Add some stationery items

2. **Submit Request (Employee App):**
   - Login to employee app
   - Go to "New Stationery Request"
   - Use search to find items
   - Add items and submit

3. **Approve Request (HR Portal):**
   - Go to Dashboard
   - Find pending request
   - Click "Approve"

4. **Receive Items (Employee App):**
   - Go to "My Stationery Requests"
   - Find approved request
   - Click "Mark as Received"
   - Stock will be automatically deducted!

5. **Check Issue Log (HR Portal):**
   - Go to "Issue Log"
   - See all completed requests

## 🎉 You're all set!

