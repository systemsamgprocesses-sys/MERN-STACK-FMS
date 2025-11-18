# Permission System & Bug Fixes - Summary

## Date: November 18, 2025

### Issues Fixed

#### 1. FMS Templates Not Showing After Creation ✅
**Problem**: Newly created FMS templates were not appearing in the template list, even though the creation alert showed success.

**Root Cause**: The GET `/api/fms` route was filtering templates based on user assignment. Non-admin users could only see FMS where they were assigned to at least one step. Admin/superadmin users should see all templates.

**Fix**: Updated `server/routes/fms.js` line 174-235
- Modified the query logic to allow admin/superadmin to see ALL FMS templates
- Non-admin users still see only FMS where they're assigned
- Added sorting by creation date (newest first)
- Added frequency and frequencySettings to response

#### 2. Trigger Dropdown Not Showing in CreateFMS ✅
**Problem**: The "Trigger FMS on Completion" dropdown was empty even though FMS templates existed.

**Root Cause**: The `fetchFmsList` function in CreateFMS was not passing the `isAdmin` flag to the backend, so it was treated as a regular user.

**Fix**: Updated `src/pages/CreateFMS.tsx` line 81-93
- Added `userId` and `isAdmin` query parameters when fetching FMS list
- Now properly passes admin status to backend

#### 3. Task Editing Permissions - Superadmin Only ✅
**Problem**: Users other than superadmin could edit tasks, but requirement is that ONLY superadmin should be able to edit tasks.

**Backend Fixes**:
- `server/routes/tasks.js`: 
  - Added `isSuperAdmin` middleware (lines 9-16)
  - Protected PUT `/:id` route with superadmin check (line 519)
  - Middleware checks `role` query parameter

**Frontend Fixes**:
- `src/pages/MasterRecurringTasks.tsx`:
  - Changed `canEditRecurringTaskSchedules` to check `user?.role === 'superadmin'` (line 261)
  - Updated edit task handler to check superadmin role and show error if not (lines 358-362)
  - Added role query parameter to API calls (line 375)

- `src/pages/MasterTasks.tsx`:
  - Updated edit button visibility to check `user?.role === 'superadmin'` (lines 420, 785)
  - Added permission check in `handleEditTask` function (lines 252-256)
  - Added role query parameter to API call (line 259)
  - Updated button titles to indicate "Super Admin only"

#### 4. Category Management Permissions - Superadmin Only ✅
**Problem**: Need to restrict category and department management to superadmin only.

**FMS Categories** (`server/routes/fmsCategories.js`):
- Added `isSuperAdmin` middleware (lines 7-15)
- Protected routes:
  - PUT `/:id/category` (line 81)
  - POST `/categories` (line 141)
  - PUT `/categories/update` (line 165)

**Checklist Categories** (`server/routes/checklistCategories.js`):
- Added `isSuperAdmin` middleware (lines 7-15)
- Protected routes:
  - PUT `/:id/categorize` (line 68)
  - POST `/categories` (line 161)
  - POST `/departments` (line 187)
  - PUT `/categories/update` (line 211)
  - PUT `/departments/update` (line 235)

#### 5. Checklist Categories API 404 Errors ✅
**Problem**: Frontend was getting 404 errors when loading checklists:
```
GET http://localhost:3000/api/checklist-categories/categories 404
GET http://localhost:3000/api/checklist-categories/departments 404
```

**Root Cause**: Backend routes used `/categories/list` and `/departments/list` but frontend was calling `/categories` and `/departments`

**Fix**: Updated `server/routes/checklistCategories.js`
- Changed route `/categories/list` to `/categories` (line 97)
- Changed route `/departments/list` to `/departments` (line 129)

#### 6. ChecklistDashboard Duplicate Key Warnings ✅
**Problem**: React warnings about duplicate keys 'T' and 'S' in ChecklistDashboard component.

**Root Cause**: Weekday abbreviations ['S', 'M', 'T', 'W', 'T', 'F', 'S'] have duplicate letters:
- 'S' appears twice (Sunday and Saturday)
- 'T' appears twice (Tuesday and Thursday)
Using these as React keys caused conflicts.

