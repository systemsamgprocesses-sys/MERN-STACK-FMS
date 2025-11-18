import React, { useState, useEffect } from 'react';
import { X, AlertCircle, Edit, Pause, Play } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { Task } from '../types/Task';

interface SuperAdminTaskEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSuccess: () => void;
}

export const SuperAdminTaskEditModal: React.FC<SuperAdminTaskEditModalProps> = ({
  isOpen,
  onClose,
  task,
  onSuccess
}) => {
  const [status, setStatus] = useState<string>('');
  const [isOnHold, setIsOnHold] = useState<boolean>(false);
  const [inProgressRemarks, setInProgressRemarks] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (task) {
      setStatus(task.status || 'pending');
      setIsOnHold(task.isOnHold || false);
      setInProgressRemarks(task.inProgressRemarks || '');
      setError('');
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    // If status is being changed to 'in-progress', require remarks
    if (status === 'in-progress' && !inProgressRemarks.trim()) {
      setError('Remarks are required when marking task as In Progress');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const updates: any = {
        status,
        isOnHold
      };

      if (status === 'in-progress' && inProgressRemarks.trim()) {
        updates.inProgressRemarks = inProgressRemarks.trim();
      }

      await axios.put(
        `${address}/api/tasks/${task._id}`,
        updates,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        }
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update task. Please try again.');
      console.error('Error updating task:', err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
            <Edit className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
            Super Admin - Edit Task Status
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-red-700 dark:text-red-400">{error}</span>
            </div>
          )}

          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-md">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Task Information</h3>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div><span className="font-medium">Title:</span> {task.title}</div>
              <div><span className="font-medium">Current Status:</span> {task.status}</div>
              <div><span className="font-medium">Assigned To:</span> {task.assignedTo?.username || 'Unknown'}</div>
            </div>
          </div>

          <div>
            <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Status *
            </label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            >
              <option value="pending">Pending</option>
              <option value="in-progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Super Admin can change status from any status to any status, including changing completed tasks back to pending.
            </p>
          </div>

          {status === 'in-progress' && (
            <div>
              <label htmlFor="inProgressRemarks" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                In Progress Remarks *
              </label>
              <textarea
                id="inProgressRemarks"
                value={inProgressRemarks}
                onChange={(e) => setInProgressRemarks(e.target.value)}
                rows={3}
                required
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="Enter remarks for marking task as In Progress"
              />
            </div>
          )}

          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={isOnHold}
                onChange={(e) => setIsOnHold(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
              />
              <div className="flex items-center space-x-2">
                {isOnHold ? (
                  <Pause className="w-5 h-5 text-orange-500" />
                ) : (
                  <Play className="w-5 h-5 text-gray-400" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Put Task On Hold
                </span>
              </div>
            </label>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 ml-7">
              When a task is on hold, it cannot be completed. Super Admin can hold/unhold any task.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Updating...' : 'Update Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

