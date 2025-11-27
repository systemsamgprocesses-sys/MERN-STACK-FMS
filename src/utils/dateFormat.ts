/**
 * Formats a date string or Date object to DD/MM/YYYY format
 * @param dateString - Date string or Date object
 * @returns Formatted date string in DD/MM/YYYY format, or 'N/A' if invalid
 */
export const formatDate = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  } catch (error) {
    return 'N/A';
  }
};

/**
 * Formats a date string or Date object to DD/MM/YYYY HH:MM format
 * @param dateString - Date string or Date object
 * @returns Formatted date string in DD/MM/YYYY HH:MM format, or 'N/A' if invalid
 */
export const formatDateTime = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return 'N/A';
  
  try {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    
    // Check if date is valid
    if (isNaN(date.getTime())) {
      return 'N/A';
    }
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch (error) {
    return 'N/A';
  }
};

