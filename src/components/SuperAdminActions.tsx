import React, { useState } from 'react';
import { MoreVertical, Edit, Trash2, UserPlus, CheckSquare, Paperclip } from 'lucide-react';

interface SuperAdminActionsProps {
    itemType: 'task' | 'fms';
    onEdit?: () => void;
    onDelete?: () => void;
    onDeleteProgress?: () => void;
    onDeleteChecklist?: () => void;
    onDeleteAttachment?: (index: number) => void;
    onReassign?: () => void;
    isDark?: boolean;
}

export const SuperAdminActions: React.FC<SuperAdminActionsProps> = ({
    itemType,
    onEdit,
    onDelete,
    onDeleteProgress,
    onDeleteChecklist,
    onDeleteAttachment,
    onReassign,
    isDark = false
}) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleAction = (action: () => void) => {
        action();
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`p-2 rounded-lg transition-colors ${isDark
                        ? 'hover:bg-gray-700 text-gray-300'
                        : 'hover:bg-gray-100 text-gray-600'
                    }`}
                title="Super Admin Actions"
            >
                <MoreVertical size={20} />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown Menu */}
                    <div
                        className={`absolute right-0 mt-2 w-56 rounded-lg shadow-lg z-20 ${isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
                            }`}
                    >
                        <div className="py-1">
                            {/* Header */}
                            <div className={`px-4 py-2 text-xs font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                Super Admin Actions
                            </div>

                            {/* Edit */}
                            {onEdit && (
                                <button
                                    onClick={() => handleAction(onEdit)}
                                    className={`w-full px-4 py-2 text-left flex items-center space-x-3 transition-colors ${isDark
                                            ? 'hover:bg-gray-700 text-gray-200'
                                            : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <Edit size={16} className="text-blue-500" />
                                    <span>Edit {itemType === 'task' ? 'Task' : 'FMS Task'}</span>
                                </button>
                            )}

                            {/* Reassign */}
                            {onReassign && (
                                <button
                                    onClick={() => handleAction(onReassign)}
                                    className={`w-full px-4 py-2 text-left flex items-center space-x-3 transition-colors ${isDark
                                            ? 'hover:bg-gray-700 text-gray-200'
                                            : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <UserPlus size={16} className="text-green-500" />
                                    <span>Reassign Task</span>
                                </button>
                            )}

                            {/* Delete Checklist */}
                            {onDeleteChecklist && (
                                <button
                                    onClick={() => handleAction(onDeleteChecklist)}
                                    className={`w-full px-4 py-2 text-left flex items-center space-x-3 transition-colors ${isDark
                                            ? 'hover:bg-gray-700 text-gray-200'
                                            : 'hover:bg-gray-50 text-gray-700'
                                        }`}
                                >
                                    <CheckSquare size={16} className="text-orange-500" />
                                    <span>Delete Checklist</span>
                                </button>
                            )}

                            {/* Divider */}
                            {(onDeleteProgress || onDelete) && (
                                <div className={`my-1 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`} />
                            )}

                            {/* Delete FMS Progress */}
                            {onDeleteProgress && itemType === 'fms' && (
                                <button
                                    onClick={() => handleAction(onDeleteProgress)}
                                    className={`w-full px-4 py-2 text-left flex items-center space-x-3 transition-colors ${isDark
                                            ? 'hover:bg-red-900/20 text-red-400'
                                            : 'hover:bg-red-50 text-red-600'
                                        }`}
                                >
                                    <Trash2 size={16} />
                                    <span>Delete Progress</span>
                                </button>
                            )}

                            {/* Delete Task */}
                            {onDelete && (
                                <button
                                    onClick={() => handleAction(onDelete)}
                                    className={`w-full px-4 py-2 text-left flex items-center space-x-3 transition-colors ${isDark
                                            ? 'hover:bg-red-900/20 text-red-400'
                                            : 'hover:bg-red-50 text-red-600'
                                        }`}
                                >
                                    <Trash2 size={16} />
                                    <span>Delete {itemType === 'task' ? 'Task' : 'FMS Task'}</span>
                                </button>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};
