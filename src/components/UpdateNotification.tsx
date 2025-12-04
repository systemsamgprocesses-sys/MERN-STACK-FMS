import React from 'react';
import { RefreshCw, X } from 'lucide-react';

interface UpdateNotificationProps {
  onRefresh: () => void;
  onDismiss?: () => void;
}

const UpdateNotification: React.FC<UpdateNotificationProps> = ({ 
  onRefresh, 
  onDismiss 
}) => {
  const [isVisible, setIsVisible] = React.useState(true);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss?.();
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
      <div className="bg-blue-600 text-white rounded-lg shadow-2xl p-4 max-w-md border border-blue-500">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <RefreshCw className="w-5 h-5 animate-spin" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">New Version Available</h3>
            <p className="text-xs text-blue-100 mb-3">
              A new version of the application is available. Please refresh to get the latest updates.
            </p>
            <div className="flex gap-2">
              <button
                onClick={onRefresh}
                className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh Now
              </button>
              {onDismiss && (
                <button
                  onClick={handleDismiss}
                  className="px-3 py-2 text-blue-100 hover:text-white transition-colors rounded-md"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UpdateNotification;

