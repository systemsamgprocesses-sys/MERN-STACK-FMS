// Get the backend URL from environment variable or detect from current location
const getBackendURL = () => {
  // Check if VITE_BACKEND_URL is explicitly set (from build-time environment variable)
  if (import.meta.env.VITE_BACKEND_URL) {
    return import.meta.env.VITE_BACKEND_URL;
  }

  // TEMPORARILY: Force localhost:3000 for testing (change back later)
  // Always use localhost:3000 regardless of current domain
  return 'http://localhost:3000';
};

export const address = getBackendURL();

