import React, { useEffect, useState, useMemo } from 'react';
import { presenceApi } from '../api/client';
import { PresenceStatus, Role } from '@hrms/shared';
import type { OnlineStatusRecordDto, PresenceStatsDto } from '@hrms/shared';
import { useAuth } from '../context/AuthContext';
import { io, Socket } from 'socket.io-client';

const presetEmojis = ['🚀', '🧑‍💻', '☕', '🎧', '💡', '🍔', '⚡', '🌴'];

function getDurationString(clockInTime?: string | null): string {
  if (!clockInTime) return '';
  const start = new Date(clockInTime).getTime();
  const now = Date.now();
  const diffMinutes = Math.max(0, Math.floor((now - start) / (1000 * 60)));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${mins}m online`;
  }
  return `${mins}m online`;
}

function roleBadgeClasses(role: Role): string {
  switch (role) {
    case Role.ADMIN:
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case Role.HR:
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    case Role.EMPLOYEE:
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  }
}

export default function PresencePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<OnlineStatusRecordDto[]>([]);
  const [stats, setStats] = useState<PresenceStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ONLINE' | 'OFFICE' | 'REMOTE' | 'ON_LEAVE' | 'OFFLINE'>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Custom status state
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusInput, setStatusInput] = useState('');
  const [emojiInput, setEmojiInput] = useState('🚀');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Live timer tick every 30 seconds for duration display
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  const fetchData = async () => {
    try {
      const [listData, statsData] = await Promise.all([
        presenceApi.getLive(),
        presenceApi.getStats(),
      ]);
      setRecords(listData);
      setStats(statsData);

      if (user) {
        const myRec = listData.find((r) => r.userId === user.id);
        if (myRec) {
          if (myRec.customStatus !== undefined && myRec.customStatus !== null) {
            setStatusInput(myRec.customStatus);
          }
          if (myRec.customEmoji) {
            setEmojiInput(myRec.customEmoji);
          }
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Setup Socket.io client for real-time updates
    const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const socketBase = envUrl.replace(/\/api\/?$/, '');
    let socket: Socket | null = null;

    try {
      socket = io(`${socketBase}/presence`, {
        transports: ['websocket', 'polling'],
      });

      socket.on('presence_feed', (data: { records: OnlineStatusRecordDto[]; stats: PresenceStatsDto }) => {
        if (data.records) setRecords(data.records);
        if (data.stats) setStats(data.stats);
      });
    } catch {
      // socket init error fallback
    }

    // Polling fallback every 15s
    const interval = setInterval(fetchData, 15000);

    return () => {
      clearInterval(interval);
      if (socket) socket.disconnect();
    };
  }, []);

  const departments = useMemo(() => {
    const deps = new Set<string>();
    records.forEach((r) => {
      if (r.department) deps.add(r.department);
    });
    return Array.from(deps);
  }, [records]);

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.email.toLowerCase().includes(search.toLowerCase()) ||
        (r.department && r.department.toLowerCase().includes(search.toLowerCase())) ||
        (r.intendedTask && r.intendedTask.toLowerCase().includes(search.toLowerCase())) ||
        (r.customStatus && r.customStatus.toLowerCase().includes(search.toLowerCase()));

      const matchesDep = departmentFilter === 'ALL' || r.department === departmentFilter;

      let matchesStatus = true;
      if (statusFilter === 'ONLINE') matchesStatus = r.isOnline;
      else if (statusFilter === 'OFFICE') matchesStatus = r.status === PresenceStatus.ONLINE_OFFICE;
      else if (statusFilter === 'REMOTE') matchesStatus = r.status === PresenceStatus.ONLINE_REMOTE;
      else if (statusFilter === 'ON_LEAVE') matchesStatus = r.status === PresenceStatus.ON_LEAVE;
      else if (statusFilter === 'OFFLINE') matchesStatus = r.status === PresenceStatus.OFFLINE;

      return matchesSearch && matchesDep && matchesStatus;
    });
  }, [records, search, statusFilter, departmentFilter]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingStatus(true);
    try {
      const updatedList = await presenceApi.updateCustomStatus({
        customStatus: statusInput.trim() || null,
        customEmoji: emojiInput || null,
      });
      setRecords(updatedList);
      setEditingStatus(false);
    } catch {
      // ignore
    } finally {
      setUpdatingStatus(false);
    }
  };

  const myRecord = records.find((r) => r.userId === user?.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Live Team Radar
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Real-time feed
            </span>
          </div>
          <p className="text-slate-400 mt-1.5 text-sm">
            See exactly who is online, where they are working from, and what everyone is actively building right now.
          </p>
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1 rounded-xl self-start md:self-auto">
          <button
            onClick={() => setViewMode('GRID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'GRID'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'LIST'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* My Live Status Widget */}
      {myRecord && (
        <div className="glass-card p-5 border-l-4 border-l-indigo-500 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {myRecord.photoUrl ? (
                  <img
                    src={`http://localhost:3000${myRecord.photoUrl}`}
                    alt={myRecord.name}
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-400 shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
                    {myRecord.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {/* Status indicator ring/dot */}
                <span
                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#0f172a] ${
                    myRecord.isOnline
                      ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                      : myRecord.status === PresenceStatus.ON_LEAVE
                      ? 'bg-amber-400'
                      : 'bg-slate-500'
                  }`}
                />
              </div>

              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-base font-bold text-white">Your Current Presence</span>
                  <span
                    className={`badge text-xs px-2.5 py-0.5 ${
                      myRecord.isOnline
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : myRecord.status === PresenceStatus.ON_LEAVE
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}
                  >
                    {myRecord.status === PresenceStatus.ONLINE_OFFICE && '🟢 Online (Office 🏢)'}
                    {myRecord.status === PresenceStatus.ONLINE_REMOTE && '🟢 Online (Remote 🏠)'}
                    {myRecord.status === PresenceStatus.ON_LEAVE && `🏖️ On Leave (${myRecord.absenceType})`}
                    {myRecord.status === PresenceStatus.OFFLINE && '⚫ Offline (Clocked Out)'}
                  </span>
                  {myRecord.isOnline && (
                    <span className="text-xs text-indigo-300 font-medium">
                      ⏱️ {getDurationString(myRecord.clockInTime)}
                    </span>
                  )}
                </div>

                {myRecord.intendedTask ? (
                  <p className="text-sm text-slate-300 mt-1 flex items-center gap-1.5 font-medium">
                    <span className="text-indigo-400 font-semibold">Active Task:</span> &ldquo;{myRecord.intendedTask}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    {myRecord.isOnline
                      ? 'No task note specified'
                      : 'Clock in from Attendance page to appear online and broadcast your current activity.'}
                  </p>
                )}
              </div>
            </div>

            {/* Set custom status button/editor */}
            <div className="flex items-center gap-3 self-start sm:self-center">
              {!editingStatus ? (
                <button
                  onClick={() => setEditingStatus(true)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs font-semibold flex items-center gap-2 transition-all duration-200"
                >
                  <span className="text-base">{myRecord.customEmoji || '🎯'}</span>
                  <span>{myRecord.customStatus ? myRecord.customStatus : 'Set status mood'}</span>
                  <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              ) : (
                <form onSubmit={handleUpdateStatus} className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/15">
                  <select
                    value={emojiInput}
                    onChange={(e) => setEmojiInput(e.target.value)}
                    className="bg-slate-800 text-white rounded-lg px-2 py-1.5 text-base border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {presetEmojis.map((em) => (
                      <option key={em} value={em}>
                        {em}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="e.g. Coding HRMS features..."
                    value={statusInput}
                    onChange={(e) => setStatusInput(e.target.value)}
                    maxLength={50}
                    className="bg-slate-900/80 text-white text-xs rounded-lg px-3 py-1.5 border border-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 w-44 sm:w-56"
                  />
                  <button
                    type="submit"
                    disabled={updatingStatus}
                    className="gradient-btn text-xs px-3 py-1.5"
                  >
                    {updatingStatus ? '...' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingStatus(false)}
                    className="text-slate-400 hover:text-white px-2 text-xs"
                  >
                    ✕
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <div
            onClick={() => setStatusFilter('ONLINE')}
            className={`glass-card p-4 cursor-pointer transition-all hover:border-emerald-500/50 ${
              statusFilter === 'ONLINE' ? 'ring-2 ring-emerald-500 bg-emerald-500/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Online Now</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
            <p className="text-3xl font-extrabold text-emerald-400 mt-2">{stats.onlineCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Active teammates</p>
          </div>

          <div
            onClick={() => setStatusFilter('OFFICE')}
            className={`glass-card p-4 cursor-pointer transition-all hover:border-blue-500/50 ${
              statusFilter === 'OFFICE' ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Office 🏢</span>
              <span className="text-base">🏢</span>
            </div>
            <p className="text-3xl font-extrabold text-blue-400 mt-2">{stats.officeCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">At HQ desk</p>
          </div>

          <div
            onClick={() => setStatusFilter('REMOTE')}
            className={`glass-card p-4 cursor-pointer transition-all hover:border-purple-500/50 ${
              statusFilter === 'REMOTE' ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Remote 🏠</span>
              <span className="text-base">🏠</span>
            </div>
            <p className="text-3xl font-extrabold text-purple-400 mt-2">{stats.remoteCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Working from home</p>
          </div>

          <div
            onClick={() => setStatusFilter('ON_LEAVE')}
            className={`glass-card p-4 cursor-pointer transition-all hover:border-amber-500/50 ${
              statusFilter === 'ON_LEAVE' ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">On Leave 🏖️</span>
              <span className="text-base">🏖️</span>
            </div>
            <p className="text-3xl font-extrabold text-amber-400 mt-2">{stats.onLeaveCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Vacation / Sick</p>
          </div>

          <div
            onClick={() => setStatusFilter('OFFLINE')}
            className={`glass-card p-4 cursor-pointer transition-all hover:border-slate-500/50 ${
              statusFilter === 'OFFLINE' ? 'ring-2 ring-slate-500 bg-slate-500/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Offline ⚫</span>
              <span className="text-base">⚫</span>
            </div>
            <p className="text-3xl font-extrabold text-slate-400 mt-2">{stats.offlineCount}</p>
            <p className="text-[11px] text-slate-500 mt-1">Not clocked in</p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Quick status tabs */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'ALL', label: 'All Team', count: records.length },
              { id: 'ONLINE', label: '🟢 Online', count: stats?.onlineCount || 0 },
              { id: 'OFFICE', label: '🏢 Office', count: stats?.officeCount || 0 },
              { id: 'REMOTE', label: '🏠 Remote', count: stats?.remoteCount || 0 },
              { id: 'ON_LEAVE', label: '🏖️ On Leave', count: stats?.onLeaveCount || 0 },
              { id: 'OFFLINE', label: '⚫ Offline', count: stats?.offlineCount || 0 },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                statusFilter === tab.id
                  ? 'bg-gradient-to-r from-indigo-500/30 to-purple-500/30 text-white border border-indigo-500/50 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  statusFilter === tab.id ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search and Department Filter */}
        <div className="flex items-center gap-3">
          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-slate-900/90 text-slate-300 text-xs font-medium rounded-xl px-3 py-2 border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-64">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search teammate or task..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Content Feed */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="glass-card text-center py-16 px-4">
          <p className="text-slate-400 text-sm">No team members match the current search or filters.</p>
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredRecords.map((emp) => (
            <div
              key={emp.userId}
              className={`glass-card p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl relative overflow-hidden group ${
                emp.isOnline
                  ? 'border-emerald-500/30 shadow-emerald-500/5'
                  : emp.status === PresenceStatus.ON_LEAVE
                  ? 'border-amber-500/30'
                  : 'border-white/5 opacity-85 hover:opacity-100'
              }`}
            >
              {/* Top accent line */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 ${
                  emp.isOnline
                    ? emp.status === PresenceStatus.ONLINE_REMOTE
                      ? 'bg-gradient-to-r from-purple-500 to-indigo-500'
                      : 'bg-gradient-to-r from-emerald-500 to-teal-500'
                    : emp.status === PresenceStatus.ON_LEAVE
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-slate-700'
                }`}
              />

              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    {emp.photoUrl ? (
                      <img
                        src={`http://localhost:3000${emp.photoUrl}`}
                        alt={emp.name}
                        className="w-12 h-12 rounded-full object-cover border border-white/20 shadow-sm"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/80 to-purple-600/80 flex items-center justify-center text-base font-bold text-white shadow-sm">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0f172a] ${
                        emp.isOnline
                          ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                          : emp.status === PresenceStatus.ON_LEAVE
                          ? 'bg-amber-400'
                          : 'bg-slate-500'
                      }`}
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-white truncate leading-tight">
                      {emp.name}
                    </h3>
                    <p className="text-xs text-slate-400 truncate mt-0.5">
                      {emp.department || emp.email.split('@')[0]}
                    </p>
                  </div>
                </div>

                <span className={`badge text-[10px] flex-shrink-0 ${roleBadgeClasses(emp.role)}`}>
                  {emp.role}
                </span>
              </div>

              {/* Status Pill */}
              <div className="mb-3">
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${
                    emp.status === PresenceStatus.ONLINE_OFFICE
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : emp.status === PresenceStatus.ONLINE_REMOTE
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      : emp.status === PresenceStatus.ON_LEAVE
                      ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      : 'bg-slate-800/80 text-slate-400 border border-slate-700'
                  }`}
                >
                  {emp.status === PresenceStatus.ONLINE_OFFICE && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Online · Office 🏢</span>
                    </>
                  )}
                  {emp.status === PresenceStatus.ONLINE_REMOTE && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                      <span>Online · Remote 🏠</span>
                    </>
                  )}
                  {emp.status === PresenceStatus.ON_LEAVE && (
                    <>
                      <span>🏖️ On Leave · {emp.absenceType || 'AWAY'}</span>
                    </>
                  )}
                  {emp.status === PresenceStatus.OFFLINE && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                      <span>Offline (Clocked out)</span>
                    </>
                  )}
                </span>

                {emp.isOnline && emp.clockInTime && (
                  <span className="text-[11px] text-slate-400 ml-2 font-medium">
                    {getDurationString(emp.clockInTime)}
                  </span>
                )}
              </div>

              {/* Custom Mood / Intended Task Box */}
              <div className="bg-slate-900/70 border border-white/5 rounded-xl p-3 text-xs space-y-1.5 min-h-[58px] flex flex-col justify-center">
                {emp.customStatus || emp.customEmoji ? (
                  <div className="flex items-center gap-2 text-indigo-300 font-medium">
                    <span className="text-base">{emp.customEmoji || '⚡'}</span>
                    <span className="truncate">{emp.customStatus || 'Active'}</span>
                  </div>
                ) : null}

                {emp.intendedTask ? (
                  <p className="text-slate-300 line-clamp-2">
                    <span className="text-slate-500 font-semibold">Task:</span> &ldquo;{emp.intendedTask}&rdquo;
                  </p>
                ) : emp.absenceReason ? (
                  <p className="text-amber-300/80 line-clamp-1 italic">
                    Note: &ldquo;{emp.absenceReason}&rdquo;
                  </p>
                ) : (
                  <p className="text-slate-500 italic text-[11px]">
                    {emp.isOnline ? 'Working on assigned tasks...' : 'No active clock-in session'}
                  </p>
                )}
              </div>

              {/* Footer info */}
              <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                <span>Points: <strong className={emp.netCardPoints >= 0 ? 'text-emerald-400' : 'text-red-400'}>{emp.netCardPoints >= 0 ? `+${emp.netCardPoints}` : emp.netCardPoints}</strong></span>
                <span className="truncate max-w-[130px]">{emp.email}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List Mode */
        <div className="glass-card overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-white/5 text-xs text-slate-400 uppercase border-b border-white/10">
              <tr>
                <th className="py-3 px-4">Teammate</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Active Task / Mood</th>
                <th className="py-3 px-4">Department</th>
                <th className="py-3 px-4">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((emp) => (
                <tr key={emp.userId} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="relative flex-shrink-0">
                        {emp.photoUrl ? (
                          <img
                            src={`http://localhost:3000${emp.photoUrl}`}
                            alt={emp.name}
                            className="w-8 h-8 rounded-full object-cover border border-white/20"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-[#0f172a] ${
                            emp.isOnline
                              ? 'bg-emerald-400'
                              : emp.status === PresenceStatus.ON_LEAVE
                              ? 'bg-amber-400'
                              : 'bg-slate-500'
                          }`}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-white">{emp.name}</p>
                        <p className="text-xs text-slate-500">{emp.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-semibold ${
                        emp.status === PresenceStatus.ONLINE_OFFICE
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : emp.status === PresenceStatus.ONLINE_REMOTE
                          ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                          : emp.status === PresenceStatus.ON_LEAVE
                          ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      {emp.status === PresenceStatus.ONLINE_OFFICE && '🟢 Online (Office)'}
                      {emp.status === PresenceStatus.ONLINE_REMOTE && '🟢 Online (Remote)'}
                      {emp.status === PresenceStatus.ON_LEAVE && `🏖️ On Leave (${emp.absenceType || 'AWAY'})`}
                      {emp.status === PresenceStatus.OFFLINE && '⚫ Offline'}
                    </span>
                  </td>
                  <td className="py-3 px-4 max-w-xs truncate">
                    {emp.customStatus || emp.customEmoji ? (
                      <span className="text-indigo-300 font-medium mr-2">
                        {emp.customEmoji} {emp.customStatus}
                      </span>
                    ) : null}
                    {emp.intendedTask ? (
                      <span className="text-slate-300">&ldquo;{emp.intendedTask}&rdquo;</span>
                    ) : (
                      <span className="text-slate-500 italic text-xs">No task specified</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-400">
                    {emp.department || 'General'}
                  </td>
                  <td className="py-3 px-4 text-xs font-medium text-slate-400">
                    {emp.isOnline ? getDurationString(emp.clockInTime) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
