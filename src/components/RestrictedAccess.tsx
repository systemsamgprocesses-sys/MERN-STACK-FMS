import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RestrictedAccessProps {
  title?: string;
  description?: string;
  showBackButton?: boolean;
}

const RestrictedAccess: React.FC<RestrictedAccessProps> = ({
  title = 'Restricted Access',
  description = 'You do not have permission to view this section.',
  showBackButton = true
}) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center w-full h-full p-6">
      <div className="max-w-md w-full bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border border-gray-200/60 dark:border-gray-800/80 rounded-2xl shadow-xl p-8 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 text-red-500 mb-6">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">{title}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-8">
          {description}
        </p>
        {showBackButton && (
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={16} />
            Go to Dashboard
          </button>
        )}
      </div>
    </div>
  );
};

export default RestrictedAccess;

