
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { CheckSquare, Clock, AlertCircle, Upload } from 'lucide-react';
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

    try {
      const formData = new FormData();
      formData.append('status', taskStatus);
      formData.append('completedBy', user?.id || '');
      formData.append('notes', taskNotes);
      
      files.forEach(file => {
        formData.append('files', file);
      });

      const response = await axios.put(
        `${address}/api/projects/${selectedProject.projectId}/tasks/${selectedTask.index}`,
        {
          status: taskStatus,
          completedBy: user?.id,
          notes: taskNotes,
          attachments: [] // Files would be uploaded separately
        }
      );

      if (response.data.success) {
        alert('Task updated successfully!');
        fetchProjects();
        setSelectedTask(null);
        setTaskStatus('');
        setTaskNotes('');
        setFiles([]);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[var(--color-text)] mb-2">FMS Project Progress</h1>
          <p className="text-[var(--color-textSecondary)]">Track and manage project tasks</p>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[var(--color-textSecondary)]">No projects found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Projects List */}
            <div className="lg:col-span-1 space-y-4">
              <h2 className="text-xl font-bold text-[var(--color-text)] mb-4">Projects</h2>
              {projects.map((project) => (
                <div
                  key={project._id}
                  onClick={() => setSelectedProject(project)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedProject?._id === project._id
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-primary)]/50'
                  }`}
                >
                  <h3 className="font-bold text-[var(--color-text)] mb-2">{project.projectName}</h3>
                  <p className="text-sm text-[var(--color-textSecondary)] mb-2">{project.projectId}</p>
                  <p className="text-xs text-[var(--color-textSecondary)] mb-3">
                    {project.fmsId.fmsName}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                    <div
                      className="bg-[var(--color-primary)] h-2 rounded-full transition-all"
                      style={{ width: `${calculateProgress(project.tasks)}%` }}
                    />
                  </div>
                  <p className="text-xs text-[var(--color-textSecondary)]">
                    {calculateProgress(project.tasks)}% Complete
                  </p>
                </div>
              ))}
            </div>

            {/* Task Details */}
            <div className="lg:col-span-2">
              {selectedProject ? (
                <div>
                  <div className="mb-6 p-6 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]">
                    <h2 className="text-2xl font-bold text-[var(--color-text)] mb-2">
                      {selectedProject.projectName}
                    </h2>
                    <div className="flex items-center space-x-4 text-sm text-[var(--color-textSecondary)]">
                      <span>Started: {new Date(selectedProject.startDate).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>Status: {selectedProject.status}</span>
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[var(--color-text)] mb-4">Tasks</h3>
                  <div className="space-y-4">
                    {selectedProject.tasks.map((task, index) => (
                      <div
                        key={index}
                        className="p-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)]"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h4 className="text-lg font-bold text-[var(--color-text)]">
                                Step {task.stepNo}: {task.what}
                              </h4>
                              <span className={`px-3 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                                {task.status}
                              </span>
                            </div>
                            <p className="text-sm text-[var(--color-textSecondary)] mb-2">{task.how}</p>
                            <div className="flex items-center space-x-4 text-sm text-[var(--color-textSecondary)]">
                              <span>
                                Assigned to: {task.who.map((w: any) => w.username).join(', ')}
                              </span>
                              {task.plannedDueDate && (
                                <>
                                  <span>•</span>
                                  <span className="flex items-center">
                                    <Clock size={14} className="mr-1" />
                                    Due: {new Date(task.plannedDueDate).toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          {task.status !== 'Done' && task.who.some((w: any) => w._id === user?.id) && (
                            <button
                              onClick={() => {
                                setSelectedTask({ ...task, index });
                                setTaskStatus(task.status);
                              }}
                              className="px-4 py-2 bg-[var(--color-primary)] text-white rounded-lg hover:opacity-90 text-sm"
                            >
                              Update
                            </button>
                          )}
                        </div>

                        {task.requiresChecklist && task.checklistItems.length > 0 && (
                          <div className="mt-3 p-3 rounded bg-[var(--color-background)]">
                            <p className="text-sm font-medium text-[var(--color-text)] mb-2">Checklist</p>
                            <div className="space-y-1">
                              {task.checklistItems.map((item: any, idx: number) => (
                                <div key={idx} className="flex items-center space-x-2 text-sm">
                                  {item.completed ? (
                                    <CheckSquare size={16} className="text-green-600" />
                                  ) : (
                                    <div className="w-4 h-4 border border-gray-400 rounded" />
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
                          <div className="mt-3 text-sm text-green-600 flex items-center">
                            <CheckSquare size={16} className="mr-2" />
                            Completed on {new Date(task.actualCompletedOn).toLocaleDateString()} by {task.completedBy?.username}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-[var(--color-textSecondary)]">
                  Select a project to view tasks
                </div>
              )}
            </div>
          </div>
        )}

        {/* Task Update Modal */}
        {selectedTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[var(--color-surface)] rounded-lg p-6 max-w-lg w-full mx-4">
              <h3 className="text-xl font-bold text-[var(--color-text)] mb-4">
                Update Task: {selectedTask.what}
              </h3>
              
              <div className="space-y-4">
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
                  <label className="block text-sm font-medium text-[var(--color-text)] mb-2">Attachments</label>
                  <input
                    type="file"
                    multiple
                    onChange={(e) => setFiles(e.target.files ? Array.from(e.target.files) : [])}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setSelectedTask(null);
                    setTaskStatus('');
                    setTaskNotes('');
                    setFiles([]);
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
