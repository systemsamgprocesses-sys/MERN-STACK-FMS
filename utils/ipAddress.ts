// Note: When using a production domain, always use HTTPS to avoid CORS redirect issues
// HTTP URLs that redirect to HTTPS will fail CORS preflight requests
export const address = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';
