
import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Package, FileText, TrendingUp, AlertCircle, CheckCircle, Clock } from 'lucide-react';

const PurchaseDashboard: React.FC = () => {
  const { theme } = useTheme();

  // TEST DATA - This is only test data for demonstration
  const purchaseMetrics = {
    totalPOs: 45,
    pendingPOs: 12,
    approvedPOs: 28,
    rejectedPOs: 5,
    totalIndents: 67,
    pendingIndents: 23,
    approvedIndents: 40,
    rejectedIndents: 4
  };

  const recentPOs = [
    { id: 'PO-001', vendor: 'ABC Suppliers', items: 15, status: 'Pending', date: '2025-01-10' },
    { id: 'PO-002', vendor: 'XYZ Materials', items: 8, status: 'Approved', date: '2025-01-09' },
    { id: 'PO-003', vendor: 'DEF Trading', items: 12, status: 'Approved', date: '2025-01-08' },
  ];

  const recentIndents = [
    { id: 'IND-001', department: 'Operations', items: 5, status: 'Pending', requestedBy: 'John Doe', date: '2025-01-11' },
    { id: 'IND-002', department: 'Maintenance', items: 3, status: 'Approved', requestedBy: 'Jane Smith', date: '2025-01-10' },
    { id: 'IND-003', department: 'Sales', items: 7, status: 'Pending', requestedBy: 'Mike Wilson', date: '2025-01-09' },
  ];

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text)' }}>
              Purchase Dashboard
            </h1>
            <p className="text-sm mt-2" style={{ color: 'var(--color-error)' }}>
              ⚠️ This is only test data for demonstration purposes
            </p>
          </div>
        </div>

        {/* Purchase Orders Metrics */}
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Purchase Orders Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <Package size={24} style={{ color: 'var(--color-primary)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{purchaseMetrics.totalPOs}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Total Purchase Orders</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <Clock size={24} style={{ color: 'var(--color-warning)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{purchaseMetrics.pendingPOs}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Pending POs</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{purchaseMetrics.approvedPOs}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Approved POs</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <AlertCircle size={24} style={{ color: 'var(--color-error)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{purchaseMetrics.rejectedPOs}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Rejected POs</p>
            </div>
          </div>
        </div>

        {/* Indents Metrics */}
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Indents Overview
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <FileText size={24} style={{ color: 'var(--color-primary)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{purchaseMetrics.totalIndents}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Total Indents</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <Clock size={24} style={{ color: 'var(--color-warning)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{purchaseMetrics.pendingIndents}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Pending Indents</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <CheckCircle size={24} style={{ color: 'var(--color-success)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{purchaseMetrics.approvedIndents}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Approved Indents</p>
            </div>

            <div className="p-6 rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <AlertCircle size={24} style={{ color: 'var(--color-error)' }} />
                <span className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>{purchaseMetrics.rejectedIndents}</span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--color-textSecondary)' }}>Rejected Indents</p>
            </div>
          </div>
        </div>

        {/* Recent Purchase Orders */}
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Recent Purchase Orders
          </h2>
          <div className="overflow-x-auto rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <table className="w-full">
              <thead className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <tr>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>PO ID</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Vendor</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Items</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Status</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentPOs.map((po) => (
                  <tr key={po.id} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="p-4 font-medium" style={{ color: 'var(--color-text)' }}>{po.id}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{po.vendor}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{po.items}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(po.status)}`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{po.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Indents */}
        <div>
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--color-text)' }}>
            Recent Indents
          </h2>
          <div className="overflow-x-auto rounded-xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
            <table className="w-full">
              <thead className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                <tr>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Indent ID</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Department</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Requested By</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Items</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Status</th>
                  <th className="text-left p-4 font-semibold" style={{ color: 'var(--color-text)' }}>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentIndents.map((indent) => (
                  <tr key={indent.id} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                    <td className="p-4 font-medium" style={{ color: 'var(--color-text)' }}>{indent.id}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{indent.department}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{indent.requestedBy}</td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{indent.items}</td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(indent.status)}`}>
                        {indent.status}
                      </span>
                    </td>
                    <td className="p-4" style={{ color: 'var(--color-textSecondary)' }}>{indent.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PurchaseDashboard;
