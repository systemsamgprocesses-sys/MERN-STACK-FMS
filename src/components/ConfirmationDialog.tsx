import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDangerous?: boolean;
    isDark?: boolean;
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDangerous = false,
    isDark = false
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`rounded-lg shadow-xl w-full max-w-md ${isDark ? 'bg-gray-800' : 'bg-white'
                }`}>
                {/* Header */}
                <div className={`flex items-center justify-between p-6 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                    <div className="flex items-center space-x-3">
                        {isDangerous && (
                            <div className="flex-shrink-0">
                                <AlertTriangle className="w-6 h-6 text-red-500" />
                            </div>
                        )}
                        <h2 className={`text-xl font-semibold ${isDark ? 'text-white' : 'text-gray-900'
                            }`}>
                            {title}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        className={`transition-colors ${isDark
                                ? 'text-gray-400 hover:text-gray-300'
                                : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'
                        }`}>
                        {message}
                    </p>
                </div>

                {/* Footer */}
                <div className={`flex justify-end space-x-3 p-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                    <button
                        onClick={onClose}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${isDark
                                ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 border border-gray-600'
                                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                            }`}
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md transition-colors ${isDangerous
                                ? 'bg-red-600 hover:bg-red-700'
                                : 'bg-blue-600 hover:bg-blue-700'
                            }`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};
