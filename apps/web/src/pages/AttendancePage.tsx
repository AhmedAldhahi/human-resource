import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { attendanceApi, scheduleApi } from '../api/client';
import { AttendanceStatus, WorkLocation, Role, EmployeeType } from '@hrms/shared';
import type { AttendanceResponseDto } from '@hrms/shared';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import EmployeeHoursModal from '../components/EmployeeHoursModal';

const MIN_CHARS = 15;

export default function AttendancePage() {
  const { user } = useAuth();
  const { t, isRtl } = useLanguage();
  const isHrOrAdmin = user?.role === Role.HR || user?.role === Role.ADMIN;

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [records, setRecords] = useState<AttendanceResponseDto[]>([]);
  const [allExceptions, setAllExceptions] = useState<AttendanceResponseDto[]>([]);
  const [exceptionTab, setExceptionTab] = useState<'PENDING' | 'AUTO_15H' | 'ACCEPTED' | 'REJECTED' | 'ALL'>('PENDING');
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState('');
  const [workLocation, setWorkLocation] = useState<WorkLocation>(WorkLocation.OFFICE);
  const [scheduledLocation, setScheduledLocation] = useState<WorkLocation | null>(null);
  const [outputItems, setOutputItems] = useState<{ output: string; explanation: string }[]>([
    { output: '', explanation: '' },
  ]);
  const [authorizationName, setAuthorizationName] = useState<string>('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const addOutputItem = () => {
    setOutputItems((prev) => [...prev, { output: '', explanation: '' }]);
  };

  const removeOutputItem = (index: number) => {
    if (outputItems.length <= 1) return;
    setOutputItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOutputItem = (index: number, field: 'output' | 'explanation', value: string) => {
    setOutputItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const fetchRecords = async () => {
    try {
      const [data, sched] = await Promise.all([
        attendanceApi.getMyAttendance(),
        scheduleApi.getMySchedule().catch(() => null),
      ]);
      setRecords(data);
      if (sched?.todayScheduledLocation) {
        setScheduledLocation(sched.todayScheduledLocation);
        setWorkLocation(sched.todayScheduledLocation);
      }

      if (isHrOrAdmin) {
        const allData = await attendanceApi.getAllRecords();
        const exc = allData.filter((r) => r.isException);
        setAllExceptions(exc);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, [user]);

  // Determine current active record (works across midnight!)
  const activeRecord = records.find(
    (r) => r.status === AttendanceStatus.CLOCKED_IN || !r.clockOutTime
  );
  const isClockedIn = !!activeRecord;

  const charsNeeded = MIN_CHARS - task.length;
  const canClockIn = task.length >= MIN_CHARS;

  const now = new Date();
  const isAfterNine = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 0);
  const willBeLate = user?.employeeType === EmployeeType.PER_HOUR && workLocation === WorkLocation.OFFICE && isAfterNine;

  const handleClockIn = async () => {
    setError('');
    setSuccessMsg('');
    setActionLoading(true);
    try {
      await attendanceApi.clockIn({ intendedTask: task, workLocation });
      setTask('');
      await fetchRecords();
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل تسجيل الدخول.' : 'Failed to clock in.'));
    } finally {
      setActionLoading(false);
    }
  };

  // Trigger Clock-out or Overtime Authorization Modal if shift exceeds user.maxDailyHours
  const initiateClockOut = () => {
    if (!activeRecord) return;
    const maxHours = user?.maxDailyHours ?? 12;
    let shiftMins = 0;
    if (activeRecord.clockInTime) {
      const start = new Date(activeRecord.clockInTime).getTime();
      const current = new Date().getTime();
      if (!isNaN(start) && current > start) {
        shiftMins = Math.floor((current - start) / 60000);
      }
    }

    if (shiftMins > maxHours * 60 && !authorizationName.trim()) {
      setIsAuthModalOpen(true);
      return;
    }

    executeClockOut();
  };

  const executeClockOut = async (overrideAuthName?: string) => {
    const finalAuthName = overrideAuthName !== undefined ? overrideAuthName : authorizationName;
    setError('');
    setSuccessMsg('');
    setActionLoading(true);
    try {
      const validItems = outputItems.filter((i) => i.output.trim() !== '' || i.explanation.trim() !== '');

      const totalNumericOutputs = validItems.reduce((sum, item) => {
        const num = Number(item.output);
        return !isNaN(num) && num > 0 ? sum + num : sum;
      }, 0);

      const formattedNotes = validItems
        .map((item, idx) => {
          const prefix = item.output.trim() ? `[#${item.output.trim()}] ` : '';
          const text = item.explanation.trim() || (isRtl ? 'إنجاز مخرج' : 'Output Result');
          return validItems.length > 1 ? `${idx + 1}. ${prefix}${text}` : `${prefix}${text}`;
        })
        .join('\n');

      await attendanceApi.clockOut({
        completedTasksCount: totalNumericOutputs > 0 ? totalNumericOutputs : null,
        clockOutNote: formattedNotes.trim() || null,
        authorizationName: finalAuthName.trim() || undefined,
      });
      setOutputItems([{ output: '', explanation: '' }]);
      setAuthorizationName('');
      setIsAuthModalOpen(false);
      await fetchRecords();
    } catch (err: any) {
      const msg = err?.response?.data?.message || (isRtl ? 'فشل تسجيل الخروج.' : 'Failed to clock out.');
      if (typeof msg === 'string' && msg.includes('NEEDS_AUTHORIZATION')) {
        setIsAuthModalOpen(true);
        setError(isRtl ? 'لقد عملت أكثر من 12 ساعة. يرجى تزويد اسم المدير المرخص لتسجيل الخروج.' : 'You have worked over 12 hours. Please provide manager authorization to clock out.');
      } else {
        setError(msg);
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveException = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await attendanceApi.resolveException(id, status);
      setSuccessMsg(isRtl ? `تم تحديث قرار العمل الإضافي إلى ${status === 'ACCEPTED' ? 'مقبول' : 'مرفوض'} بنجاح.` : `Overtime decision updated to ${status === 'ACCEPTED' ? 'Approved' : 'Rejected'} successfully.`);
      await fetchRecords();
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل معالجة الاستثناء.' : 'Failed to resolve exception.'));
    }
  };

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(isRtl ? 'ar-JO' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

  const calculateDuration = (clockIn: string, clockOut: string | null, status: AttendanceStatus) => {
    if (status === AttendanceStatus.CLOCKED_IN || !clockOut) {
      return isRtl ? 'مستمرة' : 'Ongoing';
    }
    const start = new Date(clockIn).getTime();
    const end = new Date(clockOut).getTime();
    if (isNaN(start) || isNaN(end) || end <= start) return isRtl ? '0 د' : '0m';
    const mins = Math.floor((end - start) / (1000 * 60));
    const hrs = Math.floor(mins / 60);
    const rem = mins % 60;
    if (hrs === 0) return isRtl ? `${rem} د` : `${rem}m`;
    if (rem === 0) return isRtl ? `${hrs} س` : `${hrs}h`;
    return isRtl ? `${hrs} س ${rem} د` : `${hrs}h ${rem}m`;
  };

  // Compute overall stats (excluding unapproved overtime exceptions)
  let totalMinutesWorked = 0;
  records.forEach((r) => {
    if (r.clockOutTime && r.status === AttendanceStatus.CLOCKED_OUT) {
      if (r.isException && r.exceptionStatus !== 'ACCEPTED') {
        return; // Exclude unapproved overtime exception hours
      }
      const start = new Date(r.clockInTime).getTime();
      const end = new Date(r.clockOutTime).getTime();
      if (!isNaN(start) && !isNaN(end) && end > start) {
        totalMinutesWorked += Math.floor((end - start) / (1000 * 60));
      }
    }
  });
  const totalHoursWorked = Math.floor(totalMinutesWorked / 60);
  const totalRemainingMins = totalMinutesWorked % 60;

  // Filter rejected records for employee notification
  const rejectedRecords = records.filter(r => r.isException && r.exceptionStatus === 'REJECTED');
  const auto15hUserRecords = records.filter(r => r.authorizationName === 'AUTO_15H_SYSTEM' || (r.clockOutNote && r.clockOutNote.includes('15-hour')));

  // Filter exceptions for HR Management Card
  const pendingCount = allExceptions.filter(e => e.exceptionStatus === 'PENDING').length;
  const auto15hCount = allExceptions.filter(e => e.authorizationName === 'AUTO_15H_SYSTEM' || (e.clockOutNote && e.clockOutNote.includes('15-hour'))).length;
  const approvedCount = allExceptions.filter(e => e.exceptionStatus === 'ACCEPTED').length;
  const rejectedCount = allExceptions.filter(e => e.exceptionStatus === 'REJECTED').length;

  const filteredExceptions = allExceptions.filter(e => {
    if (exceptionTab === 'PENDING') return e.exceptionStatus === 'PENDING';
    if (exceptionTab === 'AUTO_15H') return e.authorizationName === 'AUTO_15H_SYSTEM' || (e.clockOutNote && e.clockOutNote.includes('15-hour'));
    if (exceptionTab === 'ACCEPTED') return e.exceptionStatus === 'ACCEPTED';
    if (exceptionTab === 'REJECTED') return e.exceptionStatus === 'REJECTED';
    return true;
  });

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-white">{t('att_title')}</h1>
        <p className="text-slate-400 mt-1">{t('att_subtitle')}</p>
      </div>

      {/* Employee Auto-Closed 15H Alert Banner */}
      {auto15hUserRecords.length > 0 && (
        <div className="glass-card p-5 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent border border-amber-500/30 rounded-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-lg">
              ⏰
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isRtl ? 'تم إغلاق الوردية تلقائياً تجاوزاً لـ 15 ساعة' : 'Shift Auto-Closed (Exceeded 15-Hour Limit)'}
              </h3>
              <p className="text-xs text-amber-200/90">
                {isRtl
                  ? 'لقد تجاوزت الوردية الحد الأقصى 15 ساعة دون تسجيل خروج. تم إغلاق الوردية وإرسالها للموارد البشرية (HR) للمراجعة ولن تُحسب في الراتب حتى موافقة HR.'
                  : 'Your shift exceeded the 15-hour safety limit without clocking out. It has been automatically closed and sent to HR for review before hours can count.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Employee Rejection Notice Banner */}
      {rejectedRecords.length > 0 && (
        <div className="glass-card p-5 bg-gradient-to-r from-red-500/15 via-rose-500/10 to-transparent border border-red-500/30 rounded-2xl space-y-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center text-red-400 font-bold text-lg">
              ⚠️
            </div>
            <div>
              <h3 className="text-base font-bold text-white">{isRtl ? 'ساعات العمل الإضافية لم تُعتمد' : 'Overtime Hours Not Approved'}</h3>
              <p className="text-xs text-red-300">
                {isRtl
                  ? `لديك ${rejectedRecords.length} ورديات تزيد عن الحد اليومي تم رفضها من قبل الموارد البشرية. تم استبعادها من احتساب الراتب.`
                  : `You have ${rejectedRecords.length} shift(s) where overtime was rejected by HR. These hours have been excluded from your payroll calculations.`}
              </p>
            </div>
          </div>
          <div className="divide-y divide-red-500/20 bg-slate-950/60 rounded-xl p-3 text-xs space-y-2 border border-red-500/20">
            {rejectedRecords.map(rec => (
              <div key={rec.id} className="pt-2 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-slate-300">
                <div>
                  <strong className="text-white">{formatDate(rec.clockInTime)}</strong> ({isRtl ? 'الترخيص المدعى:' : 'Claimed Authorization:'} <span className="text-red-300 italic">{rec.authorizationName || (isRtl ? 'غير محدد' : 'Not specified')}</span>)
                </div>
                <span className="text-[11px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded font-semibold self-start sm:self-auto">
                  {isRtl ? 'تواصل مع HR لمراجعة القرار' : 'Contact HR to request review'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* HR / Admin Overtime Approvals & Decisions Management Panel */}
      {isHrOrAdmin && allExceptions.length > 0 && (
        <div className="glass-card p-6 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-transparent border border-indigo-500/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full bg-indigo-400 animate-pulse" />
              <div>
                <h2 className="text-lg font-bold text-white">
                  {isRtl ? `استثناءات وقرارات HR (${allExceptions.length})` : `Overtime Exceptions & HR Decisions (${allExceptions.length})`}
                </h2>
                <p className="text-xs text-slate-400">
                  {isRtl ? 'مراجعة وقبول أو إلغاء قرارات طلبات تجاوز ساعات العمل اليومية والإغلاق التلقائي' : 'Review, approve, or reverse decisions on daily overtime limits and 15h auto-closed shifts'}
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="inline-flex flex-wrap rounded-xl bg-slate-950/80 p-1 border border-white/10 text-xs font-bold gap-1">
              <button
                onClick={() => setExceptionTab('PENDING')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  exceptionTab === 'PENDING'
                    ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? `معلقة (${pendingCount})` : `Pending (${pendingCount})`}
              </button>
              <button
                onClick={() => setExceptionTab('AUTO_15H')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  exceptionTab === 'AUTO_15H'
                    ? 'bg-orange-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? `تلقائي 15+ ساعة (${auto15hCount})` : `15+ Hours Auto-Closed (${auto15hCount})`}
              </button>
              <button
                onClick={() => setExceptionTab('ACCEPTED')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  exceptionTab === 'ACCEPTED'
                    ? 'bg-emerald-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? `مقبولة (${approvedCount})` : `Approved (${approvedCount})`}
              </button>
              <button
                onClick={() => setExceptionTab('REJECTED')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  exceptionTab === 'REJECTED'
                    ? 'bg-red-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? `مرفوضة (${rejectedCount})` : `Rejected (${rejectedCount})`}
              </button>
              <button
                onClick={() => setExceptionTab('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  exceptionTab === 'ALL'
                    ? 'bg-indigo-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
              </button>
            </div>
          </div>

          {filteredExceptions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/60 rounded-xl border border-white/5" dir="auto">
              {isRtl
                ? `لا توجد سجلات استثناءات في تبويب "${exceptionTab === 'PENDING' ? 'المعلقة' : exceptionTab === 'ACCEPTED' ? 'المقبولة' : exceptionTab === 'REJECTED' ? 'المرفوضة' : 'الكل'}".`
                : `No overtime exception records found in the "${exceptionTab.toLowerCase()}" tab.`}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredExceptions.map((exp) => {
                const isPending = !exp.exceptionStatus || exp.exceptionStatus === 'PENDING';
                const isApproved = exp.exceptionStatus === 'ACCEPTED';
                const isRejected = exp.exceptionStatus === 'REJECTED';

                return (
                  <div key={exp.id} className="bg-slate-900/90 border border-white/10 rounded-xl p-4 space-y-3 shadow-lg hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-sm font-bold text-white">{exp.employeeName || (isRtl ? 'موظف' : 'Employee')}</h4>
                        <p className="text-xs text-slate-400" dir="ltr">{exp.employeeEmail}</p>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                        isApproved
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : isRejected
                          ? 'bg-red-500/20 text-red-300 border-red-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {isApproved && (isRtl ? '✓ مقبول' : '✓ Approved')}
                        {isRejected && (isRtl ? '❌ مرفوض' : '❌ Rejected')}
                        {isPending && (isRtl ? '⏳ قيد الانتظار' : '⏳ Pending HR')}
                      </span>
                    </div>

                    <div className="text-xs space-y-1 bg-white/5 p-2.5 rounded-lg border border-white/5">
                      <p className="text-slate-300">
                        <strong className="text-indigo-400">{isRtl ? 'تاريخ الوردية:' : 'Shift Date:'}</strong> {formatDate(exp.clockInTime)}
                      </p>
                      <p className="text-slate-300">
                        <strong className="text-indigo-400">{isRtl ? 'اسم المرخّص المدعى:' : 'Claimed Authorizer:'}</strong> <span className="text-white font-semibold">{exp.authorizationName || 'N/A'}</span>
                      </p>
                      {exp.clockOutNote && (
                        <p className="text-slate-400 italic" dir="auto">"{exp.clockOutNote}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {!isApproved && (
                        <button
                          onClick={() => handleResolveException(exp.id, 'ACCEPTED')}
                          className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-1 shadow-md"
                        >
                          <span>{isRejected ? (isRtl ? '✓ إلغاء الرفض واعتماد الساعات' : '✓ Reverse & Approve Hours') : (isRtl ? '✓ اعتماد الساعات' : '✓ Approve Hours')}</span>
                        </button>
                      )}
                      {!isRejected && (
                        <button
                          onClick={() => handleResolveException(exp.id, 'REJECTED')}
                          className="flex-1 px-3 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors flex items-center justify-center gap-1 shadow-md"
                        >
                          <span>{isApproved ? (isRtl ? '✕ تغيير القرار إلى رفض' : '✕ Change Decision to Reject') : (isRtl ? '✕ رفض' : '✕ Reject')}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

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
              {isClockedIn ? (isRtl ? 'مسجل دخول حالياً' : 'Currently Clocked In') : (isRtl ? 'غير مسجل دخول' : 'Not Clocked In')}
            </span>
          </div>
          {isClockedIn && activeRecord?.workLocation && (
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
              {activeRecord.workLocation === WorkLocation.OFFICE ? (isRtl ? '🏢 المكتب' : '🏢 Office') : (isRtl ? '🏠 المنزل' : '🏠 Home')}
              {activeRecord.latePenalty && (
                <span className="text-red-400 bg-red-500/20 px-1.5 py-0.5 rounded text-[10px]">
                  {isRtl ? '-45د تأخير' : '-45m Late'}
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

        {successMsg && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400">
            {successMsg}
          </div>
        )}

        {isClockedIn && activeRecord ? (
          <div className="space-y-6">
            <div className="bg-white/5 rounded-xl p-4 space-y-2 border border-white/10">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">
                {isRtl ? 'خطة الصباح / المهمة المستهدفة' : 'Morning Plan / Intended Task'}
              </p>
              <p className="text-white font-medium" dir="auto">{activeRecord.intendedTask}</p>
              <p className="text-xs text-slate-500">
                {isRtl
                  ? `تم تسجيل الدخول منذ ${formatTime(activeRecord.clockInTime)} (${formatDate(activeRecord.clockInTime)})`
                  : `Clocked in since ${formatTime(activeRecord.clockInTime)} (${formatDate(activeRecord.clockInTime)})`}
              </p>
            </div>

            {/* Results of today (Number + Text dynamic items) */}
            <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-5 space-y-4 shadow-lg">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏁</span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{isRtl ? 'تسجيل نتائج وإنجازات اليوم' : "Log Today's Results"}</h3>
                    <p className="text-xs text-slate-400">{isRtl ? 'سجل ما أنجزته اليوم قبل تسجيل الخروج النهائي (يمكنك إضافة أكثر من مخرج)' : 'Record what you achieved before clocking out for the day (you can add multiple items)'}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={addOutputItem}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-sm"
                >
                  <span className="text-base font-extrabold">+</span>
                  <span>{isRtl ? 'إضافة مخرج جديد' : 'Add Output Item'}</span>
                </button>
              </div>

              <div className="space-y-3">
                {outputItems.map((item, index) => (
                  <div key={index} className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/20 space-y-2.5 relative animate-fadeIn">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400" />
                        {isRtl ? `المخرج / الإنجاز #${index + 1}` : `Output Item #${index + 1}`}
                      </span>
                      {outputItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeOutputItem(index)}
                          className="text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 px-2 py-0.5 rounded transition-colors font-bold flex items-center gap-1"
                          title={isRtl ? 'حذف هذا المخرج' : 'Remove Item'}
                        >
                          ✕ {isRtl ? 'حذف' : 'Remove'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          {isRtl ? 'عدد المهام / مخرجات اليوم (#)' : 'Tasks / Output (#)'}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={item.output}
                          onChange={(e) => updateOutputItem(index, 'output', e.target.value)}
                          placeholder={isRtl ? 'مثال: 5 أو 100' : 'e.g. 5 or 100'}
                          className="input-field py-2 text-xs bg-slate-900 border-emerald-500/30 focus:border-emerald-400 font-mono text-emerald-300 placeholder:text-slate-600 w-full"
                          dir="ltr"
                        />
                        <span className="text-[10px] text-slate-500 mt-0.5 block">{isRtl ? 'حقل رقمي' : 'Number field'}</span>
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          {isRtl ? 'شرح النتائج / الملخص' : 'Results Explanation / Summary'}
                        </label>
                        <input
                          type="text"
                          value={item.explanation}
                          onChange={(e) => updateOutputItem(index, 'explanation', e.target.value)}
                          placeholder={isRtl ? 'اشرح باختصار نتائج وإنجازات هذا المخرج...' : 'Briefly explain your results/accomplishments today...'}
                          className="input-field py-2 text-xs bg-slate-900 border-emerald-500/30 focus:border-emerald-400 text-white placeholder:text-slate-600 w-full"
                          dir="auto"
                        />
                        <span className="text-[10px] text-slate-500 mt-0.5 block">{isRtl ? 'حقل شرح نصي للإنجاز' : 'Explanation text next to output'}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={initiateClockOut}
              disabled={actionLoading || !outputItems.some(i => i.output.trim() !== '' || i.explanation.trim() !== '')}
              className="flex items-center justify-center gap-2 w-full px-6 py-3.5 rounded-xl font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-600/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              )}
              {isRtl ? 'تسليم النتائج وتسجيل الخروج' : 'Submit Results & Clock Out'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Today's Schedule Requirement Banner */}
            {scheduledLocation && (
              <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3.5 flex items-center justify-between text-xs text-indigo-300">
                <span className="font-semibold flex items-center gap-2">
                  <span>{isRtl ? '📅 دوامك المعتمد اليوم حسب جدول HR:' : '📅 HR Schedule Requirement Today:'}</span>
                  <strong className="text-white bg-indigo-500/20 px-2.5 py-0.5 rounded border border-indigo-500/40">
                    {scheduledLocation === WorkLocation.OFFICE ? (isRtl ? '🏢 يوم مكتب' : '🏢 Office Day') : (isRtl ? '🏠 يوم منزل' : '🏠 Home Day')}
                  </strong>
                </span>
                <Link to="/dashboard/schedule" className="text-indigo-400 hover:underline font-bold">
                  {isRtl ? 'عرض الجدول الكامل ←' : 'View Full Schedule →'}
                </Link>
              </div>
            )}

            {/* Location Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isRtl ? 'اختر موقع دوام اليوم' : "Select Today's Work Location"}
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
                  <span className="font-semibold text-sm">{isRtl ? 'المكتب' : 'Office'}</span>
                  <span className="text-[11px] text-slate-400">{isRtl ? 'الدوام الميداني في مقر الشركة' : 'On-site workspace'}</span>
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
                  <span className="font-semibold text-sm">{isRtl ? 'المنزل' : 'Home'}</span>
                  <span className="text-[11px] text-slate-400">{isRtl ? 'الدوام عن بعد' : 'Remote workday'}</span>
                </button>
              </div>

              {willBeLate && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3 mt-2 animate-fadeIn">
                  <span className="text-amber-400 text-lg">⚠️</span>
                  <div className="text-xs text-amber-300 space-y-0.5">
                    <p className="font-bold">{isRtl ? 'تنبيه التأخر عن 9:00 صباحاً' : 'Late Arrival Notice (After 9:00 AM)'}</p>
                    <p className="text-amber-300/90">
                      {isRtl
                        ? 'تسجيل الدخول في المكتب بعد الساعة 9:00 صباحاً يتضمن خصم 45 دقيقة تأخير من رصيدك اليومي.'
                        : 'Clocking in at the Office after 9:00 AM automatically incurs a 45-minute deduction penalty to your daily hours record.'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isRtl ? 'ما هي خطة عملك اليوم؟' : 'What are you working on today?'}
              </label>
              <textarea
                rows={3}
                value={task}
                onChange={(e) => setTask(e.target.value)}
                className="input-field resize-none"
                placeholder={isRtl ? 'اشرح المهمة التي ستعمل عليها اليوم...' : 'Describe your intended task for today...'}
                dir="auto"
              />
              <div className="flex justify-between text-xs">
                {charsNeeded > 0 ? (
                  <span className="text-amber-400">
                    {isRtl ? `متبقي ${charsNeeded} حرف إضافي` : `${charsNeeded} more character${charsNeeded !== 1 ? 's' : ''} needed`}
                  </span>
                ) : (
                  <span className="text-emerald-400">{isRtl ? '✓ جاهز لتسجيل الدخول' : '✓ Ready to clock in'}</span>
                )}
                <span className="text-slate-500" dir="ltr">{task.length} {isRtl ? 'حرف' : 'characters'}</span>
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
              {isRtl
                ? `تسجيل الدخول في ${workLocation === WorkLocation.OFFICE ? 'المكتب 🏢' : 'المنزل 🏠'}`
                : `Clock In at ${workLocation === WorkLocation.OFFICE ? 'Office 🏢' : 'Home 🏠'}`}
            </button>
          </div>
        )}
      </div>

      {/* Dedicated Overtime Authorization Modal */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="glass-card border border-red-500/30 max-w-lg w-full p-6 space-y-6 shadow-2xl rounded-2xl bg-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-2xl text-red-400">
                ⚠️
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{isRtl ? `مطلوب ترخيص العمل الإضافي (>${user?.maxDailyHours ?? 12} ساعة)` : `Overtime Authorization Required (>${user?.maxDailyHours ?? 12}h)`}</h3>
                <p className="text-xs text-red-300">{isRtl ? `لقد تجاوزت الحد المعتمد (${user?.maxDailyHours ?? 12} ساعة) في اليوم الحالي.` : `You have crossed your daily limit (${user?.maxDailyHours ?? 12} hours) in a single shift/day.`}</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-slate-300">
                {isRtl
                  ? `لتسجيل الخروج من وردية تتجاوز ${user?.maxDailyHours ?? 12} ساعة، يرجى كتابة اسم المدير المسؤول الذي رخّص هذا العمل الإضافي.`
                  : `To clock out of a shift exceeding ${user?.maxDailyHours ?? 12} hours, please enter the name of the manager or supervisor who authorized this overtime work.`}
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5 uppercase tracking-wider">
                  {isRtl ? 'اسم المدير المرخّص *' : 'Authorizing Manager Name *'}
                </label>
                <input
                  type="text"
                  value={authorizationName}
                  onChange={(e) => setAuthorizationName(e.target.value)}
                  placeholder={isRtl ? 'مثال: أحمد علي (مسؤول القسم)' : 'e.g. John Doe (Department Lead)'}
                  className="input-field py-2.5 text-sm bg-slate-950 border-red-500/40 focus:border-red-400 text-white w-full"
                  autoFocus
                  dir="auto"
                />
                <span className="text-[11px] text-slate-400 mt-1 block">
                  {isRtl ? 'ملاحظة: سيتم إرسال ساعات العمل الإضافية لمراجعة قسم الموارد البشرية.' : 'Note: Overtime hours will be sent to HR for review before being added to payroll.'}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 bg-white/5 hover:bg-white/10 hover:text-white transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={() => executeClockOut()}
                disabled={actionLoading || !authorizationName.trim()}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-600/20 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {isRtl ? 'تأكيد الترخيص وتسجيل الخروج' : 'Confirm Authorization & Clock Out'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Attendance History */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h2 className="text-lg font-semibold text-white">
            {t('att_history')}
          </h2>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-purple-600/80 hover:bg-purple-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-lg shadow-purple-500/20 border border-purple-500/30"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              {isRtl ? 'مقارنة مع مراقب الجهاز' : 'Compare with Tracker'}
            </button>
            <div className="flex items-center gap-4 text-xs bg-white/[0.03] border border-white/10 px-4 py-2 rounded-xl">
              <span className="text-slate-400">{isRtl ? 'إجمالي الساعات المعتمدة:' : 'Total Approved Worked:'} <strong className="text-emerald-400 font-bold text-sm" dir="ltr">{totalHoursWorked}h {totalRemainingMins}m</strong></span>
              <span className="text-slate-600">|</span>
              <span className="text-slate-400">{isRtl ? 'إجمالي الورديات:' : 'Total Shifts:'} <strong className="text-white font-bold text-sm" dir="ltr">{records.length}</strong></span>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : records.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <p className="text-slate-400">{isRtl ? 'لا توجد سجلات حضور سابقة.' : 'No attendance records yet.'}</p>
          </div>
        ) : (
          <div className="glass-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm`}>
                <thead>
                  <tr className="border-b border-white/10 bg-slate-900/60">
                    <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                      {isRtl ? 'التاريخ' : 'Date'}
                    </th>
                    <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                      {isRtl ? 'الموقع' : 'Location'}
                    </th>
                    <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                      {t('att_clock_in')}
                    </th>
                    <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                      {t('att_clock_out')}
                    </th>
                    <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                      {isRtl ? 'ساعات العمل' : 'Worked Hours'}
                    </th>
                    <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                      {t('att_task')}
                    </th>
                    <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[160px] w-48 ${isRtl ? 'text-right' : 'text-left'}`}>
                      {t('att_status')}
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
                              {record.workLocation === WorkLocation.OFFICE ? (isRtl ? '🏢 المكتب' : '🏢 Office') : (isRtl ? '🏠 المنزل' : '🏠 Home')}
                            </span>
                            {record.latePenalty && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-400 border border-red-500/30" title="45-minute late arrival penalty applied">
                                {isRtl ? '-45د تأخير' : '-45m Late'}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-slate-300 whitespace-nowrap" dir="ltr">
                          {formatTime(record.clockInTime)}
                        </td>
                        <td className="px-6 py-4 text-slate-300 whitespace-nowrap" dir="ltr">
                          {record.clockOutTime
                            ? formatTime(record.clockOutTime)
                            : <span className="text-amber-400/80 italic text-xs">{isRtl ? 'مستمرة' : 'Ongoing'}</span>}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${
                              isActive
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : record.isException && record.exceptionStatus !== 'ACCEPTED'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 line-through'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`} dir="ltr">
                              {isActive && (
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                              )}
                              {durationStr}
                            </span>
                            {record.isException && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                                record.exceptionStatus === 'ACCEPTED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : record.exceptionStatus === 'REJECTED'
                                  ? 'bg-red-500/20 text-red-400'
                                  : 'bg-amber-500/20 text-amber-300'
                              }`}>
                                {record.exceptionStatus === 'ACCEPTED' && (isRtl ? '✓ إضافي مقبول' : '✓ Approved Overtime')}
                                {record.exceptionStatus === 'REJECTED' && (isRtl ? '❌ إضافي مرفوض' : '❌ Overtime Rejected')}
                                {(!record.exceptionStatus || record.exceptionStatus === 'PENDING') && (isRtl ? '⏳ قيد مراجعة HR' : '⏳ Pending HR Approval')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 max-w-sm">
                          <div className="space-y-1">
                            <p className="text-slate-300 truncate" title={record.intendedTask} dir="auto">
                              <span className="text-[10px] text-indigo-400 font-bold uppercase mr-1">{isRtl ? 'الخطة:' : 'Plan:'}</span>
                              {record.intendedTask}
                            </p>
                            {(record.completedTasksCount !== null && record.completedTasksCount !== undefined || record.clockOutNote) && (
                              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded p-2 text-xs space-y-1 mt-1">
                                {record.completedTasksCount !== null && record.completedTasksCount !== undefined && (
                                  <div className="flex items-center gap-1.5 text-emerald-300 font-bold mb-1">
                                    <span>{isRtl ? '🏆 إجمالي المخرجات:' : '🏆 Total Outputs:'}</span>
                                    <span className="bg-emerald-500/20 px-2 py-0.5 rounded font-mono text-xs" dir="ltr">{record.completedTasksCount}</span>
                                  </div>
                                )}
                                {record.clockOutNote && (
                                  <div className="text-slate-200 text-[11px] space-y-1 font-normal" dir="auto">
                                    {record.clockOutNote.split('\n').map((line, idx) => (
                                      <div key={idx} className="flex items-start gap-1.5 bg-slate-900/60 p-1.5 rounded border border-white/5">
                                        <span className="text-emerald-400 font-bold text-xs shrink-0">•</span>
                                        <span className="leading-relaxed whitespace-pre-wrap">{line}</span>
                                      </div>
                                    ))}
                                  </div>
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
                            {isActive ? (isRtl ? 'مستمرة (مسجل دخول)' : 'Active (Clocked In)') : (isRtl ? 'مكتملة' : 'Completed')}
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

      <EmployeeHoursModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        employeeId={user?.id}
        employeeName={user?.name}
        readOnly={true}
      />
    </div>
  );
}
