// Permission checking middleware

/**
 * Middleware factory to check if user has a specific permission
 * @param {string} permission - The permission key to check
 * @param {boolean} allowAdmin - Whether to automatically grant access to admin/superadmin roles
 * @returns {Function} Express middleware function
 */
export const checkPermission = (permission, allowAdmin = true) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Superadmin always has all permissions
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Admin has all permissions if allowAdmin is true
    if (allowAdmin && req.user.role === 'admin') {
      return next();
    }

    // Check if user has the specific permission
    if (req.user.permissions && req.user.permissions[permission] === true) {
      return next();
    }

    return res.status(403).json({ 
      message: `Access denied. Required permission: ${permission}`,
      requiredPermission: permission
    });
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {string[]} permissions - Array of permission keys
 * @param {boolean} allowAdmin - Whether to automatically grant access to admin/superadmin roles
 * @returns {Function} Express middleware function
 */
export const checkAnyPermission = (permissions, allowAdmin = true) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Superadmin always has all permissions
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Admin has all permissions if allowAdmin is true
    if (allowAdmin && req.user.role === 'admin') {
      return next();
    }

    // Check if user has any of the specified permissions
    const hasPermission = permissions.some(
      permission => req.user.permissions && req.user.permissions[permission] === true
    );

    if (hasPermission) {
      return next();
    }

    return res.status(403).json({ 
      message: `Access denied. Required one of: ${permissions.join(', ')}`,
      requiredPermissions: permissions
    });
  };
};

/**
 * Middleware to check if user has all of the specified permissions
 * @param {string[]} permissions - Array of permission keys
 * @param {boolean} allowAdmin - Whether to automatically grant access to admin/superadmin roles
 * @returns {Function} Express middleware function
 */
export const checkAllPermissions = (permissions, allowAdmin = true) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    // Superadmin always has all permissions
    if (req.user.role === 'superadmin') {
      return next();
    }

    // Admin has all permissions if allowAdmin is true
    if (allowAdmin && req.user.role === 'admin') {
      return next();
    }

    // Check if user has all of the specified permissions
    const hasAllPermissions = permissions.every(
      permission => req.user.permissions && req.user.permissions[permission] === true
    );

    if (hasAllPermissions) {
      return next();
    }

    return res.status(403).json({ 
      message: `Access denied. Required all of: ${permissions.join(', ')}`,
      requiredPermissions: permissions
    });
  };
};

/**
 * Pre-defined permission middleware for common operations
 */

// Task Permissions
export const canViewAllTeamTasks = checkPermission('canViewAllTeamTasks');
export const canAssignTasks = checkPermission('canAssignTasks');
export const canDeleteTasks = checkPermission('canDeleteTasks');
export const canEditTasks = checkPermission('canEditTasks');
export const canCompleteTasksOnBehalf = checkPermission('canCompleteTasksOnBehalf');
export const canCompleteAnyTask = checkPermission('canCompleteAnyTask');
export const canEditRecurringTaskSchedules = checkPermission('canEditRecurringTaskSchedules');

// Checklist Permissions
export const canViewAllChecklists = checkPermission('canViewAllChecklists');
export const canCreateChecklists = checkPermission('canCreateChecklists');
export const canEditChecklists = checkPermission('canEditChecklists');
export const canDeleteChecklists = checkPermission('canDeleteChecklists');
export const canManageChecklistCategories = checkPermission('canManageChecklistCategories');

// Complaint Permissions
export const canViewAllComplaints = checkPermission('canViewAllComplaints');
export const canRaiseComplaints = checkPermission('canRaiseComplaints');
export const canAssignComplaints = checkPermission('canAssignComplaints');
export const canResolveComplaints = checkPermission('canResolveComplaints');

// User Management Permissions
export const canManageUsers = checkPermission('canManageUsers');
export const canManageRoles = checkPermission('canManageRoles');

// Stationery Permissions
export const canManageStationery = checkPermission('canManageStationery');

// Objection Permissions
export const canViewObjectionMaster = checkPermission('canViewObjectionMaster');
export const canApproveObjections = checkPermission('canApproveObjections');

export default {
  checkPermission,
  checkAnyPermission,
  checkAllPermissions,
  canViewAllTeamTasks,
  canAssignTasks,
  canDeleteTasks,
  canEditTasks,
  canCompleteTasksOnBehalf,
  canCompleteAnyTask,
  canEditRecurringTaskSchedules,
  canViewAllChecklists,
  canCreateChecklists,
  canEditChecklists,
  canDeleteChecklists,
  canManageChecklistCategories,
  canViewAllComplaints,
  canRaiseComplaints,
  canAssignComplaints,
  canResolveComplaints,
  canManageUsers,
  canManageRoles,
  canManageStationery,
  canViewObjectionMaster,
  canApproveObjections
};

