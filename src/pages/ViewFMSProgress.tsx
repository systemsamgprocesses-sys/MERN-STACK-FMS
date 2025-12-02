
import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, Clock, AlertCircle, Upload, RotateCcw, Printer, ArrowRight, Users } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useLocation, useNavigate } from 'react-router-dom';
import { formatDate } from '../utils/dateFormat';

interface Project {
  _id: string;
  projectId: string;
  projectName: string;
  startDate: string;
  status: string;
  fmsId: { fmsName: string };
  tasks: any[];
  createdBy: { username: string };
}

interface MultiLevelTask {
  _id: string;
  title: string;
  description: string;
  assignedBy: { username: string; email: string };
  assignedTo: { username: string; email: string };
  forwardedBy?: { username: string; email: string };
  forwardedAt?: string;
  forwardingHistory: Array<{
    from: { username: string };
    to: { username: string };
    forwardedAt: string;
    remarks: string;
  }>;
  status: string;
  priority: string;
  dueDate: string;
  requiresChecklist: boolean;
  checklistItems: Array<{ id: string; text: string; completed: boolean }>;
  checklistProgress: number;
  createdAt: string;
}

type TaskFilter = 'all' | 'pending' | 'in-progress' | 'completed' | 'overdue';
const VALID_FILTERS: TaskFilter[] = ['all', 'pending', 'in-progress', 'completed', 'overdue'];

const normalizeTasks = (tasks: any[] | undefined | null): any[] => {
  return Array.isArray(tasks) ? tasks : [];
};

