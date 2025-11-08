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
    pendingRepetitive: 0,
    masterTasks: 0,
    masterRepetitive: 0,
    myTasks: 0,
    objections: 0,
  });

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
    { icon: CheckSquare, label: 'Pending Tasks', path: '/pending-tasks', countKey: 'pendingTasks' },
    { icon: RefreshCw, label: 'Pending Repetitive', path: '/pending-recurring', countKey: 'pendingRepetitive' },
    { icon: Archive, label: 'Master Tasks', path: '/master-tasks', countKey: 'masterTasks' },
    { icon: RotateCcw, label: 'Master Repetitive', path: '/master-recurring', countKey: 'masterRepetitive' },
    { icon: UserPlus, label: 'Assign Task', path: '/assign-task', permission: 'canAssignTasks' },
    { icon: UserCheck, label: 'Assigned By Me', path: '/assigned-by-me', permission: 'canAssignTasks' }, // Added Assigned By Me
    { icon: Zap, label: 'Performance', path: '/performance' },
    { icon: Settings, label: 'FMS Templates', path: '/fms-templates', permission: 'canAssignTasks' },
    { icon: Settings, label: 'Start Project', path: '/start-project' },
    { icon: Settings, label: 'FMS Progress', path: '/fms-progress' },
    { icon: User, label: 'My Tasks', path: '/admin-tasks', requireAdmin: true, countKey: 'myTasks' },
    { icon: Settings, label: 'Admin Panel', path: '/admin', requireAdmin: true },
    { icon: AlertCircle, label: 'Objection Approvals', path: '/objection-approvals', countKey: 'objections' },
    { icon: Shield, label: 'Audit Logs', path: '/audit-logs', requireAdmin: true }, // Added Audit Logs
    { icon: Award, label: 'Score Logs', path: '/score-logs', requireAdmin: true }, // Added Score Logs
  ];

  useEffect(() => {
    if (user?.id) {
      fetchCounts();
      // Refresh counts every 30 seconds
      const interval = setInterval(fetchCounts, 30000);

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
      // Fetch pending tasks (including FMS)
      const pendingParams = new URLSearchParams({ taskType: 'one-time' });
      if (!user?.permissions?.canViewAllTeamTasks && user?.id) {
        pendingParams.append('userId', user.id);
      }
      const pendingResponse = await axios.get(`${address}/api/tasks/pending?${pendingParams}`);
      const pendingTasksCount = pendingResponse.data.length || 0;

      // Fetch FMS pending tasks
      let fmsTasksCount = 0;
      if (user?.id) {
        try {
          const fmsResponse = await axios.get(`${address}/api/projects/pending-fms-tasks/${user.id}`);
          fmsTasksCount = fmsResponse.data.tasks?.length || 0;
        } catch (e) {
          console.error('Error fetching FMS tasks:', e);
        }
      }

      // Fetch pending repetitive tasks
      const recurringParams = new URLSearchParams();
      if (!user?.permissions?.canViewAllTeamTasks && user?.id) {
        recurringParams.append('userId', user.id);
      }
      const recurringResponse = await axios.get(`${address}/api/tasks/pending-recurring?${recurringParams}`);
      const pendingRepetitiveCount = Array.isArray(recurringResponse.data) ? recurringResponse.data.length : 0;

      // Fetch master tasks count
      const masterParams = new URLSearchParams({ taskType: 'one-time', page: '1', limit: '1000000' });
      if (!user?.permissions?.canViewAllTeamTasks && user?.id) {
        masterParams.append('assignedTo', user.id);
      }
      const masterResponse = await axios.get(`${address}/api/tasks?${masterParams}`);
      const masterTasksCount = masterResponse.data.tasks?.filter((t: any) => t.taskType === 'one-time' && (t.isActive !== false)).length || 0;

      // Fetch master repetitive tasks count
      const masterRecurringParams = new URLSearchParams({ taskType: 'daily,weekly,monthly,quarterly,yearly', page: '1', limit: '1000000' });
      if (!user?.permissions?.canViewAllTeamTasks && user?.id) {
        masterRecurringParams.append('assignedTo', user.id);
      }
      const masterRecurringResponse = await axios.get(`${address}/api/tasks?${masterRecurringParams}`);
      const masterRepetitiveCount = masterRecurringResponse.data.tasks?.filter((t: any) => 
        ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'].includes(t.taskType) && (t.isActive !== false)
      ).length || 0;

      // Fetch my tasks count (admin-tasks)
      let myTasksCount = 0;
      if (user?.role === 'admin' || user?.role === 'superadmin') { // Include superadmin for My Tasks
        try {
          const myTasksResponse = await axios.get(`${address}/api/tasks?${new URLSearchParams({ assignedTo: user.id })}`);
          myTasksCount = myTasksResponse.data.tasks?.filter((t: any) => t.isActive !== false).length || 0;
        } catch (e) {
          console.error('Error fetching my tasks:', e);
        }
      }

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

      setCounts({
        pendingTasks: pendingTasksCount + fmsTasksCount,
        pendingRepetitive: pendingRepetitiveCount,
        masterTasks: masterTasksCount,
        masterRepetitive: masterRepetitiveCount,
        myTasks: myTasksCount,
        objections: objectionsCount,
      });
    } catch (error) {
      console.error('Error fetching counts:', error);
    }
  };

  const filteredMenuItems = menuItems.filter(item => {
    // Super admin can see everything
    if (user?.role === 'superadmin') return true;
    // Admin can see admin panel and below
    if (item.requireAdmin && user?.role !== 'admin') return false;
    // Check for specific permissions
    if (item.permission && !user?.permissions[item.permission as keyof typeof user.permissions]) return false;
    // Regular users see the rest
    return true;
  });

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
        className={`fixed inset-y-0 left-0 z-30 overflow-y-auto transition-all duration-300 transform lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0 ease-out' : '-translate-x-full ease-in lg:translate-x-0'
        } border-r backdrop-blur-xl`}
        style={{
          backgroundColor: 'rgba(var(--color-surface-rgb, 255, 255, 255), 0.95)',
          borderColor: 'var(--color-border)',
          width: isCollapsed ? '5rem' : '14rem',
          willChange: 'width',
          backfaceVisibility: 'hidden',
          perspective: 1000,
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
        <nav className="mt-4 pb-32">
          <div className="px-2 space-y-1">
            {filteredMenuItems.map((item) => (
              <Tooltip
                key={item.path}
                content={item.label}
                show={isCollapsed}
              >
                <NavLink
                  to={item.path}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center px-3 py-3 text-sm font-semibold rounded-xl transition-all duration-300 group ${
                      isActive
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
                    <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[1.5rem] text-center">
                      {counts[item.countKey as keyof typeof counts]}
                    </span>
                  )}
                </NavLink>
              </Tooltip>
            ))}
          </div>
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t backdrop-blur-md" style={{ borderColor: 'var(--color-border)', background: 'linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(var(--color-surface-rgb, 255, 255, 255), 0.6) 100%)' }}>
          {isCollapsed ? (
            <Tooltip content={`${user?.username} (${user?.role})`} show={true}>
              <div className="flex justify-center">
                <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg hover:scale-110 transition-transform" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
                  {user?.username?.charAt(0).toUpperCase()}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 to-transparent"></div>
                </div>
              </div>
            </Tooltip>
          ) : (
            <div className="flex items-center transition-all duration-200 group hover:scale-105">
              <div className="relative w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg" style={{ background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))' }}>
                {user?.username?.charAt(0).toUpperCase()}
                <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/30 to-transparent"></div>
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                  {user?.username}
                </p>
                <p className="text-xs font-medium capitalize truncate" style={{ color: 'var(--color-textSecondary)' }}>
                  {user?.role}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;