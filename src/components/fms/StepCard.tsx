import React from 'react';
import { Trash2, X, Filter, GripVertical } from 'lucide-react';
import FormField from './FormField';

interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

interface Step {
  stepNo: number;
  what: string;
  who: string;
  how: string;
  when: number;
  whenUnit: 'days' | 'hours' | 'days+hours';
  whenDays?: number;
  whenHours?: number;
  whenType: 'fixed' | 'dependent' | 'ask-on-completion';
  dependentOnStep?: number;
  dependentDelay?: number;
  dependentDelayUnit?: 'days' | 'hours';
  requiresChecklist: boolean;
  checklistItems: ChecklistItem[];
  attachments: File[];
  triggersFMSId?: string;
  requireAttachments: boolean;
  mandatoryAttachments: boolean;
}

interface StepCardProps {
  step: Step;
  index: number;
  totalSteps: number;
  users: any[];
  fmsList: any[];
  errors: any;
  userSearchTerm: string;
  steps?: Step[]; // Add steps array to show step descriptions
  onUpdateStep: (index: number, field: string, value: any) => void;
  onRemoveStep: (index: number) => void;
  onUpdateUserSearchTerm: (index: number, value: string) => void;
  onAddChecklistItem: (stepIndex: number) => void;
  onUpdateChecklistItem: (stepIndex: number, itemIndex: number, text: string) => void;
  onRemoveChecklistItem: (stepIndex: number, itemIndex: number) => void;
  onFileChange: (stepIndex: number, files: FileList | null) => void;
  onDragStart?: (e: React.DragEvent, index: number) => void;
  onDragOver?: (e: React.DragEvent, index: number) => void;
  onDrop?: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
  isDragging?: boolean;
  dragOverIndex?: number | null;
}

