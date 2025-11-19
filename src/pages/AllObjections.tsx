import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { AlertCircle, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';

interface Objection {
  type: string;
  requestedDate?: string;
  extraDaysRequested?: number;
  remarks: string;
  requestedBy: { username: string; email: string };
  requestedAt: string;
  status: string;
  approvalRemarks?: string;
  approvedBy?: { username: string; email: string };
  approvedAt?: string;
}

interface Task {
  _id: string;
  title: string;
  dueDate: string;
  assignedTo: { username: string; email: string };
  assignedBy: { username: string; email: string };
  objections: Objection[];
}

const AllObjections: React.FC = () => {
  const { user } = useAuth();
  const [regularTasks, setRegularTasks] = useState<Task[]>([]);
  const [fmsTasks, setFmsTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if user has PC role or admin access
    if (user && !['pc', 'admin', 'superadmin'].includes(user.role)) {
      setError('Access denied. This page is only available for Process Coordinators.');
      setLoading(false);
      return;
    }
    
    if (user) {
      fetchAllObjections();
    }
  }, [user]);

  const fetchAllObjections = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/objections/all');
      setRegularTasks(response.data.regularTasks || []);
      setFmsTasks(response.data.fmsTasks || []);
    } catch (error: any) {
      console.error('Error fetching all objections:', error);
      if (error.response?.status === 403) {
        setError('Access denied. You do not have permission to view this page.');
      } else if (error.response?.status === 401) {
        setError('Authentication required. Please log in again.');
      } else {
        setError('Failed to load objections. Please try again later.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock size={16} className="text-yellow-500" />;
      case 'approved':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'rejected':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'approved':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'date_change':
        return 'Date Change';
      case 'hold':
        return 'Hold Task';
      case 'terminate':
        return 'Terminate Task';
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[--color-background] p-4">
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-[--color-error]" />
          <p className="text-lg font-semibold text-[--color-text] mb-2">Access Denied</p>
          <p className="text-[--color-textSecondary]">{error}</p>
        </div>
      </div>
    );
  }

  const allRegularObjections = regularTasks.flatMap(task =>
    task.objections.map((objection, index) => ({
      task,
      objection,
      index,
      isFMS: false
    }))
  );

  const allFMSObjections = fmsTasks.flatMap(project =>
    project.tasks.flatMap((task: any) =>
      task.objections.map((objection: any, index: number) => ({
        project,
        task,
        objection,
        index,
        isFMS: true
      }))
    )
  );

  const allObjections = [...allRegularObjections, ...allFMSObjections];

  // Sort by requested date (newest first)
  allObjections.sort((a, b) => {
    const dateA = new Date(a.objection.requestedAt).getTime();
    const dateB = new Date(b.objection.requestedAt).getTime();
    return dateB - dateA;
  });

  return (
    <div className="min-h-screen bg-[--color-background] p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[--color-text] mb-2">All Objections</h1>
        <p className="text-sm text-[--color-textSecondary]">View all objections raised by users (Read-only)</p>
      </div>

      {allObjections.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-[--color-textSecondary]" />
          <p className="text-[--color-textSecondary]">No objections found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {allObjections.map((item, idx) => {
            const key = item.isFMS 
              ? `fms-${item.project._id}-${(item.task as any).taskIndex || idx}-${idx}`
              : `regular-${item.task._id}-${idx}`;

            return (
              <div key={key} className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-[--color-text] mb-1">
                      {item.isFMS ? item.task.what : item.task.title}
                    </h3>
                    {item.isFMS ? (
                      <>
                        <p className="text-sm text-[--color-textSecondary] mb-1">
                          FMS Project: {item.project.projectName}
                        </p>
                        <p className="text-sm text-[--color-textSecondary] mb-1">
                          Assigned to: {item.task.who?.map((w: any) => w.username).join(', ') || 'N/A'}
                        </p>
                        <p className="text-sm text-[--color-textSecondary]">
                          Current Due Date: {item.task.plannedDueDate ? new Date(item.task.plannedDueDate).toLocaleDateString('en-GB') : 'N/A'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-sm text-[--color-textSecondary] mb-1">
                          Assigned to: {item.task.assignedTo?.username || 'Unknown User'}
                        </p>
                        <p className="text-sm text-[--color-textSecondary] mb-1">
                          Assigned by: {item.task.assignedBy?.username || 'Unknown User'}
                        </p>
                        <p className="text-sm text-[--color-textSecondary]">
                          Current Due Date: {new Date(item.task.dueDate).toLocaleDateString('en-GB')}
                        </p>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {getStatusIcon(item.objection.status)}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.objection.status)}`}>
                      {item.objection.status.charAt(0).toUpperCase() + item.objection.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="bg-[--color-background] rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-[--color-text] mb-2">
                        Objection Type: {getTypeLabel(item.objection.type)}
                      </p>
                      {item.objection.requestedDate && (
                        <p className="text-sm text-[--color-textSecondary] mb-2">
                          Requested Date: {new Date(item.objection.requestedDate).toLocaleDateString('en-GB')}
                          {item.objection.extraDaysRequested && (
                            <span className="ml-2">({item.objection.extraDaysRequested} extra days)</span>
                          )}
                        </p>
                      )}
                      <p className="text-sm text-[--color-textSecondary] mb-2">
                        Remarks: {item.objection.remarks}
                      </p>
                      <p className="text-xs text-[--color-textSecondary]">
                        Requested by: {item.objection.requestedBy?.username || 'Unknown User'} on {new Date(item.objection.requestedAt).toLocaleDateString('en-GB')}
                      </p>
                    </div>
                    <div>
                      {item.objection.approvedBy && (
                        <>
                          <p className="text-xs text-[--color-textSecondary] mb-1">
                            {item.objection.status === 'approved' ? 'Approved' : item.objection.status === 'rejected' ? 'Rejected' : 'Reviewed'} by: {item.objection.approvedBy.username}
                          </p>
                          {item.objection.approvedAt && (
                            <p className="text-xs text-[--color-textSecondary] mb-2">
                              on: {new Date(item.objection.approvedAt).toLocaleDateString('en-GB')}
                            </p>
                          )}
                        </>
                      )}
                      {item.objection.approvalRemarks && (
                        <div className="mt-2">
                          <p className="text-xs font-medium text-[--color-text] mb-1">Review Remarks:</p>
                          <p className="text-xs text-[--color-textSecondary]">{item.objection.approvalRemarks}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AllObjections;

