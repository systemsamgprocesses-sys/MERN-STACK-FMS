import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, availableThemes } from '../contexts/ThemeContext';
import { Menu, LogOut, Palette, Sun, Moon } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { theme, setTheme, isDark } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const handleLogout = () => {
    logout();
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
          <h2 className="text-xl font-bold tracking-tight" style={{ color: 'var(--color-text)' }}>
            AMG TMS
          </h2>
        </div>
      </div>

      <div className="flex items-center space-x-4">
        {/* Theme Selector */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="p-2 rounded-lg hover:bg-opacity-10 transition-colors"
            style={{ backgroundColor: showThemeMenu ? 'var(--color-primary)' : 'transparent', color: showThemeMenu ? 'white' : 'var(--color-text)' }}
            title="Change Theme"
          >
            {isDark ? <Moon size={20} /> : <Palette size={20} />}
          </button>

          {showThemeMenu && (
            <div className="absolute right-0 mt-3 w-40 rounded-2xl shadow-2xl border backdrop-blur-xl z-50 animate-in overflow-hidden" style={{ backgroundColor: 'rgba(var(--color-surface-rgb, 255, 255, 255), 0.95)', borderColor: 'var(--color-border)' }}>
              <div className="py-2 px-1">
                {availableThemes.map((themeName) => (
                  <button
                    key={themeName}
                    onClick={() => {
                      setTheme(themeName);
                      setShowThemeMenu(false);
                    }}
                    className={`w-full text-left px-4 py-2.5 text-sm rounded-xl transition-all duration-200 ${
                      theme === themeName ? 'font-semibold shadow-sm' : 'hover:bg-opacity-50'
                    }`}
                    style={{
                      backgroundColor: theme === themeName ? 'var(--color-primary)' : 'transparent',
                      color: theme === themeName ? 'white' : 'var(--color-text)'
                    }}
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
  );
};

export default Header;