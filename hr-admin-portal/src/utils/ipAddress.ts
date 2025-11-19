// Backend URL configuration
// Get the backend URL from environment variable or detect from current location
const getBackendURL = () => {
  // Check if VITE_BACKEND_URL is explicitly set (from build-time environment variable)
  const env = (import.meta as any).env;
  if (env?.VITE_BACKEND_URL) {
    return env.VITE_BACKEND_URL;
  }
  
  // Detect production environment from current URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If running on production domain, use production API
    if (hostname === 'hub.amgrealty.in' || hostname.includes('amgrealty.in')) {
      return 'https://hub.amgrealty.in';
    }
  }
  
  // Default to production for HR portal (since it's typically only used in production)
  return 'https://hub.amgrealty.in';
};

export const address = getBackendURL();

