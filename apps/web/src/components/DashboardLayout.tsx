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
        <div className="flex-1 overflow-y-auto p-6 lg:p-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
