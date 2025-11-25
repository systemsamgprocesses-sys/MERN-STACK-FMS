import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Calendar, CheckCircle, Trash2, Edit, AlertCircle, RefreshCw, Search, Filter } from 'lucide-react';

interface ChecklistOccurrence {
    _id: string;
    templateName: string;
    category: string;
    dueDate: string;
    status: 'pending' | 'completed';
    assignedTo: {
        _id: string;
        username: string;
        email: string;
    };
    completedBy?: {
        username: string;
    };
    completedAt?: string;
    items: Array<{
        label: string;
        checked: boolean;
    }>;
}

interface FMSProject {
    _id: string;
    projectId: string;
    projectName: string;
    status?: string;
    fmsId: {
        fmsName: string;
    };
    tasks: Array<{
        stepNo: number;
        what: string;
        status: string;
        plannedDueDate: string;
        actualCompletedOn?: string;
        who: Array<{
            username: string;
        }>;
    }>;
}

const SuperAdminManagement: React.FC = () => {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'checklists' | 'fms'>('checklists');
    const [checklists, setChecklists] = useState<ChecklistOccurrence[]>([]);
    const [fmsProjects, setFmsProjects] = useState<FMSProject[]>([]);
    const [loading, setLoading] = useState(false);
    const [editModal, setEditModal] = useState<{
        type: 'status' | 'duedate' | 'delete';
        item: any;
        itemType: 'checklist' | 'fms';
    } | null>(null);

    // Filter states
    const [checklistSearch, setChecklistSearch] = useState('');
    const [checklistStatusFilter, setChecklistStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
    const [fmsSearch, setFmsSearch] = useState('');
    const [fmsStatusFilter, setFmsStatusFilter] = useState<string>('all');

    useEffect(() => {
        if (activeTab === 'checklists') {
            fetchChecklists();
        } else {
            fetchFMSProjects();
        }
    }, [activeTab]);

    const fetchChecklists = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get(`${address}/api/checklist-occurrences`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setChecklists(response.data);
        } catch (error) {
            console.error('Error fetching checklists:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchFMSProjects = async () => {
        setLoading(true);
        try {
            const response = await axios.get(`${address}/api/projects?role=${user?.role}`);
            setFmsProjects(response.data.projects || []);
        } catch (error) {
            console.error('Error fetching FMS projects:', error);
        } finally {
            setLoading(false);
        }
    };

    // Filtered checklists
    const filteredChecklists = useMemo(() => {
        return checklists.filter((checklist) => {
            const matchesSearch =
                checklistSearch === '' ||
                checklist.templateName.toLowerCase().includes(checklistSearch.toLowerCase()) ||
                checklist.category.toLowerCase().includes(checklistSearch.toLowerCase()) ||
                checklist.assignedTo?.username.toLowerCase().includes(checklistSearch.toLowerCase());

            const matchesStatus =
                checklistStatusFilter === 'all' || checklist.status === checklistStatusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [checklists, checklistSearch, checklistStatusFilter]);

    // Filtered FMS projects
    const filteredFMSProjects = useMemo(() => {
        return fmsProjects.filter((project) => {
            const matchesSearch =
                fmsSearch === '' ||
                project.projectName.toLowerCase().includes(fmsSearch.toLowerCase()) ||
                project.projectId.toLowerCase().includes(fmsSearch.toLowerCase()) ||
                project.fmsId?.fmsName.toLowerCase().includes(fmsSearch.toLowerCase());

            const matchesStatus =
                fmsStatusFilter === 'all' ||
                project.tasks.some((task) => task.status === fmsStatusFilter);

            return matchesSearch && matchesStatus;
        });
    }, [fmsProjects, fmsSearch, fmsStatusFilter]);

    const handleDeleteChecklist = async (id: string) => {
        if (!window.confirm('Are you sure you want to delete this checklist occurrence?')) return;

        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${address}/api/checklist-occurrences/${id}/admin-delete`, {
                headers: { Authorization: `Bearer ${token}` },
                data: { reason: 'Deleted by Super Admin' }
            });
            alert('Checklist deleted successfully');
            fetchChecklists();
            setEditModal(null);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error deleting checklist');
        }
    };

    const handleUpdateChecklistStatus = async (id: string, newStatus: 'pending' | 'completed') => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(
                `${address}/api/checklist-occurrences/${id}/admin-status`,
                { status: newStatus, reason: 'Status changed by Super Admin' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Status updated successfully');
            fetchChecklists();
            setEditModal(null);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error updating status');
        }
    };

    const handleUpdateChecklistDueDate = async (id: string, newDueDate: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(
                `${address}/api/checklist-occurrences/${id}/admin-duedate`,
                { dueDate: newDueDate, reason: 'Due date changed by Super Admin' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('Due date updated successfully');
            fetchChecklists();
            setEditModal(null);
        } catch (error: any) {
            alert(error.response?.data?.error || 'Error updating due date');
        }
    };

    const handleUpdateFMSStatus = async (projectId: string, taskIndex: number, newStatus: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(
                `${address}/api/projects/${projectId}/tasks/${taskIndex}/admin-status`,
                { status: newStatus, reason: 'Status changed by Super Admin' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('FMS status updated successfully');
            fetchFMSProjects();
            setEditModal(null);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error updating FMS status');
        }
    };

    const handleUpdateFMSDueDate = async (projectId: string, taskIndex: number, newDueDate: string) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(
                `${address}/api/projects/${projectId}/tasks/${taskIndex}/admin-duedate`,
                { plannedDueDate: newDueDate, reason: 'Due date changed by Super Admin' },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            alert('FMS due date updated successfully');
            fetchFMSProjects();
            setEditModal(null);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error updating FMS due date');
        }
    };

    const handleDeleteFMSProject = async (projectId: string) => {
        if (!window.confirm('Are you sure you want to delete this entire FMS project?')) return;

        try {
            await axios.delete(`${address}/api/projects/${projectId}?role=superadmin`);
            alert('FMS project deleted successfully');
            fetchFMSProjects();
            setEditModal(null);
        } catch (error: any) {
            alert(error.response?.data?.message || 'Error deleting FMS project');
        }
    };

    if (user?.role !== 'superadmin') {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <AlertCircle size={48} className="mx-auto mb-4 text-red-500" />
                    <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
                    <p className="text-gray-600">Only Super Admins can access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            <div className="mb-6">
                <div className="flex items-center gap-3 mb-2">
                    <Shield size={32} className="text-purple-600" />
                    <h1 className="text-3xl font-bold">Super Admin Management</h1>
                </div>
                <p className="text-gray-600">Manage FMS projects and checklists with elevated privileges</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 mb-6 border-b">
                <button
                    onClick={() => setActiveTab('checklists')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'checklists'
                            ? 'border-b-2 border-purple-600 text-purple-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <CheckCircle size={20} />
                        Checklists
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('fms')}
                    className={`px-6 py-3 font-medium transition-colors ${activeTab === 'fms'
                            ? 'border-b-2 border-purple-600 text-purple-600'
                            : 'text-gray-600 hover:text-gray-900'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <RefreshCw size={20} />
                        FMS Projects
                    </div>
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading...</p>
                </div>
            ) : (
                <>
                    {/* Checklists Tab */}
                    {activeTab === 'checklists' && (
                        <div className="space-y-4">
                            {/* Filters for Checklists */}
                            <div className="bg-white rounded-lg shadow p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter size={20} className="text-purple-600" />
                                    <h3 className="font-semibold">Filters</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by template, category, or user..."
                                            value={checklistSearch}
                                            onChange={(e) => setChecklistSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <select
                                        value={checklistStatusFilter}
                                        onChange={(e) => setChecklistStatusFilter(e.target.value as any)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="all">All Statuses</option>
                                        <option value="pending">Pending</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                    Showing {filteredChecklists.length} of {checklists.length} checklists
                                </div>
                            </div>

                            {/* Checklists Table */}
                            <div className="bg-white rounded-lg shadow overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Template
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Category
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Assigned To
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Due Date
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Status
                                                </th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {filteredChecklists.map((checklist) => (
                                                <tr key={checklist._id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{checklist.templateName}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">
                                                            {checklist.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {checklist.assignedTo?.username}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {new Date(checklist.dueDate).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span
                                                            className={`px-2 py-1 text-xs font-medium rounded ${checklist.status === 'completed'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                                }`}
                                                        >
                                                            {checklist.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                        <div className="flex gap-2">
                                                            <button
                                                                onClick={() =>
                                                                    setEditModal({ type: 'status', item: checklist, itemType: 'checklist' })
                                                                }
                                                                className="text-blue-600 hover:text-blue-800"
                                                                title="Change Status"
                                                            >
                                                                <Edit size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() =>
                                                                    setEditModal({ type: 'duedate', item: checklist, itemType: 'checklist' })
                                                                }
                                                                className="text-purple-600 hover:text-purple-800"
                                                                title="Change Due Date"
                                                            >
                                                                <Calendar size={18} />
                                                            </button>
                                                            <button
                                                                onClick={() => handleDeleteChecklist(checklist._id)}
                                                                className="text-red-600 hover:text-red-800"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* FMS Projects Tab */}
                    {activeTab === 'fms' && (
                        <div className="space-y-4">
                            {/* Filters for FMS */}
                            <div className="bg-white rounded-lg shadow p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <Filter size={20} className="text-purple-600" />
                                    <h3 className="font-semibold">Filters</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <Search size={18} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="Search by project name, ID, or FMS name..."
                                            value={fmsSearch}
                                            onChange={(e) => setFmsSearch(e.target.value)}
                                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                        />
                                    </div>
                                    <select
                                        value={fmsStatusFilter}
                                        onChange={(e) => setFmsStatusFilter(e.target.value)}
                                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="all">All Task Statuses</option>
                                        <option value="Not Started">Not Started</option>
                                        <option value="Pending">Pending</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Done">Done</option>
                                        <option value="Awaiting Date">Awaiting Date</option>
                                    </select>
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                    Showing {filteredFMSProjects.length} of {fmsProjects.length} projects
                                </div>
                            </div>

                            {/* FMS Projects List */}
                            <div className="space-y-6">
                                {filteredFMSProjects.map((project) => (
                                    <div key={project._id} className="bg-white rounded-lg shadow overflow-hidden">
                                        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-4 flex justify-between items-center">
                                            <div>
                                                <h3 className="text-white text-lg font-bold">{project.projectName}</h3>
                                                <p className="text-purple-100 text-sm">
                                                    {project.fmsId?.fmsName} • {project.projectId}
                                                </p>
                                            </div>
                                            <button
                                                onClick={() => handleDeleteFMSProject(project.projectId)}
                                                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                                            >
                                                <Trash2 size={18} />
                                                Delete Project
                                            </button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full divide-y divide-gray-200">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Step
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Task
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Assigned To
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Due Date
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Status
                                                        </th>
                                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                                            Actions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white divide-y divide-gray-200">
                                                    {project.tasks.map((task, index) => (
                                                        <tr key={index} className="hover:bg-gray-50">
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                {task.stepNo}
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-gray-900">{task.what}</td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {task.who?.map((u) => u.username).join(', ')}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                                {task.plannedDueDate
                                                                    ? new Date(task.plannedDueDate).toLocaleDateString()
                                                                    : 'N/A'}
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap">
                                                                <span
                                                                    className={`px-2 py-1 text-xs font-medium rounded ${task.status === 'Done'
                                                                            ? 'bg-green-100 text-green-800'
                                                                            : task.status === 'Pending'
                                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                                : task.status === 'In Progress'
                                                                                    ? 'bg-blue-100 text-blue-800'
                                                                                    : 'bg-gray-100 text-gray-800'
                                                                        }`}
                                                                >
                                                                    {task.status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                                <div className="flex gap-2">
                                                                    <button
                                                                        onClick={() =>
                                                                            setEditModal({
                                                                                type: 'status',
                                                                                item: { project, task, taskIndex: index },
                                                                                itemType: 'fms'
                                                                            })
                                                                        }
                                                                        className="text-blue-600 hover:text-blue-800"
                                                                        title="Change Status"
                                                                    >
                                                                        <Edit size={18} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() =>
                                                                            setEditModal({
                                                                                type: 'duedate',
                                                                                item: { project, task, taskIndex: index },
                                                                                itemType: 'fms'
                                                                            })
                                                                        }
                                                                        className="text-purple-600 hover:text-purple-800"
                                                                        title="Change Due Date"
                                                                    >
                                                                        <Calendar size={18} />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Edit Modal */}
            {editModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-xl font-bold mb-4">
                            {editModal.type === 'status' && 'Change Status'}
                            {editModal.type === 'duedate' && 'Change Due Date'}
                            {editModal.type === 'delete' && 'Confirm Deletion'}
                        </h3>

                        {editModal.type === 'status' && editModal.itemType === 'checklist' && (
                            <div className="space-y-4">
                                <p className="text-gray-600">Select new status:</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleUpdateChecklistStatus(editModal.item._id, 'pending')}
                                        className="flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600"
                                    >
                                        Pending
                                    </button>
                                    <button
                                        onClick={() => handleUpdateChecklistStatus(editModal.item._id, 'completed')}
                                        className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                                    >
                                        Completed
                                    </button>
                                </div>
                            </div>
                        )}

                        {editModal.type === 'status' && editModal.itemType === 'fms' && (
                            <div className="space-y-4">
                                <p className="text-gray-600">Select new status:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    {['Not Started', 'Pending', 'In Progress', 'Done', 'Awaiting Date'].map((status) => (
                                        <button
                                            key={status}
                                            onClick={() =>
                                                handleUpdateFMSStatus(
                                                    editModal.item.project.projectId,
                                                    editModal.item.taskIndex,
                                                    status
                                                )
                                            }
                                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                                        >
                                            {status}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {editModal.type === 'duedate' && editModal.itemType === 'checklist' && (
                            <div className="space-y-4">
                                <label className="block">
                                    <span className="text-gray-700">New Due Date:</span>
                                    <input
                                        type="date"
                                        defaultValue={new Date(editModal.item.dueDate).toISOString().split('T')[0]}
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleUpdateChecklistDueDate(editModal.item._id, e.target.value);
                                            }
                                        }}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                    />
                                </label>
                            </div>
                        )}

                        {editModal.type === 'duedate' && editModal.itemType === 'fms' && (
                            <div className="space-y-4">
                                <label className="block">
                                    <span className="text-gray-700">New Due Date:</span>
                                    <input
                                        type="date"
                                        defaultValue={
                                            editModal.item.task.plannedDueDate
                                                ? new Date(editModal.item.task.plannedDueDate).toISOString().split('T')[0]
                                                : ''
                                        }
                                        onChange={(e) => {
                                            if (e.target.value) {
                                                handleUpdateFMSDueDate(
                                                    editModal.item.project.projectId,
                                                    editModal.item.taskIndex,
                                                    e.target.value
                                                );
                                            }
                                        }}
                                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-purple-500 focus:ring-purple-500"
                                    />
                                </label>
                            </div>
                        )}

                        <div className="mt-6 flex gap-2">
                            <button
                                onClick={() => setEditModal(null)}
                                className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuperAdminManagement;
