import { getAssetUrl, getSocketUrl } from '../api/client';
import React, { useEffect, useState, useMemo } from 'react';
import { presenceApi } from '../api/client';
import { PresenceStatus, Role } from '@hrms/shared';
import type { OnlineStatusRecordDto, PresenceStatsDto } from '@hrms/shared';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { io, Socket } from 'socket.io-client';

const presetEmojis = ['🚀', '🧑‍💻', '☕', '🎧', '💡', '🍔', '⚡', '🌴'];

function getDurationString(clockInTime?: string | null, isRtl = false): string {
  if (!clockInTime) return '';
  const start = new Date(clockInTime).getTime();
  const now = Date.now();
  const diffMinutes = Math.max(0, Math.floor((now - start) / (1000 * 60)));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  if (hours > 0) {
    return isRtl ? `${hours} س ${mins} د` : `${hours}h ${mins}m`;
  }
  return isRtl ? `${mins} د` : `${mins}m`;
}

function roleBadgeClasses(role?: Role): string {
  switch (role) {
    case Role.ADMIN:
      return 'bg-red-500/20 text-red-400 border border-red-500/30';
    case Role.HR:
      return 'bg-purple-500/20 text-purple-400 border border-purple-500/30';
    case Role.EMPLOYEE:
    default:
      return 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
  }
}

function roleLabel(role?: Role, isRtl = false): string {
  if (!isRtl) return role || Role.EMPLOYEE;
  switch (role) {
    case Role.ADMIN:
      return 'مدير';
    case Role.HR:
      return 'موارد بشرية';
    case Role.EMPLOYEE:
    default:
      return 'موظف';
  }
}

