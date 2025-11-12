import React, { createContext, useContext, useState, useEffect } from 'react';

interface ThemeContextType {
  theme: string;
  setTheme: (theme: string) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

const themes = {
  light: {
    'color-background': '#F7F9FC',
    'color-background-rgb': '247, 249, 252',
    'color-surface': '#FFFFFF',
    'color-surface-rgb': '255, 255, 255',
    'color-primary': '#6366F1',
    'color-secondary': '#8B5CF6',
    'color-accent': '#EC4899',
    'color-text': '#1E293B',
    'color-textSecondary': '#64748B',
    'color-border': '#E2E8F0',
    'color-success': '#10B981',
    'color-warning': '#F59E0B',
    'color-error': '#EF4444',
    'color-info': '#3B82F6',
  },
  dark: {
    'color-background': '#0F172A',
    'color-background-rgb': '15, 23, 42',
    'color-surface': '#1E293B',
    'color-surface-rgb': '30, 41, 59',
    'color-primary': '#818CF8',
    'color-secondary': '#A78BFA',
    'color-accent': '#F472B6',
    'color-text': '#F1F5F9',
    'color-textSecondary': '#94A3B8',
    'color-border': '#334155',
    'color-success': '#34D399',
    'color-warning': '#FBBF24',
    'color-error': '#F87171',
    'color-info': '#60A5FA',
  },
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'light';
    setThemeState(savedTheme);
    applyTheme(savedTheme);
  }, []);

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  };

  const applyTheme = (themeName: string) => {
    const themeConfig = themes[themeName as keyof typeof themes] || themes.light;
    const root = document.documentElement;

    Object.entries(themeConfig).forEach(([key, value]) => {
      if (key === 'name') return; // Skip the name property
      root.style.setProperty(`--color-${key.replace('color-', '')}`, value);
    });

    // Apply dark class for better Tailwind integration
    if (themeName === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const availableThemes = Object.keys(themes);