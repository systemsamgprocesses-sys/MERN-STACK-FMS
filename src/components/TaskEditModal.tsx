import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, User, FileText } from 'lucide-react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';

interface Task {
    _id: string;
    title: string;
    description?: string;
    assignedTo: any;
    assignedBy: any;
    dueDate?: string;
    priority?: string;
    taskType?: string;
    taskCategory?: string;
    startDate?: string;
    endDate?: string;
    checklistItems?: any[];
    attachments?: any[];
    status?: string;
}

interface User {
    _id: string;
    username: string;
    email: string;
}

interface TaskEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    task: Task | null;
    onSuccess: () => void;
    users: User[];
    isDark?: boolean;
}

export const TaskEditModal: React.FC<TaskEditModalProps> = ({
    isOpen,
    onClose,
    task,
    onSuccess,
    users,
    isDark = false
}) => {
    const [activeTab, setActiveTab] = useState('basic');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [assignedTo, setAssignedTo] = useState('');
    const [assignedBy, setAssignedBy] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [priority, setPriority] = useState('medium');
    const [taskType, setTaskType] = useState('general');
    const [taskCategory, setTaskCategory] = useState('regular');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setAssignedTo(task.assignedTo?._id || '');
            setAssignedBy(task.assignedBy?._id || '');
            setDueDate(task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '');
            setPriority(task.priority || 'medium');
            setTaskType(task.taskType || 'general');
            setTaskCategory(task.taskCategory || 'regular');
            setStartDate(task.startDate ? new Date(task.startDate).toISOString().split('T')[0] : '');
            setEndDate(task.endDate ? new Date(task.endDate).toISOString().split('T')[0] : '');
            setReason('');
            setError('');
        }
    }, [task]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!task) return;

        if (!reason.trim()) {
            setError('Please provide a reason for this edit (required for audit trail)');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const token = localStorage.getItem('token');
            const updates = {
                title,
                description,
                assignedTo,
                assignedBy,
                dueDate: dueDate || undefined,
                priority,
                taskType,
                taskCategory,
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                reason
            };

            await axios.put(
                `${address}/api/tasks/${task._id}/admin-edit`,
                updates,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            onSuccess();
            onClose();
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to update task');
            console.error('Error updating task:', err);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !task) return null;

    const tabs = [
        { id: 'basic', label: 'Basic Info', icon: FileText },
        { id: 'dates', label: 'Dates', icon: Calendar },
        { id: 'assignments', label: 'Assignments', icon: User },
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden ${isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700 bg-gradient-to-r from-blue-900 to-purple-900' : 'border-gray-200 bg-gradient-to-r from-blue-600 to-purple-600'
                    }`}>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                        <FileText size={24} />
                        Edit Task (Super Admin)
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={24} className="text-white" />
                    </button>
                </div>

                {/* Tabs */}
                <div className={`flex border-b ${isDark ? 'border-gray-700 bg-gray-750' : 'border-gray-200 bg-gray-50'}`}>
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === tab.id
                                    ? isDark
                                        ? 'bg-gray-800 text-blue-400 border-b-2 border-blue-400'
                                        : 'bg-white text-blue-600 border-b-2 border-blue-600'
                                    : isDark
                                        ? 'text-gray-400 hover:text-gray-300 hover:bg-gray-700'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                <Icon size={16} />
                                {tab.label}
                            </button>
                        );
                    })}
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto p-6 space-y-6">
                        {error && (
                            <div className={`p-4 rounded-lg border ${isDark
                                ? 'bg-red-900/20 border-red-800 text-red-400'
                                : 'bg-red-50 border-red-200 text-red-700'
                                }`}>
                                {error}
                            </div>
                        )}

                        {/* Basic Info Tab */}
                        {activeTab === 'basic' && (
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                        Task Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                            }`}
                                    />
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                            }`}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                            Priority
                                        </label>
                                        <select
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                                                ? 'bg-gray-700 border-gray-600 text-white'
                                                : 'bg-white border-gray-300 text-gray-900'
                                                }`}
                                        >
                                            <option value="low">Low</option>
                                            <option value="medium">Medium</option>
                                            <option value="high">High</option>
                                            <option value="urgent">Urgent</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                                            }`}>
                                            Task Type
                                        </label>
                                        <select
                                            value={taskType}
                                            onChange={(e) => setTaskType(e.target.value)}
                                            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                                                ? 'bg-gray-700 border-gray-600 text-white'
                                                : 'bg-white border-gray-300 text-gray-900'
                                                }`}
                                        >
                                            <option value="general">General</option>
                                            <option value="meeting">Meeting</option>
                                            <option value="review">Review</option>
                                            <option value="approval">Approval</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                        Task Category
                                    </label>
                                    <select
                                        value={taskCategory}
                                        onChange={(e) => setTaskCategory(e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                            }`}
                                    >
                                        <option value="regular">Regular</option>
                                        <option value="multi-level">Multi-Level (MLT)</option>
                                        <option value="date-range">Date Range</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Dates Tab */}
                        {activeTab === 'dates' && (
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                        Due Date
                                    </label>
                                    <input
                                        type="date"
                                        value={dueDate}
                                        onChange={(e) => setDueDate(e.target.value)}
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                            }`}
                                    />
                                </div>

                                {taskCategory === 'date-range' && (
                                    <>
                                        <div>
                                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                Start Date
                                            </label>
                                            <input
                                                type="date"
                                                value={startDate}
                                                onChange={(e) => setStartDate(e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                                                    ? 'bg-gray-700 border-gray-600 text-white'
                                                    : 'bg-white border-gray-300 text-gray-900'
                                                    }`}
                                            />
                                        </div>

                                        <div>
                                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                                                }`}>
                                                End Date
                                            </label>
                                            <input
                                                type="date"
                                                value={endDate}
                                                onChange={(e) => setEndDate(e.target.value)}
                                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                                                    ? 'bg-gray-700 border-gray-600 text-white'
                                                    : 'bg-white border-gray-300 text-gray-900'
                                                    }`}
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Assignments Tab */}
                        {activeTab === 'assignments' && (
                            <div className="space-y-4">
                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                        Assigned To *
                                    </label>
                                    <select
                                        value={assignedTo}
                                        onChange={(e) => setAssignedTo(e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                            }`}
                                    >
                                        <option value="">Select user...</option>
                                        {users.map((user) => (
                                            <option key={user._id} value={user._id}>
                                                {user.username} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'
                                        }`}>
                                        Assigned By *
                                    </label>
                                    <select
                                        value={assignedBy}
                                        onChange={(e) => setAssignedBy(e.target.value)}
                                        required
                                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${isDark
                                            ? 'bg-gray-700 border-gray-600 text-white'
                                            : 'bg-white border-gray-300 text-gray-900'
                                            }`}
                                    >
                                        <option value="">Select user...</option>
                                        {users.map((user) => (
                                            <option key={user._id} value={user._id}>
                                                {user.username} ({user.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Reason (shown on all tabs) */}
                        <div className={`p-4 rounded-lg border ${isDark
                            ? 'bg-yellow-900/20 border-yellow-800'
                            : 'bg-yellow-50 border-yellow-200'
                            }`}>
                            <label className={`block text-sm font-medium mb-2 ${isDark ? 'text-yellow-300' : 'text-yellow-800'
                                }`}>
                                Reason for Edit * (Audit Trail)
                            </label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                rows={2}
                                placeholder="Explain why you're making this change..."
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 ${isDark
                                    ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                                    }`}
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className={`flex justify-end space-x-3 p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'
                        }`}>
                        <button
                            type="button"
                            onClick={onClose}
                            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${isDark
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                                }`}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Save size={16} />
                            {loading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
