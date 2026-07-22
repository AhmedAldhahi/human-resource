import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useChat } from '../context/ChatContext';

export default function DashboardLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { unreadTotal } = useChat();

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[var(--bg-canvas)]">
      {/* Mobile Header Bar */}
      <header className="lg:hidden sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] backdrop-blur-md border-b border-[var(--border-color)]">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors focus:outline-none"
            aria-label="Open Navigation Menu"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-xl font-extrabold tracking-tight gradient-text">HRMS</span>
        </div>

        {unreadTotal > 0 && (
          <div className="flex items-center gap-1 bg-red-500/20 border border-red-500/30 text-red-400 text-xs px-2.5 py-1 rounded-full animate-pulse">
            <span className="w-2 h-2 rounded-full bg-red-400"></span>
            <span>{unreadTotal} new</span>
          </div>
        )}
      </header>

      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Sidebar */}
          <div className="relative z-10 w-72 max-w-[80vw] h-full shadow-2xl flex flex-col">
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 z-20"
              aria-label="Close Navigation Menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <div className="h-full">
              <Sidebar onNavItemClick={() => setIsMobileMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Fixed Sidebar */}
      <div className="hidden lg:block lg:sticky lg:top-0 lg:h-screen lg:flex-shrink-0 z-30">
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 min-h-screen">
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 flex flex-col">
          <div className="flex-1">
            <Outlet />
          </div>

          {/* Global Footer */}
          <footer className="mt-12 text-center text-xs text-slate-600/70 py-4 border-t border-slate-800/50">
            &copy; {new Date().getFullYear()} Ahmed Aldhahi. All Rights Reserved.
          </footer>
        </div>
      </main>
    </div>
  );
}