const ViewFMSProgress: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const initialFilterParam = params.get('view');
  const initialFilter = VALID_FILTERS.includes((initialFilterParam as TaskFilter) || 'all')
    ? (initialFilterParam as TaskFilter)
    : 'all';
  const [activeTab, setActiveTab] = useState<'fms' | 'multilevel'>('fms');
  const [projects, setProjects] = useState<Project[]>([]);
  const [multiLevelTasks, setMultiLevelTasks] = useState<MultiLevelTask[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedMultiLevelTask, setSelectedMultiLevelTask] = useState<MultiLevelTask | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskStatus, setTaskStatus] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [taskPlannedDate, setTaskPlannedDate] = useState('');
  const [forwardTo, setForwardTo] = useState('');
  const [forwardDate, setForwardDate] = useState('');
  const [forwardRemarks, setForwardRemarks] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwarding, setForwarding] = useState(false);
  const [showMultiLevelActionModal, setShowMultiLevelActionModal] = useState(false);
  const [completionRemarks, setCompletionRemarks] = useState('');
  const [completingTask, setCompletingTask] = useState(false);
  const [taskFilter, setTaskFilter] = useState<TaskFilter>(initialFilter);

  useEffect(() => {
    const view = new URLSearchParams(location.search).get('view');
    if (view && VALID_FILTERS.includes(view as TaskFilter)) {
      setTaskFilter(view as TaskFilter);
    }
  }, [location.search]);

  useEffect(() => {
    fetchProjects();
    fetchMultiLevelTasks();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    const refreshedProject = projects.find(project => project.projectId === selectedProject.projectId);
    if (refreshedProject && refreshedProject !== selectedProject) {
      setSelectedProject(refreshedProject);
    }
  }, [projects, selectedProject?.projectId]);

  const fetchUsers = async () => {
    try {
      const response = await axios.get(`${address}/api/users`);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const fetchProjects = async () => {
    try {
      // Super admin should see all projects
      const isSuperAdmin = user?.role === 'superadmin';
      const userId = isSuperAdmin ? 'all' : user?.id;
      const response = await axios.get(`${address}/api/projects?userId=${userId}&role=${user?.role}`);
      if (response.data.success) {
        setProjects(response.data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMultiLevelTasks = async () => {
    try {
      // Super admin should see all multi-level tasks
      const isSuperAdmin = user?.role === 'superadmin';
      const userId = isSuperAdmin ? 'all' : user?.id;
      const response = await axios.get(`${address}/api/tasks/multi-level?userId=${userId}&role=${user?.role}`);
      setMultiLevelTasks(response.data);
    } catch (error) {
      console.error('Error fetching multi-level tasks:', error);
    }
  };

  const handleForwardTask = async () => {
    if (!selectedMultiLevelTask) return;

    // Validation
    if (!forwardTo) {
      alert('Please select a user to forward this task to');
      return;
    }
    if (!forwardDate) {
      alert('Please select a due date for the forwarded task');
      return;
    }
    if (!forwardRemarks.trim()) {
      alert('Please provide remarks for forwarding');
      return;
    }

    setForwarding(true);
    try {
      const response = await axios.post(
        `${address}/api/tasks/${selectedMultiLevelTask._id}/forward`,
        {
          forwardTo,
          remarks: forwardRemarks,
          dueDate: forwardDate
        }
      );

      if (response.data) {
        alert('Task forwarded successfully!');
        setShowForwardModal(false);
        setForwardTo('');
        setForwardDate('');
        setForwardRemarks('');
        setSelectedMultiLevelTask(null);
        fetchMultiLevelTasks();
      }
    } catch (error: any) {
      console.error('Error forwarding task:', error);
      alert(error.response?.data?.message || 'Failed to forward task');
    } finally {
      setForwarding(false);
    }
  };

  const handleCompleteMultiLevelTask = async () => {
    if (!selectedMultiLevelTask) return;

    if (!completionRemarks.trim()) {
      alert('Please provide remarks before closing this task.');
      return;
    }

    setCompletingTask(true);
    try {
      const response = await axios.post(
        `${address}/api/tasks/${selectedMultiLevelTask._id}/complete`,
        {
          completionRemarks: completionRemarks.trim(),
          completedBy: user?.id
        }
      );

      if (response.data) {
        alert('Task marked as completed!');
        setShowMultiLevelActionModal(false);
        setCompletionRemarks('');
        setSelectedMultiLevelTask(null);
        fetchMultiLevelTasks();
      }
    } catch (error: any) {
      console.error('Error completing multi-level task:', error);
      alert(error.response?.data?.message || 'Failed to complete task');
    } finally {
      setCompletingTask(false);
    }
  };

  const handleTaskUpdate = async () => {
    if (!selectedTask || !selectedProject) return;

    // Validation: If task requires checklist, ensure all items are completed
    if (selectedTask.requiresChecklist && selectedTask.checklistItems) {
      const allCompleted = selectedTask.checklistItems.every((item: any) => item.completed);
      if (!allCompleted && taskStatus === 'Done') {
        alert('Please complete all checklist items before marking task as Done');
        return;
      }
    }

    const normalizedWhenType = selectedTask.whenType?.toLowerCase();
    const needsPlannedDate =
      normalizedWhenType === 'ask-on-completion' &&
      (
        selectedTask.status === 'Awaiting Date' ||
        taskStatus === 'Done' ||
        !selectedTask.plannedDueDate
      );

    if (needsPlannedDate && !taskPlannedDate) {
      alert('Please select a planned date before proceeding.');
      return;
    }

    if (taskStatus === 'Done' && selectedTask.requireAttachments && selectedTask.mandatoryAttachments) {
      const existingAttachments = Array.isArray(selectedTask.attachments) ? selectedTask.attachments.length : 0;
      if (existingAttachments + files.length === 0) {
        alert('Attachments are mandatory for this step. Please upload at least one file.');
        return;
      }
    }

    try {
      let uploadedFiles: any[] = [];
      
      // Upload files first if any
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach(file => {
          formData.append('files', file);
        });

        const uploadResponse = await axios.post(`${address}/api/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        if (uploadResponse.data.files) {
          uploadedFiles = uploadResponse.data.files.map((f: any) => ({
            filename: f.filename,
            originalName: f.originalName,
            path: f.path,
            size: f.size,
            uploadedBy: user?.id,
            uploadedAt: new Date()
          }));
        }
      }

      const response = await axios.put(
        `${address}/api/projects/${selectedProject.projectId}/tasks/${selectedTask.index}`,
        {
          status: taskStatus,
          completedBy: user?.id,
          notes: taskNotes,
          attachments: uploadedFiles,
          checklistItems: selectedTask.checklistItems,
          plannedDueDate: taskPlannedDate || undefined
        }
      );

      if (response.data.success) {
        alert('Task updated successfully!');
        const wasCompleting = taskStatus === 'Done';
        const currentTaskIndex = selectedTask?.index;
        const currentProjectId = selectedProject?.projectId;
        
        await fetchProjects();
        
        // If we just completed a step, check if the next step needs a date
        if (wasCompleting && currentTaskIndex !== undefined && currentProjectId && selectedProject?.fmsId) {
          const fmsSteps = selectedProject.fmsId.steps || [];
          const nextStepIndex = currentTaskIndex + 1;
          
          // Check if next step has ask-on-completion
          if (nextStepIndex < fmsSteps.length) {
            const nextStep = fmsSteps[nextStepIndex];
            if (nextStep.whenType === 'ask-on-completion') {
              // Refetch to get updated project with next task in 'Awaiting Date' status
              const projectResponse = await axios.get(`${address}/api/projects?userId=${user?.id}&role=${user?.role}`);
              if (projectResponse.data.success) {
                const updatedProjects = projectResponse.data.projects;
                const updatedProject = updatedProjects.find((p: Project) => p.projectId === currentProjectId);
                if (updatedProject && nextStepIndex < updatedProject.tasks.length) {
                  const nextTask = updatedProject.tasks[nextStepIndex];
                  if (nextTask.status === 'Awaiting Date') {
                    // Automatically open the next task for date input
                    setTimeout(() => {
                      setSelectedProject(updatedProject);
                      setSelectedTask({ ...nextTask, index: nextStepIndex });
                      setTaskStatus('Awaiting Date');
                      setTaskPlannedDate('');
                      setTaskNotes('');
                      setFiles([]);
                    }, 500);
                    return; // Don't clear the selected task
                  }
                }
              }
            }
          }
        }
        
        // Clear selection if not opening next task
        setSelectedTask(null);
        setTaskStatus('');
        setTaskNotes('');
        setFiles([]);
        setTaskPlannedDate('');
      }
    } catch (error) {
      console.error('Error updating task:', error);
      alert('Failed to update task');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Done': return 'bg-green-100 text-green-800';
      case 'Awaiting Date': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const calculateProgress = (tasks: any[]) => {
    const list = normalizeTasks(tasks);
    const completed = list.filter(t => t?.status === 'Done').length;
    return list.length > 0 ? Math.round((completed / list.length) * 100) : 0;
  };

  // Add a helper function to check if a step can be updated
  const canUpdateStep = (currentIndex: number, tasks: any[]): boolean => {
    // First step can always be updated
    if (currentIndex === 0) return true;
    
    // For other steps, check if previous step is 'Done'
    const previousStep = tasks[currentIndex - 1];
    return previousStep && previousStep.status === 'Done';
  };

  const matchesFilter = (task: any, filter: TaskFilter) => {
    if (!task) return false;
    const status = (task.status || '').toLowerCase();
    const plannedDate = task.plannedDueDate ? new Date(task.plannedDueDate) : null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isOverdue = plannedDate && plannedDate < today && status !== 'done';

    const isPendingStatus = ['pending', 'not started', 'awaiting date'].includes(status);
    const hasValidDueDate = Boolean(plannedDate);
    const isPastOrToday = plannedDate ? plannedDate <= today : false;

    switch (filter) {
      case 'pending':
        if (status === 'awaiting date') {
          return hasValidDueDate ? isPastOrToday : false;
        }
        return isPendingStatus && hasValidDueDate && isPastOrToday;
      case 'in-progress':
        return status === 'in progress';
      case 'completed':
        return status === 'done';
      case 'overdue':
        return isOverdue;
      default:
        return true;
    }
  };

  const filteredProjects = useMemo(() => {
    if (taskFilter === 'all') return projects;
    return projects.filter(project => {
      const tasks = normalizeTasks(project.tasks);
      return tasks.some(task => matchesFilter(task, taskFilter));
    });
  }, [projects, taskFilter]);

  useEffect(() => {
    if (!selectedProject && filteredProjects.length > 0) {
      setSelectedProject(filteredProjects[0]);
    }
  }, [filteredProjects, selectedProject]);

  useEffect(() => {
    if (selectedProject && taskFilter !== 'all') {
      const stillValid = normalizeTasks(selectedProject.tasks).some(task => matchesFilter(task, taskFilter));
      if (!stillValid) {
        setSelectedProject(null);
      }
    }
  }, [selectedProject, taskFilter]);

  const fmsStats = useMemo(() => {
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;
    let totalTasks = 0;

    projects.forEach(project => {
      const tasks = normalizeTasks(project.tasks);
      tasks.forEach(task => {
        totalTasks++;
        const status = (task.status || '').toLowerCase();
        const isOverdue = task.plannedDueDate && new Date(task.plannedDueDate) < new Date() && status !== 'done';
        if (isOverdue) overdue++;
        if (status === 'done') completed++;
        else if (status === 'in progress') inProgress++;
        else pending++;
      });
    });

    return {
      totalProjects: projects.length,
      totalTasks,
      pending,
      inProgress,
      completed,
      overdue
    };
  }, [projects]);

  const myPendingSteps = useMemo(() => {
    if (!user) return [];
    const items: Array<{
      projectId: string;
      projectName: string;
      task: any;
      isOverdue: boolean;
    }> = [];

    projects.forEach(project => {
      const tasks = normalizeTasks(project.tasks);
      tasks.forEach(task => {
        const assignedToUser = task.who?.some((w: any) => (w?._id || w) === user.id);
        if (!assignedToUser) return;
        if (task.status === 'Done') return;
        const isOverdue = task.plannedDueDate && new Date(task.plannedDueDate) < new Date();
        items.push({
          projectId: project.projectId,
          projectName: project.projectName,
          task,
          isOverdue
        });
      });
    });

    return items.sort((a, b) => {
      if (a.isOverdue && !b.isOverdue) return -1;
      if (!a.isOverdue && b.isOverdue) return 1;
      return new Date(a.task.plannedDueDate || a.task.creationDate || 0).getTime() -
        new Date(b.task.plannedDueDate || b.task.creationDate || 0).getTime();
    });
  }, [projects, user]);

  const visibleTasks = useMemo(() => {
    if (!selectedProject) return [];
    return normalizeTasks(selectedProject.tasks)
      .map((task, index) => ({ task, index }))
      .filter(({ task }) => taskFilter === 'all' || matchesFilter(task, taskFilter));
  }, [selectedProject, taskFilter]);

  const filterOptions = useMemo(() => ([
    {
      value: 'all' as TaskFilter,
      label: 'All Steps',
      description: 'Every step in your projects',
      count: fmsStats.totalTasks,
      gradient: 'from-slate-600 to-slate-800',
      icon: <RotateCcw size={18} />,
    },
    {
      value: 'pending' as TaskFilter,
      label: 'Pending',
      description: 'Not started or awaiting date',
      count: fmsStats.pending,
      gradient: 'from-amber-500 to-orange-500',
      icon: <Clock size={18} />,
    },
    {
      value: 'in-progress' as TaskFilter,
      label: 'In Progress',
      description: 'Actively being worked on',
      count: fmsStats.inProgress,
      gradient: 'from-indigo-500 to-blue-600',
      icon: <Users size={18} />,
    },
    {
      value: 'completed' as TaskFilter,
      label: 'Completed',
      description: 'Finished steps',
      count: fmsStats.completed,
      gradient: 'from-emerald-500 to-teal-500',
      icon: <CheckSquare size={18} />,
    },
    {
      value: 'overdue' as TaskFilter,
      label: 'Overdue',
      description: 'Past due date, needs attention',
      count: fmsStats.overdue,
      gradient: 'from-rose-500 to-red-600',
      icon: <AlertCircle size={18} />,
    },
  ]), [fmsStats]);

  const handleFilterChange = (value: TaskFilter) => {
    setTaskFilter(value);
    const searchParams = new URLSearchParams(location.search);
    if (value === 'all') {
      searchParams.delete('view');
    } else {
      searchParams.set('view', value);
    }
    navigate({ pathname: location.pathname, search: searchParams.toString() }, { replace: true });
  };

  const normalizedSelectedWhenType = selectedTask?.whenType?.toLowerCase();
  const shouldShowPlannedDateInput =
    !!selectedTask &&
    normalizedSelectedWhenType === 'ask-on-completion' &&
    (
      selectedTask.status === 'Awaiting Date' ||
      !selectedTask.plannedDueDate ||
      taskStatus === 'Done'
    );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--color-text)]">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-3 lg:p-4" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl" style={{ backgroundColor: 'var(--color-primary)10' }}>
              <RotateCcw size={20} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--color-text)]">Task Progress Management</h1>
              <p className="text-[var(--color-textSecondary)] text-xs mt-0.5">Track FMS projects and multi-level tasks</p>
            </div>
          </div>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 flex items-center gap-2 print:hidden"
          >
            <Printer size={18} />
            Print
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
          {[
            { label: 'Total Projects', value: fmsStats.totalProjects, accent: 'from-blue-500 to-indigo-600' },
            { label: 'Pending Steps', value: fmsStats.pending, accent: 'from-yellow-500 to-amber-500' },
            { label: 'In Progress', value: fmsStats.inProgress, accent: 'from-purple-500 to-fuchsia-500' },
            { label: 'Overdue', value: fmsStats.overdue, accent: 'from-red-500 to-rose-500' },
          ].map(card => (
            <div key={card.label} className={`p-3 rounded-xl text-white bg-gradient-to-br ${card.accent} shadow-lg`}>
              <p className="text-xs uppercase tracking-wide opacity-80">{card.label}</p>
              <p className="text-2xl font-bold mt-1">{card.value}</p>
            </div>
          ))}
        </div>

        {/* Filter Pills */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {filterOptions.map(option => {
            const active = taskFilter === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleFilterChange(option.value)}
                className={`relative w-full rounded-xl border transition-all p-3 text-left overflow-hidden group ${
                  active
                    ? `bg-gradient-to-br ${option.gradient} text-white border-transparent shadow-xl`
                    : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text)] hover:border-[var(--color-primary)]/60 hover:shadow-lg'
                }`}
              >
                {!active && (
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--color-background)]/40 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                )}
                <div className="relative flex items-start justify-between gap-3">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-[var(--color-primary)]/10 text-[var(--color-primary)]'
                  }`}>
                    {option.icon}
                  </div>
                  <span className={`text-sm font-bold ${active ? 'text-white' : 'text-[var(--color-text)]'}`}>
                    {option.count}
                  </span>
                </div>
                <div className="relative mt-3">
                  <p className={`text-base font-semibold ${active ? 'text-white' : 'text-[var(--color-text)]'}`}>
                    {option.label}
                  </p>
                  <p className={`text-xs mt-1 leading-snug ${active ? 'text-white/80' : 'text-[var(--color-textSecondary)]'}`}>
                    {option.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Pending Steps Snapshot */}
        {myPendingSteps.length > 0 && (
          <div className="mb-4 p-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-[var(--color-text)]">My Pending Steps</h2>
                <p className="text-sm text-[var(--color-textSecondary)]">Steps assigned to you that still need attention</p>
              </div>
              <span className="text-sm font-semibold text-[var(--color-primary)]">{myPendingSteps.length} pending</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPendingSteps.slice(0, 6).map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-semibold text-[var(--color-text)] truncate">{item.task.what}</p>
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full font-semibold ${
                        item.isOverdue ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {item.isOverdue ? 'Overdue' : item.task.status}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--color-textSecondary)] truncate mb-1">{item.projectName}</p>
                  {item.task.plannedDueDate && (
                    <p className="text-xs text-[var(--color-textSecondary)] flex items-center gap-1">
                      <Clock size={12} /> Due {formatDate(item.task.plannedDueDate)}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-2 border-b border-[var(--color-border)]">
          <button
            onClick={() => {
              setActiveTab('fms');
              setSelectedProject(null);
              setSelectedMultiLevelTask(null);
            }}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === 'fms'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <RotateCcw size={18} />
              FMS Projects
              {projects.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-primary)] text-white">
                  {projects.length}
                </span>
              )}
            </div>
          </button>
          <button
            onClick={() => {
              setActiveTab('multilevel');
              setSelectedProject(null);
              setSelectedMultiLevelTask(null);
            }}
            className={`px-6 py-3 font-semibold transition-all relative ${
              activeTab === 'multilevel'
                ? 'text-[var(--color-primary)] border-b-2 border-[var(--color-primary)]'
                : 'text-[var(--color-textSecondary)] hover:text-[var(--color-text)]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Users size={18} />
              Multi Level Tasks
              {multiLevelTasks.length > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-[var(--color-accent)] text-white">
                  {multiLevelTasks.length}
                </span>
              )}
            </div>
          </button>
        </div>

        {/* FMS Projects Tab Content */}
        {activeTab === 'fms' && (
          <>
            {filteredProjects.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ backgroundColor: 'var(--color-primary)10' }}>
                  <RotateCcw size={40} style={{ color: 'var(--color-primary)' }} />
                </div>
                <p className="text-[var(--color-textSecondary)] text-lg font-medium">No projects match this filter</p>
                <p className="text-[var(--color-textSecondary)] text-sm">Try selecting a different view above</p>
              </div>
            ) : (
              <div className="space-y-8">
            {/* Projects Grid */}
            <div>
              <h2 className="text-2xl font-bold text-[var(--color-text)] mb-6 flex items-center">
                <span className="w-1 h-8 bg-[var(--color-primary)] rounded-full mr-3"></span>
                Your Projects
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-8">
                {filteredProjects.map((project) => {
                  const progress = calculateProgress(project.tasks);
                  const isSelected = selectedProject?._id === project._id;
                  
                  return (
                    <div
                      key={project._id}
                      onClick={() => setSelectedProject(project)}
                      className={`cursor-pointer rounded-2xl overflow-hidden border-2 transition-all duration-300 transform hover:scale-105 hover:shadow-xl ${
                        isSelected
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-xl ring-2 ring-[var(--color-primary)]'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50'
                      }`}
                    >
                      <div className="h-1 bg-gradient-to-r" style={{ 
                        width: `${progress}%`,
                        backgroundColor: progress >= 80 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444'
                      }} />
                      
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="font-bold text-[var(--color-text)] line-clamp-2 text-base">{project.projectName}</h3>
                          {isSelected && (
                            <span className="ml-2 px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap bg-[var(--color-primary)] text-white">
                              Active
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-[var(--color-textSecondary)] mb-2 font-mono truncate">{project.projectId}</p>
                        
                        <div className="mb-3 p-2 rounded-lg bg-[var(--color-background)] text-xs text-[var(--color-textSecondary)] truncate">
                          📋 {project.fmsId?.fmsName || 'No FMS'}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-[var(--color-textSecondary)]">Progress</span>
                            <span className="text-sm font-bold" style={{ color: progress >= 80 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444' }}>{progress}%</span>
                          </div>
                          <div className="h-2 bg-gray-300 dark:bg-gray-600 rounded-full overflow-hidden">
                            <div
                              className="h-full transition-all duration-500 rounded-full"
                              style={{ 
                                width: `${progress}%`,
                                backgroundColor: progress >= 80 ? '#10b981' : progress >= 50 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-[var(--color-border)] flex justify-between text-xs text-[var(--color-textSecondary)]">
                          <span className="font-medium">{project.tasks.filter(t => t.status === 'Done').length}/{project.tasks.length}</span>
                          <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--color-primary)10', color: 'var(--color-primary)' }}>
                            {project.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Task Details */}
            <div className="lg:col-span-2">
              {selectedProject ? (
                <div className="space-y-6">
                  {/* Project Header Card */}
                  <div className="p-6 rounded-2xl border border-[var(--color-border)] bg-gradient-to-br from-[var(--color-primary)]/5 to-[var(--color-secondary)]/5">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                          {selectedProject.projectName}
                        </h2>
                        <div className="flex items-center space-x-3 text-sm text-[var(--color-textSecondary)]">
                          <span className="flex items-center"><Clock size={14} className="mr-1" /> Started: {formatDate(selectedProject.startDate)}</span>
                          <span>•</span>
                          <span className="flex items-center">Started By: <strong className="ml-1 text-[var(--color-text)]">{selectedProject.createdBy?.username || 'Unknown'}</strong></span>
                          <span>•</span>
                          <span className="flex items-center gap-2">
                            Status: 
                            <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--color-primary)10', color: 'var(--color-primary)' }}>
                              {selectedProject.status}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {selectedProject.totalScore > 0 && (
                      <div className="grid grid-cols-3 gap-4 mt-4">
                        <div className="p-4 rounded-xl bg-white/50 dark:bg-[var(--color-background)]/50 border border-[var(--color-border)]/50 hover:shadow-md transition-all">
                          <p className="text-xs text-[var(--color-textSecondary)] mb-2 font-medium uppercase tracking-wider">Performance Score</p>
                          <p className="text-2xl font-bold" style={{ color: 'var(--color-primary)' }}>{selectedProject.totalScore}%</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/50 dark:bg-[var(--color-background)]/50 border border-[var(--color-border)]/50 hover:shadow-md transition-all">
                          <p className="text-xs text-[var(--color-textSecondary)] mb-2 font-medium uppercase tracking-wider">On-Time Tasks</p>
                          <p className="text-2xl font-bold text-green-600">{selectedProject.tasksOnTime || 0}</p>
                        </div>
                        <div className="p-4 rounded-xl bg-white/50 dark:bg-[var(--color-background)]/50 border border-[var(--color-border)]/50 hover:shadow-md transition-all">
                          <p className="text-xs text-[var(--color-textSecondary)] mb-2 font-medium uppercase tracking-wider">Late Tasks</p>
                          <p className="text-2xl font-bold text-red-600">{selectedProject.tasksLate || 0}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tasks Section */}
                  <div>
                    <h3 className="text-xl font-bold text-[var(--color-text)] mb-4 flex items-center">
                      <span className="w-1 h-6 bg-[var(--color-primary)] rounded-full mr-3"></span>
                      Steps & Tasks
                    </h3>
                    <div className="space-y-4">
                      {visibleTasks.length === 0 && (
                        <div className="p-6 text-center rounded-2xl border border-dashed border-[var(--color-border)] text-[var(--color-textSecondary)]">
                          No tasks found for the “{taskFilter.replace('-', ' ')}” filter in this project.
                        </div>
                      )}
                      {visibleTasks.map(({ task, index }) => (
                        <div
                          key={index}
                          className="p-5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] hover:shadow-lg hover:border-[var(--color-primary)]/50 transition-all duration-300"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                                  {task.stepNo}
                                </span>
                                <h4 className="text-lg font-bold text-[var(--color-text)]">
                                  {task.what}
                                </h4>
                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(task.status)}`}>
                                  {task.status}
                                </span>
                              </div>
                              <p className="text-sm text-[var(--color-textSecondary)] mb-3 ml-11">{task.how}</p>
                              <div className="flex items-center space-x-4 text-sm text-[var(--color-textSecondary)] ml-11">
                                <span className="flex items-center gap-1">👤 {task.who.filter((w: any) => w).map((w: any) => {
                                  if (typeof w === 'object' && w !== null) {
                                    return w.username || w.name || w.email || 'Unknown';
                                  }
                                  return typeof w === 'string' ? w : 'Unknown';
                                }).join(', ')}</span>
                                {task.plannedDueDate && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Clock size={14} /> Due: {formatDate(task.plannedDueDate)}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                            {task.status !== 'Done' && 
                              task.who.some((w: any) => w._id === user?.id) && 
                              canUpdateStep(index, selectedProject.tasks) && (
                                <button
                                  onClick={() => {
                                    setSelectedTask({ ...task, index });
                                    setTaskStatus(task.status === 'Awaiting Date' ? 'Pending' : task.status);
                                    setTaskPlannedDate(task.plannedDueDate ? new Date(task.plannedDueDate).toISOString().split('T')[0] : '');
                                  }}
                                  className="px-4 py-2 rounded-lg text-white font-semibold hover:shadow-lg hover:scale-105 transition-all text-sm ml-4 flex-shrink-0"
                                  style={{ backgroundColor: 'var(--color-primary)' }}
                                >
                                  Update
                                </button>
                              )}
                            {task.status !== 'Done' && 
                              task.who.some((w: any) => w._id === user?.id) && 
                              !canUpdateStep(index, selectedProject.tasks) && (
                                <div className="px-4 py-2 text-sm text-[var(--color-warning)] bg-[var(--color-warning)]/10 rounded-lg ml-4 flex-shrink-0">
                                  ⚠️ Complete previous step first
                                </div>
                              )}
                          </div>

                          {task.requiresChecklist && task.checklistItems.length > 0 && (
                            <div className="mt-4 p-4 rounded-lg bg-[var(--color-background)] border border-[var(--color-border)]/50">
                              <p className="text-sm font-bold text-[var(--color-text)] mb-3">✓ Checklist</p>
                              <div className="space-y-2">
                                {task.checklistItems.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center space-x-2 text-sm">
                                    {item.completed ? (
                                      <CheckSquare size={16} className="text-green-600" />
                                    ) : (
                                      <div className="w-4 h-4 border-2 border-[var(--color-border)] rounded" />
                                    )}
                                    <span className={item.completed ? 'line-through text-[var(--color-textSecondary)]' : 'text-[var(--color-text)]'}>
                                      {item.text}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {task.actualCompletedOn && (
                            <div className="mt-3 p-3 rounded-lg bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/30 text-sm text-green-700 dark:text-green-400 flex items-center">
                              <CheckSquare size={16} className="mr-2" />
                              Completed on {formatDate(task.actualCompletedOn)} by {task.completedBy?.username}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{ backgroundColor: 'var(--color-primary)10' }}>
                    <AlertCircle size={32} style={{ color: 'var(--color-primary)' }} />
                  </div>
                  <p className="text-[var(--color-text)] font-medium">Select a project to view details</p>
                  <p className="text-[var(--color-textSecondary)] text-sm">Click a project card above to see full details</p>
                </div>
              )}
            </div>
          </div>
            )}
          </>
        )}

        {/* Multi Level Tasks Tab Content */}
        {activeTab === 'multilevel' && (
          <div className="space-y-6">
            {multiLevelTasks.length === 0 ? (
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ backgroundColor: 'var(--color-accent)10' }}>
                  <Users size={40} style={{ color: 'var(--color-accent)' }} />
                </div>
                <p className="text-[var(--color-textSecondary)] text-lg font-medium">No multi-level tasks found</p>
                <p className="text-[var(--color-textSecondary)] text-sm">Multi-level tasks will appear here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {multiLevelTasks.map((task) => {
                  const normalizedTaskStatus = (task.status || '').toLowerCase();
                  const isOverdue =
                    task.dueDate
                      ? new Date(task.dueDate) < new Date() && normalizedTaskStatus !== 'completed'
                      : false;
                  const assignedToId =
                    typeof task.assignedTo === 'string'
                      ? task.assignedTo
                      : (task.assignedTo as any)?._id;
                  const isMyTask = assignedToId?.toString() === user?.id;
                  const canManageTask = isMyTask || ['admin', 'superadmin', 'manager'].includes(user?.role || '');
                  
                  return (
                    <div
                      key={task._id}
                      className={`p-6 rounded-2xl border-2 transition-all cursor-pointer hover:shadow-lg ${
                        isMyTask
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5'
                          : 'border-[var(--color-border)] bg-[var(--color-surface)]'
                      }`}
                      onClick={() => setSelectedMultiLevelTask(task)}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-[var(--color-text)] mb-2">
                            {task.title}
                          </h3>
                          <p className="text-sm text-[var(--color-textSecondary)] line-clamp-2">
                            {task.description}
                          </p>
                        </div>
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            task.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : task.status === 'in-progress'
                              ? 'bg-blue-100 text-blue-800'
                              : isOverdue
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}
                        >
                          {task.status === 'completed' ? 'Completed' : isOverdue ? 'Overdue' : task.status}
                        </span>
                      </div>

                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-[var(--color-textSecondary)]">
                          <Clock size={14} />
                          <span>Due: {formatDate(task.dueDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[var(--color-textSecondary)]">
                          <Users size={14} />
                          <span>Assigned to: <strong className="text-[var(--color-text)]">{task.assignedTo.username}</strong></span>
                          {task.forwardedBy && (
                            <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                              (forwarded by {task.forwardedBy.username})
                            </span>
                          )}
                        </div>
                        {task.forwardedAt && (
                          <div className="flex items-center gap-2 text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded">
                            <ArrowRight size={12} />
                            <span>Forwarded on: {formatDate(task.forwardedAt)}</span>
                          </div>
                        )}
                        {task.requiresChecklist && (
                          <div className="flex items-center gap-2 text-[var(--color-textSecondary)]">
                            <CheckSquare size={14} />
                            <span>Checklist: {task.checklistProgress}% complete</span>
                          </div>
                        )}
                      </div>

                      {task.forwardingHistory.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
                          <p className="text-xs font-semibold text-[var(--color-text)] mb-2">
                            Forwarding History
                          </p>
                          <div className="flex items-center gap-1 text-xs text-[var(--color-textSecondary)]">
                            {task.forwardingHistory.slice(-3).map((h, idx) => (
                              <React.Fragment key={idx}>
                                {h.from.username}
                                <ArrowRight size={12} />
                              </React.Fragment>
                            ))}
                            {task.assignedTo.username}
                          </div>
                        </div>
                      )}

                      {canManageTask && normalizedTaskStatus !== 'completed' && (
                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMultiLevelTask(task);
                              setCompletionRemarks('');
                              setShowMultiLevelActionModal(true);
                            }}
                            className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium flex-1"
                          >
                            Update Task
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Multi Level Task Action Modal */}
        {showMultiLevelActionModal && selectedMultiLevelTask && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-2">
                Finish Task: {selectedMultiLevelTask.title}
              </h3>
              <p className="text-sm text-[var(--color-textSecondary)] mb-4">
                Would you like to completely close this task or assign it to another team member for further work?
              </p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Completion Remarks <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={completionRemarks}
                    onChange={(e) => setCompletionRemarks(e.target.value)}
                    rows={4}
                    placeholder="Add important updates or outcomes before closing the task"
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] resize-none"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowMultiLevelActionModal(false);
                    setForwardTo('');
                    setForwardDate('');
                    setForwardRemarks('');
                    setShowForwardModal(true);
                  }}
                  className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)] text-sm font-medium"
                >
                  Assign to New Assignee
                </button>
                <button
                  onClick={handleCompleteMultiLevelTask}
                  disabled={completingTask}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm font-medium disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {completingTask ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Closing Task...
                    </>
                  ) : (
                    'Close Task'
                  )}
                </button>
                <button
                  onClick={() => {
                    setShowMultiLevelActionModal(false);
                    setCompletionRemarks('');
                    setSelectedMultiLevelTask(null);
                  }}
                  className="px-4 py-2 text-[var(--color-textSecondary)] text-sm font-medium hover:text-[var(--color-text)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Forward Task Modal */}
        {showForwardModal && selectedMultiLevelTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-4 flex items-center gap-2">
                <ArrowRight size={24} style={{ color: 'var(--color-primary)' }} />
                Forward Multi-Level Task
              </h3>
              <p className="text-sm text-[var(--color-textSecondary)] mb-4">{selectedMultiLevelTask.title}</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Forward To (New Assignee) <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={forwardTo}
                    onChange={(e) => setForwardTo(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  >
                    <option value="">Select user...</option>
                    {users
                      .filter((u: any) => u._id !== user?.id && u._id !== selectedMultiLevelTask.assignedTo._id)
                      .map((u: any) => (
                        <option key={u._id} value={u._id}>
                          {u.username} ({u.email})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    New Due Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={forwardDate}
                    onChange={(e) => setForwardDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  />
                  <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                    Select the due date for the forwarded task
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Forwarding Remarks <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={forwardRemarks}
                    onChange={(e) => setForwardRemarks(e.target.value)}
                    rows={4}
                    placeholder="Explain why you're forwarding this task..."
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowForwardModal(false);
                    setForwardTo('');
                    setForwardDate('');
                    setForwardRemarks('');
                    setSelectedMultiLevelTask(null);
                  }}
                  disabled={forwarding}
                  className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleForwardTask}
                  disabled={forwarding}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 disabled:opacity-50 flex items-center gap-2"
                >
                  {forwarding ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Forwarding...
                    </>
                  ) : (
                    <>
                      <ArrowRight size={16} />
                      Forward Task
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-4">
                Update Task: {selectedTask.what}
              </h3>
              
              <div className="space-y-4">
                {selectedTask.requiresChecklist && selectedTask.checklistItems?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                      Checklist (Required) *
                    </label>
                    <div className="space-y-2 p-3 rounded-lg bg-[var(--color-background)]">
                      {selectedTask.checklistItems.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={item.completed}
                            onChange={(e) => {
                              const updatedItems = [...selectedTask.checklistItems];
                              updatedItems[idx].completed = e.target.checked;
                              setSelectedTask({
                                ...selectedTask,
                                checklistItems: updatedItems
                              });
                            }}
                            className="w-4 h-4"
                          />
                          <span className={`text-sm ${item.completed ? 'line-through text-[var(--color-textSecondary)]' : 'text-[var(--color-text)]'}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Status</label>
                  <select
                    value={taskStatus}
                    onChange={(e) => setTaskStatus(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                </div>

                {shouldShowPlannedDateInput && (
                  <div>
                    <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                      Planned Date <span className="text-[var(--color-error)]">*</span>
                    </label>
                    <input
                      type="date"
                      value={taskPlannedDate}
                      onChange={(e) => setTaskPlannedDate(e.target.value)}
                      className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                      min={new Date().toISOString().split('T')[0]}
                    />
                    <p className="text-xs text-[var(--color-textSecondary)] mt-1">
                      Select the target date for this step. Sundays will automatically shift to Monday.
                    </p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Notes</label>
                  <textarea
                    value={taskNotes}
                    onChange={(e) => setTaskNotes(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
                    rows={3}
                    placeholder="Add notes..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">
                    Attachments (Max 3 files, 2MB each)
                  </label>
                  {selectedTask.requireAttachments && (
                    <p className="text-xs mb-2" style={{ color: selectedTask.mandatoryAttachments ? 'var(--color-error)' : 'var(--color-textSecondary)' }}>
                      {selectedTask.mandatoryAttachments
                        ? 'Attachments are required to complete this step.'
                        : 'Attachments are recommended for this step.'}
                    </p>
                  )}
                  <input
                    type="file"
                    multiple
                    accept=".jpg,.jpeg,.png,.pdf,.docx,.xlsx"
                    onChange={(e) => {
                      const selectedFiles = e.target.files ? Array.from(e.target.files) : [];
                      if (selectedFiles.length > 3) {
                        alert('Maximum 3 files allowed');
                        return;
                      }
                      const oversized = selectedFiles.find(f => f.size > 2 * 1024 * 1024);
                      if (oversized) {
                        alert('Each file must be under 2MB');
                        return;
                      }
                      setFiles(selectedFiles);
                    }}
                    className="w-full"
                  />
                  {files.length > 0 && (
                    <div className="mt-2 text-xs text-[var(--color-textSecondary)]">
                      {files.length} file(s) selected
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setTaskStatus('');
                    setTaskNotes('');
                    setFiles([]);
                    setTaskPlannedDate('');
                  }}
                  className="px-4 py-2 border border-[var(--color-border)] text-[var(--color-text)] rounded-lg hover:bg-[var(--color-background)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleTaskUpdate}
                  className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewFMSProgress;
