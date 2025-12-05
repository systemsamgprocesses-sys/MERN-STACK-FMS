import React from 'react';
import { Calendar } from 'lucide-react';
import SectionCard from './SectionCard';

interface FrequencySettingsProps {
  frequency: 'one-time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  settings: {
    includeSunday: boolean;
    shiftSundayToMonday: boolean;
    weeklyDays: number[];
    monthlyDay: number;
    yearlyDuration: number;
  };
  onFrequencyChange: (frequency: 'one-time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly') => void;
  onSettingsChange: (settings: any) => void;
  error?: string;
}

const FrequencySettings: React.FC<FrequencySettingsProps> = ({
  frequency,
  settings,
  onFrequencyChange,
  onSettingsChange,
  error
}) => {
  const toggleWeeklyDay = (day: number) => {
    onSettingsChange({
      ...settings,
      weeklyDays: settings.weeklyDays.includes(day)
        ? settings.weeklyDays.filter(d => d !== day)
        : [...settings.weeklyDays, day]
    });
  };

  return (
    <SectionCard
      icon={Calendar}
      title="FMS Frequency"
      description="Configure how often this FMS should run"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Frequency</label>
            <select
              value={frequency}
              onChange={(e) => onFrequencyChange(e.target.value as typeof frequency)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
            >
              <option value="one-time">One Time</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="quarterly">Quarterly</option>
              <option value="yearly">Yearly</option>
            </select>
            {error && <p className="text-[var(--color-error)] text-sm mt-1">{error}</p>}
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={settings.shiftSundayToMonday}
                onChange={(e) => onSettingsChange({ ...settings, shiftSundayToMonday: e.target.checked })}
                className="rounded"
              />
              Shift Sunday planned dates to Monday
            </label>
            <p className="text-xs text-[var(--color-textSecondary)] mt-1">
              When enabled, any step that lands on Sunday automatically moves to Monday.
            </p>
          </div>
        </div>

        {(frequency === 'daily' || frequency === 'weekly' || frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') && (
          <div className="space-y-4 pt-4 border-t border-[var(--color-border)]">
            <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-text)]">
              <input
                type="checkbox"
                checked={settings.includeSunday}
                onChange={(e) => onSettingsChange({ ...settings, includeSunday: e.target.checked })}
                className="rounded"
              />
              Include Sundays in scheduling
            </label>

            {frequency === 'weekly' && (
              <div>
                <p className="text-sm font-medium text-[var(--color-text)] mb-2">Select days of the week</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                  {[{ value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' }, { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' }, { value: 0, label: 'Sun' }].map(day => (
                    <button
                      type="button"
                      key={day.value}
                      onClick={() => toggleWeeklyDay(day.value)}
                      className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                        settings.weeklyDays.includes(day.value)
                          ? 'bg-[var(--color-primary)] text-white border-transparent'
                          : 'bg-[var(--color-background)] text-[var(--color-text)] border-[var(--color-border)] hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {frequency === 'monthly' && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Day of the month</label>
                <select
                  value={settings.monthlyDay}
                  onChange={(e) => onSettingsChange({ ...settings, monthlyDay: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                    <option key={day} value={day}>
                      {day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {frequency === 'yearly' && (
              <div>
                <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Years to pre-schedule</label>
                <select
                  value={settings.yearlyDuration}
                  onChange={(e) => onSettingsChange({ ...settings, yearlyDuration: parseInt(e.target.value, 10) })}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value={1}>1 year</option>
                  <option value={3}>3 years</option>
                  <option value={5}>5 years</option>
                  <option value={10}>10 years</option>
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </SectionCard>
  );
};

export default FrequencySettings;

