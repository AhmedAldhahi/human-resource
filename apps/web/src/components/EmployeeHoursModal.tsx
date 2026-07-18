import React, { useEffect, useState, useMemo } from 'react';
import { attendanceApi, usersApi, voaderaApi } from '../api/client';
import { AttendanceResponseDto, AttendanceStatus, Role, VoaderaDailyReportDto } from '@hrms/shared';

interface EmployeeHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  employeeName?: string;
  employeeRole?: Role;
}

interface EditingRecordState {
  id: string;
  clockInDate: string; // YYYY-MM-DD
  clockInTime: string; // HH:mm
  clockOutDate: string; // YYYY-MM-DD
  clockOutTime: string; // HH:mm
  intendedTask: string;
  status: AttendanceStatus;
  completedTasksCount: string | number;
  clockOutNote: string;
}

export default function EmployeeHoursModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeRole,
}: EmployeeHoursModalProps) {
  const [records, setRecords] = useState<AttendanceResponseDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const [activeTab, setActiveTab] = useState<'CLOCK_IN' | 'SERVER_HOURS' | 'COMPARE'>('CLOCK_IN');
  const [voaderaDailyReports, setVoaderaDailyReports] = useState<VoaderaDailyReportDto[]>([]);
  const [voaderaLoading, setVoaderaLoading] = useState(false);
  const [voaderaError, setVoaderaError] = useState<string>('');

  // Editing state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingRecordState | null>(null);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fetchAttendance = async () => {
    if (!employeeId) return;
    setLoading(true);
    setVoaderaLoading(true);
    setError('');
    setVoaderaError('');
    try {
      const [user, data] = await Promise.all([
        usersApi.getById(employeeId),
        attendanceApi.getByEmployee(employeeId)
      ]);
      setRecords(data);

      try {
        const employees = await voaderaApi.getEmployees();
        let matched = null;
        if (user.tsUsername) {
          matched = employees.find(e => e.windowsId === user.tsUsername);
        }
        if (!matched && employeeName) {
          matched = employees.find(e => (e.name || '').toLowerCase() === employeeName.toLowerCase() || e.windowsId === employeeName);
        }

        if (matched) {
          const now = new Date();
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          
          const startStr = startOfMonth.toISOString().split('T')[0];
          const endStr = endOfMonth.toISOString().split('T')[0];

          const reports = await voaderaApi.getDailyReport(matched.id, startStr, endStr);
          setVoaderaDailyReports(reports);
        } else {
          setVoaderaError('No matching Tracker account found. Please link Windows Username in profile.');
          setVoaderaDailyReports([]);
        }
      } catch (err: any) {
        setVoaderaError('Failed to load tracker data.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch attendance records.');
    } finally {
      setLoading(false);
      setVoaderaLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && employeeId) {
      fetchAttendance();
      setEditingRecordId(null);
      setEditForm(null);
      setSuccessMsg('');
      setSearch('');
      setStatusFilter('ALL');
    }
  }, [isOpen, employeeId]);

  // Compute stats
  const totalRecords = records.length;
  let totalMinutesWorked = 0;
  let activeSession = false;
  let activeCount = 0;
  let completedCount = 0;

  records.forEach((r) => {
    if (r.status === AttendanceStatus.CLOCKED_IN || !r.clockOutTime) {
      activeSession = true;
      activeCount++;
      const start = new Date(r.clockInTime).getTime();
      const now = new Date().getTime();
      if (!isNaN(start) && now > start) {
        totalMinutesWorked += Math.floor((now - start) / (1000 * 60));
      }
    } else if (r.clockOutTime) {
      completedCount++;
      const start = new Date(r.clockInTime).getTime();
      const end = new Date(r.clockOutTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end > start) {
        totalMinutesWorked += Math.floor((end - start) / (1000 * 60));
      }
    }
  });

  const totalHoursWorked = Math.floor(totalMinutesWorked / 60);
  const remainingMinutes = totalMinutesWorked % 60;

  const calculateDurationString = (clockIn: string, clockOut: string | null, status: AttendanceStatus) => {
    if (status === AttendanceStatus.CLOCKED_IN || !clockOut) {
      return 'Ongoing';
    }
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) {
      return '0m';
    }
    const mins = Math.floor((end - start) / (1000 * 60));
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    if (hrs === 0) return `${rem}m`;
    if (rem === 0) return `${hrs}h`;
    return `${hrs}h ${rem}m`;
  };

  const formatIsoToDateInputValue = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatIsoToTimeInputValue = (isoString: string) => {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '';
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  const startEditing = (rec: AttendanceResponseDto) => {
    setSuccessMsg('');
    setError('');
    setEditingRecordId(rec.id);
    const clockInDate = formatIsoToDateInputValue(rec.clockInTime);
    const clockInTime = formatIsoToTimeInputValue(rec.clockInTime);

    let clockOutDate = '';
    let clockOutTime = '';
    if (rec.clockOutTime) {
      clockOutDate = formatIsoToDateInputValue(rec.clockOutTime);
      clockOutTime = formatIsoToTimeInputValue(rec.clockOutTime);
    } else {
      clockOutDate = formatIsoToDateInputValue(new Date().toISOString());
      clockOutTime = formatIsoToTimeInputValue(new Date().toISOString());
    }

    setEditForm({
      id: rec.id,
      clockInDate,
      clockInTime,
      clockOutDate,
      clockOutTime,
      intendedTask: rec.intendedTask || '',
      status: rec.status,
      completedTasksCount: rec.completedTasksCount !== null && rec.completedTasksCount !== undefined ? rec.completedTasksCount : '',
      clockOutNote: rec.clockOutNote || '',
    });
  };

  const cancelEditing = () => {
    setEditingRecordId(null);
    setEditForm(null);
    setError('');
  };

  const handleSaveEdit = async () => {
    if (!editForm || !editingRecordId) return;
    setSaveLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (!editForm.clockInDate || !editForm.clockInTime) {
        setError('Clock in date and time are required.');
        setSaveLoading(false);
        return;
      }
      if (!editForm.intendedTask.trim()) {
        setError('Task description cannot be empty.');
        setSaveLoading(false);
        return;
      }

      const combinedClockIn = new Date(`${editForm.clockInDate}T${editForm.clockInTime}:00`);
      if (isNaN(combinedClockIn.getTime())) {
        setError('Invalid clock-in date or time format.');
        setSaveLoading(false);
        return;
      }

      let combinedClockOut: string | null = null;
      if (editForm.status === AttendanceStatus.CLOCKED_OUT) {
        if (!editForm.clockOutDate || !editForm.clockOutTime) {
          setError('Clock out date and time are required when marked as Completed.');
          setSaveLoading(false);
          return;
        }
        const d = new Date(`${editForm.clockOutDate}T${editForm.clockOutTime}:00`);
        if (isNaN(d.getTime())) {
          setError('Invalid clock-out date or time format.');
          setSaveLoading(false);
          return;
        }
        if (d <= combinedClockIn) {
          setError('Clock out time must be strictly later than clock in time.');
          setSaveLoading(false);
          return;
        }
        combinedClockOut = d.toISOString();
      }

      const num = editForm.completedTasksCount !== '' ? Number(editForm.completedTasksCount) : null;

      await attendanceApi.update(editingRecordId, {
        clockInTime: combinedClockIn.toISOString(),
        clockOutTime: combinedClockOut,
        intendedTask: editForm.intendedTask,
        status: editForm.status,
        completedTasksCount: !isNaN(num as number) && num !== null ? num : null,
        clockOutNote: editForm.clockOutNote.trim() || null,
      });

      setSuccessMsg('Attendance record updated successfully.');
      setEditingRecordId(null);
      setEditForm(null);
      await fetchAttendance();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to update attendance record.');
    } finally {
      setSaveLoading(false);
    }
  };

  const formatDateDisplay = (iso: string) => {
    if (!iso) return 'N/A';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeDisplay = (iso: string) => {
    if (!iso) return '--:--';
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      (r.intendedTask || '').toLowerCase().includes(search.toLowerCase()) ||
      formatDateDisplay(r.clockInTime).toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'ACTIVE') return r.status === AttendanceStatus.CLOCKED_IN || !r.clockOutTime;
    if (statusFilter === 'COMPLETED') return r.status === AttendanceStatus.CLOCKED_OUT && r.clockOutTime !== null;
    return true;
  });

  const compareData = useMemo(() => {
     const groupedHrms: Record<string, { totalMins: number; count: number; firstClockIn: string; lastClockOut: string | null }> = {};
     records.forEach(r => {
        const dateStr = formatIsoToDateInputValue(r.clockInTime);
        if (!groupedHrms[dateStr]) {
           groupedHrms[dateStr] = { totalMins: 0, count: 0, firstClockIn: r.clockInTime, lastClockOut: r.clockOutTime };
        }
        
        groupedHrms[dateStr].count++;
        if (new Date(r.clockInTime) < new Date(groupedHrms[dateStr].firstClockIn)) {
            groupedHrms[dateStr].firstClockIn = r.clockInTime;
        }
        if (r.clockOutTime) {
            if (!groupedHrms[dateStr].lastClockOut || new Date(r.clockOutTime) > new Date(groupedHrms[dateStr].lastClockOut)) {
                groupedHrms[dateStr].lastClockOut = r.clockOutTime;
            }
        }
        
        const start = new Date(r.clockInTime).getTime();
        const end = r.clockOutTime ? new Date(r.clockOutTime).getTime() : new Date().getTime();
        if (!isNaN(start) && !isNaN(end) && end > start) {
           groupedHrms[dateStr].totalMins += Math.floor((end - start) / 60000);
        }
     });

     const combinedDates = Array.from(new Set([...Object.keys(groupedHrms), ...voaderaDailyReports.map(r => r.date)])).sort().reverse();
     
     return combinedDates.map(date => {
        const hrms = groupedHrms[date];
        const voadera = voaderaDailyReports.find(r => r.date === date);
        
        let voaderaMins = 0;
        if (voadera?.activeTime) {
           let h = 0, m = 0;
           const hMatch = voadera.activeTime.match(/(\d+)h/);
           if (hMatch) h = parseInt(hMatch[1], 10);
           const mMatch = voadera.activeTime.match(/(\d+)m/);
           if (mMatch) m = parseInt(mMatch[1], 10);
           
           if (voadera.activeTime.includes(':')) {
              const parts = voadera.activeTime.split(':');
              if (parts.length >= 2) {
                 h = parseInt(parts[0], 10);
                 m = parseInt(parts[1], 10);
              }
           }
           voaderaMins = (h * 60) + m;
        }
        
        const diffMins = hrms ? voaderaMins - hrms.totalMins : 0;
        
        return { date, hrms, voadera, voaderaMins, diffMins };
     });
  }, [records, voaderaDailyReports]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      {/* Wider Modal Container (max-w-[1450px]) */}
      <div className="glass-card border border-white/10 w-full max-w-[1450px] w-[97vw] max-h-[94vh] flex flex-col overflow-hidden shadow-2xl rounded-2xl">
        {/* Header */}
        <div className="p-6 sm:px-8 sm:py-7 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-indigo-500/15 via-purple-500/15 to-transparent">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-2xl font-extrabold text-white shadow-xl shadow-indigo-500/30 flex-shrink-0">
              {employeeName ? employeeName.charAt(0).toUpperCase() : 'E'}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{employeeName || 'Employee'}</h2>
                {employeeRole && (
                  <span className="badge bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 rounded-full font-bold border border-indigo-500/30">
                    {employeeRole}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-1">Daily Working Hours & Attendance History</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="self-end sm:self-center p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors bg-white/5 border border-white/5"
            title="Close modal"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex bg-slate-900/80 border-b border-white/10 px-6 pt-4 gap-2 overflow-x-auto scrollbar-hide">
          <button 
            onClick={() => setActiveTab('CLOCK_IN')}
            className={`relative -bottom-[1px] px-5 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'CLOCK_IN' ? 'border-indigo-500 text-indigo-400 bg-indigo-500/10 rounded-t-lg z-10' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            📋 Clock-In History
          </button>
          <button 
            onClick={() => setActiveTab('SERVER_HOURS')}
            className={`relative -bottom-[1px] px-5 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'SERVER_HOURS' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/10 rounded-t-lg z-10' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            🖥️ Tracker Server Hours
          </button>
          <button 
            onClick={() => setActiveTab('COMPARE')}
            className={`relative -bottom-[1px] px-5 py-3 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === 'COMPARE' ? 'border-purple-500 text-purple-400 bg-purple-500/10 rounded-t-lg z-10' : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'}`}
          >
            ⚖️ Compare Daily
          </button>
        </div>

        {activeTab === 'CLOCK_IN' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Stats Summary Bar */}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-6 py-5 bg-white/[0.02] border-b border-white/10">
          <div className="glass-card px-5 py-4 flex items-center justify-between border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Worked Hours</p>
              <p className="text-3xl font-extrabold text-white mt-1">
                {totalHoursWorked}h <span className="text-base font-medium text-slate-400">{remainingMinutes}m</span>
              </p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>

          <div className="glass-card px-5 py-4 flex items-center justify-between border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Shifts / Days</p>
              <p className="text-3xl font-extrabold text-white mt-1">{totalRecords}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>

          <div className="glass-card px-5 py-4 flex items-center justify-between border border-white/10 bg-gradient-to-br from-white/[0.04] to-transparent shadow-sm">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Current Status</p>
              <div className="flex items-center gap-2.5 mt-2">
                <span className={`w-3 h-3 rounded-full ${activeSession ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-slate-600'}`} />
                <p className={`text-sm font-bold ${activeSession ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {activeSession ? 'Currently Clocked In' : 'Not Active'}
                </p>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-2xl border flex items-center justify-center shadow-inner ${activeSession ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-slate-500/10 border-slate-500/20 text-slate-400'}`}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Search & Status Filters Bar */}
        <div className="px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 bg-slate-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Search */}
            <div className="relative w-full sm:w-80">
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
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search history by task or date..."
                className="input-field pl-10 py-2 text-sm bg-slate-900/80 border-white/10 focus:border-indigo-500"
              />
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex rounded-xl bg-slate-900/90 p-1 border border-white/10">
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                All ({totalRecords})
              </button>
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Active ({activeCount})
              </button>
              <button
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-slate-700 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                Completed ({completedCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <span className="text-xs font-medium text-slate-400 bg-white/[0.04] px-3 py-1.5 rounded-lg border border-white/5">
              Showing <strong className="text-white font-bold">{filteredRecords.length}</strong> of <strong className="text-white font-bold">{records.length}</strong> records
            </span>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center justify-between shadow-lg">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-400 hover:text-red-300 font-bold px-2 py-1">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 flex items-center justify-between shadow-lg animate-fadeIn">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-emerald-300 font-bold px-2 py-1">✕</button>
          </div>
        )}

        {/* Table Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex justify-center py-20">
              <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="glass-card p-16 text-center border border-white/5">
              <p className="text-slate-400 text-base">
                {search || statusFilter !== 'ALL'
                  ? 'No attendance records match your current filter or search criteria.'
                  : 'This employee has no attendance records yet.'}
              </p>
              {(search || statusFilter !== 'ALL') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                  className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 transition-colors"
                >
                  Reset Filters
                </button>
              )}
            </div>
          ) : (
            <div className="glass-card overflow-hidden border border-white/10 shadow-inner">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 shadow-sm">
                    <tr className="border-b border-white/10">
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider min-w-[150px]">Date</th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider min-w-[130px]">Clock In</th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider min-w-[130px]">Clock Out</th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider min-w-[150px]">Worked Hours</th>
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider min-w-[280px]">Task</th>
                      {/* Wider Status Column Header */}
                      <th className="text-left px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider min-w-[180px] w-52">Status</th>
                      <th className="text-right px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider min-w-[140px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRecords.map((record) => {
                      const isEditing = editingRecordId === record.id && editForm !== null;
                      const durationStr = calculateDurationString(record.clockInTime, record.clockOutTime, record.status);

                      if (isEditing) {
                        return (
                          <tr key={record.id} className="bg-indigo-950/40 border-l-4 border-l-indigo-500 shadow-md">
                            {/* Date + Clock In */}
                            <td className="px-6 py-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-indigo-300 block">Start Date</label>
                                <input
                                  type="date"
                                  value={editForm.clockInDate}
                                  onChange={(e) => setEditForm({ ...editForm, clockInDate: e.target.value })}
                                  className="input-field text-xs py-1.5 px-3 w-36 bg-slate-900 border-indigo-500/30 focus:border-indigo-500 font-mono"
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-indigo-300 block">Start Time</label>
                                <input
                                  type="time"
                                  value={editForm.clockInTime}
                                  onChange={(e) => setEditForm({ ...editForm, clockInTime: e.target.value })}
                                  className="input-field text-xs py-1.5 px-3 w-32 bg-slate-900 border-indigo-500/30 focus:border-indigo-500 font-mono"
                                />
                              </div>
                            </td>

                            {/* Clock Out */}
                            <td className="px-6 py-4">
                              {editForm.status === AttendanceStatus.CLOCKED_OUT ? (
                                <div className="space-y-1.5 flex items-center gap-2">
                                  <div>
                                    <label className="text-[11px] font-bold text-indigo-300 block">End Date</label>
                                    <input
                                      type="date"
                                      value={editForm.clockOutDate}
                                      onChange={(e) => setEditForm({ ...editForm, clockOutDate: e.target.value })}
                                      className="input-field text-xs py-1.5 px-3 w-36 bg-slate-900 border-indigo-500/30 focus:border-indigo-500 font-mono"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[11px] font-bold text-indigo-300 block">End Time</label>
                                    <input
                                      type="time"
                                      value={editForm.clockOutTime}
                                      onChange={(e) => setEditForm({ ...editForm, clockOutTime: e.target.value })}
                                      className="input-field text-xs py-1.5 px-3 w-32 bg-slate-900 border-indigo-500/30 focus:border-indigo-500 font-mono"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-amber-400/80 text-xs italic font-medium">Ongoing (Clocked In)</span>
                              )}
                            </td>

                            {/* Duration badge */}
                            <td className="px-6 py-4">
                              <span className="badge bg-indigo-500/20 text-indigo-300 text-xs px-3 py-1 font-bold">
                                Updating...
                              </span>
                            </td>

                            {/* Task */}
                            <td className="px-6 py-4">
                              <div className="space-y-2">
                                <div>
                                  <label className="text-[11px] font-bold text-indigo-300 block mb-1">Morning Plan (Intended Task)</label>
                                  <textarea
                                    rows={2}
                                    value={editForm.intendedTask}
                                    onChange={(e) => setEditForm({ ...editForm, intendedTask: e.target.value })}
                                    className="input-field text-xs py-1.5 px-3 resize-none bg-slate-900 border-indigo-500/30 focus:border-indigo-500 w-full min-w-[260px]"
                                    placeholder="Task description..."
                                  />
                                </div>
                                <div className="grid grid-cols-3 gap-2 bg-slate-900/60 p-2 rounded-lg border border-white/5">
                                  <div>
                                    <label className="text-[10px] font-bold text-emerald-400 block mb-1">Output (#)</label>
                                    <input
                                      type="number"
                                      step="any"
                                      value={editForm.completedTasksCount}
                                      onChange={(e) => setEditForm({ ...editForm, completedTasksCount: e.target.value })}
                                      className="input-field text-xs py-1 px-2 bg-slate-950 border-emerald-500/30 font-mono text-emerald-300 w-full"
                                      placeholder="Count"
                                    />
                                  </div>
                                  <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-emerald-400 block mb-1">Results Explanation</label>
                                    <input
                                      type="text"
                                      value={editForm.clockOutNote}
                                      onChange={(e) => setEditForm({ ...editForm, clockOutNote: e.target.value })}
                                      className="input-field text-xs py-1 px-2 bg-slate-950 border-emerald-500/30 text-white w-full"
                                      placeholder="Summary of results..."
                                    />
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Wider Status selector */}
                            <td className="px-6 py-4">
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-indigo-300 block">Status</label>
                                <select
                                  value={editForm.status}
                                  onChange={(e) => {
                                    const nextStatus = e.target.value as AttendanceStatus;
                                    setEditForm({
                                      ...editForm,
                                      status: nextStatus,
                                    });
                                  }}
                                  className="input-field text-xs py-2 px-3 bg-slate-900 border-indigo-500/30 focus:border-indigo-500 font-medium w-48 min-w-[180px]"
                                >
                                  <option value={AttendanceStatus.CLOCKED_IN}>Active (Clocked In)</option>
                                  <option value={AttendanceStatus.CLOCKED_OUT}>Completed</option>
                                </select>
                              </div>
                            </td>

                            {/* Save / Cancel buttons */}
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={saveLoading}
                                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all duration-200 shadow-md disabled:opacity-50"
                                >
                                  {saveLoading ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={saveLoading}
                                  className="inline-flex items-center px-3 py-2 rounded-xl text-xs font-bold text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white transition-all duration-200 disabled:opacity-50"
                                >
                                  Cancel
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      const isActive = record.status === AttendanceStatus.CLOCKED_IN || !record.clockOutTime;

                      return (
                        <tr key={record.id} className={`hover:bg-white/5 transition-colors duration-150 group ${isActive ? 'bg-emerald-950/10' : ''}`}>
                          <td className="px-6 py-4 text-white font-bold whitespace-nowrap">
                            {formatDateDisplay(record.clockInTime)}
                          </td>
                          <td className="px-6 py-4 text-slate-300 font-mono whitespace-nowrap">
                            {formatTimeDisplay(record.clockInTime)}
                          </td>
                          <td className="px-6 py-4 text-slate-300 font-mono whitespace-nowrap">
                            {record.clockOutTime ? formatTimeDisplay(record.clockOutTime) : (
                              <span className="text-amber-400 font-bold text-xs flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                                Ongoing
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-extrabold ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}>
                              {isActive && (
                                <span className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                              )}
                              {durationStr}
                            </span>
                          </td>
                          <td className="px-6 py-4 max-w-md">
                            <div className="space-y-1">
                              <p className="text-slate-200 line-clamp-2 leading-relaxed" title={record.intendedTask}>
                                <span className="text-[10px] text-indigo-400 font-bold uppercase mr-1.5">Morning Plan:</span>
                                {record.intendedTask}
                              </p>
                              {(record.completedTasksCount !== null && record.completedTasksCount !== undefined || record.clockOutNote) && (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 text-xs space-y-1">
                                  {record.completedTasksCount !== null && record.completedTasksCount !== undefined && (
                                    <div className="flex items-center gap-1.5 text-emerald-300 font-bold">
                                      <span>🏆 Output/Score (#):</span>
                                      <span className="bg-emerald-500/20 px-1.5 py-0.2 rounded font-mono">{record.completedTasksCount}</span>
                                    </div>
                                  )}
                                  {record.clockOutNote && (
                                    <p className="text-slate-300 italic text-[11px]">"{record.clockOutNote}"</p>
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                          {/* Wider, More Prominent Status Column */}
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center justify-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold min-w-[150px] ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-md shadow-emerald-500/10'
                                : 'bg-slate-700/60 text-slate-300 border border-slate-600/60'
                            }`}>
                              <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                              {isActive ? 'Active (Clocked In)' : 'Completed'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right whitespace-nowrap">
                            <button
                              onClick={() => startEditing(record)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 hover:text-indigo-300 transition-all duration-200 shadow-sm"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                              Edit Record
                            </button>
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
        )}

        {activeTab === 'SERVER_HOURS' && (
           <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center">
              {voaderaError ? (
                 <div className="glass-card p-10 text-center border border-white/5 mx-auto w-full max-w-md">
                   <p className="text-amber-400 text-base font-bold">{voaderaError}</p>
                 </div>
              ) : voaderaLoading ? (
                 <div className="flex justify-center py-20">
                   <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                 </div>
              ) : (
                 <div className="w-full max-w-lg">
                   <div className="glass-card p-8 border border-white/10 shadow-2xl rounded-3xl flex flex-col items-center text-center relative overflow-hidden">
                     {/* Background Glow */}
                     <div className="absolute inset-0 bg-emerald-500/5" />
                     <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/20 blur-[80px] rounded-full" />
                     <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-cyan-500/20 blur-[80px] rounded-full" />
                     
                     <div className="relative z-10 w-20 h-20 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6 shadow-inner">
                       <svg className="w-10 h-10 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                         <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                       </svg>
                     </div>
                     
                     <h3 className="text-lg font-bold text-slate-300 uppercase tracking-widest mb-2 relative z-10">
                       {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}
                     </h3>
                     <p className="text-sm font-medium text-slate-400 mb-6 relative z-10">
                       Total tracked hours for the current month
                     </p>
                     
                     <div className="relative z-10 bg-slate-950/50 px-8 py-6 rounded-2xl border border-white/5 w-full">
                       {(() => {
                          let totalSpanMinutes = 0;
                          let totalActiveMinutes = 0;
                          
                          voaderaDailyReports.forEach(report => {
                            // Sum Total Time
                            if (report.totalTime) {
                              let h = 0, m = 0;
                              const hMatch = report.totalTime.match(/(\d+)h/);
                              if (hMatch) h = parseInt(hMatch[1], 10);
                              const mMatch = report.totalTime.match(/(\d+)m/);
                              if (mMatch) m = parseInt(mMatch[1], 10);
                              totalSpanMinutes += (h * 60) + m;
                            }
                            
                            // Sum Active Time
                            if (report.activeTime) {
                              let h = 0, m = 0;
                              const hMatch = report.activeTime.match(/(\d+)h/);
                              if (hMatch) h = parseInt(hMatch[1], 10);
                              const mMatch = report.activeTime.match(/(\d+)m/);
                              if (mMatch) m = parseInt(mMatch[1], 10);
                              totalActiveMinutes += (h * 60) + m;
                            }
                          });
                          
                          const spanHrs = Math.floor(totalSpanMinutes / 60);
                          const spanMins = totalSpanMinutes % 60;
                          
                          const activeHrs = Math.floor(totalActiveMinutes / 60);
                          const activeMins = totalActiveMinutes % 60;
                          
                          const idleMinutes = Math.max(0, totalSpanMinutes - totalActiveMinutes);
                          const idleHrs = Math.floor(idleMinutes / 60);
                          const idleMins = idleMinutes % 60;

                          return (
                            <div className="flex flex-col items-center">
                              <div className="flex items-baseline justify-center gap-2">
                                <span className="text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 to-purple-400 drop-shadow-sm">
                                  {spanHrs}
                                </span>
                                <span className="text-2xl font-bold text-indigo-500/70">h</span>
                                <span className="text-4xl font-extrabold text-slate-200 ml-2">
                                  {spanMins}
                                </span>
                                <span className="text-xl font-bold text-slate-500">m</span>
                              </div>
                              
                              <div className="flex justify-center gap-10 mt-8 w-full border-t border-white/10 pt-6">
                                <div className="text-center">
                                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider mb-1">Active Time</p>
                                  <p className="text-2xl font-bold text-white">{activeHrs}h {activeMins}m</p>
                                </div>
                                <div className="text-center">
                                  <p className="text-xs font-bold text-rose-400 uppercase tracking-wider mb-1">Idle Time</p>
                                  <p className="text-2xl font-bold text-white">{idleHrs}h {idleMins}m</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}
                     </div>
                   </div>
                 </div>
              )}
           </div>
        )}

        {activeTab === 'COMPARE' && (
           <div className="p-6 overflow-y-auto flex-1">
              {voaderaError ? (
                 <div className="glass-card p-16 text-center border border-white/5 mx-auto w-full max-w-2xl mt-10">
                   <p className="text-amber-400 text-base font-bold">{voaderaError}</p>
                 </div>
              ) : voaderaLoading ? (
                 <div className="flex justify-center py-20">
                   <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin" />
                 </div>
              ) : (
                 <div className="glass-card overflow-hidden border border-white/10 shadow-inner">
                   <table className="w-full text-sm">
                     <thead className="sticky top-0 bg-slate-900/95 backdrop-blur-md z-10 shadow-sm border-b border-white/10">
                       <tr>
                         <th className="text-left px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Date</th>
                         <th className="text-left px-6 py-4 text-xs font-bold text-indigo-300 uppercase tracking-wider border-x border-white/5 bg-indigo-500/5 text-center" colSpan={2}>Clock-In (HRMS)</th>
                         <th className="text-left px-6 py-4 text-xs font-bold text-emerald-300 uppercase tracking-wider border-x border-white/5 bg-emerald-500/5 text-center" colSpan={2}>Tracker (Voadera)</th>
                         <th className="text-left px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider text-center">Variance (Active vs Clocked)</th>
                       </tr>
                       <tr className="border-b border-white/10 text-[10px] text-slate-400">
                         <th className="px-6 py-2"></th>
                         <th className="px-6 py-2 border-l border-white/5 bg-indigo-500/5">First In / Last Out</th>
                         <th className="px-6 py-2 border-r border-white/5 bg-indigo-500/5">Total Logged</th>
                         <th className="px-6 py-2 border-l border-white/5 bg-emerald-500/5">Total Span Time</th>
                         <th className="px-6 py-2 border-r border-white/5 bg-emerald-500/5">Active Time</th>
                         <th className="px-6 py-2 text-center">Difference</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-white/5">
                       {compareData.map((row) => (
                         <tr key={row.date} className="hover:bg-white/5 transition-colors duration-150">
                           <td className="px-6 py-4 text-white font-bold">{row.date}</td>
                           <td className="px-6 py-4 text-slate-300 font-mono text-[11px] whitespace-nowrap bg-indigo-500/5 border-l border-white/5">
                             {row.hrms ? `${formatTimeDisplay(row.hrms.firstClockIn)} - ${row.hrms.lastClockOut ? formatTimeDisplay(row.hrms.lastClockOut) : 'Ongoing'}` : '-'}
                           </td>
                           <td className="px-6 py-4 text-indigo-300 font-bold bg-indigo-500/5 border-r border-white/5">
                             {row.hrms ? `${Math.floor(row.hrms.totalMins / 60)}h ${row.hrms.totalMins % 60}m` : '-'}
                           </td>
                           <td className="px-6 py-4 text-slate-300 font-mono bg-emerald-500/5 border-l border-white/5">
                             {row.voadera ? row.voadera.totalTime : '-'}
                           </td>
                           <td className="px-6 py-4 text-emerald-400 font-bold bg-emerald-500/5 border-r border-white/5">
                             {row.voadera ? row.voadera.activeTime : '-'}
                           </td>
                           <td className="px-6 py-4 text-center font-bold">
                             {row.hrms && row.voadera ? (
                               <span className={row.diffMins >= 0 ? 'text-emerald-400' : 'text-amber-400'}>
                                 {row.diffMins > 0 ? '+' : ''}{row.diffMins === 0 ? 'Match' : `${row.diffMins < 0 ? '-' : ''}${Math.floor(Math.abs(row.diffMins) / 60)}h ${Math.abs(row.diffMins) % 60}m`}
                               </span>
                             ) : '-'}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
              )}
           </div>
        )}


        {/* Footer */}
        <div className="p-5 px-8 border-t border-white/10 bg-slate-900/80 flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
            <span><strong>HR & Admin Editor</strong> — All modifications and time overrides are saved instantly to the employee's official attendance record.</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl font-bold text-slate-200 bg-white/10 hover:bg-white/20 hover:text-white transition-all shadow-md"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}
