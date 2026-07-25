import React from 'react';

export const CardSkeleton: React.FC = () => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 animate-pulse space-y-3">
    <div className="h-4 bg-slate-800 rounded w-1/3"></div>
    <div className="h-8 bg-slate-800 rounded w-1/2"></div>
    <div className="h-3 bg-slate-800 rounded w-2/3"></div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => (
  <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 animate-pulse space-y-4">
    <div className="h-6 bg-slate-800 rounded w-1/4 mb-4"></div>
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-5 bg-slate-800 rounded flex-1"></div>
          <div className="h-5 bg-slate-800 rounded w-24"></div>
          <div className="h-5 bg-slate-800 rounded w-32"></div>
        </div>
      ))}
    </div>
  </div>
);

export const PageSkeleton: React.FC = () => (
  <div className="p-8 space-y-6 max-w-7xl mx-auto">
    <div className="animate-pulse space-y-2">
      <div className="h-8 bg-slate-800 rounded w-1/4"></div>
      <div className="h-4 bg-slate-800 rounded w-1/3"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <CardSkeleton />
      <CardSkeleton />
      <CardSkeleton />
    </div>
    <TableSkeleton rows={6} />
  </div>
);
