import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import RestrictedAccess from './RestrictedAccess';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireSuperAdmin?: boolean;
  requiredPermissions?: string[];
  allowedRoles?: string[];
  fallbackToDashboard?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  requireSuperAdmin = false,
  requiredPermissions = [],
  allowedRoles,
  fallbackToDashboard = false
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
          <p style={{ color: 'var(--color-textSecondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const renderRestricted = (description: string) =>
    fallbackToDashboard ? <Navigate to="/dashboard" replace /> : <RestrictedAccess description={description} />;

  if (requireSuperAdmin && user.role !== 'superadmin') {
    return renderRestricted('This section is reserved for Super Admins.');
  }

  if (requireAdmin && !['admin', 'superadmin'].includes(user.role)) {
    return renderRestricted('Only Admin users can access this section.');
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return renderRestricted('Your role does not allow access to this section.');
  }

  if (requiredPermissions.length > 0) {
    const missingPermission = requiredPermissions.some((perm) => !user.permissions?.[perm as keyof typeof user.permissions]);
    if (missingPermission) {
      return renderRestricted('You do not have the necessary permission to access this section.');
    }
  }

  return <>{children}</>;
};

export default ProtectedRoute;