import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export type ThemeId =
  | 'neon-cyber'
  | 'sunset-flame'
  | 'aurora-emerald'
  | 'violet-pulse'
  | 'monochrome-light'
  | 'royal-navy';

export interface ThemeOption {
  id: ThemeId;
  name: string;
  description: string;
  primaryColor: string;
  secondaryColor: string;
  bgCanvas: string;
  gradientClass: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'neon-cyber',
    name: 'Neon Cyber',
    description: 'Electric cyan & neon magenta',
    primaryColor: '#00F2FE',
    secondaryColor: '#F355DA',
    bgCanvas: '#080C14',
    gradientClass: 'from-[#00F2FE] to-[#F355DA]',
  },
  {
    id: 'sunset-flame',
    name: 'Sunset Flame',
    description: 'Vivid coral pink & amber gold',
    primaryColor: '#FF5E7E',
    secondaryColor: '#FFAA00',
    bgCanvas: '#120A14',
    gradientClass: 'from-[#FF5E7E] to-[#FFAA00]',
  },
  {
    id: 'aurora-emerald',
    name: 'Aurora Emerald',
    description: 'Electric mint & cyber teal',
    primaryColor: '#00FF9D',
    secondaryColor: '#06B6D4',
    bgCanvas: '#051517',
    gradientClass: 'from-[#00FF9D] to-[#06B6D4]',
  },
  {
    id: 'violet-pulse',
    name: 'Violet Pulse',
    description: 'Neon fuchsia & electric violet',
    primaryColor: '#E040FB',
    secondaryColor: '#7C4DFF',
    bgCanvas: '#0F0B1E',
    gradientClass: 'from-[#E040FB] to-[#7C4DFF]',
  },
  {
    id: 'monochrome-light',
    name: 'Minimalist Noir',
    description: 'Crisp white canvas & jet black sidebar',
    primaryColor: '#09090B',
    secondaryColor: '#3F3F46',
    bgCanvas: '#F4F5F7',
    gradientClass: 'from-[#09090B] to-[#27272A]',
  },
  {
    id: 'royal-navy',
    name: 'Royal Navy & White',
    description: 'Corporate navy sidebar & clean white cards',
    primaryColor: '#0A192F',
    secondaryColor: '#0052CC',
    bgCanvas: '#F0F4F8',
    gradientClass: 'from-[#0A192F] to-[#0052CC]',
  },
];

interface ThemeContextType {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  themes: ThemeOption[];
  currentThemeOption: ThemeOption;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'hrms_theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY) as ThemeId;
    if (saved && THEME_OPTIONS.some((t) => t.id === saved)) {
      return saved;
    }
    return 'neon-cyber';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(LOCAL_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
  };

  const currentThemeOption =
    THEME_OPTIONS.find((t) => t.id === theme) || THEME_OPTIONS[0];

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themes: THEME_OPTIONS,
        currentThemeOption,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
