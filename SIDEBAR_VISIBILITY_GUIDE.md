# Sidebar Visibility Control Guide

## Overview

The sidebar menu items are controlled through **3 main methods**:
1. **Permission-based** - Using user permissions
2. **Role-based** - Using user roles (admin, superadmin, etc.)
3. **Combination** - Mix of both

## How It Works

### 1. Permission-Based Control

**Format:** `permission: 'permissionName'`

**Example:**
```javascript
{ 
  section: 'Tasks', 
  icon: CheckSquare, 
  label: 'Pending Tasks', 
  path: '/pending-tasks', 
  permission: 'canViewTasks',  // ← Requires this permission
  highlight: true 
}
```

**How to Control:**
- Go to **Admin Panel** → **Users** tab
- Edit the user you want to control
- Toggle the permission checkboxes (e.g., `canViewTasks`, `canAssignTasks`, etc.)
- Save the user

**Available Permissions:**
- `canViewTasks` - View tasks
- `canViewAllTeamTasks` - View all team tasks
- `canAssignTasks` - Assign tasks
- `canDeleteTasks` - Delete tasks
- `canEditTasks` - Edit tasks
- `canViewAllChecklists` - View all checklists
- `canManageUsers` - Manage users
- `canRaiseComplaints` - Raise complaints
- `canViewAllComplaints` - View all complaints
- `canApproveObjections` - Approve objections
- `canViewObjectionMaster` - View objection master

### 2. Role-Based Control

#### A. Admin Only
**Format:** `requireAdmin: true`

**Example:**
```javascript
{ 
  section: 'Tasks', 
  icon: Star, 
  label: 'My Tasks', 
  path: '/admin-tasks', 
  requireAdmin: true,  // ← Only admin or superadmin can see
  highlight: true 
}
```

**Who can see:**
- ✅ Admin
- ✅ Super Admin
- ❌ Employee
- ❌ Manager
- ❌ PC

#### B. Super Admin Only
**Format:** `requireSuperAdmin: true`

**Example:**
```javascript
{ 
  section: 'Admin', 
  icon: Shield, 
  label: 'Super Admin Management', 
  path: '/super-admin-management', 
  requireSuperAdmin: true,  // ← Only superadmin can see
  highlight: true 
}
```

**Who can see:**
- ✅ Super Admin only
- ❌ Everyone else

#### C. Specific Role
**Format:** `requireRole: 'roleName'`

**Example:**
```javascript
{ 
  section: 'Custom', 
  icon: User, 
  label: 'Custom Section', 
  path: '/custom', 
  requireRole: 'manager'  // ← Only managers can see
}
```

**Available Roles:**
- `superadmin`
- `admin`
- `manager`
- `employee`
- `pc` (Process Coordinator)

### 3. No Restrictions

**Format:** No `permission`, `requireAdmin`, or `requireRole` properties

**Example:**
```javascript
{ 
  section: 'Management', 
  icon: LayoutDashboard, 
  label: 'Dashboard', 
  path: '/dashboard'  // ← Everyone can see this
}
```

**Who can see:**
- ✅ Everyone (all authenticated users)

## Special Rules

### Super Admin Override
- **Super Admins see EVERYTHING** regardless of permissions or roles
- Line 238 in `Sidebar.tsx`: `if (user?.role === 'superadmin') return true;`

### PC Role Special Access
PC role has special access to these permissions even without explicit grant:
- `canAssignTasks`
- `canViewTasks`
- `canViewAllChecklists`
- `canViewAllTeamTasks`

## Current Sidebar Items Configuration

### FMS Section
| Item | Control Method | Visible To |
|------|---------------|------------|
| FMS Templates | `permission: 'canAssignTasks'` | Users with permission |
| Start Project | `permission: 'canAssignTasks'` | Users with permission |
| FMS Progress | No restriction | Everyone |
| FMS Dashboard | `permission: 'canAssignTasks'` | Users with permission |
| Manage FMS Categories | `requireAdmin: true` | Admin & Super Admin |

### Checklists Section
| Item | Control Method | Visible To |
|------|---------------|------------|
| Pending Checklists | No restriction | Everyone |
| Checklist Calendar | No restriction | Everyone |
| My Checklists | No restriction | Everyone |
| Checklist Dashboard | `permission: 'canViewAllChecklists'` | Users with permission |
| Manage Checklist Categories | `requireAdmin: true` | Admin & Super Admin |

### Tasks Section
| Item | Control Method | Visible To |
|------|---------------|------------|
| My Tasks | `requireAdmin: true` | Admin & Super Admin |
| Pending Tasks | `permission: 'canViewTasks'` | Users with permission |
| Master Tasks | `permission: 'canViewTasks'` | Users with permission |

### Assign Task Section
| Item | Control Method | Visible To |
|------|---------------|------------|
| Assign Task | `permission: 'canAssignTasks'` | Users with permission |
| Assigned By Me | `permission: 'canAssignTasks'` | Users with permission |

### Management Section
| Item | Control Method | Visible To |
|------|---------------|------------|
| Dashboard | No restriction | Everyone |
| Performance | No restriction | Everyone |
| Admin Panel | `permission: 'canManageUsers'` | Users with permission |

### Workflow Section
| Item | Control Method | Visible To |
|------|---------------|------------|
| Objections Hub | No restriction | Everyone |
| Objection Approvals | No restriction | Everyone |
| Complaints | `permission: 'canRaiseComplaints'` | Users with permission |
| Complaints Dashboard | `permission: 'canViewAllComplaints'` | Users with permission |
| Help Tickets | No restriction | Everyone |
| Manage Tickets | `permission: 'canViewAllComplaints'` | Users with permission |
| New Stationery Request | No restriction | Everyone |
| My Stationery Requests | No restriction | Everyone |

