
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Package, CheckCircle, Clock, XCircle, FileText, TrendingUp, AlertCircle } from 'lucide-react';

const PurchaseDashboard: React.FC = () => {
  const { theme } = useTheme();

  // ⚠️ TEST DATA - This is only test data for demonstration
  const purchaseMetrics = {
    totalPOs: 45,
    pendingPOs: 12,
    approvedPOs: 28,
    rejectedPOs: 5,
    totalIndents: 67,
    pendingIndents: 23,
    approvedIndents: 40,
    rejectedIndents: 4,
    monthlyPOValue: 0, // Amount removed as per requirements
    avgProcessingTime: '3.5 days'
  };

  const recentPOs = [
    { id: 'PO-001', vendor: 'ABC Suppliers', items: 15, status: 'Pending', date: '2025-01-10', department: 'Operations' },
    { id: 'PO-002', vendor: 'XYZ Materials', items: 8, status: 'Approved', date: '2025-01-09', department: 'Maintenance' },
    { id: 'PO-003', vendor: 'DEF Trading', items: 12, status: 'Approved', date: '2025-01-08', department: 'Sales' },
    { id: 'PO-004', vendor: 'GHI Enterprises', items: 6, status: 'Rejected', date: '2025-01-07', department: 'IT' },
    { id: 'PO-005', vendor: 'JKL Supplies', items: 10, status: 'Pending', date: '2025-01-06', department: 'Operations' },
  ];

  const recentIndents = [
    { id: 'IND-001', department: 'Operations', items: 5, status: 'Pending', requestedBy: 'John Doe', date: '2025-01-11' },
    { id: 'IND-002', department: 'Maintenance', items: 3, status: 'Approved', requestedBy: 'Jane Smith', date: '2025-01-10' },
    { id: 'IND-003', department: 'Sales', items: 7, status: 'Pending', requestedBy: 'Mike Wilson', date: '2025-01-09' },
    { id: 'IND-004', department: 'IT', items: 4, status: 'Approved', requestedBy: 'Sarah Johnson', date: '2025-01-08' },
    { id: 'IND-005', department: 'HR', items: 2, status: 'Rejected', requestedBy: 'Tom Brown', date: '2025-01-07' },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'rejected': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-background)] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Package size={32} className="text-[var(--color-primary)]" />
            <h1 className="text-3xl font-bold text-[var(--color-text)]">Purchase Dashboard</h1>
          </div>
          <p className="text-[var(--color-textSecondary)] text-sm">
            ⚠️ <strong>TEST DATA ONLY</strong> - This dashboard displays sample data for demonstration purposes
          </p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total POs */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                <FileText className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <TrendingUp className="text-green-500" size={20} />
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{purchaseMetrics.totalPOs}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Total Purchase Orders</p>
          </div>

          {/* Pending POs */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/30">
                <Clock className="text-yellow-600 dark:text-yellow-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{purchaseMetrics.pendingPOs}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Pending POs</p>
          </div>

          {/* Approved POs */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                <CheckCircle className="text-green-600 dark:text-green-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{purchaseMetrics.approvedPOs}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Approved POs</p>
          </div>

          {/* Rejected POs */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900/30">
                <XCircle className="text-red-600 dark:text-red-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{purchaseMetrics.rejectedPOs}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Rejected POs</p>
          </div>

          {/* Total Indents */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                <Package className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{purchaseMetrics.totalIndents}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Total Indents</p>
          </div>

          {/* Pending Indents */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                <AlertCircle className="text-orange-600 dark:text-orange-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{purchaseMetrics.pendingIndents}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Pending Indents</p>
          </div>

          {/* Approved Indents */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-teal-100 dark:bg-teal-900/30">
                <CheckCircle className="text-teal-600 dark:text-teal-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{purchaseMetrics.approvedIndents}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Approved Indents</p>
          </div>

          {/* Processing Time */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                <Clock className="text-indigo-600 dark:text-indigo-400" size={24} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-[var(--color-text)] mb-1">{purchaseMetrics.avgProcessingTime}</h3>
            <p className="text-sm text-[var(--color-textSecondary)]">Avg Processing Time</p>
          </div>
        </div>

        {/* Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Purchase Orders */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <h2 className="text-xl font-bold text-[var(--color-text)] mb-4">Recent Purchase Orders</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">PO ID</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Vendor</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Items</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Status</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPOs.map((po) => (
                    <tr key={po.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                      <td className="py-3 px-2 text-sm font-medium text-[var(--color-text)]">{po.id}</td>
                      <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{po.vendor}</td>
                      <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{po.items}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(po.status)}`}>
                          {po.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{po.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Indents */}
          <div className="bg-[var(--color-surface)] rounded-xl p-6 border border-[var(--color-border)] shadow-lg">
            <h2 className="text-xl font-bold text-[var(--color-text)] mb-4">Recent Indents</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--color-border)]">
                    <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Indent ID</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Department</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Items</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Status</th>
                    <th className="text-left py-3 px-2 text-sm font-semibold text-[var(--color-text)]">Requested By</th>
                  </tr>
                </thead>
                <tbody>
                  {recentIndents.map((indent) => (
                    <tr key={indent.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-background)]">
                      <td className="py-3 px-2 text-sm font-medium text-[var(--color-text)]">{indent.id}</td>
                      <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{indent.department}</td>
                      <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{indent.items}</td>
                      <td className="py-3 px-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(indent.status)}`}>
                          {indent.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-sm text-[var(--color-textSecondary)]">{indent.requestedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDashboard;
