
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Filter, Calendar, Printer } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

const AuditLogs: React.FC = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    if (!user) return;
    fetchLogs();
  }, [user, filterType]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (filterType !== 'all') {
        params.targetType = filterType;
      }

      // For non-superadmin users, filter to their own audit logs
      if (user?.role !== 'superadmin' && user?.id) {
        params.userId = user.id;
      }

      const response = await axios.get(`${address}/api/audit-logs`, { params });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
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
        <div className="text-[var(--color-text)]">Loading audit logs...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--color-error)10' }}>
              <Shield size={28} style={{ color: 'var(--color-error)' }} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[var(--color-text)]">Audit Logs</h1>
              <p className="text-[var(--color-textSecondary)] text-sm">
                {user?.role === 'superadmin' ? 'System activity tracking' : 'Your activity tracking'}
              </p>
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text)]"
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="fms">FMS</option>
            <option value="user">Users</option>
            <option value="score">Scores</option>
          </select>
        </div>

        <div className="space-y-3">
          {logs.map((log) => (
            <div
              key={log._id}
              className="p-5 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                      {log.actionType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-sm text-[var(--color-textSecondary)]">
                      by {log.performedBy?.username}
                    </span>
                  </div>
                  <p className="text-sm text-[var(--color-text)] mb-2">
                    <strong>Reason:</strong> {log.reason}
                  </p>
                  <div className="flex items-center gap-4 text-xs text-[var(--color-textSecondary)]">
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuditLogs;
