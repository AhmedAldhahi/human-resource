import React, { useEffect, useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { attendanceApi, usersApi, trackerApi } from '../api/client';
import { AttendanceResponseDto, AttendanceStatus, Role, TrackerDailyReportDto } from '@hrms/shared';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

interface EmployeeHoursModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  employeeName?: string;
  employeeRole?: Role;
  readOnly?: boolean;
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
  latePenalty: boolean;
}

export default function EmployeeHoursModal({
  isOpen,
  onClose,
  employeeId,
  employeeName,
  employeeRole,
  readOnly = false,
}: EmployeeHoursModalProps) {
  const { user: currentUser } = useAuth();
  const { t, isRtl } = useLanguage();
  const [records, setRecords] = useState<AttendanceResponseDto[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');

  const [activeTab, setActiveTab] = useState<'CLOCK_IN' | 'SERVER_HOURS' | 'COMPARE'>('CLOCK_IN');
  const [trackerDailyReports, setTrackerDailyReports] = useState<TrackerDailyReportDto[]>([]);
  const [trackerLoading, setTrackerLoading] = useState(false);
  const [trackerError, setTrackerError] = useState<string>('');

  // Editing state
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditingRecordState | null>(null);
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  const fetchAttendance = async () => {
    if (!employeeId) return;
    setLoading(true);
    setTrackerLoading(true);
    setError('');
    setTrackerError('');
    try {
      const [user, data] = await Promise.all([
        usersApi.getById(employeeId),
        attendanceApi.getByEmployee(employeeId)
      ]);
      setRecords(data);

      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        
        const pad = (n: number) => n.toString().padStart(2, '0');
        const startStr = `${startOfMonth.getFullYear()}-${pad(startOfMonth.getMonth() + 1)}-${pad(startOfMonth.getDate())}`;
        const endStr = `${endOfMonth.getFullYear()}-${pad(endOfMonth.getMonth() + 1)}-${pad(endOfMonth.getDate())}`;

        if (currentUser && currentUser.id === employeeId && currentUser.role !== Role.ADMIN && currentUser.role !== Role.HR) {
          const reports = await trackerApi.getMyDailyReport(startStr, endStr);
          setTrackerDailyReports(reports);
        } else {
          const employees = await trackerApi.getEmployees();
          let matched = null;
          if (user.tsUsername) {
            matched = employees.find(e => e.windowsId === user.tsUsername);
          }
          if (!matched && employeeName) {
            matched = employees.find(e => (e.name || '').toLowerCase() === employeeName.toLowerCase() || e.windowsId === employeeName);
          }

          if (matched) {
            const reports = await trackerApi.getDailyReport(matched.id, startStr, endStr);
            setTrackerDailyReports(reports);
          } else {
            setTrackerError(isRtl ? 'لم يتم العثور على حساب متتبع مرتبط.' : 'No matching Tracker account found. Please link Windows Username in profile.');
            setTrackerDailyReports([]);
          }
        }
      } catch (err: any) {
        setTrackerError(isRtl ? 'فشل تحميل بيانات المتتبع.' : 'Failed to load tracker data.');
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل جلب سجلات الحضور.' : 'Failed to fetch attendance records.'));
    } finally {
      setLoading(false);
      setTrackerLoading(false);
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
  let totalMinutesWorked = 0;
  let activeCount = 0;
  let completedCount = 0;

  records.forEach((r) => {
    if (r.status === AttendanceStatus.CLOCKED_IN || !r.clockOutTime) {
      activeCount++;
      const start = new Date(r.clockInTime).getTime();
      const now = new Date().getTime();
      if (!isNaN(start) && now > start) {
        totalMinutesWorked += Math.floor((now - start) / (1000 * 60));
      }
    } else if (r.clockOutTime) {
      completedCount++;
      if (r.isException && r.exceptionStatus !== 'ACCEPTED') {
        return;
      }
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
      return isRtl ? 'مستمر الان' : 'Ongoing';
    }
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) {
      return isRtl ? '0 دقيقة' : '0m';
    }
    const mins = Math.floor((end - start) / (1000 * 60));
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    if (hrs === 0) return `${rem}${isRtl ? ' د' : 'm'}`;
    if (rem === 0) return `${hrs}${isRtl ? ' س' : 'h'}`;
    return `${hrs}${isRtl ? ' س ' : 'h '}${rem}${isRtl ? ' د' : 'm'}`;
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
      latePenalty: rec.latePenalty || false,
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
        setError(isRtl ? 'تاريخ ووقت الدخول مطلوبة.' : 'Clock in date and time are required.');
        setSaveLoading(false);
        return;
      }
      if (!editForm.intendedTask.trim()) {
        setError(isRtl ? 'وصف المهمة لا يمكن أن يكون فارغاً.' : 'Task description cannot be empty.');
        setSaveLoading(false);
        return;
      }

      // Ensure HH:mm or HH:mm:ss format
      const cleanInTime = editForm.clockInTime.trim().length === 5 ? `${editForm.clockInTime.trim()}:00` : editForm.clockInTime.trim();
      const combinedClockIn = new Date(`${editForm.clockInDate}T${cleanInTime}`);
      if (isNaN(combinedClockIn.getTime())) {
        setError(isRtl ? 'صيغة تاريخ أو وقت الدخول غير صحيحة.' : 'Invalid clock-in date or time format.');
        setSaveLoading(false);
        return;
      }

      let combinedClockOut: string | null = null;
      if (editForm.status === AttendanceStatus.CLOCKED_OUT) {
        if (!editForm.clockOutDate || !editForm.clockOutTime) {
          setError(isRtl ? 'تاريخ ووقت الخروج مطلوبة عند الانتهاء.' : 'Clock out date and time are required for completed sessions.');
          setSaveLoading(false);
          return;
        }
        const cleanOutTime = editForm.clockOutTime.trim().length === 5 ? `${editForm.clockOutTime.trim()}:00` : editForm.clockOutTime.trim();
        const outDateObj = new Date(`${editForm.clockOutDate}T${cleanOutTime}`);
        if (isNaN(outDateObj.getTime())) {
          setError(isRtl ? 'صيغة تاريخ أو وقت الخروج غير صحيحة.' : 'Invalid clock-out date or time format.');
          setSaveLoading(false);
          return;
        }
        if (outDateObj.getTime() <= combinedClockIn.getTime()) {
          setError(isRtl ? 'وقت الخروج يجب أن يكون بعد وقت الدخول.' : 'Clock out time must be after clock in time.');
          setSaveLoading(false);
          return;
        }
        combinedClockOut = outDateObj.toISOString();
      }

      await attendanceApi.updateRecord(editingRecordId, {
        clockInTime: combinedClockIn.toISOString(),
        clockOutTime: combinedClockOut,
        intendedTask: editForm.intendedTask.trim(),
        status: editForm.status,
        completedTasksCount: editForm.completedTasksCount !== '' ? Number(editForm.completedTasksCount) : null,
        clockOutNote: editForm.clockOutNote.trim() || null,
        latePenalty: editForm.latePenalty,
      });

      setSuccessMsg(isRtl ? 'تم تحديث سجل الحضور بنجاح.' : 'Attendance record updated successfully.');
      setEditingRecordId(null);
      setEditForm(null);
      await fetchAttendance();
    } catch (err: any) {
      const serverMsg = err?.response?.data?.message;
      const parsedMsg = Array.isArray(serverMsg) ? serverMsg.join(', ') : serverMsg;
      setError(parsedMsg || err?.message || (isRtl ? 'فشل تحديث سجل الحضور.' : 'Failed to update attendance record.'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (!window.confirm(isRtl ? 'هل أنت تأكد من رغبتك في حذف سجل الحضور هذا؟' : 'Are you sure you want to delete this attendance record?')) return;
    setSaveLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await attendanceApi.deleteRecord(id);
      setSuccessMsg(isRtl ? 'تم حذف سجل الحضور.' : 'Attendance record deleted.');
      await fetchAttendance();
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل حذف السجل.' : 'Failed to delete record.'));
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (statusFilter === 'ACTIVE' && r.status !== AttendanceStatus.CLOCKED_IN) return false;
      if (statusFilter === 'COMPLETED' && r.status !== AttendanceStatus.CLOCKED_OUT) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const task = (r.intendedTask || '').toLowerCase();
        const note = (r.clockOutNote || '').toLowerCase();
        const dateStr = new Date(r.clockInTime).toLocaleDateString().toLowerCase();
        if (!task.includes(q) && !note.includes(q) && !dateStr.includes(q)) return false;
      }
      return true;
    });
  }, [records, statusFilter, search]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card border border-white/10 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl rounded-3xl bg-slate-900">
        {/* Header */}
        <div className="p-6 sm:p-7 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-indigo-900/40 via-slate-900 to-slate-900">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-white">
                {isRtl ? `سجل الحضور والساعات: ${employeeName || 'الموظف'}` : `Attendance & Hours History: ${employeeName || 'Employee'}`}
              </h2>
              {employeeRole && (
                <span className="badge bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                  {employeeRole}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm mt-1">
              {isRtl
                ? `إجمالي ساعات العمل: ${totalHoursWorked} ساعة و ${remainingMinutes} دقيقة (${completedCount} جلسات مكتملة)`
                : `Total Hours Worked: ${totalHoursWorked}h ${remainingMinutes}m (${completedCount} completed sessions)`}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Tab navigation */}
            <div className="flex bg-slate-950 p-1 rounded-xl border border-white/10">
              <button
                onClick={() => setActiveTab('CLOCK_IN')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'CLOCK_IN' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? `جلسات الحضور (${records.length})` : `Clock-In Sessions (${records.length})`}
              </button>
              <button
                onClick={() => setActiveTab('SERVER_HOURS')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'SERVER_HOURS' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? 'ساعات المتتبع' : 'Tracker Hours'}
              </button>
              <button
                onClick={() => setActiveTab('COMPARE')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'COMPARE' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? 'مقارنة الساعات' : 'Compare Hours'}
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-3 rounded-xl text-sm flex items-center justify-between">
              <span>✓ {successMsg}</span>
              <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {activeTab === 'CLOCK_IN' && (
            <>
              {/* Controls */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <input
                  type="text"
                  placeholder={isRtl ? 'بحث بالمهمة أو التفاصيل أو التاريخ...' : 'Search by task, notes, or date...'}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input-field max-w-xs text-xs py-2"
                  dir="auto"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setStatusFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {isRtl ? 'جميع الحالات' : 'All Statuses'}
                  </button>
                  <button
                    onClick={() => setStatusFilter('ACTIVE')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      statusFilter === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {isRtl ? 'نشط الان' : 'Active'}
                  </button>
                  <button
                    onClick={() => setStatusFilter('COMPLETED')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      statusFilter === 'COMPLETED' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-white/5 text-slate-400 hover:bg-white/10'
                    }`}
                  >
                    {isRtl ? 'مكتمل' : 'Completed'}
                  </button>
                </div>
              </div>

              {/* Table */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  {isRtl ? 'لا توجد سجلات حضور مطابقة.' : 'No attendance records found.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm`}>
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'وقت الدخول' : 'Clock In'}</th>
                        <th className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'وقت الخروج' : 'Clock Out'}</th>
                        <th className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'المدة' : 'Duration'}</th>
                        <th className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'المهمة المقررة' : 'Intended Task'}</th>
                        <th className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'ملاحظة الخروج' : 'Clock Out Note'}</th>
                        <th className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase ${isRtl ? 'text-right' : 'text-left'}`}>{t('att_status')}</th>
                        {!readOnly && (
                          <th className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase ${isRtl ? 'text-left' : 'text-right'}`}>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {filteredRecords.map((rec) => {
                        const durationStr = calculateDurationString(rec.clockInTime, rec.clockOutTime, rec.status);
                        const isEditingThis = editingRecordId === rec.id;

                        return (
                          <tr key={rec.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-4 py-3 text-white font-medium whitespace-nowrap text-xs">
                              {new Date(rec.clockInTime).toLocaleString(isRtl ? 'ar-JO' : 'en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3 text-slate-300 whitespace-nowrap text-xs">
                              {rec.clockOutTime
                                ? new Date(rec.clockOutTime).toLocaleString(isRtl ? 'ar-JO' : 'en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : '-'}
                            </td>
                            <td className="px-4 py-3 font-bold text-indigo-300 whitespace-nowrap text-xs">
                              {durationStr}
                            </td>
                            <td className="px-4 py-3 text-slate-200 max-w-xs text-xs" dir="auto">
                              {rec.intendedTask || '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-300 max-w-xs text-xs" dir="auto">
                              {rec.clockOutNote ? (
                                <div className="space-y-1 max-h-36 overflow-y-auto">
                                  {rec.clockOutNote.split('\n').map((line, idx) => (
                                    <div key={idx} className="flex items-start gap-1.5 bg-white/5 p-1.5 rounded border border-white/5 text-[11px]">
                                      <span className="text-emerald-400 font-bold shrink-0">•</span>
                                      <span className="leading-tight whitespace-pre-wrap">{line}</span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                '-'
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {rec.status === AttendanceStatus.CLOCKED_IN ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  {isRtl ? 'نشط الان' : 'Active'}
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                  {isRtl ? 'مكتمل' : 'Completed'}
                                </span>
                              )}
                            </td>
                            {!readOnly && (
                              <td className={`px-4 py-3 whitespace-nowrap ${isRtl ? 'text-left' : 'text-right'} space-x-2`}>
                                <button
                                  onClick={() => startEditing(rec)}
                                  className="px-2.5 py-1 rounded text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-200"
                                >
                                  ✏️ {isRtl ? 'تعديل' : 'Edit'}
                                </button>
                                <button
                                  onClick={() => handleDeleteRecord(rec.id)}
                                  className="px-2.5 py-1 rounded text-xs font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                                >
                                  🗑️ {isRtl ? 'حذف' : 'Delete'}
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Inline Edit Form if active */}
              {editingRecordId && editForm && (
                <div className="p-6 rounded-2xl bg-slate-950 border border-indigo-500/40 space-y-4 animate-fadeIn">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <h4 className="font-bold text-white text-base">✏️ {isRtl ? 'تعديل سجل الحضور' : 'Edit Attendance Record'}</h4>
                    <button onClick={cancelEditing} className="text-slate-400 hover:text-white text-sm">✕</button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'تاريخ الدخول' : 'Clock In Date'}</label>
                      <input
                        type="date"
                        value={editForm.clockInDate}
                        onChange={(e) => setEditForm({ ...editForm, clockInDate: e.target.value })}
                        className="input-field py-2 text-xs"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'وقت الدخول' : 'Clock In Time'}</label>
                      <input
                        type="time"
                        value={editForm.clockInTime}
                        onChange={(e) => setEditForm({ ...editForm, clockInTime: e.target.value })}
                        className="input-field py-2 text-xs"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'حالة السجل' : 'Status'}</label>
                      <select
                        value={editForm.status}
                        onChange={(e) => setEditForm({ ...editForm, status: e.target.value as AttendanceStatus })}
                        className="input-field py-2 text-xs bg-slate-900"
                      >
                        <option value={AttendanceStatus.CLOCKED_IN}>{isRtl ? 'نشط (دخول قيد الدوام)' : 'CLOCKED_IN (Ongoing)'}</option>
                        <option value={AttendanceStatus.CLOCKED_OUT}>{isRtl ? 'مكتمل (خروج)' : 'CLOCKED_OUT (Completed)'}</option>
                      </select>
                    </div>

                    {editForm.status === AttendanceStatus.CLOCKED_OUT && (
                      <>
                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'تاريخ الخروج' : 'Clock Out Date'}</label>
                          <input
                            type="date"
                            value={editForm.clockOutDate}
                            onChange={(e) => setEditForm({ ...editForm, clockOutDate: e.target.value })}
                            className="input-field py-2 text-xs"
                            dir="ltr"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'وقت الخروج' : 'Clock Out Time'}</label>
                          <input
                            type="time"
                            value={editForm.clockOutTime}
                            onChange={(e) => setEditForm({ ...editForm, clockOutTime: e.target.value })}
                            className="input-field py-2 text-xs"
                            dir="ltr"
                          />
                        </div>
                      </>
                    )}

                    <div className="sm:col-span-2">
                      <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'المهمة المقررة' : 'Intended Task'}</label>
                      <input
                        type="text"
                        value={editForm.intendedTask}
                        onChange={(e) => setEditForm({ ...editForm, intendedTask: e.target.value })}
                        className="input-field py-2 text-xs"
                        dir="auto"
                      />
                    </div>

                    {editForm.status === AttendanceStatus.CLOCKED_OUT && (
                      <div className="sm:col-span-2">
                        <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'ملاحظة الخروج / التفاصيل' : 'Clock Out Note / Details'}</label>
                        <textarea
                          rows={2}
                          value={editForm.clockOutNote}
                          onChange={(e) => setEditForm({ ...editForm, clockOutNote: e.target.value })}
                          className="input-field py-2 text-xs resize-none"
                          dir="auto"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      onClick={cancelEditing}
                      disabled={saveLoading}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-slate-300"
                    >
                      {t('cancel')}
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={saveLoading}
                      className="gradient-btn px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2"
                    >
                      {saveLoading && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      {isRtl ? 'حفظ التعديلات' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {activeTab === 'SERVER_HOURS' && (
            <div className="space-y-4">
              {trackerError && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  ⚠️ {trackerError}
                </div>
              )}

              {trackerLoading ? (
                <div className="flex justify-center py-12">
                  <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
                </div>
              ) : trackerDailyReports.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-sm">
                  {isRtl ? 'لا توجد تقارير متتبع لهذا الشهر.' : 'No daily tracker reports found for this month.'}
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-white/10">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm`}>
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'التاريخ' : 'Date'}</th>
                        <th className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'ساعات المتتبع' : 'Tracker Hours'}</th>
                        <th className={`px-4 py-3 text-xs font-bold text-slate-400 uppercase ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'النسبة المئوية' : 'Work Percentage'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {trackerDailyReports.map((r, i) => (
                        <tr key={i} className="hover:bg-white/5">
                          <td className="px-4 py-3 text-white font-medium text-xs">{r.date}</td>
                          <td className="px-4 py-3 text-indigo-300 font-bold text-xs" dir="ltr">{r.hours.toFixed(2)} {isRtl ? 'ساعة' : 'hrs'}</td>
                          <td className="px-4 py-3 text-emerald-400 font-bold text-xs" dir="ltr">{Math.min(100, Math.round((r.hours / 8) * 100))}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'COMPARE' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-400">
                {isRtl
                  ? 'مقارنة بين ساعات تسجيل الدخول من المنصة وساعات المتتبع الفعلية لهذا الشهر.'
                  : 'Side-by-side comparison between manual web clock-in hours and automated desktop Tracker hours for this month.'}
              </p>

              <div className="p-6 rounded-2xl bg-slate-950 border border-white/10 flex items-center justify-around">
                <div className="text-center">
                  <span className="text-xs text-slate-400 uppercase font-bold">{isRtl ? 'ساعات المنصة' : 'Portal Clock-Ins'}</span>
                  <div className="text-3xl font-black text-indigo-400 mt-1" dir="ltr">{totalHoursWorked}h {remainingMinutes}m</div>
                </div>
                <div className="w-px h-12 bg-white/10" />
                <div className="text-center">
                  <span className="text-xs text-slate-400 uppercase font-bold">{isRtl ? 'ساعات المتتبع' : 'Tracker Server'}</span>
                  <div className="text-3xl font-black text-emerald-400 mt-1" dir="ltr">
                    {trackerDailyReports.reduce((s, r) => s + r.hours, 0).toFixed(1)}h
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
