
import React from 'react';
import { Grid, List } from 'lucide-react';

interface ViewToggleProps {
  view: 'card' | 'table';
  onViewChange: (view: 'card' | 'table') => void;
}

const ViewToggle: React.FC<ViewToggleProps> = ({ view, onViewChange }) => {
  return (
    <div className="flex items-center space-x-1 bg-[var(--color-background)] rounded-lg p-1 border border-[var(--color-border)]">
      <button
        onClick={() => onViewChange('card')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          view === 'card'
            ? 'bg-[var(--color-primary)] text-white shadow-sm'
            : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
        }`}
      >
        <Grid size={12} />
      </button>
      <button
        onClick={() => onViewChange('table')}
        className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
          view === 'table'
            ? 'bg-[var(--color-primary)] text-white shadow-sm'
            : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
        }`}
      >
        <List size={12} />
      </button>
    </div>
  );
};

export default ViewToggle;
