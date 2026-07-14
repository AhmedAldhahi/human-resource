import React, { useEffect, useState } from 'react';
import { attendanceApi } from '../api/client';
import { AttendanceResponseDto, AttendanceStatus, Role } from '@hrms/shared';

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

  // Editing state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingRecordState | null>(null);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fetchAttendance = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError('');
    try {
      const data = await attendanceApi.getByEmployee(employeeId);
      setRecords(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch attendance records.');
    } finally {
      setLoading(false);
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

  if (!isOpen) return null;

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

      await attendanceApi.update(editingRecordId, {
        clockInTime: combinedClockIn.toISOString(),
        clockOutTime: combinedClockOut,
        intendedTask: editForm.intendedTask,
        status: editForm.status,
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
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTimeDisplay = (iso: string) => {
    return new Date(iso).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredRecords = records.filter((r) => {
    const matchesSearch =
      r.intendedTask.toLowerCase().includes(search.toLowerCase()) ||
      formatDateDisplay(r.clockInTime).toLowerCase().includes(search.toLowerCase());
    if (!matchesSearch) return false;
    if (statusFilter === 'ACTIVE') return r.status === AttendanceStatus.CLOCKED_IN || !r.clockOutTime;
    if (statusFilter === 'COMPLETED') return r.status === AttendanceStatus.CLOCKED_OUT && r.clockOutTime !== null;
    return true;
  });

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
                              <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-indigo-300 block">Intended Task</label>
                                <textarea
                                  rows={2}
                                  value={editForm.intendedTask}
                                  onChange={(e) => setEditForm({ ...editForm, intendedTask: e.target.value })}
                                  className="input-field text-xs py-1.5 px-3 resize-none bg-slate-900 border-indigo-500/30 focus:border-indigo-500 w-full min-w-[260px]"
                                  placeholder="Task description..."
                                />
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
                                  <option value={AttendanceStatus.CLOCKED_OUT}>Completed (Clocked Out)</option>
                                </select>
                              </div>
                            </td>

                            {/* Actions */}
                            <td className="px-6 py-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-2.5">
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={saveLoading}
                                  className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 disabled:opacity-50"
                                >
                                  {saveLoading ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                  Save
                                </button>
                                <button
                                  onClick={cancelEditing}
                                  disabled={saveLoading}
                                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 bg-white/10 hover:bg-white/20 transition-all"
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
                          <td className="px-6 py-4 text-slate-200 max-w-md" title={record.intendedTask}>
                            <p className="line-clamp-2 leading-relaxed">{record.intendedTask}</p>
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
