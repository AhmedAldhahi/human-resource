import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { attendanceApi, presenceApi } from '../api/client';
import { Link } from 'react-router-dom';
import { Role, AttendanceStatus } from '@hrms/shared';
import type { AttendanceResponseDto, OnlineStatusRecordDto, PresenceStatsDto } from '@hrms/shared';

export default function DashboardHome() {
  const { user } = useAuth();
  const [todayRecord, setTodayRecord] = useState<AttendanceResponseDto | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);
  const [onlineTeammates, setOnlineTeammates] = useState<OnlineStatusRecordDto[]>([]);
  const [presenceStats, setPresenceStats] = useState<PresenceStatsDto | null>(null);

  useEffect(() => {
    const fetchToday = async () => {
      try {
        const [records, liveList, stats] = await Promise.all([
          attendanceApi.getMyAttendance(),
          presenceApi.getLive(),
          presenceApi.getStats(),
        ]);
        const today = new Date().toDateString();
        const todayRec = records.find(
          (r) => new Date(r.clockInTime).toDateString() === today
        );
        setTodayRecord(todayRec || null);
        setOnlineTeammates(liveList.filter((r) => r.isOnline).slice(0, 7));
        setPresenceStats(stats);
      } catch {
        // ignore
      } finally {
        setLoadingAttendance(false);
      }
    };
    fetchToday();
  }, []);

  if (!user) return null;

  const isHrOrAdmin = user.role === Role.HR || user.role === Role.ADMIN;
  const isClockedIn = todayRecord?.status === AttendanceStatus.CLOCKED_IN;

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          {greeting()},{' '}
          <span className="gradient-text">{user.name.split(' ')[0]}</span>
        </h1>
        <p className="text-slate-400 mt-1">
          Here&rsquo;s your overview for today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Points */}
        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Card Points</p>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            </div>
          </div>
          <p
            className={`text-4xl font-extrabold ${
              user.netCardPoints >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {user.netCardPoints >= 0 ? '+' : ''}
            {user.netCardPoints}
          </p>
          <p className="text-xs text-slate-500">Net performance points</p>
        </div>

        {/* Attendance Status */}
        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">
              Today&rsquo;s Attendance
            </p>
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isClockedIn ? 'bg-emerald-500/20' : 'bg-slate-500/20'
              }`}
            >
              <svg
                className={`w-5 h-5 ${isClockedIn ? 'text-emerald-400' : 'text-slate-400'}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          {loadingAttendance ? (
            <div className="h-10 flex items-center">
              <div className="w-6 h-6 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <p className={`text-2xl font-bold ${isClockedIn ? 'text-emerald-400' : 'text-slate-300'}`}>
                {isClockedIn ? 'Clocked In' : todayRecord ? 'Clocked Out' : 'Not Clocked In'}
              </p>
              {todayRecord && (
                <p className="text-xs text-slate-500">
                  Since{' '}
                  {new Date(todayRecord.clockInTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              )}
            </>
          )}
        </div>

        {/* Role Info */}
        <div className="glass-card p-6 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-400">Your Role</p>
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{user.role}</p>
          <p className="text-xs text-slate-500">
            Member since{' '}
            {new Date(user.createdAt).toLocaleDateString('en-US', {
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Live Team Presence Radar Banner */}
      <div className="glass-card p-6 border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-indigo-500/5 to-transparent relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">Live Team Radar</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {presenceStats ? (
                <>
                  <strong className="text-emerald-400 font-semibold">{presenceStats.onlineCount} online</strong> out of {presenceStats.totalEmployees} teammates right now ({presenceStats.officeCount} office, {presenceStats.remoteCount} remote).
                </>
              ) : (
                'Check live online status across the whole company.'
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Avatar pile of online teammates */}
            <div className="flex -space-x-2 overflow-hidden">
              {onlineTeammates.map((tm) => (
                <div
                  key={tm.userId}
                  title={`${tm.name} (${tm.status === 'ONLINE_OFFICE' ? 'Office' : 'Remote'})`}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-slate-900 overflow-hidden bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                >
                  {tm.photoUrl ? (
                    <img
                      src={`http://localhost:3000${tm.photoUrl}`}
                      alt={tm.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    tm.name.charAt(0).toUpperCase()
                  )}
                </div>
              ))}
              {presenceStats && presenceStats.onlineCount > onlineTeammates.length && (
                <div className="inline-flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-slate-900 bg-slate-800 text-[10px] font-bold text-slate-300">
                  +{presenceStats.onlineCount - onlineTeammates.length}
                </div>
              )}
            </div>

            <Link
              to="/dashboard/presence"
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 border border-emerald-500/30 text-emerald-400 hover:text-white hover:border-emerald-500/60 text-xs font-bold transition-all duration-200 flex items-center gap-1.5 flex-shrink-0"
            >
              <span>Explore Live Radar</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          {!isClockedIn && (
            <Link
              to="/dashboard/attendance"
              className="gradient-btn text-sm px-5 py-2.5 inline-flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Clock In
            </Link>
          )}
          {isClockedIn && (
            <Link
              to="/dashboard/attendance"
              className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-emerald-500/30 transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              View Attendance
            </Link>
          )}
          {isHrOrAdmin && (
            <>
              <Link
                to="/dashboard/employees"
                className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Manage Employees
              </Link>
              <Link
                to="/dashboard/issue-card"
                className="inline-flex items-center gap-2 bg-white/5 border border-white/10 text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-white/10 transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138c.157.73.555 1.395 1.106 1.946.898.898.898 2.354 0 3.252a3.42 3.42 0 00-1.106 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946 1.106 3.42 3.42 0 01-3.252 0 3.42 3.42 0 00-1.946-1.106 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-1.106-1.946 3.42 3.42 0 010-3.252 3.42 3.42 0 001.106-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                Issue Card
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
