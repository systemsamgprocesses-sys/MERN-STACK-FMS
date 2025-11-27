import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { address } from '../../utils/ipAddress';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Calendar, CheckCircle, Trash2, Edit, AlertCircle, RefreshCw, Search, Filter, X } from 'lucide-react';

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
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-pink-50">
                <div className="text-center p-8 bg-white rounded-2xl shadow-2xl">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center">
                        <AlertCircle size={32} className="text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">Access Denied</h2>
                    <p className="text-gray-600">Only Super Admins can access this page.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg">
                            <Shield size={24} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                                Super Admin Management
                            </h1>
                            <p className="text-sm text-gray-600">Manage FMS projects and checklists with elevated privileges</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-white rounded-xl shadow-sm p-1 mb-6 inline-flex gap-1">
                    <button
                        onClick={() => setActiveTab('checklists')}
                        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'checklists'
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <CheckCircle size={18} />
                            Checklists
                        </div>
                    </button>
                    <button
                        onClick={() => setActiveTab('fms')}
                        className={`px-6 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${activeTab === 'fms'
                                ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-md'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                    >
                        <div className="flex items-center gap-2">
                            <RefreshCw size={18} />
                            FMS Projects
                        </div>
                    </button>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-600 font-medium">Loading...</p>
                    </div>
                ) : (
                    <>
                        {/* Checklists Tab */}
                        {activeTab === 'checklists' && (
                            <div className="space-y-4">
                                {/* Filters */}
                                <div className="bg-white rounded-xl shadow-sm p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Filter size={18} className="text-purple-600" />
                                        <h3 className="font-semibold text-gray-900">Filters</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by template, category, or user..."
                                                value={checklistSearch}
                                                onChange={(e) => setChecklistSearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <select
                                            value={checklistStatusFilter}
                                            onChange={(e) => setChecklistStatusFilter(e.target.value as any)}
                                            className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        >
                                            <option value="all">All Statuses</option>
                                            <option value="pending">Pending</option>
                                            <option value="completed">Completed</option>
                                        </select>
                                    </div>
                                    <div className="mt-3 text-xs text-gray-600">
                                        Showing <span className="font-semibold text-purple-600">{filteredChecklists.length}</span> of {checklists.length} checklists
                                    </div>
                                </div>

                                {/* Checklists Table */}
                                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Template</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Category</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Assigned To</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Due Date</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Status</th>
                                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-100">
                                                {filteredChecklists.map((checklist) => (
                                                    <tr key={checklist._id} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <div className="text-sm font-medium text-gray-900">{checklist.templateName}</div>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-md">
                                                                {checklist.category}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                            {checklist.assignedTo?.username}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                            {new Date(checklist.dueDate).toLocaleDateString()}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span
                                                                className={`px-2 py-1 text-xs font-medium rounded-md ${checklist.status === 'completed'
                                                                        ? 'bg-green-100 text-green-800'
                                                                        : 'bg-yellow-100 text-yellow-800'
                                                                    }`}
                                                            >
                                                                {checklist.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                            <div className="flex gap-2">
                                                                <button
                                                                    onClick={() =>
                                                                        setEditModal({ type: 'status', item: checklist, itemType: 'checklist' })
                                                                    }
                                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                    title="Change Status"
                                                                >
                                                                    <Edit size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() =>
                                                                        setEditModal({ type: 'duedate', item: checklist, itemType: 'checklist' })
                                                                    }
                                                                    className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                                    title="Change Due Date"
                                                                >
                                                                    <Calendar size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeleteChecklist(checklist._id)}
                                                                    className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                    title="Delete"
                                                                >
                                                                    <Trash2 size={16} />
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
                                {/* Filters */}
                                <div className="bg-white rounded-xl shadow-sm p-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Filter size={18} className="text-purple-600" />
                                        <h3 className="font-semibold text-gray-900">Filters</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        <div className="relative">
                                            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                placeholder="Search by project name, ID, or FMS name..."
                                                value={fmsSearch}
                                                onChange={(e) => setFmsSearch(e.target.value)}
                                                className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <select
                                            value={fmsStatusFilter}
                                            onChange={(e) => setFmsStatusFilter(e.target.value)}
                                            className="px-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        >
                                            <option value="all">All Task Statuses</option>
                                            <option value="Not Started">Not Started</option>
                                            <option value="Pending">Pending</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Done">Done</option>
                                            <option value="Awaiting Date">Awaiting Date</option>
                                        </select>
                                    </div>
                                    <div className="mt-3 text-xs text-gray-600">
                                        Showing <span className="font-semibold text-purple-600">{filteredFMSProjects.length}</span> of {fmsProjects.length} projects
                                    </div>
                                </div>

                                {/* FMS Projects List */}
                                <div className="space-y-4">
                                    {filteredFMSProjects.map((project) => (
                                        <div key={project._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                                            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 px-4 py-3 flex justify-between items-center">
                                                <div>
                                                    <h3 className="text-white text-base font-bold">{project.projectName}</h3>
                                                    <p className="text-purple-100 text-xs">
                                                        {project.fmsId?.fmsName} • {project.projectId}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteFMSProject(project.projectId)}
                                                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors text-sm"
                                                >
                                                    <Trash2 size={16} />
                                                    Delete
                                                </button>
                                            </div>
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200">
                                                    <thead className="bg-gray-50">
                                                        <tr>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Step</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Task</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Assigned To</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Due Date</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                                                            <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700 uppercase">Actions</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white divide-y divide-gray-100">
                                                        {project.tasks.map((task, index) => (
                                                            <tr key={index} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                                                                    {task.stepNo}
                                                                </td>
                                                                <td className="px-4 py-2 text-sm text-gray-900 max-w-xs truncate">{task.what}</td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                    {task.who?.map((u) => u.username).join(', ')}
                                                                </td>
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                                                                    {task.plannedDueDate
                                                                        ? new Date(task.plannedDueDate).toLocaleDateString()
                                                                        : 'N/A'}
                                                                </td>
                                                                <td className="px-4 py-2 whitespace-nowrap">
                                                                    <span
                                                                        className={`px-2 py-1 text-xs font-medium rounded-md ${task.status === 'Done'
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
                                                                <td className="px-4 py-2 whitespace-nowrap text-sm">
                                                                    <div className="flex gap-2">
                                                                        <button
                                                                            onClick={() =>
                                                                                setEditModal({
                                                                                    type: 'status',
                                                                                    item: { project, task, taskIndex: index },
                                                                                    itemType: 'fms'
                                                                                })
                                                                            }
                                                                            className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                            title="Change Status"
                                                                        >
                                                                            <Edit size={16} />
                                                                        </button>
                                                                        <button
                                                                            onClick={() =>
                                                                                setEditModal({
                                                                                    type: 'duedate',
                                                                                    item: { project, task, taskIndex: index },
                                                                                    itemType: 'fms'
                                                                                })
                                                                            }
                                                                            className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                                                            title="Change Due Date"
                                                                        >
                                                                            <Calendar size={16} />
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
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl animate-in">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editModal.type === 'status' && 'Change Status'}
                                    {editModal.type === 'duedate' && 'Change Due Date'}
                                    {editModal.type === 'delete' && 'Confirm Deletion'}
                                </h3>
                                <button
                                    onClick={() => setEditModal(null)}
                                    className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                    <X size={20} className="text-gray-500" />
                                </button>
                            </div>

                            {editModal.type === 'status' && editModal.itemType === 'checklist' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">Select new status:</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleUpdateChecklistStatus(editModal.item._id, 'pending')}
                                            className="flex-1 px-4 py-2.5 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 font-medium transition-colors"
                                        >
                                            Pending
                                        </button>
                                        <button
                                            onClick={() => handleUpdateChecklistStatus(editModal.item._id, 'completed')}
                                            className="flex-1 px-4 py-2.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition-colors"
                                        >
                                            Completed
                                        </button>
                                    </div>
                                </div>
                            )}

                            {editModal.type === 'status' && editModal.itemType === 'fms' && (
                                <div className="space-y-4">
                                    <p className="text-sm text-gray-600">Select new status:</p>
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
                                                className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 text-sm font-medium transition-all"
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
                                        <span className="text-sm font-medium text-gray-700">New Due Date:</span>
                                        <input
                                            type="date"
                                            defaultValue={new Date(editModal.item.dueDate).toISOString().split('T')[0]}
                                            onChange={(e) => {
                                                if (e.target.value) {
                                                    handleUpdateChecklistDueDate(editModal.item._id, e.target.value);
                                                }
                                            }}
                                            className="mt-2 block w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        />
                                    </label>
                                </div>
                            )}

                            {editModal.type === 'duedate' && editModal.itemType === 'fms' && (
                                <div className="space-y-4">
                                    <label className="block">
                                        <span className="text-sm font-medium text-gray-700">New Due Date:</span>
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
                                            className="mt-2 block w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                        />
                                    </label>
                                </div>
                            )}

                            <div className="mt-6 flex gap-2">
                                <button
                                    onClick={() => setEditModal(null)}
                                    className="flex-1 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SuperAdminManagement;
