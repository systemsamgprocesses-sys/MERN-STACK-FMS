
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Award, Filter, User, Printer } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

const ScoreLogs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string>('all');

  useEffect(() => {
    if (user?.role !== 'superadmin') {
      return;
    }
    fetchUsers();
    fetchLogs();
  }, [user, selectedUser]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      setUsers(response.data.filter((u: any) => u.isActive));
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedUser !== 'all') {
        params.userId = selectedUser;
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

  if (user?.role !== 'superadmin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-error)]">Access Denied: Super Admin Only</p>
      </div>
    );
  }

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

        <div className="mb-6 flex items-center gap-3 print:hidden">
          <Filter size={18} style={{ color: 'var(--color-textSecondary)' }} />
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
          >
            <option value="all">All Users</option>
            {users.map((u) => (
              <option key={u._id} value={u._id}>{u.username}</option>
            ))}
          </select>
        </div>

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log._id}
              className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">{log.taskTitle}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <p className="text-[var(--color-textSecondary)]">User</p>
                      <p className="font-semibold text-[var(--color-text)]">{log.userId?.username}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)]">Score</p>
                      <p className="font-bold text-2xl" style={{ color: log.wasOnTime ? 'var(--color-success)' : 'var(--color-error)' }}>
                        {log.scorePercentage.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)]">Planned On</p>
                      <p className="font-semibold text-[var(--color-text)]">{log.plannedDate ? new Date(log.plannedDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)]">Completed On</p>
                      <p className="font-semibold text-[var(--color-text)]">{log.completedDate ? new Date(log.completedDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)]">Planned/Actual Days</p>
                      <p className="font-semibold text-[var(--color-text)]">{log.plannedDays} / {log.actualDays}</p>
                    </div>
                    <div>
                      <p className="text-[var(--color-textSecondary)]">Status</p>
                      <p className={`font-semibold ${log.wasOnTime ? 'text-green-600' : 'text-red-600'}`}>
                        {log.wasOnTime ? 'On Time' : 'Late'}
                      </p>
                    </div>
                  </div>
                  {log.scoreImpacted && (
                    <p className="text-xs text-[var(--color-warning)] mt-2">
                      ⚠️ Score Impacted: {log.impactReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ScoreLogs;
