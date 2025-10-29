import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, availableThemes } from '../contexts/ThemeContext';
import { Menu, Sun, Moon, LogOut, AlertCircle } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const themeNames = {
    light: 'Light',
    dark: 'Dark',
    oceanic: 'Oceanic',
    forest: 'Forest',
    sunset: 'Sunset',
    royal: 'Royal'
  };

  return (
    <>
      <header className="flex items-center justify-between px-6 py-4 border-b backdrop-blur-xl" style={{ backgroundColor: 'rgba(var(--color-background-rgb, 247, 249, 252), 0.8)', borderColor: 'var(--color-border)' }}>
        <div className="flex items-center">
          <button
            onClick={onMenuClick}
            className="p-2.5 rounded-xl lg:hidden hover:bg-opacity-10 transition-all duration-200 hover:scale-105"
            style={{ backgroundColor: 'var(--color-primary)', color: 'var(--color-background)' }}
          >
            <Menu size={20} />
          </button>
          <div className="ml-4 lg:ml-0 flex items-center space-x-3">
            <div className="relative">
              <img 
                src="/assets/AMG LOGO.webp" 
                alt="AMG Logo" 
                className="h-10 w-10 object-contain rounded-xl"
              />
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 blur-sm -z-10"></div>
            </div>
            <h2 className="text-lg font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
              <span className="hidden sm:inline">Ashok Malhotra Group</span>
              <span className="sm:hidden">AMG</span>
              <br className="hidden sm:inline" />
              <span className="text-sm font-semibold text-[var(--color-primary)]">Task & Flow Monitoring System</span>
            </h2>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Selector */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              className="p-2.5 rounded-xl transition-all duration-200 hover:scale-105"
              style={{ color: 'var(--color-primary)', backgroundColor: 'var(--color-primary)10' }}
              title="Theme"
            >
              {isDark ? <Moon size={18} /> : <Sun size={18} />}
            </button>

            {showThemeMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 rounded-xl shadow-lg border z-50" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="p-2 space-y-1">
                  {availableThemes.map((themeName) => (
                    <button
                      key={themeName}
                      onClick={() => {
                        setTheme(themeName);
                        setShowThemeMenu(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium ${
                        theme === themeName
                          ? 'bg-[var(--color-primary)] text-white'
                          : 'hover:bg-[var(--color-background)] text-[var(--color-text)]'
                      }`}
                    >
                      {themeNames[themeName as keyof typeof themeNames]}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {user?.username}
              </p>
              <p className="text-xs capitalize font-medium" style={{ color: 'var(--color-textSecondary)' }}>
                {user?.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2.5 rounded-xl hover:bg-opacity-10 transition-all duration-200 hover:scale-105"
              style={{ color: 'var(--color-error)', backgroundColor: 'rgba(239, 68, 68, 0.1)' }}
              title="Logout"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={cancelLogout}
          ></div>

          {/* Modal */}
          <div className="relative w-full max-w-md rounded-2xl shadow-2xl overflow-hidden" style={{ backgroundColor: 'var(--color-surface)' }}>
            {/* Header */}
            <div className="p-6 border-b flex items-start gap-4" style={{ borderColor: 'var(--color-border)' }}>
              <div className="p-3 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)' }}>
                <AlertCircle size={24} style={{ color: 'var(--color-error)' }} />
              </div>
              <div>
                <h3 className="text-lg font-bold" style={{ color: 'var(--color-text)' }}>
                  Confirm Logout
                </h3>
                <p className="text-sm mt-1" style={{ color: 'var(--color-textSecondary)' }}>
                  Are you sure you want to logout?
                </p>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 space-y-2" style={{ backgroundColor: 'var(--color-background)' }}>
              <p className="text-sm" style={{ color: 'var(--color-text)' }}>
                <span className="font-semibold">Logged in as:</span> {user?.username}
              </p>
              <p className="text-sm" style={{ color: 'var(--color-textSecondary)' }}>
                You will be returned to the login page.
              </p>
            </div>

            {/* Footer */}
            <div className="p-6 flex gap-3 border-t" style={{ borderColor: 'var(--color-border)' }}>
              <button
                onClick={cancelLogout}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold transition-all duration-200 hover:opacity-80"
                style={{ 
                  backgroundColor: 'var(--color-border)',
                  color: 'var(--color-text)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 px-4 py-2.5 rounded-lg font-semibold text-white transition-all duration-200 hover:opacity-90 flex items-center justify-center gap-2"
                style={{ 
                  backgroundColor: 'var(--color-error)'
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Header;