import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar — fixed width */}
      <Sidebar />

      {/* Main content area */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-10 flex flex-col">
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
