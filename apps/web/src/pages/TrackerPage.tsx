import React from 'react';

export const TrackerPage: React.FC = () => {
  // Use environment variable if set, otherwise fallback to local Tracker Dashboard
  const dashboardUrl = import.meta.env.VITE_TRACKER_DASHBOARD_URL || 'http://localhost:5174';

  return (
    <div className="space-y-6 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            PC Tracker Activity
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Live PC activity and automated tracking via Tracker Desktop Agent.
          </p>
        </div>
      </div>

      <div className="flex-1 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl min-h-[600px] relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500 to-blue-500 z-10" />
        <iframe 
          src={dashboardUrl} 
          title="Tracker Tracker Dashboard"
          className="w-full h-full border-none bg-slate-900"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
        />
      </div>
    </div>
  );
};