### Analytics Section
| Item | Control Method | Visible To |
|------|---------------|------------|
| Purchase Dashboard | `requireAdmin: true` | Admin & Super Admin |
| Sales Dashboard | `requireAdmin: true` | Admin & Super Admin |

### Admin Section
| Item | Control Method | Visible To |
|------|---------------|------------|
| Super Admin Management | `requireSuperAdmin: true` | Super Admin only |
| Audit Logs | `requireSuperAdmin: true` | Super Admin only |
| Score Logs | `requireSuperAdmin: true` | Super Admin only |

## How to Modify Sidebar Visibility

### Method 1: Change Existing Item (Edit Sidebar.tsx)

1. Open `src/components/Sidebar.tsx`
2. Find the menu item in the `menuItems` array (around line 94-141)
3. Add/remove/modify these properties:

```javascript
{
  section: 'Section Name',
  icon: IconComponent,
  label: 'Menu Label',
  path: '/route-path',
  
  // Choose ONE or combine:
  permission: 'permissionName',      // Permission-based
  requireAdmin: true,                 // Admin & Super Admin
  requireSuperAdmin: true,            // Super Admin only
  requireRole: 'specificRole',        // Specific role
  
  // Optional:
  highlight: true,                    // Highlight in UI
  countKey: 'countKeyName'           // Show count badge
}
```

### Method 2: Control Through Admin Panel (For Permissions)

1. Go to **Admin Panel** (requires `canManageUsers` permission)
2. Click **Users** tab
3. Find and edit the user
4. Toggle permissions checkboxes
5. Save

**Note:** This only works for items controlled by `permission` property. Role-based items (`requireAdmin`, `requireSuperAdmin`) cannot be changed from Admin Panel.

### Method 3: Control User Roles (For Role-Based Items)

1. Go to **Admin Panel** → **Users** tab
2. Find and edit the user
3. Change the **Role** dropdown:
   - `employee` - Basic access
   - `manager` - Manager access
   - `admin` - Admin access (sees admin items)
   - `superadmin` - Super Admin access (sees everything)
   - `pc` - Process Coordinator (special access)
4. Save

## Adding a New Sidebar Item

1. **Add to menuItems array** in `src/components/Sidebar.tsx`:

```javascript
{
  section: 'Your Section',
  icon: YourIcon,                    // Import from lucide-react
  label: 'Your Menu Item',
  path: '/your-route',
  permission: 'yourPermission',      // Optional
  highlight: true                    // Optional
}
```

2. **Add the route** in `src/App.tsx`:

```javascript
<Route 
  path="your-route" 
  element={
    <ProtectedRoute 
      requiredPermissions={['yourPermission']}  // Optional, match sidebar
    >
      <YourComponent />
    </ProtectedRoute>
  } 
/>
```

3. **If using permission**, add it to:
   - `src/pages/AdminPanel.tsx` - Permission checkboxes
   - `server/models/User.js` - User schema

## Quick Reference Table

| Control Type | Property | How to Set | Where to Control |
|--------------|----------|------------|------------------|
| Permission | `permission: 'name'` | Code (Sidebar.tsx) + Admin Panel | ✅ Admin Panel → User Edit |
| Admin Only | `requireAdmin: true` | Code only | ❌ Code only |
| Super Admin Only | `requireSuperAdmin: true` | Code only | ❌ Code only |
| Specific Role | `requireRole: 'role'` | Code only | ❌ Code only |
| Everyone | (none) | (none) | ✅ Always visible |

## Examples

### Example 1: Make an item visible to everyone
```javascript
{
  section: 'Public',
  icon: Globe,
  label: 'Public Page',
  path: '/public'
  // No restrictions
}
```

### Example 2: Make an item require specific permission
```javascript
{
  section: 'Tasks',
  icon: CheckSquare,
  label: 'View Tasks',
  path: '/tasks',
  permission: 'canViewTasks'
}
```
Then in Admin Panel, toggle `canViewTasks` for users.

### Example 3: Make an item admin-only
```javascript
{
  section: 'Admin',
  icon: Settings,
  label: 'Admin Tools',
  path: '/admin-tools',
  requireAdmin: true
}
```
Only users with `admin` or `superadmin` role can see this.

### Example 4: Make an item superadmin-only
```javascript
{
  section: 'Super Admin',
  icon: Shield,
  label: 'Super Admin Tools',
  path: '/super-admin-tools',
  requireSuperAdmin: true
}
```
Only users with `superadmin` role can see this.

## Troubleshooting

### Item not showing for a user?
1. Check if user is superadmin (superadmins see everything)
2. Check if item has `permission` property → Verify user has that permission in Admin Panel
3. Check if item has `requireAdmin` → Verify user role is admin or superadmin
4. Check if item has `requireSuperAdmin` → Verify user role is superadmin
5. Check if route exists in `App.tsx` and is properly protected

### Item showing when it shouldn't?
1. Verify the user is not superadmin (they see everything)
2. Check the filtering logic in `Sidebar.tsx` lines 237-256
3. Ensure permission/role check is correct

## Summary

**As a Super Admin, you control sidebar visibility by:**

1. **For Permission-Based Items:**
   - Go to Admin Panel → Users → Edit User
   - Toggle permissions
   - Item appears/disappears automatically

2. **For Role-Based Items:**
   - Change user's role in Admin Panel
   - Or modify code in `Sidebar.tsx`

3. **For New Items:**
   - Add to `menuItems` array in `Sidebar.tsx`
   - Choose appropriate control method
   - Add route in `App.tsx`

**Remember:** Super Admins see everything by default!

