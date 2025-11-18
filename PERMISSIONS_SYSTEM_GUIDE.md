# Permissions System & Bug Fix Guide

## Overview
This document outlines the comprehensive permissions system implementation and the fix for the "Mark as Received" stationery functionality.

## 🔧 Issues Fixed

### 1. Mark as Received Bug Fix
**Problem**: The "Mark as Received" button was failing with an error.

**Solution**: 
- Enhanced error handling in `/api/stationery/receive/:id` endpoint
- Added better logging for debugging
- Fixed user ID compatibility (`req.user._id` and `req.user.id`)
- Improved error messages to help identify issues

**Location**: `server/routes/stationery.js` (lines 93-193)

## 🎯 Comprehensive Permissions System

### New Permission Categories

#### 1. Task Permissions
- `canViewTasks` - View own tasks
- `canViewAllTeamTasks` - View all team member tasks
- `canAssignTasks` - Assign tasks to others
- `canDeleteTasks` - Delete tasks
- `canEditTasks` - Edit task details
- `canCompleteTasksOnBehalf` - Complete tasks on behalf of others (PC role)
- `canCompleteAnyTask` - Complete any task in the system
- `canEditRecurringTaskSchedules` - Modify recurring task schedules

#### 2. Checklist Permissions
- `canViewAllChecklists` - View all checklists (not just own)
- `canCreateChecklists` - Create new checklists
- `canEditChecklists` - Edit existing checklists
- `canDeleteChecklists` - Delete checklists
- `canManageChecklistCategories` - Manage checklist categories

#### 3. Complaint Permissions
- `canViewAllComplaints` - View all complaints in the system
- `canRaiseComplaints` - Create new complaints
- `canAssignComplaints` - Assign complaints to team members
- `canResolveComplaints` - Mark complaints as resolved

#### 4. User Management Permissions
- `canManageUsers` - Create, edit, delete users
- `canManageRoles` - Modify user roles and permissions

#### 5. Stationery Permissions
- `canManageStationery` - Full stationery management (HR function)

#### 6. Objection Permissions
- `canViewObjectionMaster` - View objection master list
- `canApproveObjections` - Approve/reject objections

## 📂 Files Modified

### Backend
1. **`server/models/User.js`**
   - Added all new permission fields to User schema
   - Organized permissions by category with comments

2. **`server/middleware/permissions.js`** (NEW FILE)
   - Created comprehensive permission checking middleware
   - Three main functions:
     - `checkPermission(permission, allowAdmin)` - Check single permission
     - `checkAnyPermission(permissions, allowAdmin)` - Check any of multiple permissions
     - `checkAllPermissions(permissions, allowAdmin)` - Require all permissions
   - Pre-defined middleware exports for each permission

3. **`server/routes/stationery.js`**
   - Fixed "Mark as Received" endpoint with better error handling
   - Added detailed logging for debugging

### Frontend
1. **`src/contexts/AuthContext.tsx`**
   - Updated User interface with all new permissions
   - Organized by category for clarity

2. **`src/pages/AdminPanel.tsx`**
   - Updated formData with all new permissions
   - Enhanced rolePermissions mapping for each role
   - Updated getPermissionDisplayName() with human-readable names for all permissions
   - Permission checkboxes automatically render all permissions

3. **`src/components/Sidebar.tsx`**
   - Updated menu items to use granular permissions
   - Added HR Stationery Approval and Inventory links
   - Improved permission filtering logic
   - Better permission-based access control

## 🎭 Role-Based Default Permissions

### Employee
- View Tasks
- Assign Tasks
- Raise Complaints

### Manager
- All Employee permissions
- View All Team Tasks
- Delete Tasks
- Edit Tasks
- Edit Recurring Task Schedules
- Full Checklist management
- View All Complaints
- Assign Complaints
- Resolve Complaints

### Admin
- All Manager permissions
- Manage Users
- Complete Any Task
- Manage Roles
- Manage Stationery
- View Objection Master
- Approve Objections

### Superadmin
- ALL permissions (unrestricted access)

### PC (Process Coordinator)
- View Tasks
- View All Team Tasks
- Complete Tasks On Behalf
- Complete Any Task

## 🔧 How to Use the Permission System

### Backend Route Protection

```javascript
import { checkPermission, canManageUsers } from '../middleware/permissions.js';
import auth from '../middleware/auth.js';

// Method 1: Use pre-defined middleware
router.post('/users', auth, canManageUsers, async (req, res) => {
  // Only users with canManageUsers permission can access
});

// Method 2: Check specific permission
router.delete('/tasks/:id', auth, checkPermission('canDeleteTasks'), async (req, res) => {
  // Only users with canDeleteTasks permission can access
});

// Method 3: Check any of multiple permissions
import { checkAnyPermission } from '../middleware/permissions.js';

router.get('/tasks', auth, checkAnyPermission(['canViewTasks', 'canViewAllTeamTasks']), async (req, res) => {
  // User needs either permission
});

// Method 4: Require all permissions
import { checkAllPermissions } from '../middleware/permissions.js';

router.post('/critical-action', auth, checkAllPermissions(['canManageUsers', 'canManageRoles']), async (req, res) => {
  // User needs both permissions
});
```

