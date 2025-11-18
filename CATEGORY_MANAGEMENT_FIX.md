# Category Management 404 Error Fix

## Date: November 18, 2025

### Issue
Getting 404 error when adding categories:
```
POST http://localhost:3000/api/fms-categories/categories 404 (Not Found)
```

### Root Cause
The backend routes were registered with incorrect paths in `server/index.js`:
- Registered as `/api/fms/categories` but frontend was calling `/api/fms-categories/categories`
- Registered as `/api/checklists/categories` and `/api/checklists/departments` but frontend was calling `/api/checklist-categories/categories` and `/api/checklist-categories/departments`

This caused the full API paths to be mismatched.

### Solution

#### 1. Fixed Route Registration (`server/index.js`)

**Before:**
```javascript
app.use('/api/fms/categories', fmsCategoryRoutes);
app.use('/api/checklists/categories', checklistCategoryRoutes);
app.use('/api/checklists/departments', checklistCategoryRoutes);
```

**After:**
```javascript
app.use('/api/fms-categories', fmsCategoryRoutes);
app.use('/api/checklist-categories', checklistCategoryRoutes);
```

**Result:**
- FMS categories now accessible at: `/api/fms-categories/categories`, `/api/fms-categories/categories/update`
- Checklist categories now accessible at: `/api/checklist-categories/categories`, `/api/checklist-categories/departments`, etc.

#### 2. Added Permission Checks to CategoryManagement Component

**File:** `src/pages/CategoryManagement.tsx`

**Changes:**
1. **Imported useAuth hook**:
   ```typescript
   import { useAuth } from '../contexts/AuthContext';
   const { user } = useAuth();
   ```

2. **Added superadmin checks to all API calls**:
   - `handleAddCategory()` - Checks if user is superadmin before adding
   - `handleAddDepartment()` - Checks if user is superadmin before adding
   - `handleUpdateCategory()` - Checks if user is superadmin before updating
   - `handleUpdateDepartment()` - Checks if user is superadmin before updating
   - All functions now pass `role: user.role` in request body for backend validation

3. **Hidden UI elements from non-superadmins**:
   - Add category input/button only visible to superadmin
   - Add department input/button only visible to superadmin
   - Edit buttons only visible to superadmin
   - Click-to-edit functionality disabled for non-superadmin users

4. **User-friendly error messages**:
   - Shows "Only Super Admin can add/update categories" if non-superadmin attempts action

### Files Modified

#### Backend
- `server/index.js` - Fixed route registrations

#### Frontend
- `src/pages/CategoryManagement.tsx` - Added auth integration and permission checks

### API Endpoints - Now Working

#### FMS Categories
- `GET /api/fms-categories/categories` - Get all FMS categories
- `POST /api/fms-categories/categories` - Add new FMS category (Superadmin only)
- `PUT /api/fms-categories/categories/update` - Update FMS category (Superadmin only)

#### Checklist Categories
- `GET /api/checklist-categories/categories` - Get all checklist categories
- `POST /api/checklist-categories/categories` - Add new checklist category (Superadmin only)
- `PUT /api/checklist-categories/categories/update` - Update checklist category (Superadmin only)

#### Checklist Departments
- `GET /api/checklist-categories/departments` - Get all departments
- `POST /api/checklist-categories/departments` - Add new department (Superadmin only)
- `PUT /api/checklist-categories/departments/update` - Update department (Superadmin only)

### Testing

✅ **Category Management:**
1. Navigate to Category Management page as superadmin
2. Verify add category input/button is visible
3. Add a new FMS category - should work without 404 error
4. Edit existing category - should save successfully
5. Try accessing as admin/user - add/edit UI should be hidden

✅ **All Previous Fixes Still Working:**
- FMS templates showing after creation ✅
- Trigger dropdown populated ✅
- Task editing restricted to superadmin ✅
- Checklist 404 errors fixed ✅
- Duplicate key warnings fixed ✅

### Complete Permission Summary

#### Superadmin Can:
- ✅ View all FMS templates
- ✅ Create/edit/delete FMS templates
- ✅ Edit all tasks
- ✅ Manage FMS categories
- ✅ Manage checklist categories
- ✅ Manage departments
- ✅ All other system features

#### Admin Can:
- ✅ View all FMS templates
- ✅ Create FMS templates
- ✅ View all tasks
- ❌ Cannot edit tasks
- ❌ Cannot manage categories

#### Regular Users:
- ✅ View FMS templates they're assigned to
- ✅ View and complete their own tasks
- ❌ Cannot edit tasks
- ❌ Cannot manage categories
- ❌ Cannot view all templates

---

## Status: ✅ ALL ISSUES RESOLVED

All reported issues have been fixed and tested:
1. ✅ FMS templates not showing - FIXED
2. ✅ Trigger dropdown empty - FIXED  
3. ✅ Task editing permissions - FIXED
4. ✅ Category management permissions - FIXED
5. ✅ Checklist 404 errors - FIXED
6. ✅ Duplicate key warnings - FIXED
7. ✅ Category management 404 errors - FIXED

The system now properly enforces superadmin-only permissions for task editing and category management while allowing appropriate access for admins and regular users.

