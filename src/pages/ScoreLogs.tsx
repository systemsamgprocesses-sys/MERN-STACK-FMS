
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Award, Filter, User, Printer } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { formatDate } from '../utils/dateFormat';

const ScoreLogs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    
    // For non-superadmin/admin users, automatically filter to their own data
    if ((user.role !== 'superadmin' && user.role !== 'admin') && selectedUser !== user.id) {
      setSelectedUser(user.id);
    }
    
    fetchUsers();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [user, selectedUser, selectedEntityType]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      const activeUsers = response.data.filter((u: any) => u.isActive);
      setUsers(activeUsers);
      
      // If user is not superadmin/admin, only show their own option
      if (user?.role !== 'superadmin' && user?.role !== 'admin' && user?.id) {
        const currentUser = activeUsers.find((u: any) => u._id === user.id || u.id === user.id);
        if (currentUser) {
          setUsers([currentUser]);
        }
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      
      // For non-superadmin/admin users, always filter to their own data
      if (user?.role !== 'superadmin' && user?.role !== 'admin') {
        params.userId = user?.id;
      } else if (selectedUser !== 'all') {
        params.userId = selectedUser;
      }

      // Filter by entity type
      if (selectedEntityType !== 'all') {
        params.entityType = selectedEntityType;
      }

      const response = await axios.get(`${address}/api/score-logs`, { params });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching score logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--color-text)]">Loading score logs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--color-success)10' }}>
              <Award size={28} style={{ color: 'var(--color-success)' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)]">Score Logs</h1>
              <p className="text-[var(--color-textSecondary)] text-sm">Individual task performance tracking</p>
            </div>
          </div>
          <button
            onClick={handlePrint}
            className="px-4 py-2 rounded-lg bg-[var(--color-primary)] text-white hover:opacity-90 flex items-center gap-2 print:hidden"
          >
            <Printer size={18} />
            Print
          </button>
        </div>

        {(user?.role === 'superadmin' || user?.role === 'admin') && (
          <div className="mb-6 flex flex-wrap items-center gap-3 print:hidden">
            <Filter size={18} style={{ color: 'var(--color-textSecondary)' }} />
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
            >
              <option value="all">All Users</option>
              {users.map((u) => (
                <option key={u._id || u.id} value={u._id || u.id}>{u.username}</option>
              ))}
            </select>
            <select
              value={selectedEntityType}
              onChange={(e) => setSelectedEntityType(e.target.value)}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
            >
              <option value="all">All Types</option>
              <option value="task">Tasks</option>
              <option value="fms">FMS</option>
              <option value="checklist">Checklists</option>
            </select>
          </div>
        )}

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log._id}
              className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-lg font-bold text-[var(--color-text)]">{log.entityTitle || log.taskTitle}</h3>
                    <span className="px-2 py-1 text-xs rounded-full bg-[var(--color-primary)]20 text-[var(--color-primary)]">
                      {log.entityType === 'task' ? 'Task' : log.entityType === 'fms' ? 'FMS' : 'Checklist'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--color-textSecondary)] mb-1">User</p>
                      <p className="font-semibold text-[var(--color-text)]">{log.userId?.username || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)] mb-1">Score</p>
                      <p className="font-bold text-2xl" style={{ color: log.wasOnTime ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {log.scorePercentage?.toFixed(1) || '0.0'}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)] mb-1">Planned On</p>
                      <p className="font-semibold text-[var(--color-text)]">
                        {log.plannedDate ? formatDate(log.plannedDate) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)] mb-1">Completed On</p>
                      <p className="font-semibold text-[var(--color-text)]">
                        {log.completedDate ? formatDate(log.completedDate) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)] mb-1">Planned/Actual Days</p>
                      <p className="font-semibold text-[var(--color-text)]">
                        {log.plannedDays || 0} / {log.actualDays || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)] mb-1">Status</p>
                      <p className={`font-semibold ${log.wasOnTime ? 'text-green-600' : 'text-red-600'}`}>
                        {log.wasOnTime ? 'On Time' : 'Late'}
                      </p>
                    </div>
                  </div>
                  {log.scoreImpacted && (
                    <p className="text-xs text-[var(--color-warning)] mt-2">
                      ⚠️ Score Impacted: {log.impactReason || 'Date extension'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {logs.length === 0 && !loading && (
          <div className="text-center py-12">
            <Award size={48} className="mx-auto mb-4 text-[var(--color-textSecondary)] opacity-50" />
            <p className="text-lg text-[var(--color-textSecondary)]">No score logs found</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreLogs;
