import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

interface VersionInfo {
  version: string;
  buildTime: string;
  timestamp: number;
}

interface UseVersionCheckOptions {
  checkInterval?: number; // Check interval in milliseconds (default: 60000 = 1 minute)
  enabled?: boolean; // Whether to enable version checking (default: true)
}

export const useVersionCheck = (options: UseVersionCheckOptions = {}) => {
  const { checkInterval = 60000, enabled = true } = options;
  
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const currentVersionRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const loadInitialVersion = async () => {
    try {
      // Try to load the version.json file that was bundled with this build
      const response = await axios.get<VersionInfo>('/version.json', {
        // Add cache-busting to ensure we get the file, not cached version
        params: { _t: Date.now() },
        // Don't throw on 404 - it's okay if file doesn't exist in dev
        validateStatus: (status) => status < 500
      });
      
      if (response.status === 200 && response.data.version) {
        currentVersionRef.current = response.data.version;
        console.log('📦 Initial version loaded:', currentVersionRef.current);
      }
    } catch (error) {
      // Silently fail - version file might not exist in development
      console.debug('Could not load initial version file (this is normal in dev mode)');
    }
  };

  const checkVersion = async () => {
    if (!enabled || isChecking) return;

    try {
      setIsChecking(true);
      
      // If we don't have an initial version yet, try to load it first
      if (currentVersionRef.current === null) {
        await loadInitialVersion();
        // If still null after loading, use the server version as initial
        if (currentVersionRef.current === null) {
          const response = await axios.get<VersionInfo>('/api/version', {
            params: { _t: Date.now() }
          });
          currentVersionRef.current = response.data.version;
          setIsChecking(false);
          return;
        }
      }
      
      // Fetch current build version from server
      const response = await axios.get<VersionInfo>('/api/version', {
        // Add cache-busting query parameter to ensure we get the latest version
        params: { _t: Date.now() }
      });
      
      const serverVersion = response.data.version;
      
      // Compare versions
      if (currentVersionRef.current !== serverVersion) {
        console.log('🔄 New version detected!', {
          current: currentVersionRef.current,
          new: serverVersion,
          buildTime: response.data.buildTime
        });
        setHasUpdate(true);
      }
    } catch (error) {
      // Silently fail - don't interrupt user experience
      console.warn('Version check failed:', error);
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    if (!enabled) return;

    // Initial check after a short delay
    const initialTimeout = setTimeout(() => {
      checkVersion();
    }, 5000); // Wait 5 seconds after mount

    // Set up periodic checks
    intervalRef.current = setInterval(() => {
      checkVersion();
    }, checkInterval);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, checkInterval]);

  const refreshApp = () => {
    // Clear any cached data and reload
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    
    // Force reload
    window.location.reload();
  };

  return {
    hasUpdate,
    isChecking,
    refreshApp,
    checkVersion: () => checkVersion()
  };
};

