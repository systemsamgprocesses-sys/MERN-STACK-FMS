import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import { AlertCircle, Clock, CheckCircle, XCircle, Calendar } from 'lucide-react';
import { address } from '../../utils/ipAddress';

interface Objection {
  type: string;
  requestedDate?: string;
  extraDaysRequested?: number;
  remarks: string;
  requestedAt: string;
  status: string;
  approvalRemarks?: string;
  approvedBy?: { username: string; email: string };
  approvedAt?: string;
}

interface MyObjection {
  taskId: string;
  taskTitle: string;
  taskDueDate: string;
  objections: Objection[];
  isFMS?: boolean;
  projectId?: string;
  projectName?: string;
  taskIndex?: number;
}

const ObjectionsHub: React.FC = () => {
  const { user } = useAuth();
  const [myObjections, setMyObjections] = useState<{
    regular: MyObjection[];
    fms: MyObjection[];
  }>({ regular: [], fms: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyObjections();
  }, [user]);

  const fetchMyObjections = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      // Admin/SuperAdmin can see all objections
      if (user?.role === 'admin' || user?.role === 'superadmin') {
        const token = localStorage.getItem('token');
        const response = await axios.get(`${address}/api/objections/all`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined
        });

        // Transform the data to match the expected format
        const regularObjections = (response.data.regularTasks || []).map((task: any) => ({
          taskId: task._id,
          taskTitle: task.title,
          taskDueDate: task.dueDate,
          objections: task.objections
        }));

        const fmsObjections = (response.data.fmsTasks || []).flatMap((project: any) =>
          project.tasks.map((task: any) => ({
            taskId: `${project._id}-${task.taskIndex || 0}`,
            taskTitle: task.what,
            taskDueDate: task.plannedDueDate,
            objections: task.objections,
            isFMS: true,
            projectId: project._id,
            projectName: project.projectName,
            taskIndex: task.taskIndex
          }))
        );

        setMyObjections({
          regular: regularObjections,
          fms: fmsObjections
        });
      } else {
        // Regular employees see only their own objections
        const response = await axios.get(`${address}/api/objections/my/${user.id}`);
        setMyObjections(response.data || { regular: [], fms: [] });
      }
    } catch (error) {
      console.error('Error fetching my objections:', error);
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

  const allObjections = [
    ...myObjections.regular.map(item => ({ ...item, type: 'regular' })),
    ...myObjections.fms.map(item => ({ ...item, type: 'fms' }))
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[--color-primary]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[--color-background] p-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[--color-text] mb-2">
          {user?.role === 'admin' || user?.role === 'superadmin' ? 'All Objections' : 'My Objections'}
        </h1>
        <p className="text-sm text-[--color-textSecondary]">
          {user?.role === 'admin' || user?.role === 'superadmin'
            ? 'View all objections raised by all users'
            : 'View objections you have raised'}
        </p>
      </div>

      {allObjections.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle size={48} className="mx-auto mb-4 text-[--color-textSecondary]" />
          <p className="text-[--color-textSecondary]">No objections raised yet</p>
          <p className="text-sm text-[--color-textSecondary] mt-2">
            Objections can be raised when you need to request date changes, hold tasks, or terminate tasks
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {allObjections.map((item) =>
            item.objections.map((objection, index) => (
              <div key={`${item.taskId}-${index}`} className="bg-[--color-surface] rounded-xl p-6 border border-[--color-border]">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold text-[--color-text] mb-1">{item.taskTitle}</h3>
                    <p className="text-sm text-[--color-textSecondary]">
                      Current Due Date: {new Date(item.taskDueDate).toLocaleDateString('en-GB')}
                    </p>
                    {item.isFMS && (
                      <p className="text-sm text-[--color-textSecondary]">
                        FMS Project: {item.projectName}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(objection.status)}
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(objection.status)}`}>
                      {objection.status.charAt(0).toUpperCase() + objection.status.slice(1)}
                    </span>
                  </div>
                </div>

                <div className="bg-[--color-background] rounded-lg p-4 mb-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-[--color-text] mb-1">
                        Objection Type: {getTypeLabel(objection.type)}
                      </p>
                      {objection.requestedDate && (
                        <p className="text-sm text-[--color-textSecondary] mb-1">
                          Requested Date: {new Date(objection.requestedDate).toLocaleDateString('en-GB')}
                          {objection.extraDaysRequested && (
                            <span className="ml-2">({objection.extraDaysRequested} extra days)</span>
                          )}
                        </p>
                      )}
                      <p className="text-sm text-[--color-textSecondary]">
                        Remarks: {objection.remarks}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-[--color-textSecondary] mb-1">
                        Requested on: {new Date(objection.requestedAt).toLocaleDateString('en-GB')}
                      </p>
                      {objection.approvedBy && (
                        <>
                          <p className="text-xs text-[--color-textSecondary] mb-1">
                            {objection.status === 'approved' ? 'Approved' : 'Reviewed'} by: {objection.approvedBy.username}
                          </p>
                          {objection.approvedAt && (
                            <p className="text-xs text-[--color-textSecondary]">
                              on: {new Date(objection.approvedAt).toLocaleDateString('en-GB')}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {objection.approvalRemarks && (
                  <div className="bg-[--color-surface] border border-[--color-border] rounded-lg p-3">
                    <p className="text-sm font-medium text-[--color-text] mb-1">Review Remarks:</p>
                    <p className="text-sm text-[--color-textSecondary]">{objection.approvalRemarks}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default ObjectionsHub;