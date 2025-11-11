
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, Clock, AlertCircle, Upload, RotateCcw, Printer } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

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

const ViewFMSProgress: React.FC = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [taskStatus, setTaskStatus] = useState('');
  const [taskNotes, setTaskNotes] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [taskPlannedDate, setTaskPlannedDate] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${address}/api/projects?userId=${user?.id}&role=${user?.role}`);
      if (response.data.success) {
        setProjects(response.data.projects);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
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

    if (selectedTask.status === 'Awaiting Date' && !taskPlannedDate) {
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
        fetchProjects();
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
    const completed = tasks.filter(t => t.status === 'Done').length;
    return tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;
  };

  // Add a helper function to check if a step can be updated
  const canUpdateStep = (currentIndex: number, tasks: any[]): boolean => {
    // First step can always be updated
    if (currentIndex === 0) return true;
    
    // For other steps, check if previous step is 'Done'
    const previousStep = tasks[currentIndex - 1];
    return previousStep && previousStep.status === 'Done';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-[var(--color-text)]">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8" style={{ backgroundColor: 'var(--color-background)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl" style={{ backgroundColor: 'var(--color-primary)10' }}>
              <RotateCcw size={28} style={{ color: 'var(--color-primary)' }} />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-[var(--color-text)]">FMS Project Progress</h1>
              <p className="text-[var(--color-textSecondary)] text-sm mt-1">Track and manage project tasks seamlessly</p>
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

        {projects.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4" style={{ backgroundColor: 'var(--color-primary)10' }}>
              <RotateCcw size={40} style={{ color: 'var(--color-primary)' }} />
            </div>
            <p className="text-[var(--color-textSecondary)] text-lg font-medium">No projects found</p>
            <p className="text-[var(--color-textSecondary)] text-sm">Create a project to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-bold text-[var(--color-text)] mb-4 flex items-center">
                <span className="w-1 h-6 bg-[var(--color-primary)] rounded-full mr-3"></span>
                Projects
              </h2>
              <div className="space-y-3">
                {projects.map((project) => (
                  <div
                    key={project._id}
                    onClick={() => setSelectedProject(project)}
                    className={`p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg ${
                      selectedProject?._id === project._id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 shadow-lg'
                        : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50 hover:-translate-y-1'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-[var(--color-text)]">{project.projectName}</h3>
                      {selectedProject?._id === project._id && (
                        <span className="px-2 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: 'var(--color-primary)10', color: 'var(--color-primary)' }}>
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-textSecondary)] mb-1 font-medium">{project.projectId}</p>
                    <p className="text-xs text-[var(--color-textSecondary)] mb-3">
                      📋 {project.fmsId?.fmsName || 'No FMS Assigned'}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-sm">
                        <div
                          className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-green-400 transition-all duration-500 rounded-full shadow-lg"
                          style={{ 
                            width: `${calculateProgress(project.tasks)}%`,
                            boxShadow: '0 0 12px rgba(16, 185, 129, 0.6)'
                          }}
                        />
                      </div>
                      <span className="text-xs font-bold min-w-fit" style={{ color: '#10b981' }}>
                        {calculateProgress(project.tasks)}%
                      </span>
                    </div>
                  </div>
                ))}
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
                          <span className="flex items-center"><Clock size={14} className="mr-1" /> Started: {new Date(selectedProject.startDate).toLocaleDateString()}</span>
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
                      {selectedProject.tasks.map((task, index) => (
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
                                <span className="flex items-center gap-1">👤 {task.who.filter((w: any) => w).map((w: any) => w.username || w || 'Unknown').join(', ')}</span>
                                {task.plannedDueDate && (
                                  <>
                                    <span>•</span>
                                    <span className="flex items-center gap-1">
                                      <Clock size={14} /> Due: {new Date(task.plannedDueDate).toLocaleDateString()}
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
                              Completed on {new Date(task.actualCompletedOn).toLocaleDateString()} by {task.completedBy?.username}
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
                  <p className="text-[var(--color-textSecondary)] text-sm">Choose from the list on the left</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Task Update Modal */}
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

                {selectedTask.whenType === 'ask-on-completion' && selectedTask.status === 'Awaiting Date' && (
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
                      Select the new target date for this step. Sundays will automatically shift to Monday.
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
