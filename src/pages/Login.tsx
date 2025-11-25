import React, { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogIn, User, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { user, login, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Show loading state while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--color-background)' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4" style={{ borderColor: 'var(--color-primary)' }}></div>
          <p style={{ color: 'var(--color-textSecondary)' }}>Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect if user is already logged in
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(username, password);
      
      if (success) {
        // Small delay to ensure user state is updated
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
      } else {
        setError('Invalid username or password');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: 'var(--color-background)' }}>
      {/* Animated Background Gradients */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-br from-green-500/20 to-teal-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-br from-teal-500/20 to-cyan-500/20 rounded-full blur-3xl"></div>
      </div>
      
      <div className="max-w-md w-full mx-4 relative z-10">
        <div className="rounded-3xl shadow-2xl border backdrop-blur-xl p-10 animate-in" style={{ backgroundColor: 'rgba(var(--color-surface-rgb, 255, 255, 255), 0.95)', borderColor: 'var(--color-border)' }}>
          <div className="text-center mb-10">
            {/* Logo and Branding */}
            <div className="mb-8 flex flex-col items-center">
              <div className="relative mb-6">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-green-500/30 to-teal-500/30 blur-lg"></div>
                <img 
                  src="/assets/AMG LOGO.webp" 
                  alt="AMG Logo" 
                  className="h-24 w-24 object-contain rounded-3xl relative z-10"
                />
              </div>
              <h1 className="text-4xl font-bold tracking-tight mb-2" style={{ color: 'var(--color-text)', fontFamily: 'Poppins, sans-serif' }}>
                Ashok Malhotra Group
              </h1>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                Task & Flow Monitoring System
              </p>
            </div>

            <p className="text-lg font-semibold" style={{ color: 'var(--color-textSecondary)' }}>
              Sign in to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <User size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/30 transition-all disabled:opacity-50 font-medium"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  placeholder="Enter your username"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-3" style={{ color: 'var(--color-text)' }}>
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} style={{ color: 'var(--color-primary)' }} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="w-full pl-12 pr-4 py-3 border-2 rounded-xl focus:ring-2 focus:border-[var(--color-primary)] focus:ring-[var(--color-primary)]/30 transition-all disabled:opacity-50 font-medium"
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: 'var(--color-border)',
                    color: 'var(--color-text)'
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-auto"
                  style={{ color: 'var(--color-primary)' }}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 rounded-xl border-l-4 flex items-start gap-3" style={{ backgroundColor: 'rgba(239, 68, 68, 0.05)', borderColor: 'var(--color-error)' }}>
                <AlertCircle size={20} style={{ color: 'var(--color-error)', flexShrink: 0 }} className="mt-0.5" />
                <p className="text-sm font-medium" style={{ color: 'var(--color-error)' }}>
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-xl font-bold text-white transition-all duration-300 hover:shadow-lg hover:scale-105 disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-2"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {isLoading ? (
                <>
                  <div className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }}></div>
                  <span>Signing in...</span>
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  <span>Sign In</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-8 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <p className="text-xs text-center" style={{ color: 'var(--color-textSecondary)' }}>
              © 2025 Ashok Malhotra Group. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;