import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  isOnHold?: boolean;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'sm', isOnHold }) => {
  const getStatusStyles = (status: string) => {
    // Show hold status if task is on hold
    if (isOnHold) {
      return 'bg-orange-100 text-orange-800 border-orange-200';
    }
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'overdue':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'hold':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  
  // Display "HOLD" if task is on hold, otherwise show the original status
  const displayStatus = isOnHold ? 'hold' : status;

  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${sizeClasses} ${getStatusStyles(
        displayStatus
      )}`}
    >
      {displayStatus.toUpperCase()}
    </span>
  );
};

export default StatusBadge;