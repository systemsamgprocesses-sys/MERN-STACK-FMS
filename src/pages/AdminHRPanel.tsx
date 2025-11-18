import React from 'react';
import { Activity } from 'lucide-react';
import AdjustmentLogs from './AdjustmentLogs';

const AdminHRPanel: React.FC = () => {
  return (
    <div className="min-h-screen bg-[var(--color-background)] p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity size={32} className="text-[var(--color-primary)]" />
            <h1 className="text-3xl font-bold text-[var(--color-text)]">
              Admin HR Panel
            </h1>
          </div>
          <p className="text-[var(--color-textSecondary)]">
            Human Resources Management - Track user changes and administrative activities
          </p>
        </div>

        {/* Adjustment Logs Component */}
        <AdjustmentLogs />
      </div>
    </div>
  );
};

export default AdminHRPanel;

