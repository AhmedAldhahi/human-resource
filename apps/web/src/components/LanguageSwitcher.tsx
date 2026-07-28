import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../i18n/translations';

interface LanguageSwitcherProps {
  compact?: boolean;
  dropPosition?: 'up' | 'down';
}

export function LanguageSwitcher({ compact = false, dropPosition = 'down' }: LanguageSwitcherProps) {
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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

  const options: { id: Language; label: string; flag: string }[] = [
    { id: 'en', label: t('english'), flag: '🇬🇧' },
    { id: 'ar', label: t('arabic'), flag: '🇯🇴' },
  ];

  const currentOpt = options.find((o) => o.id === language) || options[0];

  return (
    <div className={`relative ${compact ? 'inline-block' : 'w-full'} text-left`} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 
                   bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 
                   transition-all duration-200 shadow-md ${
                     compact ? 'w-auto' : 'w-full justify-between'
                   }`}
        title={t('select_language')}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base flex-shrink-0">{currentOpt.flag}</span>
          {!compact && (
            <div className="text-left min-w-0">
              <span className="block font-medium truncate text-white">
                {currentOpt.label}
              </span>
              <span className="block text-[10px] text-slate-400 font-normal truncate">
                {t('language')}
              </span>
            </div>
          )}
        </div>

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
      </button>

      {isOpen && (
        <div
          className={`absolute ${compact ? 'right-0 w-44' : 'left-0 right-0 w-full'} ${dropPositionClasses} rounded-2xl bg-slate-900/95 
                     backdrop-blur-2xl border border-white/15 shadow-2xl p-2 z-50 duration-200`}
        >
          <div className="px-2 py-1.5 border-b border-white/10 mb-1 flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {t('language')}
            </span>
          </div>

          <div className="space-y-1">
            {options.map((opt) => {
              const isActive = opt.id === language;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    setLanguage(opt.id);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-indigo-600/30 border border-indigo-500/40 text-white font-bold shadow-md'
                      : 'hover:bg-white/10 text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{opt.flag}</span>
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </div>

                  {isActive && (
                    <span className="text-emerald-400">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
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

export default LanguageSwitcher;
