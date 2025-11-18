import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { address } from '../../utils/ipAddress'; // Fixed import path
interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: {
    // Task Permissions
    canViewTasks: boolean;
    canViewAllTeamTasks: boolean;
    canAssignTasks: boolean;
    canDeleteTasks: boolean;
    canEditTasks: boolean;
    canCompleteTasksOnBehalf: boolean;
    canCompleteAnyTask: boolean;
    canEditRecurringTaskSchedules: boolean;
    
    // Checklist Permissions
    canViewAllChecklists: boolean;
    canCreateChecklists: boolean;
    canEditChecklists: boolean;
    canDeleteChecklists: boolean;
    canManageChecklistCategories: boolean;
    
    // Complaint Permissions
    canViewAllComplaints: boolean;
    canRaiseComplaints: boolean;
    canAssignComplaints: boolean;
    canResolveComplaints: boolean;
    
    // User Management Permissions
    canManageUsers: boolean;
    canManageRoles: boolean;
    
    // Stationery Permissions
    canManageStationery: boolean;
    
    // Objection Permissions
    canViewObjectionMaster: boolean;
    canApproveObjections: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeAuth = () => {
      try {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        
        if (savedUser && savedToken) {
          try {
            const parsedUser = JSON.parse(savedUser);
            setUser(parsedUser);
            // Set default authorization header for all axios requests
            axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
          } catch (parseError) {
            console.error('Error parsing saved user:', parseError);
            localStorage.removeItem('user');
            localStorage.removeItem('token');
          }
        }
      } catch (err) {
        console.error('Error initializing auth:', err);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();

    // Add axios interceptor to handle 401/403 errors
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
          // Token is invalid or expired
          console.error('Authentication error:', error.response.data?.message);
          // Clear auth data
          setUser(null);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
          // Redirect to login
          if (window.location.pathname !== '/login') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.response.eject(interceptor);
    };
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);
      
      const response = await axios.post(`${address}/api/auth/login`, {
        username,
        password
      });

      if (response.data.user && response.data.token) {
        setUser(response.data.user);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('token', response.data.token);
        // Set default authorization header for all axios requests
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        return true;
      }
      setError('Login failed: No user data or token returned');
      return false;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Login failed';
      setError(errorMessage);
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setError(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, error }}>
      {children}
    </AuthContext.Provider>
  );
};