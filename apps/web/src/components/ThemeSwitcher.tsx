import React, { useState, useRef, useEffect } from 'react';
import { useTheme, type ThemeId } from '../context/ThemeContext';

interface ThemeSwitcherProps {
  compact?: boolean;
  dropPosition?: 'up' | 'down';
}

export function ThemeSwitcher({ compact = false, dropPosition = 'down' }: ThemeSwitcherProps) {
  const { theme, setTheme, themes, currentThemeOption } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const dropPositionClasses =
    dropPosition === 'up'
      ? 'bottom-full mb-2 animate-in fade-in slide-in-from-bottom-2'
      : 'top-full mt-2 animate-in fade-in slide-in-from-top-2';

  const menuAlignment = compact
    ? 'right-0 w-64'
    : 'left-0 right-0 w-full min-w-[200px]';

  return (
    <div className={`relative ${compact ? 'inline-block' : 'w-full'} text-left`} ref={menuRef}>
      {/* Toggle Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 
                   bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 
                   transition-all duration-200 shadow-md ${
                     compact ? 'w-auto' : 'w-full justify-between'
                   }`}
        title="Change App Theme"
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 rounded-lg bg-white/10 text-slate-200 flex-shrink-0">
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"
              />
            </svg>
          </span>

          {!compact && (
            <div className="text-left min-w-0">
              <span className="block font-medium truncate text-white">
                {currentThemeOption.name}
              </span>
              <span className="block text-[10px] text-slate-400 font-normal truncate">
                Vibrant Theme
              </span>
            </div>
          )}
        </div>

        {/* Color preview badge */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <span
            className={`w-3.5 h-3.5 rounded-full bg-gradient-to-r ${currentThemeOption.gradientClass} ring-2 ring-white/20 shadow-sm`}
          />
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Popover Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute ${menuAlignment} ${dropPositionClasses} rounded-2xl bg-slate-900/95 
                     backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-50 duration-200`}
        >
          <div className="px-2 py-1.5 border-b border-white/10 mb-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Vibrant Themes
            </span>
            <span className="text-[9px] bg-indigo-500/20 text-indigo-300 font-medium px-1.5 py-0.5 rounded-full border border-indigo-500/30">
              Live Preview
            </span>
          </div>

          <div className="space-y-1">
            {themes.map((t) => {
              const isActive = t.id === theme;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setTheme(t.id as ThemeId);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all duration-200 group ${
                    isActive
                      ? 'bg-white/15 border border-white/20 text-white shadow-md'
                      : 'hover:bg-white/10 text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-4 h-4 rounded-full bg-gradient-to-r ${t.gradientClass} ring-2 flex-shrink-0 ${
                        isActive ? 'ring-white shadow-md scale-110' : 'ring-white/30 group-hover:ring-white/60'
                      }`}
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold truncate leading-tight">
                        {t.name}
                      </p>
                      <p className="text-[9px] text-slate-400 truncate leading-tight mt-0.5">
                        {t.description}
                      </p>
                    </div>
                  </div>

                  {isActive && (
                    <span className="text-emerald-400 flex-shrink-0 ml-1">
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default ThemeSwitcher;
