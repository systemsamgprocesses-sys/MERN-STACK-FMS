import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import {
  LayoutDashboard,
  CheckSquare,
  RefreshCw,
  Archive,
  RotateCcw,
  UserPlus,
  Settings,
  X,
  ChevronLeft,
  ChevronRight,
  Zap,
  User,
  AlertCircle,
  UserCheck,
  Shield,
  Award,
  Package,
  ClipboardList,
  HelpCircle,
  BarChart2,
  MessageSquare,
  Calendar,
  Activity,
  ListTodo,
  Star
} from 'lucide-react';

// Clean and Professional AMG Logo Component
const AMGLogo = ({ isCollapsed }: { isCollapsed: boolean }) => (
  <div className="flex items-center">
    <div className="relative mr-3">
      {/* Logo Image Container */}
      <img
        src="/assets/AMG LOGO.webp"
        alt="AMG Logo"
        className="h-8 w-8 object-contain rounded-lg"
        style={{
          boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
        }}
      />
    </div>
    {!isCollapsed && (
      <span
        className="text-sm font-bold tracking-tight transition-opacity duration-200"
        style={{
          color: '#277ef8ff',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}
      >
        Ashok Malhotra Group
      </span>
    )}
  </div>
);

// Tooltip Component
interface TooltipProps {
  children: React.ReactNode;
  content: React.ReactNode;
  show: boolean;
}

const Tooltip: React.FC<TooltipProps> = ({ children, content, show }) => (
  <div className="relative group">
    {children}
    {show && (
      <div className="absolute left-full ml-2 top-1/2 transform -translate-y-1/2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
        <div
          className="px-3 py-2 text-sm rounded-lg shadow-lg whitespace-nowrap"
          style={{
            backgroundColor: 'var(--color-text)',
            color: 'var(--color-background)'
          }}
        >
          {content}
          <div
            className="absolute top-1/2 left-0 transform -translate-y-1/2 -translate-x-1"
            style={{
              width: 0,
              height: 0,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderRight: '4px solid var(--color-text)'
            }}
          />
        </div>
      </div>
    )}
  </div>
);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false); // Default expanded state
  const [counts, setCounts] = useState({
    pendingTasks: 0,
    masterTasks: 0,
    masterRepetitive: 0,
    myTasks: 0,
    objections: 0,
    myObjections: 0,
    assignedByMe: 0,
    helpTickets: 0,
    complaintsInbox: 0,
  });

  const menuItems = [
    // FMS Section
    { section: 'FMS', icon: Settings, label: 'FMS Templates', path: '/fms-templates', permission: 'canAssignTasks', highlight: true },
    { section: 'FMS', icon: Settings, label: 'Start Project', path: '/start-project', permission: 'canAssignTasks', highlight: true },
    { section: 'FMS', icon: Settings, label: 'FMS Progress', path: '/fms-progress', highlight: true },
    { section: 'FMS', icon: Settings, label: 'Manage FMS Categories', path: '/fms-categories', requireAdmin: true, highlight: true },

    // Checklists Section
    { section: 'Checklists', icon: ListTodo, label: 'Pending Checklists', path: '/pending-checklists', highlight: true },
    { section: 'Checklists', icon: Calendar, label: 'Checklist Calendar', path: '/checklist-calendar', highlight: true },
    { section: 'Checklists', icon: CheckSquare, label: 'My Checklists', path: '/checklists', highlight: true },
    { section: 'Checklists', icon: BarChart2, label: 'Checklist Dashboard', path: '/checklist-dashboard', permission: 'canViewAllChecklists', highlight: true },
    { section: 'Checklists', icon: Settings, label: 'Manage Checklist Categories', path: '/checklist-categories', requireAdmin: true, highlight: true },

    // Tasks Section
    { section: '⭐ Tasks', icon: Star, label: 'My Tasks', path: '/admin-tasks', countKey: 'myTasks', highlight: true },
    { section: '⭐ Tasks', icon: CheckSquare, label: 'Pending Tasks', path: '/pending-tasks', permission: 'canViewTasks', countKey: 'pendingTasks', highlight: true },
    { section: '⭐ Tasks', icon: Archive, label: 'Master Tasks', path: '/master-tasks', permission: 'canViewAllTeamTasks', countKey: 'masterTasks', highlight: true },
    { section: '⭐ Tasks', icon: RotateCcw, label: 'Master Repetitive', path: '/master-recurring', permission: 'canViewAllTeamTasks', countKey: 'masterRepetitive', highlight: true },
    { section: '⭐ Tasks', icon: Calendar, label: 'Upcoming Tasks', path: '/upcoming-tasks', permission: 'canViewTasks', highlight: true },

    // Assign Task Section
    { section: 'Assign Task', icon: UserPlus, label: 'Assign Task', path: '/assign-task', permission: 'canAssignTasks', highlight: true },
    { section: 'Assign Task', icon: UserCheck, label: 'Assigned By Me', path: '/assigned-by-me', permission: 'canAssignTasks', countKey: 'assignedByMe', highlight: true },

    // Management Section
    { section: 'Management', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { section: 'Management', icon: Zap, label: 'Performance', path: '/performance' },
    { section: 'Management', icon: Settings, label: 'Admin Panel', path: '/admin', permission: 'canManageUsers' },
    { section: 'Management', icon: Activity, label: 'Admin HR Panel', path: '/admin-hr-panel', permission: 'canManageUsers' },

    // Workflow Section
    { section: 'Workflow', icon: AlertCircle, label: 'Objections Hub', path: '/objections', countKey: 'myObjections' },
    { section: 'Workflow', icon: AlertCircle, label: 'Objection Approvals', path: '/objection-approvals', countKey: 'objections' },
    { section: 'Workflow', icon: AlertCircle, label: 'All Objections', path: '/all-objections', requireRole: 'pc' },
    { section: 'Workflow', icon: MessageSquare, label: 'Complaints', path: '/complaints', permission: 'canRaiseComplaints', countKey: 'complaintsInbox' },
    { section: 'Workflow', icon: AlertCircle, label: 'Complaints Dashboard', path: '/complaints-dashboard', permission: 'canViewAllComplaints' },
    { section: 'Workflow', icon: HelpCircle, label: 'Help Tickets', path: '/help-tickets', countKey: 'helpTickets' },
    { section: 'Workflow', icon: HelpCircle, label: 'Manage Tickets', path: '/admin-help-tickets', permission: 'canViewAllComplaints' },
    { section: 'Workflow', icon: Package, label: 'New Stationery Request', path: '/stationery-request' },
    { section: 'Workflow', icon: ClipboardList, label: 'My Stationery Requests', path: '/my-stationery-requests' },
    { section: 'Workflow', icon: Package, label: 'HR Stationery Approval', path: '/hr-stationery-approval', permission: 'canManageStationery' },
    { section: 'Workflow', icon: Package, label: 'Stationery Inventory', path: '/stationery-inventory', permission: 'canManageStationery' },

    // Analytics Section
    { section: 'Analytics', icon: BarChart2, label: 'Purchase Dashboard', path: '/purchase-dashboard', requireAdmin: true },
    { section: 'Analytics', icon: BarChart2, label: 'Sales Dashboard', path: '/sales-dashboard', requireAdmin: true },

    // Admin Section
    { section: 'Admin', icon: Shield, label: 'Audit Logs', path: '/audit-logs', requireSuperAdmin: true },
    { section: 'Admin', icon: Award, label: 'Score Logs', path: '/score-logs', requireSuperAdmin: true },
  ];

  useEffect(() => {
    if (user?.id) {
      fetchCounts();
      // Optimized: Increased from 30s to 90s to reduce server load and prevent CPU spikes
      // This reduces API calls by 66% while still keeping data reasonably fresh
      const interval = setInterval(fetchCounts, 90000);

      // Listen for task deletion/update events to refresh counts immediately
      const handleTaskUpdate = () => {
        fetchCounts();
      };

      window.addEventListener('taskDeleted', handleTaskUpdate);
      window.addEventListener('taskUpdated', handleTaskUpdate);

      return () => {
        clearInterval(interval);
        window.removeEventListener('taskDeleted', handleTaskUpdate);
        window.removeEventListener('taskUpdated', handleTaskUpdate);
      };
    }
  }, [user]);

  const fetchCounts = async () => {
    try {
      // Fetch dashboard counts which includes all the logic for totals
      const countsParams = new URLSearchParams();
      if (!user?.permissions?.canViewAllTeamTasks && user?.id) {
        countsParams.append('userId', user.id);
      }
      if (user?.role === 'admin' || user?.role === 'superadmin' || user?.role === 'manager') {
        countsParams.append('isAdmin', 'true');
      }
      if (user?.id) {
        countsParams.append('assignedById', user.id);
      }

      // Use optimized counts endpoint (single aggregation query instead of 50+ queries)
      const countsResponse = await axios.get(`${address}/api/dashboard/counts-optimized?${countsParams}`);
      const countsData = countsResponse.data;

      // Fetch objection approvals count
      let objectionsCount = 0;
      try {
        const objectionsResponse = await axios.get(`${address}/api/objections/pending/${user?.id}`);
        // Count pending objections in regular tasks
        const regularObjectionsCount = objectionsResponse.data.regularTasks?.reduce((acc: number, task: any) => {
          return acc + (task.objections?.filter((obj: any) => obj.status === 'pending').length || 0);
        }, 0) || 0;
        // Count pending objections in FMS tasks
        const fmsObjectionsCount = objectionsResponse.data.fmsTasks?.reduce((acc: number, project: any) => {
          return acc + (project.tasks?.reduce((taskAcc: number, task: any) => {
            return taskAcc + (task.objections?.filter((obj: any) => obj.status === 'pending').length || 0);
          }, 0) || 0);
        }, 0) || 0;
        objectionsCount = regularObjectionsCount + fmsObjectionsCount;
      } catch (e) {
        console.error('Error fetching objections:', e);
      }

      // Fetch help tickets count
      let helpTicketsCount = 0;
      try {
        const helpTicketsResponse = await axios.get(`${address}/api/help-tickets?userId=${user?.id}&role=${user?.role}`);
        helpTicketsCount = helpTicketsResponse.data.length;
      } catch (e) {
        console.error('Error fetching help tickets:', e);
      }

      let myObjections = 0;
      try {
        if (user?.id) {
          const myObjResponse = await axios.get(`${address}/api/objections/my/${user.id}`);
          myObjections = (myObjResponse.data?.regular?.length || 0) + (myObjResponse.data?.fms?.length || 0);
        }
      } catch (err) {
        console.error('Error fetching my objections:', err);
      }

      let complaintsInbox = 0;
      try {
        const token = localStorage.getItem('token');
        const complaintsResponse = await axios.get(`${address}/api/complaints?scope=assigned`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });
        complaintsInbox = Array.isArray(complaintsResponse.data) ? complaintsResponse.data.length : 0;
      } catch (err) {
        console.error('Error fetching complaints:', err);
      }

      setCounts({
        pendingTasks: countsData.pendingTasks || 0,
        masterTasks: countsData.totalTasks || 0, // Use totalTasks as master tasks
        masterRepetitive: countsData.recurringTasks || 0,
        myTasks: countsData.totalTasks || 0, // For admin, show total tasks
        assignedByMe: countsData.assignedByMe?.total || 0,
        objections: objectionsCount,
        myObjections,
        helpTickets: helpTicketsCount,
        complaintsInbox,
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    // Super admin can see everything
    if (user?.role === 'superadmin') return true;

    // Hide items that require super admin (for non-superadmins)
    if (item.requireSuperAdmin && user?.role !== 'superadmin') return false;

    // Admin can see admin panel and below (legacy check)
    if (item.requireAdmin && !['admin', 'superadmin'].includes(user?.role || '')) return false;

    // Check for specific role requirement
    if (item.requireRole && user?.role !== item.requireRole) return false;

    // Check for specific permissions - this is the primary access control
    if (item.permission) {
      const hasPermission = user?.permissions?.[item.permission as keyof typeof user.permissions];
      // If no permission, but user is admin/superadmin, allow access (for backward compatibility)
      if (!hasPermission && !['admin', 'superadmin'].includes(user?.role || '')) {
        return false;
      }
    }

    // Regular users see the rest
    return true;
  });

  // Group menu items by section
  const groupedMenuItems = filteredMenuItems.reduce((acc, item) => {
    const section = item.section || 'Other';
    if (!acc[section]) acc[section] = [];
    acc[section].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 transition-opacity bg-black opacity-50 lg:hidden"
          onClick={onClose}
        ></div>
      )}



      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-30 flex flex-col transition-all duration-300 ease-in-out transform lg:translate-x-0 lg:static lg:inset-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          } border-r backdrop-blur-xl`}
        style={{
          backgroundColor: 'rgba(var(--color-surface-rgb, 255, 255, 255), 0.95)',
          borderColor: 'var(--color-border)',
          width: isCollapsed ? '5rem' : '14rem',
          minWidth: isCollapsed ? '5rem' : '14rem',
          maxWidth: isCollapsed ? '5rem' : '14rem',
          boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.1)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          <AMGLogo isCollapsed={isCollapsed} />

          {/* Desktop toggle button */}
          <button
            onClick={toggleCollapse}
            className="hidden lg:flex p-1.5 rounded-lg hover:bg-opacity-10 transition-all duration-200 hover:scale-110"
            style={{ color: 'var(--color-primary)' }}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>

          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg lg:hidden hover:scale-110 transition-all duration-200"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden" style={{ scrollbarWidth: 'thin' }}>
          {Object.entries(groupedMenuItems).map(([section, items]) => {
            const isHighlightedSection = ['FMS', 'Checklists', 'Tasks', 'Assign Task'].includes(section);
            return (
              <div
                key={section}
                className={`px-2 py-3 border-t first:border-t-0 ${isHighlightedSection ? 'bg-gradient-to-r from-[var(--color-primary)]/5 to-transparent' : ''}`}
                style={{ borderColor: 'var(--color-border)' }}
              >
                {!isCollapsed && (
                  <h3
                    className={`text-xs font-semibold uppercase tracking-wider mb-2 ${isHighlightedSection ? 'text-[var(--color-primary)]' : ''}`}
                    style={{ color: isHighlightedSection ? 'var(--color-primary)' : 'var(--color-textSecondary)' }}
                  >
                    {isHighlightedSection && '⭐ '}{section}
                  </h3>
                )}
                <div className="space-y-1">
                  {items.map((item) => (
                    <Tooltip
                      key={item.path}
                      content={item.label}
                      show={isCollapsed}
                    >
                      <NavLink
                        to={item.path}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center px-3 py-3 text-sm font-semibold rounded-xl transition-all duration-300 group ${isActive
                            ? 'text-white shadow-lg scale-105'
                            : 'hover:scale-105 hover:translate-x-1'
                          } ${isCollapsed ? 'justify-center' : ''}`
                        }
                        style={({ isActive }) => ({
                          background: isActive
                            ? 'linear-gradient(135deg, var(--color-primary), var(--color-secondary))'
                            : 'transparent',
                          color: isActive ? 'white' : 'var(--color-text)',
                        })}
                        onMouseEnter={(e) => {
                          if (!e.currentTarget.classList.contains('text-white')) {
                            e.currentTarget.style.backgroundColor = 'rgba(99, 102, 241, 0.1)';
                            e.currentTarget.style.borderRadius = '0.75rem';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!e.currentTarget.classList.contains('text-white')) {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }
                        }}
                      >
                        <item.icon size={18} className={isCollapsed ? '' : 'mr-3'} />
                        {!isCollapsed && (
                          <span className="transition-opacity duration-200 flex-1">
                            {item.label}
                          </span>
                        )}
                        {item.countKey && counts[item.countKey as keyof typeof counts] > 0 && (
                          <span className="ml-auto bg-gradient-to-r from-red-500 to-red-600 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[1.5rem] text-center shadow-sm border border-red-400">
                            {counts[item.countKey as keyof typeof counts]}
                          </span>
                        )}
                      </NavLink>
                    </Tooltip>
                  ))}
                </div>
              </div>
            );
          })}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;