export default function PresencePage() {
  const { user } = useAuth();
  const { t, isRtl } = useLanguage();
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
      const safeList = Array.isArray(listData) ? listData : [];
      setRecords(safeList);
      setStats(statsData || null);

      if (user) {
        const myRec = safeList.find((r) => r.userId === user.id);
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
    const envUrl = import.meta.env.VITE_API_URL || getSocketUrl('');
    const socketBase = envUrl.replace(/\/api\/?$/, '');
    let socket: Socket | null = null;

    try {
      socket = io(`${socketBase}/presence`, {
        transports: ['websocket', 'polling'],
      });

      socket.on('presence_feed', (data: { records: OnlineStatusRecordDto[]; stats: PresenceStatsDto }) => {
        if (Array.isArray(data?.records)) setRecords(data.records);
        if (data?.stats) setStats(data.stats);
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
    (records || []).forEach((r) => {
      if (r?.department) deps.add(r.department);
    });
    return Array.from(deps);
  }, [records]);

  const filteredRecords = useMemo(() => {
    return (records || []).filter((r) => {
      if (!r) return false;
      const name = r.name || '';
      const email = r.email || '';
      const dept = r.department || '';
      const task = r.intendedTask || '';
      const custom = r.customStatus || '';

      const matchesSearch =
        name.toLowerCase().includes(search.toLowerCase()) ||
        email.toLowerCase().includes(search.toLowerCase()) ||
        dept.toLowerCase().includes(search.toLowerCase()) ||
        task.toLowerCase().includes(search.toLowerCase()) ||
        custom.toLowerCase().includes(search.toLowerCase());

      const matchesDep = departmentFilter === 'ALL' || r.department === departmentFilter;

      let matchesStatus = true;
      if (statusFilter === 'ONLINE') matchesStatus = !!r.isOnline;
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
      if (Array.isArray(updatedList)) setRecords(updatedList);
      setEditingStatus(false);
    } catch {
      // ignore
    } finally {
      setUpdatingStatus(false);
    }
  };

  const myRecord = (records || []).find((r) => r && r.userId === user?.id);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {t('presence_title')}
            </h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {isRtl ? 'بث مباشر للأنشطة' : 'Real-time feed'}
            </span>
          </div>
          <p className="text-slate-400 mt-1.5 text-sm">
            {t('presence_subtitle')}
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
            {isRtl ? 'شبكة' : 'Grid'}
          </button>
          <button
            onClick={() => setViewMode('LIST')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              viewMode === 'LIST'
                ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {isRtl ? 'قائمة' : 'List'}
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
                    src={getAssetUrl(myRecord.photoUrl)}
                    alt={myRecord.name || 'User'}
                    className="w-14 h-14 rounded-full object-cover border-2 border-indigo-400 shadow-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
                    {(myRecord.name || 'U').charAt(0).toUpperCase()}
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
                  <span className="text-base font-bold text-white">{isRtl ? 'حالتك المباشرة الان' : 'Your Current Presence'}</span>
                  <span
                    className={`badge text-xs px-2.5 py-0.5 ${
                      myRecord.isOnline
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : myRecord.status === PresenceStatus.ON_LEAVE
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                    }`}
                  >
                    {myRecord.status === PresenceStatus.ONLINE_OFFICE && (isRtl ? '🟢 متصل (من المكتب 🏢)' : '🟢 Online (Office 🏢)')}
                    {myRecord.status === PresenceStatus.ONLINE_REMOTE && (isRtl ? '🟢 متصل (عن بُعد 🏠)' : '🟢 Online (Remote 🏠)')}
                    {myRecord.status === PresenceStatus.ON_LEAVE && (isRtl ? `🏖️ في إجازة (${myRecord.absenceType || 'إجازة'})` : `🏖️ On Leave (${myRecord.absenceType || 'AWAY'})`)}
                    {myRecord.status === PresenceStatus.OFFLINE && (isRtl ? '⚫ غير متصل (انتهى الدوام)' : '⚫ Offline (Clocked Out)')}
                  </span>
                  {myRecord.isOnline && (
                    <span className="text-xs text-indigo-300 font-medium" dir="ltr">
                      ⏱️ {getDurationString(myRecord.clockInTime, isRtl)}
                    </span>
                  )}
                </div>

                {myRecord.intendedTask ? (
                  <p className="text-sm text-slate-300 mt-1 flex items-center gap-1.5 font-medium" dir="auto">
                    <span className="text-indigo-400 font-semibold">{isRtl ? 'المهمة الحالية:' : 'Active Task:'}</span> {myRecord.intendedTask}
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    {myRecord.isOnline
                      ? (isRtl ? 'لم يتم تحديد المهمة' : 'No task note specified')
                      : (isRtl ? 'سجل دخولك من صفحة الدوام لتظهر متصلاً وتبث نشاطك الحالي.' : 'Clock in from Attendance page to appear online and broadcast your current activity.')}
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
                  <span>{myRecord.customStatus ? myRecord.customStatus : (isRtl ? 'تعيين ملاحظة حالة' : 'Set status mood')}</span>
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
                    placeholder={isRtl ? 'مثال: تطوير ميزات النظام...' : 'e.g. Coding HRMS features...'}
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
                    {updatingStatus ? '...' : t('save')}
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
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isRtl ? 'المتصلون الان' : 'Online Now'}</span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            </div>
            <p className="text-3xl font-extrabold text-emerald-400 mt-2">{stats.onlineCount || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">{isRtl ? 'زملاء متصلون' : 'Active teammates'}</p>
          </div>

          <div
            onClick={() => setStatusFilter('OFFICE')}
            className={`glass-card p-4 cursor-pointer transition-all hover:border-blue-500/50 ${
              statusFilter === 'OFFICE' ? 'ring-2 ring-blue-500 bg-blue-500/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isRtl ? 'من المكتب 🏢' : 'In Office 🏢'}</span>
              <span className="text-base">🏢</span>
            </div>
            <p className="text-3xl font-extrabold text-blue-400 mt-2">{stats.officeCount || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">{isRtl ? 'في مكاتب الشركة' : 'At HQ desk'}</p>
          </div>

          <div
            onClick={() => setStatusFilter('REMOTE')}
            className={`glass-card p-4 cursor-pointer transition-all hover:border-purple-500/50 ${
              statusFilter === 'REMOTE' ? 'ring-2 ring-purple-500 bg-purple-500/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isRtl ? 'عن بُعد 🏠' : 'Remote 🏠'}</span>
              <span className="text-base">🏠</span>
            </div>
            <p className="text-3xl font-extrabold text-purple-400 mt-2">{stats.remoteCount || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">{isRtl ? 'يعملون من المنزل' : 'Working from home'}</p>
          </div>

          <div
            onClick={() => setStatusFilter('ON_LEAVE')}
            className={`glass-card p-4 cursor-pointer transition-all hover:border-amber-500/50 ${
              statusFilter === 'ON_LEAVE' ? 'ring-2 ring-amber-500 bg-amber-500/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isRtl ? 'في إجازة 🏖️' : 'On Leave 🏖️'}</span>
              <span className="text-base">🏖️</span>
            </div>
            <p className="text-3xl font-extrabold text-amber-400 mt-2">{stats.onLeaveCount || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">{isRtl ? 'مرضية / سنوية' : 'Vacation / Sick'}</p>
          </div>

          <div
            onClick={() => setStatusFilter('OFFLINE')}
            className={`glass-card p-4 cursor-pointer transition-all hover:border-slate-500/50 ${
              statusFilter === 'OFFLINE' ? 'ring-2 ring-slate-500 bg-slate-500/10' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{isRtl ? 'غير متصل ⚫' : 'Offline ⚫'}</span>
              <span className="text-base">⚫</span>
            </div>
            <p className="text-3xl font-extrabold text-slate-400 mt-2">{stats.offlineCount || 0}</p>
            <p className="text-[11px] text-slate-500 mt-1">{isRtl ? 'انتهى دوامهم' : 'Not clocked in'}</p>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="glass-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Quick status tabs */}
        <div className="flex items-center gap-1.5 flex-wrap overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              { id: 'ALL', label: isRtl ? 'جميع الفريق' : 'All Team', count: (records || []).length },
              { id: 'ONLINE', label: isRtl ? '🟢 متصل' : '🟢 Online', count: stats?.onlineCount || 0 },
              { id: 'OFFICE', label: isRtl ? '🏢 المكتب' : '🏢 Office', count: stats?.officeCount || 0 },
              { id: 'REMOTE', label: isRtl ? '🏠 عن بُعد' : '🏠 Remote', count: stats?.remoteCount || 0 },
              { id: 'ON_LEAVE', label: isRtl ? '🏖️ في إجازة' : '🏖️ On Leave', count: stats?.onLeaveCount || 0 },
              { id: 'OFFLINE', label: isRtl ? '⚫ غير متصل' : '⚫ Offline', count: stats?.offlineCount || 0 },
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
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {departments.length > 0 && (
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="bg-slate-900/90 text-slate-300 text-xs font-medium rounded-xl px-3 py-2 border border-white/10 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">{isRtl ? 'جميع الأقسام' : 'All Departments'}</option>
              {departments.map((dep) => (
                <option key={dep} value={dep}>
                  {dep}
                </option>
              ))}
            </select>
          )}

          <div className="relative w-full sm:w-64">
            <svg
              className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder={isRtl ? 'بحث باسم الزميل أو المهمة...' : 'Search teammate or task...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full bg-slate-900/90 border border-white/10 rounded-xl ${isRtl ? 'pr-9 pl-4' : 'pl-9 pr-4'} py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
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
          <p className="text-slate-400 text-sm">
            {isRtl ? 'لا يوجد أعضاء فريق يطابقون خيارات البحث الحالية.' : 'No team members match the current search or filters.'}
          </p>
        </div>
      ) : viewMode === 'GRID' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredRecords.map((emp) => {
            const netPts = typeof emp.netCardPoints === 'number' ? emp.netCardPoints : 0;
            const empName = emp.name || 'Employee';
            const empEmail = emp.email || '';
            return (
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

                {/* Card Top: User Info & Role Badge */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="relative flex-shrink-0">
                      {emp.photoUrl ? (
                        <img
                          src={getAssetUrl(emp.photoUrl)}
                          alt={empName}
                          className="w-11 h-11 rounded-full object-cover border border-white/20 shadow-sm"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-500/80 to-purple-600/80 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                          {empName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span
                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f172a] ${
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
                        {empName}
                      </h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        {emp.department || empEmail.split('@')[0]}
                      </p>
                    </div>
                  </div>

                  <span className={`badge text-[10px] shrink-0 font-bold px-2 py-0.5 rounded-full ${roleBadgeClasses(emp.role)}`}>
                    {roleLabel(emp.role, isRtl)}
                  </span>
                </div>

                {/* Status Pill & Live Duration */}
                <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
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
                        <span>{isRtl ? 'متصل · من المكتب 🏢' : 'Online · Office 🏢'}</span>
                      </>
                    )}
                    {emp.status === PresenceStatus.ONLINE_REMOTE && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                        <span>{isRtl ? 'متصل · عن بُعد 🏠' : 'Online · Remote 🏠'}</span>
                      </>
                    )}
                    {emp.status === PresenceStatus.ON_LEAVE && (
                      <>
                        <span>{isRtl ? `🏖️ في إجازة · ${emp.absenceType || 'إجازة'}` : `🏖️ On Leave · ${emp.absenceType || 'AWAY'}`}</span>
                      </>
                    )}
                    {emp.status === PresenceStatus.OFFLINE && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                        <span>{isRtl ? 'غير متصل (انتهى الدوام)' : 'Offline (Clocked out)'}</span>
                      </>
                    )}
                  </span>

                  {emp.isOnline && emp.clockInTime && (
                    <span className="text-[11px] text-indigo-300 font-bold shrink-0" dir="ltr">
                      ⏱️ {getDurationString(emp.clockInTime, isRtl)}
                    </span>
                  )}
                </div>

                {/* Custom Mood / Intended Task Box */}
                <div className="bg-slate-900/70 border border-white/5 rounded-xl p-3 text-xs space-y-1.5 min-h-[58px] flex flex-col justify-center">
                  {emp.customStatus || emp.customEmoji ? (
                    <div className="flex items-center gap-2 text-indigo-300 font-medium">
                      <span className="text-base">{emp.customEmoji || '⚡'}</span>
                      <span className="truncate">{emp.customStatus || (isRtl ? 'نشط' : 'Active')}</span>
                    </div>
                  ) : null}

                  {emp.intendedTask ? (
                    <p className="text-slate-300 line-clamp-2 leading-relaxed" dir="auto">
                      <span className="text-indigo-400 font-semibold">{isRtl ? 'المهمة:' : 'Task:'}</span> {emp.intendedTask}
                    </p>
                  ) : emp.absenceReason ? (
                    <p className="text-amber-300/80 line-clamp-1 italic" dir="auto">
                      {isRtl ? 'ملاحظة:' : 'Note:'} {emp.absenceReason}
                    </p>
                  ) : (
                    <p className="text-slate-500 italic text-[11px]">
                      {emp.isOnline
                        ? (isRtl ? 'يعمل على المهام المحددة...' : 'Working on assigned tasks...')
                        : (isRtl ? 'لا توجد جلسة دوام نشطة' : 'No active clock-in session')}
                    </p>
                  )}
                </div>

                {/* Footer info */}
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <span>{isRtl ? 'النقاط:' : 'Points:'}</span>
                    <span className={`font-extrabold ${netPts >= 0 ? 'text-emerald-400' : 'text-red-400'}`} dir="ltr">
                      {netPts >= 0 ? `+${netPts}` : netPts}
                    </span>
                  </span>
                  <span className="truncate max-w-[130px] text-left" dir="ltr">{empEmail}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List Mode */
        <div className="glass-card overflow-x-auto">
          <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm text-slate-300`}>
            <thead className="bg-white/5 text-xs text-slate-400 uppercase border-b border-white/10">
              <tr>
                <th className="py-3 px-4">{isRtl ? 'الزميل' : 'Teammate'}</th>
                <th className="py-3 px-4">{isRtl ? 'الحالة' : 'Status'}</th>
                <th className="py-3 px-4">{isRtl ? 'المهمة / الملاحظة' : 'Active Task / Mood'}</th>
                <th className="py-3 px-4">{isRtl ? 'القسم' : 'Department'}</th>
                <th className="py-3 px-4">{isRtl ? 'المدة' : 'Duration'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((emp) => {
                const empName = emp.name || 'Employee';
                const empEmail = emp.email || '';
                return (
                  <tr key={emp.userId} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="relative flex-shrink-0">
                          {emp.photoUrl ? (
                            <img
                              src={getAssetUrl(emp.photoUrl)}
                              alt={empName}
                              className="w-8 h-8 rounded-full object-cover border border-white/20"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
                              {empName.charAt(0).toUpperCase()}
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
                          <p className="font-semibold text-white">{empName}</p>
                          <p className="text-xs text-slate-500" dir="ltr">{empEmail}</p>
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
                        {emp.status === PresenceStatus.ONLINE_OFFICE && (isRtl ? '🟢 متصل (المكتب)' : '🟢 Online (Office)')}
                        {emp.status === PresenceStatus.ONLINE_REMOTE && (isRtl ? '🟢 متصل (عن بُعد)' : '🟢 Online (Remote)')}
                        {emp.status === PresenceStatus.ON_LEAVE && (isRtl ? `🏖️ في إجازة (${emp.absenceType || 'إجازة'})` : `🏖️ On Leave (${emp.absenceType || 'AWAY'})`)}
                        {emp.status === PresenceStatus.OFFLINE && (isRtl ? '⚫ غير متصل' : '⚫ Offline')}
                      </span>
                    </td>
                    <td className="py-3 px-4 max-w-xs truncate" dir="auto">
                      {emp.customStatus || emp.customEmoji ? (
                        <span className="text-indigo-300 font-medium mr-2">
                          {emp.customEmoji} {emp.customStatus}
                        </span>
                      ) : null}
                      {emp.intendedTask ? (
                        <span className="text-slate-300">{emp.intendedTask}</span>
                      ) : (
                        <span className="text-slate-500 italic text-xs">{isRtl ? 'لم يتم تحديد مهمة' : 'No task specified'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {emp.department || (isRtl ? 'عام' : 'General')}
                    </td>
                    <td className="py-3 px-4 text-xs font-medium text-slate-400" dir="ltr">
                      {emp.isOnline ? getDurationString(emp.clockInTime, isRtl) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
