import React, { useEffect, useState } from 'react';
import { attendanceApi } from '../api/client';
import { AttendanceStatus, WorkLocation } from '@hrms/shared';
import type { AttendanceResponseDto } from '@hrms/shared';

const MIN_CHARS = 15;

export default function AttendancePage() {
  const [records, setRecords] = useState<AttendanceResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState('');
  const [workLocation, setWorkLocation] = useState<WorkLocation>(WorkLocation.OFFICE);
  const [completedTasksCount, setCompletedTasksCount] = useState<string>('');
  const [clockOutNote, setClockOutNote] = useState<string>('');
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

  const now = new Date();
  const isAfterNine = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
  const willBeLate = workLocation === WorkLocation.OFFICE && isAfterNine;

  const handleClockIn = async () => {
    setError('');
    setActionLoading(true);
    try {
      await attendanceApi.clockIn({ intendedTask: task, workLocation });
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
      const num = completedTasksCount !== '' ? Number(completedTasksCount) : undefined;
      await attendanceApi.clockOut({
        completedTasksCount: !isNaN(num as number) && num !== undefined ? num : null,
        clockOutNote: clockOutNote.trim() || null,
      });
      setCompletedTasksCount('');
      setClockOutNote('');
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

  const calculateDuration = (clockIn: string, clockOut: string | null, status: AttendanceStatus) => {
    if (status === AttendanceStatus.CLOCKED_IN || !clockOut) {
      return 'Ongoing';
    }
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return '0m';
    const mins = Math.floor((end - start) / (1000 * 60));
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    if (hrs === 0) return `${rem}m`;
    if (rem === 0) return `${hrs}h`;
    return `${hrs}h ${rem}m`;
  };

  // Compute overall stats
  let totalMinutesWorked = 0;
  records.forEach((r) => {
    if (r.clockOutTime && r.status === AttendanceStatus.CLOCKED_OUT) {
      const start = new Date(r.clockInTime).getTime();
      const end = new Date(r.clockOutTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end > start) {
        totalMinutesWorked += Math.floor((end - start) / (1000 * 60));
      }
    }
  });
  const totalHoursWorked = Math.floor(totalMinutesWorked / 60);
  const totalRemainingMins = totalMinutesWorked % 60;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">My Attendance</h1>
        <p className="text-slate-400 mt-1">Track your daily attendance & work location</p>
      </div>

      {/* Clock-in / Clock-out Card */}
      <div className="glass-card p-6 sm:p-8 space-y-6 max-w-2xl">
        {/* Status indicator */}
        <div className="flex items-center justify-between">
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
          {isClockedIn && activeRecord.workLocation && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              {activeRecord.workLocation === WorkLocation.OFFICE ? '🏢 Office' : '🏠 Home'}
              {activeRecord.latePenalty && (
                <span className="text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded text-[10px]">
                  -45m Late
                </span>
              )}
            </span>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {isClockedIn ? (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-4 space-y-2 border border-white/10">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                Morning Plan / Intended Task
              </p>
              <p className="text-white font-medium">{activeRecord.intendedTask}</p>
              <p className="text-xs text-slate-500">
                Clocked in since {formatTime(activeRecord.clockInTime)} ({activeRecord.workLocation === WorkLocation.OFFICE ? '🏢 Office' : '🏠 Home'})
              </p>
            </div>

            {/* Results of today (Number + Text) */}
            <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-5 space-y-4 shadow-lg">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏁</span>
                <div>
                  <h3 className="text-sm font-bold text-white">Log Today's Results</h3>
                  <p className="text-xs text-slate-400">Record what you achieved before clocking out for the day</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Tasks / Output (#)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={completedTasksCount}
                    onChange={(e) => setCompletedTasksCount(e.target.value)}
                    placeholder="e.g. 5 or 100"
                    className="input-field py-2 text-sm bg-slate-950/80 border-emerald-500/30 focus:border-emerald-400 font-mono text-emerald-300 placeholder:text-slate-600 w-full"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Number field</span>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Results Explanation / Summary
                  </label>
                  <input
                    type="text"
                    value={clockOutNote}
                    onChange={(e) => setClockOutNote(e.target.value)}
                    placeholder="Briefly explain your results/accomplishments today..."
                    className="input-field py-2 text-sm bg-slate-950/80 border-emerald-500/30 focus:border-emerald-400 text-white placeholder:text-slate-600 w-full"
                  />
                  <span className="text-[11px] text-slate-500 mt-1 block">Explanation text next to output</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleClockOut}
              disabled={actionLoading}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-600/20 transition-all duration-200 disabled:opacity-50"
            >
              {actionLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              Submit Results & Clock Out
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Location Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Select Today's Work Location
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setWorkLocation(WorkLocation.OFFICE)}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-200 ${
                    workLocation === WorkLocation.OFFICE
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/50'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">🏢</span>
                  <span className="font-semibold text-sm">Office</span>
                  <span className="text-[11px] text-slate-400">On-site workspace</span>
                </button>
                <button
                  type="button"
                  onClick={() => setWorkLocation(WorkLocation.HOME)}
                  className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all duration-200 ${
                    workLocation === WorkLocation.HOME
                      ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-lg shadow-indigo-500/20 ring-2 ring-indigo-500/50'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className="text-2xl">🏠</span>
                  <span className="font-semibold text-sm">Home</span>
                  <span className="text-[11px] text-slate-400">Remote workday</span>
                </button>
              </div>

              {willBeLate && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3 mt-2 animate-fadeIn">
                  <span className="text-amber-400 text-lg">⚠️</span>
                  <div className="text-xs text-amber-300 space-y-0.5">
                    <p className="font-bold">Late Arrival Notice (After 9:00 AM)</p>
                    <p className="text-amber-300/90">
                      Clocking in at the <strong>Office</strong> after 9:00 AM automatically incurs a <strong>45-minute deduction penalty</strong> to your daily hours record.
                    </p>
                  </div>
                </div>
              )}
            </div>

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
              className="gradient-btn w-full flex items-center justify-center gap-2 py-3.5 text-base shadow-xl"
            >
              {actionLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              Clock In at {workLocation === WorkLocation.OFFICE ? 'Office 🏢' : 'Home 🏠'}
            </button>
          </div>
        )}
      </div>

      {/* Attendance History */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">
            Attendance & Hours History
          </h2>
          <div className="flex items-center gap-4 text-xs bg-white/[0.03] border border-white/10 px-4 py-2 rounded-xl">
            <span className="text-slate-400">Total Worked: <strong className="text-emerald-400 font-bold text-sm">{totalHoursWorked}h {totalRemainingMins}m</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-400">Total Days: <strong className="text-white font-bold text-sm">{records.length}</strong></span>
          </div>
        </div>

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
                      Location
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Clock In
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Clock Out
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Worked Hours
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[160px] w-48">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {records.map((record) => {
                    const durationStr = calculateDuration(
                      record.clockInTime,
                      record.clockOutTime,
                      record.status
                    );

                    const isActive = record.status === AttendanceStatus.CLOCKED_IN || !record.clockOutTime;

                    return (
                      <tr
                        key={record.id}
                        className="hover:bg-white/5 transition-colors duration-150"
                      >
                        <td className="px-6 py-4 text-white font-medium whitespace-nowrap">
                          {formatDate(record.clockInTime)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-white/5 border border-white/10 text-slate-300">
                              {record.workLocation === WorkLocation.OFFICE ? '🏢 Office' : '🏠 Home'}
                            </span>
                            {record.latePenalty && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30" title="45-minute late arrival penalty applied">
                                -45m Late
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                          {formatTime(record.clockInTime)}
                        </td>
                        <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                          {record.clockOutTime
                            ? formatTime(record.clockOutTime)
                            : <span className="text-amber-400/80 italic text-xs">Ongoing</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                          }`}>
                            {isActive && (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                            )}
                            {durationStr}
                          </span>
                        </td>
                        <td className="px-6 py-4 max-w-sm">
                          <div className="space-y-1">
                            <p className="text-slate-300 truncate" title={record.intendedTask}>
                              <span className="text-[10px] text-indigo-400 font-bold uppercase mr-1">Plan:</span>
                              {record.intendedTask}
                            </p>
                            {(record.completedTasksCount !== null && record.completedTasksCount !== undefined || record.clockOutNote) && (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-1.5 text-xs space-y-0.5">
                                {record.completedTasksCount !== null && record.completedTasksCount !== undefined && (
                                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                    <span>🏆 Score/Count:</span>
                                    <span className="bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">{record.completedTasksCount}</span>
                                  </div>
                                )}
                                {record.clockOutNote && (
                                  <p className="text-slate-300 italic text-[11px] line-clamp-2">"{record.clockOutNote}"</p>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold min-w-[140px] ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                              : 'bg-slate-700/60 text-slate-300 border border-slate-600/60'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                            {isActive ? 'Active (Clocked In)' : 'Completed'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


