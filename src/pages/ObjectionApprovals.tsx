
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { AlertCircle, Check, X, Calendar } from 'lucide-react';
import { address } from '../../utils/ipAddress';

interface Objection {
  type: string;
  requestedDate?: string;
  extraDaysRequested?: number;
  remarks: string;
  requestedBy: { username: string; email: string };
  requestedAt: string;
  status: string;
}

interface Task {
  _id: string;
  title: string;
  dueDate: string;
  assignedTo: { username: string; email: string };
  objections: Objection[];
  isOnHold?: boolean;
  isTerminated?: boolean;
}

interface FMSTask {
  projectId: string;
  projectName: string;
  taskIndex: number;
  task: any;
}

const ObjectionApprovals: React.FC = () => {
  const { user } = useAuth();
  const [regularTasks, setRegularTasks] = useState<Task[]>([]);
  const [fmsTasks, setFmsTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvalRemarks, setApprovalRemarks] = useState<{ [key: string]: string }>({});
  const [impactScore, setImpactScore] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    fetchPendingObjections();
  }, [user]);

  const fetchPendingObjections = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${address}/api/objections/pending/${user?.id}`);
      setRegularTasks(response.data.regularTasks || []);
      setFmsTasks(response.data.fmsTasks || []);
    } catch (error) {
      console.error('Error fetching objections:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (taskId: string, objectionIndex: number, status: 'approved' | 'rejected', isFMS = false, projectId?: string, taskIndex?: number) => {
    try {
      const key = `${taskId}-${objectionIndex}`;
      const url = isFMS
        ? `${address}/api/objections/fms/${projectId}/task/${taskIndex}/objection/${objectionIndex}/respond`
        : `${address}/api/objections/task/${taskId}/objection/${objectionIndex}/respond`;

      await axios.post(url, {
        status,
        approvalRemarks: approvalRemarks[key] || '',
        impactScore: status === 'approved' ? (impactScore[key] !== false) : undefined,
        approvedBy: user?.id
      });

      alert(`Objection ${status} successfully`);
      fetchPendingObjections();
    } catch (error) {
      console.error('Error responding to objection:', error);
      alert('Failed to respond to objection');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--color-background] p-4">
      <h1 className="text-2xl font-bold text-[--color-text] mb-6">Pending Objection Approvals</h1>

      {regularTasks.length === 0 && fmsTasks.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-[--color-textSecondary]" />
          <p className="text-[--color-textSecondary]">No pending objections</p>
        </div>
      ) : (
        <div className="space-y-6">
          {regularTasks.map((task) =>
            task.objections
              .filter((obj) => obj.status === 'pending')
              .map((objection, index) => {
                const key = `${task._id}-${index}`;
                return (
                  <div key={key} className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                    <h3 className="font-semibold text-[--color-text] mb-2">{task.title}</h3>
                    <p className="text-sm text-[--color-textSecondary] mb-2">
                      Assigned to: {task.assignedTo?.username || 'Unknown User'}
                    </p>
                    <p className="text-sm text-[--color-textSecondary] mb-2">
                      Current Due Date: {new Date(task.dueDate).toLocaleDateString('en-GB')}
                    </p>
                    <div className="bg-[--color-background] rounded-lg p-4 mb-4">
                      <p className="text-sm font-medium text-[--color-text] mb-2">
                        Objection Type: {objection.type === 'date_change' ? 'Date Change' : objection.type === 'hold' ? 'Hold Task' : 'Terminate Task'}
                      </p>
                      {objection.requestedDate && (
                        <p className="text-sm text-[--color-textSecondary] mb-2">
                          Requested Date: {new Date(objection.requestedDate).toLocaleDateString('en-GB')} ({objection.extraDaysRequested} extra days)
                        </p>
                      )}
                      <p className="text-sm text-[--color-textSecondary]">Remarks: {objection.remarks}</p>
                      <p className="text-xs text-[--color-textSecondary] mt-2">
                        Requested by: {objection.requestedBy?.username || 'Unknown User'} on {new Date(objection.requestedAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2 text-[--color-textSecondary]">
                          Your Remarks
                        </label>
                        <textarea
                          value={approvalRemarks[key] || ''}
                          onChange={(e) => setApprovalRemarks({ ...approvalRemarks, [key]: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                          placeholder="Optional remarks..."
                        />
                      </div>
                      {objection.type === 'date_change' && (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`impact-${key}`}
                            checked={impactScore[key] !== false}
                            onChange={(e) => setImpactScore({ ...impactScore, [key]: e.target.checked })}
                            className="mr-2"
                          />
                          <label htmlFor={`impact-${key}`} className="text-sm text-[--color-text]">
                            Impact scoring (uncheck to not affect score)
                          </label>
                        </div>
                      )}
                      <div className="flex space-x-3">
                        <button
                          onClick={() => handleRespond(task._id, index, 'approved')}
                          className="flex-1 py-2 px-4 bg-[--color-success] text-white rounded-lg hover:opacity-90 flex items-center justify-center"
                        >
                          <Check size={16} className="mr-2" />
                          Approve
                        </button>
                        <button
                          onClick={() => handleRespond(task._id, index, 'rejected')}
                          className="flex-1 py-2 px-4 bg-[--color-error] text-white rounded-lg hover:opacity-90 flex items-center justify-center"
                        >
                          <X size={16} className="mr-2" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
          )}

          {fmsTasks.map((project) =>
            project.tasks.map((task: any, taskIndex: number) =>
              task.objections
                ?.filter((obj: any) => obj.status === 'pending')
                .map((objection: any, objIndex: number) => {
                  const key = `fms-${project._id}-${taskIndex}-${objIndex}`;
                  return (
                    <div key={key} className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                      <h3 className="font-semibold text-[--color-text] mb-2">{task.what}</h3>
                      <p className="text-sm text-[--color-textSecondary] mb-2">FMS Project: {project.projectName}</p>
                      <p className="text-sm text-[--color-textSecondary] mb-2">
                        Current Due Date: {task.plannedDueDate ? new Date(task.plannedDueDate).toLocaleDateString('en-GB') : 'N/A'}
                      </p>
                      <div className="bg-[--color-background] rounded-lg p-4 mb-4">
                        <p className="text-sm font-medium text-[--color-text] mb-2">
                          Objection Type: {objection.type === 'date_change' ? 'Date Change' : objection.type === 'hold' ? 'Hold Task' : 'Terminate Task'}
                        </p>
                        {objection.requestedDate && (
                          <p className="text-sm text-[--color-textSecondary] mb-2">
                            Requested Date: {new Date(objection.requestedDate).toLocaleDateString('en-GB')}
                          </p>
                        )}
                        <p className="text-sm text-[--color-textSecondary]">Remarks: {objection.remarks}</p>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium mb-2 text-[--color-textSecondary]">
                            Your Remarks
                          </label>
                          <textarea
                            value={approvalRemarks[key] || ''}
                            onChange={(e) => setApprovalRemarks({ ...approvalRemarks, [key]: e.target.value })}
                            rows={2}
                            className="w-full px-3 py-2 border border-[--color-border] rounded-lg bg-[--color-background] text-[--color-text]"
                            placeholder="Optional remarks..."
                          />
                        </div>
                        {objection.type === 'date_change' && (
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id={`impact-${key}`}
                              checked={impactScore[key] !== false}
                              onChange={(e) => setImpactScore({ ...impactScore, [key]: e.target.checked })}
                              className="mr-2"
                            />
                            <label htmlFor={`impact-${key}`} className="text-sm text-[--color-text]">
                              Impact scoring (uncheck to not affect score)
                            </label>
                          </div>
                        )}
                        <div className="flex space-x-3">
                          <button
                            onClick={() => handleRespond(project._id, objIndex, 'approved', true, project._id, taskIndex)}
                            className="flex-1 py-2 px-4 bg-[--color-success] text-white rounded-lg hover:opacity-90 flex items-center justify-center"
                          >
                            <Check size={16} className="mr-2" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRespond(project._id, objIndex, 'rejected', true, project._id, taskIndex)}
                            className="flex-1 py-2 px-4 bg-[--color-error] text-white rounded-lg hover:opacity-90 flex items-center justify-center"
                          >
                            <X size={16} className="mr-2" />
                            Reject
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
            )
          )}
        </div>
      )}
    </div>
  );
};

export default ObjectionApprovals;
