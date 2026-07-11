import React, { useEffect, useState } from 'react';
import { attendanceApi } from '../api/client';
import { AttendanceStatus } from '@hrms/shared';
import type { AttendanceResponseDto } from '@hrms/shared';

const MIN_CHARS = 15;

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchRecords = async () => {
    try {
      const data = await attendanceApi.getMyAttendance();
      setRecords(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  // Determine current status from most recent record
  const todayStr = new Date().toDateString();
  const activeRecord = records.find(
    (r) =>
      r.status === AttendanceStatus.CLOCKED_IN &&
      new Date(r.clockInTime).toDateString() === todayStr
  );
  const isClockedIn = !!activeRecord;

  const charsNeeded = MIN_CHARS - task.length;
  const canClockIn = task.length >= MIN_CHARS;

  const handleClockIn = async () => {
    setError('');
    setActionLoading(true);
    try {
      await attendanceApi.clockIn({ intendedTask: task });
      setTask('');
      await fetchRecords();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to clock in.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    setError('');
    setActionLoading(true);
    try {
      await attendanceApi.clockOut();
      await fetchRecords();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to clock out.');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">My Attendance</h1>
        <p className="text-slate-400 mt-1">Track your daily attendance</p>
      </div>

      {/* Clock-in / Clock-out Card */}
      <div className="glass-card p-6 sm:p-8 space-y-5 max-w-2xl">
        {/* Status indicator */}
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${
              isClockedIn
                ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50 animate-pulse'
                : 'bg-slate-600'
            }`}
          />
          <span
            className={`text-sm font-semibold ${
              isClockedIn ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {isClockedIn ? 'Currently Clocked In' : 'Not Clocked In'}
          </span>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {isClockedIn ? (
          <div className="space-y-4">
            <div className="bg-white/5 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Working on
              </p>
              <p className="text-white">{activeRecord.intendedTask}</p>
              <p className="text-xs text-slate-500">
                Since {formatTime(activeRecord.clockInTime)}
              </p>
            </div>
            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 w-full px-6 py-3 rounded-xl font-semibold text-red-400 bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200 disabled:opacity-50"
            >
              {actionLoading ? (
                <div className="w-5 h-5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              Clock Out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                What are you working on today?
              </label>
              <textarea
                rows={3}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="input-field resize-none"
                placeholder="Describe your intended task for today..."
              />
              <div className="flex justify-between text-xs">
                {charsNeeded > 0 ? (
                  <span className="text-amber-400">
                    {charsNeeded} more character{charsNeeded !== 1 ? 's' : ''} needed
                  </span>
                ) : (
                  <span className="text-emerald-400">✓ Ready to clock in</span>
                )}
                <span className="text-slate-500">{task.length} characters</span>
              </div>
            </div>
            <button
              onClick={handleClockIn}
              disabled={!canClockIn || actionLoading}
              className="gradient-btn w-full flex items-center justify-center gap-2"
            >
              {actionLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              Clock In
            </button>
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          Attendance History
        </h2>
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-slate-400">No attendance records yet.</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {records.map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-white/5 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-white whitespace-nowrap">
                        {formatDate(record.clockInTime)}
                      </td>
                      <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                        {formatTime(record.clockInTime)}
                      </td>
                      <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                        {record.clockOutTime
                          ? formatTime(record.clockOutTime)
                          : '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-300 max-w-xs truncate">
                        {record.intendedTask}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`badge ${
                            record.status === AttendanceStatus.CLOCKED_IN
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-slate-500/20 text-slate-400'
                          }`}
                        >
                          {record.status === AttendanceStatus.CLOCKED_IN
                            ? 'Active'
                            : 'Completed'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