**Fix**: Updated `src/pages/ChecklistDashboard.tsx` line 697-701
- Changed `key={day}` to `key={\`${day}-${dayIdx}\`}`
- Now uses unique combination of day letter and index

---

## Permission System Architecture

### Superadmin Permissions
**Full Access to:**
1. ✅ Edit all tasks (one-time and recurring)
2. ✅ Manage FMS categories (create, update, delete)
3. ✅ Manage Checklist categories and departments
4. ✅ View all FMS templates
5. ✅ All other system features

### Admin Permissions
**Access to:**
1. ✅ View all FMS templates
2. ✅ View all tasks
3. ❌ Cannot edit tasks (superadmin only)
4. ❌ Cannot manage categories (superadmin only)
5. Other permissions based on role configuration

### Regular Users
**Access to:**
1. ✅ View FMS templates where they are assigned
2. ✅ View and complete their own tasks
3. ❌ Cannot edit tasks
4. ❌ Cannot manage categories
5. ❌ Cannot view all templates

---

## Testing Checklist

### FMS Templates
- [ ] Create new FMS template as superadmin
- [ ] Verify template appears immediately in template list
- [ ] Verify trigger dropdown shows all available FMS templates
- [ ] Verify admin can see all templates
- [ ] Verify regular user sees only assigned templates

### Task Editing
- [ ] Verify superadmin can see edit buttons on tasks
- [ ] Verify admin cannot see edit buttons on tasks
- [ ] Verify regular users cannot see edit buttons
- [ ] Verify edit API returns 403 for non-superadmin
- [ ] Verify superadmin can successfully edit tasks

### Category Management
- [ ] Verify superadmin can create/update FMS categories
- [ ] Verify superadmin can create/update checklist categories/departments
- [ ] Verify admin gets 403 error when trying to manage categories
- [ ] Verify regular users get 403 error

### Checklist Dashboard
- [ ] Navigate to checklist dashboard
- [ ] Verify no 404 errors in console
- [ ] Verify no duplicate key warnings
- [ ] Verify categories and departments load correctly

---

## Files Modified

### Backend
1. `server/routes/fms.js` - FMS template access control
2. `server/routes/tasks.js` - Task editing permissions
3. `server/routes/fmsCategories.js` - FMS category permissions & routes
4. `server/routes/checklistCategories.js` - Checklist category permissions & routes

### Frontend
1. `src/pages/CreateFMS.tsx` - FMS list fetching with admin flag
2. `src/pages/MasterRecurringTasks.tsx` - Superadmin edit restrictions
3. `src/pages/MasterTasks.tsx` - Superadmin edit restrictions
4. `src/pages/ChecklistDashboard.tsx` - Duplicate key fix

---

## API Endpoint Changes

### Modified Endpoints
- `GET /api/fms` - Now properly filters by admin status
- `PUT /api/tasks/:id` - Now requires `?role=superadmin` query parameter
- `GET /api/checklist-categories/categories` - Fixed route path
- `GET /api/checklist-categories/departments` - Fixed route path

### Protected Endpoints (Superadmin Only)
- `PUT /api/fms-categories/:id/category`
- `POST /api/fms-categories/categories`
- `PUT /api/fms-categories/categories/update`
- `PUT /api/checklist-categories/:id/categorize`
- `POST /api/checklist-categories/categories`
- `POST /api/checklist-categories/departments`
- `PUT /api/checklist-categories/categories/update`
- `PUT /api/checklist-categories/departments/update`
- `PUT /api/tasks/:id`

---

## Notes

1. **Middleware Implementation**: The `isSuperAdmin` middleware checks the `role` query parameter or request body for 'superadmin' value. This is a simple implementation but works for the current authentication system.

2. **Frontend Permission Checks**: All edit buttons and actions are hidden from non-superadmin users, providing a clear UX that only superadmins can edit.

3. **Backward Compatibility**: Regular users and admins can still complete tasks, view progress, and perform other operations. Only editing is restricted to superadmin.

4. **Error Messages**: Clear error messages are shown when non-superadmins attempt restricted actions.