const StepCard: React.FC<StepCardProps> = ({
  step,
  index,
  totalSteps,
  users,
  fmsList,
  errors,
  userSearchTerm,
  steps = [],
  onUpdateStep,
  onRemoveStep,
  onUpdateUserSearchTerm,
  onAddChecklistItem,
  onUpdateChecklistItem,
  onRemoveChecklistItem,
  onFileChange,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  isDragging = false,
  dragOverIndex
}) => {
  const searchTerm = (userSearchTerm || '').toLowerCase();
  const filteredUsers = users.filter((u: any) =>
    u.username.toLowerCase().includes(searchTerm) ||
    (u.email || '').toLowerCase().includes(searchTerm) ||
    (u.phoneNumber ? String(u.phoneNumber).toLowerCase().includes(searchTerm) : false)
  );

  const isDragOver = dragOverIndex === index;
  const isBeingDragged = isDragging;

  return (
    <div
      draggable={totalSteps > 1}
      onDragStart={(e) => {
        if (onDragStart) onDragStart(e, index);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', index.toString());
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
        e.dataTransfer.dropEffect = 'move';
        if (onDragOver) onDragOver(e, index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (onDrop) onDrop(e, index);
      }}
      onDragEnd={(e) => {
        // Reset visual feedback
        if (e.currentTarget instanceof HTMLElement) {
          e.currentTarget.style.opacity = '1';
        }
        if (onDragEnd) onDragEnd();
      }}
      className={`rounded-xl border-2 transition-all duration-200 bg-[var(--color-surface)] p-6 space-y-4 ${
        isDragOver
          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg scale-[1.02]'
          : isBeingDragged
          ? 'opacity-50 border-[var(--color-border)]'
          : totalSteps > 1
          ? 'border-[var(--color-border)] hover:border-[var(--color-primary)]/30'
          : 'border-[var(--color-border)]'
      }`}
      style={totalSteps > 1 ? { cursor: 'grab' } : {}}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <div
            className="flex items-center justify-center p-2 rounded-lg hover:bg-[var(--color-background)] transition-colors cursor-grab active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical className="w-5 h-5 text-[var(--color-textSecondary)]" />
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-xl text-sm font-bold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
            {step.stepNo}
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text)]">Step {step.stepNo}</h3>
        </div>
        {totalSteps > 1 && (
          <button
            onClick={() => onRemoveStep(index)}
            className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-lg transition-colors"
            title="Remove step"
          >
            <Trash2 size={18} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <FormField label="What (Task Description)" required error={errors[`step${index}_what`]}>
            <textarea
              value={step.what}
              onChange={(e) => onUpdateStep(index, 'what', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
              rows={2}
              placeholder="Describe the task"
            />
          </FormField>
        </div>

        <div>
          <FormField label="Who (Assignee)" required error={errors[`step${index}_who`]}>
            <div className="mb-2">
              <div className="flex items-center gap-2 text-xs text-[var(--color-textSecondary)] mb-1">
                <Filter size={14} />
                <span>Search teammate</span>
              </div>
              <input
                type="text"
                value={userSearchTerm || ''}
                onChange={(e) => onUpdateUserSearchTerm(index, e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] text-sm"
                placeholder="Start typing a name, email or phone..."
              />
            </div>
            <select
              value={step.who}
              onChange={(e) => onUpdateStep(index, 'who', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
            >
              <option value="">Select an assignee</option>
              {filteredUsers.map((u: any) => (
                <option key={u._id} value={u._id}>{u.username}</option>
              ))}
            </select>
          </FormField>
        </div>

        <div>
          <FormField label="How (Method)" required error={errors[`step${index}_how`]}>
            <textarea
              value={step.how}
              onChange={(e) => onUpdateStep(index, 'how', e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
              rows={4}
              placeholder="Describe the method or process"
            />
          </FormField>
        </div>

        <div>
          <FormField label="When Type">
            <select
              value={step.whenType}
              onChange={(e) => {
                onUpdateStep(index, 'whenType', e.target.value);
                if (e.target.value === 'dependent') {
                  if (index > 0) {
                    onUpdateStep(index, 'dependentOnStep', index);
                  }
                } else {
                  onUpdateStep(index, 'dependentOnStep', undefined);
                  onUpdateStep(index, 'dependentDelay', undefined);
                  onUpdateStep(index, 'dependentDelayUnit', undefined);
                }
              }}
              disabled={index === 0}
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
            >
              <option value="fixed">Fixed (from start date)</option>
              <option value="dependent">Dependent on step</option>
              <option value="ask-on-completion">Ask planned date after previous step completes</option>
            </select>
          </FormField>
        </div>

        {step.whenType === 'dependent' && index > 0 && (
          <>
            <div>
              <FormField label="Dependent on Step">
                <select
                  value={step.dependentOnStep || ''}
                  onChange={(e) => onUpdateStep(index, 'dependentOnStep', e.target.value ? parseInt(e.target.value) : undefined)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value="">Select a step</option>
                  {steps.slice(0, index).map((s, idx) => (
                    <option key={idx} value={s.stepNo}>
                      Step {s.stepNo}: {s.what.substring(0, 50)}{s.what.length > 50 ? '...' : ''}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>
            {step.dependentOnStep && (
              <>
                <div>
                  <FormField label="Delay Unit">
                    <select
                      value={step.dependentDelayUnit || 'days'}
                      onChange={(e) => onUpdateStep(index, 'dependentDelayUnit', e.target.value as 'days' | 'hours')}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                    >
                      <option value="days">Days</option>
                      <option value="hours">Hours</option>
                    </select>
                  </FormField>
                </div>
                <div>
                  <FormField label={`Delay (${step.dependentDelayUnit === 'hours' ? 'Hours' : 'Days'})`}>
                    <input
                      type="number"
                      value={step.dependentDelay || 0}
                      onChange={(e) => onUpdateStep(index, 'dependentDelay', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                      min="0"
                    />
                  </FormField>
                </div>
              </>
            )}
          </>
        )}

        {step.whenType === 'fixed' && (
          <>
            <div>
              <FormField label="Duration Unit">
                <select
                  value={step.whenUnit}
                  onChange={(e) => onUpdateStep(index, 'whenUnit', e.target.value)}
                  className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                >
                  <option value="days">Days</option>
                  <option value="hours">Hours</option>
                  <option value="days+hours">Days + Hours</option>
                </select>
              </FormField>
            </div>

            {step.whenUnit === 'days' && (
              <div>
                <FormField label="Days" error={errors[`step${index}_when`]}>
                  <input
                    type="number"
                    value={step.when}
                    onChange={(e) => onUpdateStep(index, 'when', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                    min="0"
                  />
                </FormField>
              </div>
            )}

            {step.whenUnit === 'hours' && (
              <div>
                <FormField label="Hours" error={errors[`step${index}_when`]}>
                  <input
                    type="number"
                    value={step.when}
                    onChange={(e) => onUpdateStep(index, 'when', parseInt(e.target.value) || 0)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                    min="0"
                  />
                </FormField>
              </div>
            )}

            {step.whenUnit === 'days+hours' && (
              <>
                <div>
                  <FormField label="Days" error={errors[`step${index}_whenDays`]}>
                    <input
                      type="number"
                      value={step.whenDays || 0}
                      onChange={(e) => onUpdateStep(index, 'whenDays', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                      min="0"
                    />
                  </FormField>
                </div>
                <div>
                  <FormField label="Hours" error={errors[`step${index}_whenHours`]}>
                    <input
                      type="number"
                      value={step.whenHours || 0}
                      onChange={(e) => onUpdateStep(index, 'whenHours', parseInt(e.target.value) || 0)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                      min="0"
                    />
                  </FormField>
                </div>
              </>
            )}
          </>
        )}

        {step.whenType === 'ask-on-completion' && (
          <div className="md:col-span-2 p-3 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-background)]/60 text-sm text-[var(--color-textSecondary)]">
            Planned date will be requested automatically when Step {index} is completed. No fixed duration needed.
          </div>
        )}

        <div className="md:col-span-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={step.requiresChecklist}
              onChange={(e) => onUpdateStep(index, 'requiresChecklist', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-[var(--color-text)]">Requires Checklist</span>
          </label>
        </div>

        {step.requiresChecklist && (
          <div className="md:col-span-2">
            <FormField label="Checklist Items" error={errors[`step${index}_checklist`]}>
              <div className="space-y-2">
                {step.checklistItems.map((item, itemIndex) => (
                  <div key={item.id} className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={item.text}
                      onChange={(e) => onUpdateChecklistItem(index, itemIndex, e.target.value)}
                      className="flex-1 px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                      placeholder="Checklist item"
                    />
                    <button
                      onClick={() => onRemoveChecklistItem(index, itemIndex)}
                      className="p-2 text-[var(--color-error)] hover:bg-[var(--color-error)]/10 rounded-lg transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => onAddChecklistItem(index)}
                  className="mt-2 px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 transition-opacity text-sm"
                >
                  + Add Item
                </button>
              </div>
            </FormField>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={step.requireAttachments}
              onChange={(e) => onUpdateStep(index, 'requireAttachments', e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-[var(--color-text)]">Ask for attachments when completing this step</span>
          </label>
          {step.requireAttachments && (
            <label className="flex items-center space-x-2 mt-2 ml-6">
              <input
                type="checkbox"
                checked={step.mandatoryAttachments}
                onChange={(e) => onUpdateStep(index, 'mandatoryAttachments', e.target.checked)}
                className="rounded"
              />
              <span className="text-sm text-[var(--color-text)]">Make attachments mandatory for completion</span>
            </label>
          )}
        </div>

        <div className="md:col-span-2">
          <FormField label="Attachments (Max 10 files, 10MB each)">
            <input
              type="file"
              multiple
              onChange={(e) => onFileChange(index, e.target.files)}
              className="w-full text-sm text-[var(--color-textSecondary)] file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[var(--color-primary)] file:text-white hover:file:opacity-90 cursor-pointer"
              accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx,.webm,.mp3,.wav"
            />
            {step.attachments.length > 0 && (
              <p className="text-sm text-[var(--color-textSecondary)] mt-2">
                {step.attachments.length} file(s) selected
              </p>
            )}
          </FormField>
        </div>

        <div className="md:col-span-2">
          <FormField label="Trigger FMS on Completion (Optional)">
            <select
              value={step.triggersFMSId || ''}
              onChange={(e) => onUpdateStep(index, 'triggersFMSId', e.target.value || undefined)}
              className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
            >
              <option value="">None</option>
              {fmsList.map((fms) => (
                <option key={fms._id} value={fms._id}>
                  {fms.fmsName} ({fms.fmsId})
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--color-textSecondary)] mt-1">
              Automatically start another FMS project when this step completes
            </p>
          </FormField>
        </div>
      </div>
    </div>
  );
};

export default StepCard;

