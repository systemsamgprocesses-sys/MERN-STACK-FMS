import React, { useState, useEffect } from 'react';
import { Plus, Save, ArrowLeft, FileText, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SectionCard from '@/components/fms/SectionCard';
import FormField from '@/components/fms/FormField';
import StepCard from '@/components/fms/StepCard';
import FrequencySettings from '@/components/fms/FrequencySettings';
import { Step, Frequency, FrequencySettings as FrequencySettingsType, User, FMSTemplate } from '@/types/fms';
import { useToast } from '@/hooks/use-toast';

// Mock data for demonstration
const MOCK_USERS: User[] = [
  { _id: '1', username: 'John Smith', email: 'john@example.com', isActive: true },
  { _id: '2', username: 'Sarah Johnson', email: 'sarah@example.com', isActive: true },
  { _id: '3', username: 'Mike Wilson', email: 'mike@example.com', isActive: true },
  { _id: '4', username: 'Emily Davis', email: 'emily@example.com', isActive: true },
];

const MOCK_CATEGORIES = ['General', 'Operations', 'HR', 'Finance', 'IT', 'Marketing'];

const MOCK_FMS_LIST: FMSTemplate[] = [];

const createEmptyStep = (stepNo: number): Step => ({
  stepNo,
  what: '',
  who: '',
  how: '',
  when: 1,
  whenUnit: 'days',
  whenType: 'fixed',
  requiresChecklist: false,
  checklistItems: [],
  attachments: [],
  requireAttachments: false,
  mandatoryAttachments: false,
});

const CreateFMS: React.FC = () => {
  const { toast } = useToast();
  const [fmsName, setFmsName] = useState('');
  const [category, setCategory] = useState('General');
  const [categories] = useState<string[]>(MOCK_CATEGORIES);
  const [steps, setSteps] = useState<Step[]>([createEmptyStep(1)]);
  const [users] = useState<User[]>(MOCK_USERS);
  const [fmsList] = useState<FMSTemplate[]>(MOCK_FMS_LIST);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [userSearchTerms, setUserSearchTerms] = useState<string[]>(['']);
  const [frequency, setFrequency] = useState<Frequency>('one-time');
  const [frequencySettings, setFrequencySettings] = useState<FrequencySettingsType>({
    includeSunday: true,
    shiftSundayToMonday: true,
    weeklyDays: [],
    monthlyDay: 1,
    yearlyDuration: 3,
  });

  const addStep = () => {
    setSteps([...steps, createEmptyStep(steps.length + 1)]);
    setUserSearchTerms([...userSearchTerms, '']);
  };

  const removeStep = (index: number) => {
    const newSteps = steps.filter((_, i) => i !== index);
    newSteps.forEach((step, i) => {
      step.stepNo = i + 1;
    });
    setSteps(newSteps);
    setUserSearchTerms(userSearchTerms.filter((_, i) => i !== index));
  };

  const updateStep = (index: number, field: string, value: any) => {
    const newSteps = [...steps];
    (newSteps[index] as any)[field] = value;

    if (field === 'whenType') {
      if (value === 'ask-on-completion') {
        newSteps[index].when = 0;
        newSteps[index].whenDays = 0;
        newSteps[index].whenHours = 0;
      } else if (value === 'fixed' && index === 0) {
        newSteps[index].whenUnit = 'days';
        newSteps[index].when = 1;
      }
    }

    setSteps(newSteps);
  };

  const updateUserSearchTerm = (index: number, value: string) => {
    const updated = [...userSearchTerms];
    updated[index] = value;
    setUserSearchTerms(updated);
  };

  const addChecklistItem = (stepIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].checklistItems.push({
      id: Date.now().toString(),
      text: '',
      completed: false,
    });
    setSteps(newSteps);
  };

  const updateChecklistItem = (stepIndex: number, itemIndex: number, text: string) => {
    const newSteps = [...steps];
    newSteps[stepIndex].checklistItems[itemIndex].text = text;
    setSteps(newSteps);
  };

  const removeChecklistItem = (stepIndex: number, itemIndex: number) => {
    const newSteps = [...steps];
    newSteps[stepIndex].checklistItems.splice(itemIndex, 1);
    setSteps(newSteps);
  };

  const handleFileChange = (stepIndex: number, files: FileList | null) => {
    if (files) {
      const newSteps = [...steps];
      newSteps[stepIndex].attachments = Array.from(files).slice(0, 10);
      setSteps(newSteps);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!fmsName.trim()) {
      newErrors.fmsName = 'FMS name is required';
    }

    steps.forEach((step, index) => {
      if (!step.what.trim()) {
        newErrors[`step${index}_what`] = 'Task description is required';
      }
      if (!step.who || step.who.trim() === '') {
        newErrors[`step${index}_who`] = 'An assignee is required';
      }
      if (!step.how.trim()) {
        newErrors[`step${index}_how`] = 'Process/method is required';
      }
      if (step.requiresChecklist && step.checklistItems.length === 0) {
        newErrors[`step${index}_checklist`] = 'At least one checklist item is required';
      }
      if (step.whenType !== 'ask-on-completion') {
        if (step.whenUnit === 'days' || step.whenUnit === 'hours') {
          if (!Number.isFinite(step.when) || step.when < 0) {
            newErrors[`step${index}_when`] = 'Please provide a valid duration';
          }
        }
        if (step.whenUnit === 'days+hours') {
          if (!Number.isFinite(step.whenDays) || (step.whenDays ?? 0) < 0) {
            newErrors[`step${index}_whenDays`] = 'Enter valid number of days';
          }
          if (!Number.isFinite(step.whenHours) || (step.whenHours ?? 0) < 0) {
            newErrors[`step${index}_whenHours`] = 'Enter valid number of hours';
          }
        }
      }
    });

    if (frequency === 'weekly' && frequencySettings.weeklyDays.length === 0) {
      newErrors.frequency = 'Select at least one weekday for weekly frequency';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields correctly.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast({
      title: 'Success!',
      description: 'FMS template created successfully.',
    });
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/80 backdrop-blur-lg border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon-sm">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Create FMS Template</h1>
                <p className="text-sm text-muted-foreground hidden sm:block">Define workflow steps for repeatable processes</p>
              </div>
            </div>
            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Template'}
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Template Details */}
        <SectionCard
          icon={FileText}
          title="Template Details"
          description="Basic information about this FMS template"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField label="Template Name" required error={errors.fmsName}>
              <input
                type="text"
                value={fmsName}
                onChange={(e) => setFmsName(e.target.value)}
                className="form-input"
                placeholder="Enter a descriptive name..."
              />
            </FormField>

            <FormField label="Category" required>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="form-input"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </FormField>
          </div>
        </SectionCard>

        {/* Frequency Settings */}
        <FrequencySettings
          frequency={frequency}
          settings={frequencySettings}
          onFrequencyChange={setFrequency}
          onSettingsChange={setFrequencySettings}
          error={errors.frequency}
        />

        {/* Steps Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-accent/10">
                <Layers className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Workflow Steps</h2>
                <p className="text-sm text-muted-foreground">{steps.length} step{steps.length !== 1 ? 's' : ''} configured</p>
              </div>
            </div>
            <Button variant="outline" onClick={addStep} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Step
            </Button>
          </div>

          <div className="space-y-4">
            {steps.map((step, index) => (
              <StepCard
                key={index}
                step={step}
                index={index}
                totalSteps={steps.length}
                users={users}
                fmsList={fmsList}
                errors={errors}
                userSearchTerm={userSearchTerms[index]}
                onUpdateStep={updateStep}
                onRemoveStep={removeStep}
                onUpdateUserSearchTerm={updateUserSearchTerm}
                onAddChecklistItem={addChecklistItem}
                onUpdateChecklistItem={updateChecklistItem}
                onRemoveChecklistItem={removeChecklistItem}
                onFileChange={handleFileChange}
              />
            ))}
          </div>

          {/* Add Step Button (Bottom) */}
          <button
            onClick={addStep}
            className="w-full py-4 border-2 border-dashed border-border rounded-xl text-muted-foreground hover:text-foreground hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Another Step
          </button>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-4 pt-6 border-t border-border">
          <Button variant="outline" size="lg">
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading} size="lg" className="gap-2 min-w-[160px]">
            <Save className="w-4 h-4" />
            {loading ? 'Saving...' : 'Save Template'}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default CreateFMS;
