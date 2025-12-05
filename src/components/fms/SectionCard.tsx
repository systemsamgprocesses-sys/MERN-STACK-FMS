import React from 'react';
import { LucideIcon } from 'lucide-react';

interface SectionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  children: React.ReactNode;
}

const SectionCard: React.FC<SectionCardProps> = ({ icon: Icon, title, description, children }) => {
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl" style={{ backgroundColor: 'var(--color-primary)10' }}>
          <Icon className="w-5 h-5" style={{ color: 'var(--color-primary)' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">{title}</h2>
          <p className="text-sm text-[var(--color-textSecondary)]">{description}</p>
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
};

export default SectionCard;