### Frontend Permission Checks

```typescript
import { useAuth } from './contexts/AuthContext';

const MyComponent = () => {
  const { user } = useAuth();
  
  // Check permission
  if (user?.permissions?.canManageUsers) {
    // Show admin features
  }
  
  // Check role
  if (user?.role === 'admin' || user?.role === 'superadmin') {
    // Show admin content
  }
};
```

## 📋 Testing Instructions

### 1. Test Mark as Received Fix
1. Login as a regular employee
2. Go to "New Stationery Request"
3. Create a stationery request
4. Login as HR admin (user with `canManageStationery` permission)
5. Go to "HR Stationery Approval"
6. Approve the request
7. Logout and login as the employee who created the request
8. Go to "My Stationery Requests"
9. Click "Mark as Received" button
10. ✅ Should succeed with success message and stock deduction

### 2. Test Permissions System
1. Login as admin/superadmin
2. Go to "Admin Panel"
3. Create or edit a user
4. Select different roles and observe how available permissions change
5. Toggle individual permissions
6. Save the user
7. Login as that user
8. Navigate through the system
9. ✅ Only permitted menu items should be visible
10. ✅ Attempting to access restricted pages should fail

### 3. Test Role-Based Access
Test each role to ensure they see appropriate menu items:

**Employee:**
- Should see: Dashboard, Performance, Own Tasks, Checklists, Objections Hub, Complaints, Help Tickets, Stationery Requests

**Manager:**
- Should see: All Employee items + Master Tasks, Master Repetitive, Checklist Dashboard, Complaints Dashboard

**Admin:**
- Should see: All Manager items + Admin Panel, Manage Tickets, HR Stationery functions

## 🚀 Migration Steps

### For Existing Users
All existing users need to have their permissions updated. Run this update script:

```javascript
// Optional: Update existing users with default permissions based on role
// You can run this in MongoDB shell or create a migration script

db.users.updateMany(
  { role: 'employee' },
  { 
    $set: { 
      'permissions.canRaiseComplaints': true 
    } 
  }
);

db.users.updateMany(
  { role: 'manager' },
  { 
    $set: { 
      'permissions.canViewAllChecklists': true,
      'permissions.canCreateChecklists': true,
      'permissions.canEditChecklists': true,
      'permissions.canDeleteChecklists': true,
      'permissions.canManageChecklistCategories': true,
      'permissions.canViewAllComplaints': true,
      'permissions.canAssignComplaints': true,
      'permissions.canResolveComplaints': true,
      'permissions.canRaiseComplaints': true
    } 
  }
);

db.users.updateMany(
  { role: 'admin' },
  { 
    $set: { 
      'permissions.canViewAllChecklists': true,
      'permissions.canCreateChecklists': true,
      'permissions.canEditChecklists': true,
      'permissions.canDeleteChecklists': true,
      'permissions.canManageChecklistCategories': true,
      'permissions.canViewAllComplaints': true,
      'permissions.canAssignComplaints': true,
      'permissions.canResolveComplaints': true,
      'permissions.canRaiseComplaints': true,
      'permissions.canManageRoles': true,
      'permissions.canManageStationery': true,
      'permissions.canViewObjectionMaster': true,
      'permissions.canApproveObjections': true,
      'permissions.canCompleteAnyTask': true
    } 
  }
);
```

## 📝 Notes

1. **Backward Compatibility**: The system maintains backward compatibility with `requireAdmin` and `requireSuperAdmin` checks
2. **Automatic Admin Access**: Admin and Superadmin roles automatically get access to most features (can be disabled per middleware)
3. **Permission Hierarchy**: Permissions are additive - having a role doesn't remove ability to grant additional permissions
4. **Frontend & Backend**: Permissions are enforced on BOTH frontend (UI hiding) and backend (API protection)

## 🐛 Debugging

### If Mark as Received Still Fails:
1. Check server logs for detailed error messages
2. Verify user is logged in (check localStorage token)
3. Ensure request status is "Approved" (not Pending/Rejected)
4. Check if items still exist in inventory
5. Verify sufficient stock is available

### If Permissions Not Working:
1. Check user object in browser console: `console.log(user.permissions)`
2. Verify backend User model has new permission fields
3. Clear localStorage and login again
4. Check middleware is imported and used correctly
5. Verify JWT token includes permissions

## 🔐 Security Best Practices

1. **Always check permissions on backend** - Frontend checks are for UX only
2. **Use specific permissions** - Avoid relying solely on role checks
3. **Audit permission changes** - Track who modifies user permissions
4. **Regular reviews** - Periodically review user permissions
5. **Principle of least privilege** - Grant minimum required permissions

## 📞 Support

For issues or questions:
1. Check server console for error logs
2. Check browser console for frontend errors
3. Review this guide
4. Check the middleware implementation in `server/middleware/permissions.js`

