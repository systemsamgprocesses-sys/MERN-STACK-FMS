import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { address } from '../utils/ipAddress';

// Set axios default baseURL to ensure all requests use the correct backend URL
axios.defaults.baseURL = address;

interface User {
  id: string;
  username: string;
  email: string;
  role: string;
  permissions: {
    canManageStationery: boolean;
    canManageUsers?: boolean;
    canAssignTasks?: boolean;
  };
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  token: string | null;
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
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('hr_user');
    const savedToken = localStorage.getItem('hr_token');
    
    if (savedUser && savedToken) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
      } catch (e) {
        localStorage.removeItem('hr_user');
        localStorage.removeItem('hr_token');
      }
    }
    setIsLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setIsLoading(true);

      // Use relative URL since baseURL is set in axios defaults
      const response = await axios.post('/api/auth/login', {
        username,
        password
      });

      if (response.data.user && response.data.token) {
        // CRITICAL CHECK: Does this user have HR permissions?
        if (!response.data.user.permissions.canManageStationery) {
          setError('Access denied: User does not have HR permissions.');
          return false;
        }

        setUser(response.data.user);
        setToken(response.data.token);
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
        
        localStorage.setItem('hr_user', JSON.stringify(response.data.user));
        localStorage.setItem('hr_token', response.data.token);
        return true;
      }

      setError('Login failed: Invalid response');
      return false;
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    setError(null);
    delete axios.defaults.headers.common['Authorization'];
    localStorage.removeItem('hr_user');
    localStorage.removeItem('hr_token');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading, error }}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
};

