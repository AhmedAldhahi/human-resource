import { getAssetUrl, getSocketUrl } from '../api/client';
import React, { useEffect, useState } from 'react';
import { absenceApi, usersApi } from '../api/client';
import { AbsenceStatus, AbsenceType, Role, EmployeeType } from '@hrms/shared';
import type { AbsenceRecordResponseDto, UserResponseDto } from '@hrms/shared';
import { useLanguage } from '../context/LanguageContext';

export default function AbsencePage() {
  const { t, isRtl } = useLanguage();
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [myRecords, setMyRecords] = useState<AbsenceRecordResponseDto[]>([]);
  const [allRecords, setAllRecords] = useState<AbsenceRecordResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'my' | 'hr'>('my');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<AbsenceType>(AbsenceType.VACATION);
  const [reason, setReason] = useState('');
  const [earlyLeaveMinutes, setEarlyLeaveMinutes] = useState<number | ''>('');
  const [file, setFile] = useState<File | undefined>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Auto Check state
  const [autoChecking, setAutoChecking] = useState(false);

  const isHrOrAdmin = user?.role === Role.HR || user?.role === Role.ADMIN;
  const isPerHour = user?.employeeType === EmployeeType.PER_HOUR;

  const fetchData = async () => {
    setLoading(true);
    try {
      const me = await usersApi.getMe();
      setUser(me);
      const myData = await absenceApi.getMyRecords();
      setMyRecords(myData);

      if (me.role === Role.HR || me.role === Role.ADMIN) {
        const allData = await absenceApi.getAllRecords();
        setAllRecords(allData);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // When modal opens, default the type based on employee type
  const openModal = () => {
    setError('');
    setSuccessMsg('');
    setReason('');
    setFile(undefined);
    setEarlyLeaveMinutes('');
    if (isPerHour) {
      setType(AbsenceType.HOURLY_OFF);
    } else {
      setType(AbsenceType.VACATION);
    }
    setIsModalOpen(true);
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isPerHour && !reason.trim()) {
      setError(isRtl ? 'يجب على موظفي أجر الساعة تزويد سبب عند طلب عطلة أو غياب.' : 'Hourly wage employees must provide a reason when requesting time off or marking absent.');
      return;
    }

    if (!isPerHour) {
      if (type === AbsenceType.SICK_LEAVE && !file && !reason.trim()) {
        setError(isRtl ? 'الإجازة المرضية تتطلب إما رفع تقرير طبي أو كتابة شرح تفصيلي.' : 'Sick leave requires either uploading a medical certificate document or providing detailed notes.');
        return;
      }
      if (type === AbsenceType.EARLY_LEAVE && (!earlyLeaveMinutes || Number(earlyLeaveMinutes) <= 0)) {
        setError(isRtl ? 'يرجى إدخال عدد دقائق المغادرة المبكرة (مثال: 60 لساعة واحدة، 120 لساعتين).' : 'Please enter the number of minutes or hours left early (e.g., 60 for 1 hour, 120 for 2 hours).');
        return;
      }
      if (type === AbsenceType.EARLY_LEAVE && !reason.trim()) {
        setError(isRtl ? 'يرجى تزويد سبب المغادرة المبكرة.' : 'Please provide a reason for leaving early.');
        return;
      }
      if ((type === AbsenceType.VACATION || type === AbsenceType.REGULAR) && !reason.trim()) {
        setError(isRtl ? 'يرجى كتابة تفاصيل أو سبب طلب الإجازة.' : 'Please provide details/reason for your vacation or leave request.');
      }
    }

    setSubmitting(true);
    try {
      await absenceApi.createRequest(
        {
          date,
          type: isPerHour ? AbsenceType.HOURLY_OFF : type,
          reason: reason.trim(),
          earlyLeaveMinutes: earlyLeaveMinutes !== '' ? Number(earlyLeaveMinutes) : undefined,
        },
        file
      );
      setIsModalOpen(false);
      setReason('');
      setFile(undefined);
      setEarlyLeaveMinutes('');
      setSuccessMsg(isRtl ? 'تم تقديم طلب الإجازة / المغادرة بنجاح.' : 'Absence / leave request submitted successfully.');
      await fetchData();
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل تقديم الطلب.' : 'Failed to submit request.'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: AbsenceStatus) => {
    try {
      await absenceApi.updateStatus(id, status);
      await fetchData();
    } catch {
      alert(isRtl ? 'فشل تحديث حالة الإجازة.' : 'Failed to update absence status.');
    }
  };

  const handleRunAutoCheck = async () => {
    setAutoChecking(true);
    try {
      const res = await absenceApi.checkAuto();
      alert(isRtl ? `اكتمل التدقيق التلقائي! تم فحص ${res.processed} موظفاً وتسجيل ${res.created} غيابات جديدة.` : `Auto-check complete! Checked ${res.processed} employees. Logged ${res.created} new absences.`);
      await fetchData();
    } catch {
      alert(isRtl ? 'فشل تشغيل التدقيق التلقائي.' : 'Failed to run auto-check.');
    } finally {
      setAutoChecking(false);
    }
  };

  const getStatusBadge = (status: AbsenceStatus) => {
    switch (status) {
      case AbsenceStatus.APPROVED:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">{isRtl ? 'مقبول' : 'Approved'}</span>;
      case AbsenceStatus.REJECTED:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">{isRtl ? 'مرفوض' : 'Rejected'}</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">{isRtl ? 'قيد المراجعة' : 'Pending Review'}</span>;
    }
  };

  const getTypeBadge = (t: AbsenceType) => {
    switch (t) {
      case AbsenceType.SICK_LEAVE:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">{isRtl ? '🩺 إجازة مرضية' : '🩺 Sick Leave'}</span>;
      case AbsenceType.VACATION:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">{isRtl ? '🌴 إجازة سنوية' : '🌴 Vacation'}</span>;
      case AbsenceType.EARLY_LEAVE:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">{isRtl ? '⏳ مغادرة مبكرة' : '⏳ Early Departure'}</span>;
      case AbsenceType.HOURLY_OFF:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">{isRtl ? '⏱️ يوم عطلة بالساعة' : '⏱️ Hourly Off Day'}</span>;
      default:
        return <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">{isRtl ? '📅 إجازة اعتيادية' : '📅 Regular Leave'}</span>;
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Header & Main Action */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <span>{isRtl ? 'إدارة الإجازات والمغادرات' : 'Absence & Leave Management'}</span>
            {user && (
              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase border ${
                isPerHour 
                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30' 
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}>
                {isPerHour ? (isRtl ? 'بوابة موظفي الساعة' : 'Hourly Wage Portal') : (isRtl ? 'نظام الراتب الثابت' : 'Fixed Income Salaried')}
              </span>
            )}
          </h1>
          <p className="text-slate-400 mt-1">
            {isPerHour 
              ? (isRtl ? 'تسجيل أيام العطل والمغادرات مع الشرح الإجباري لضمان متابعة قسم الموارد البشرية.' : 'Report off days and absences with mandatory reasons so HR has visibility in your history and reports.')
              : (isRtl ? 'تتبع رصيد 14 يوم مرضية + 14 يوم سنوية، تقديم الشهادات الطبية، وإدارة المغادرات المبكرة.' : 'Track your 14 Sick + 14 Vacation days, submit medical certificates, and manage early departure accumulation.')}
          </p>
        </div>
        <button
          onClick={openModal}
          className="gradient-btn px-6 py-3 flex items-center justify-center gap-2 shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {isPerHour ? (isRtl ? '+ تسجيل عطلة / غياب' : 'Mark Absent / Request Off') : (isRtl ? '+ طلب إجازة / مغادرة' : 'Request Absence / Leave')}
        </button>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-4 py-3 text-sm text-emerald-300 flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Balance Cards Section */}
      {user && !isPerHour && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Sick Leave Card */}
          <div className="glass-card p-6 border-l-4 border-l-purple-500 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">{isRtl ? 'الرصيد السنوي' : 'Annual Allowance'}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{isRtl ? '🩺 رصيد الإجازات المرضية' : '🩺 Sick Leave Pool'}</h3>
              </div>
              <span className="text-3xl font-extrabold text-purple-300" dir="ltr">{user.sickDaysLeft}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${(user.sickDaysLeft / 14) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{isRtl ? 'المتبقي:' : 'Remaining:'} <strong className="text-white" dir="ltr">{user.sickDaysLeft} {isRtl ? 'يوم' : 'days'}</strong></span>
              <span dir="ltr">{isRtl ? 'الإجمالي: 14 يوم/سنة' : 'Total: 14 days/yr'}</span>
            </div>
            <p className="text-[11px] text-slate-500 italic">{isRtl ? 'تتطلب تقريراً طبياً عند تقديم الطلب.' : 'Requires doctor verification note when requesting.'}</p>
          </div>

          {/* Vacation / Other Card */}
          <div className="glass-card p-6 border-l-4 border-l-indigo-500 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{isRtl ? 'الرصيد السنوي' : 'Annual Allowance'}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{isRtl ? '🌴 رصيد الإجازات السنوية' : '🌴 Vacation & Other'}</h3>
              </div>
              <span className="text-3xl font-extrabold text-indigo-300" dir="ltr">{user.vacationDaysLeft}</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-indigo-500 to-blue-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${(user.vacationDaysLeft / 14) * 100}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{isRtl ? 'المتبقي:' : 'Remaining:'} <strong className="text-white" dir="ltr">{user.vacationDaysLeft} {isRtl ? 'يوم' : 'days'}</strong></span>
              <span dir="ltr">{isRtl ? 'الإجمالي: 14 يوم/سنة' : 'Total: 14 days/yr'}</span>
            </div>
            <p className="text-[11px] text-slate-500 italic">{isRtl ? 'يتم التجديد تلقائياً كل سنة (أو عبر HR).' : 'Resets automatically every year (or via HR).'}</p>
          </div>

          {/* Early Departure Tracker Card */}
          <div className="glass-card p-6 border-l-4 border-l-amber-500 space-y-3 relative overflow-hidden">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">{isRtl ? 'قاعدة الخصم' : 'Deduction Rule'}</span>
                <h3 className="text-lg font-bold text-white mt-0.5">{isRtl ? '⏳ متتبع المغادرات المبكرة' : '⏳ Early Departure Tracker'}</h3>
              </div>
              <span className="text-2xl font-extrabold text-amber-300" dir="ltr">
                {Math.round((user.earlyLeaveMinutesAccumulated / 60) * 10) / 10} <span className="text-xs font-normal text-slate-400">/ 4h</span>
              </span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (user.earlyLeaveMinutesAccumulated / 240) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400">
              <span>{isRtl ? 'المتراكم:' : 'Accumulated:'} <strong className="text-amber-300" dir="ltr">{user.earlyLeaveMinutesAccumulated} {isRtl ? 'دقيقة' : 'mins'}</strong></span>
              <span>{isRtl ? 'الخصم التالي -1 يوم: 240 دقيقة' : 'Next -1 Day: 240 mins'}</span>
            </div>
            <p className="text-[11px] text-slate-500 italic">{isRtl ? 'كل 4 ساعات متراكمة (240 دقيقة) = خصم 1 يوم من الرصيد السنوي.' : 'Every 4 accumulated hours = -1 day from vacation.'}</p>
          </div>
        </div>
      )}

      {/* Per-Hour Banner if Hourly */}
      {user && isPerHour && (
        <div className="glass-card p-6 border-l-4 border-l-teal-500 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>{isRtl ? '⏱️ موظف بالساعة – أيام عطل مرنة' : '⏱️ Hourly Wage Worker – Flexible Off Days'}</span>
            </h3>
            <p className="text-sm text-slate-400">
              {isRtl
                ? 'بصفتك موظفاً بنظام الساعة، لا تستخدم رصيد 14 يوماً ثابتاً. عند الرغبة بأخذ عطلة، سجل ذلك أدناه مع كتابة السبب.'
                : 'As an hourly employee (`PER_HOUR`), you do not use fixed 14-day absence pools. When you cannot make it or need a day off, simply mark absent below with the mandatory reason.'}
            </p>
            <p className="text-xs text-teal-300/80 mt-1">
              {isRtl ? '✓ يتم تسجيل جميع أيام العطل فوراً في سجلك وتقارير الموارد البشرية.' : '✓ All recorded off days instantly log in your history and HR reports for clean tracking.'}
            </p>
          </div>
          <button
            onClick={openModal}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 hover:bg-teal-500/30 transition-all whitespace-nowrap"
          >
            {isRtl ? '+ تسجيل يوم عطلة الآن' : '+ Report Off Day Now'}
          </button>
        </div>
      )}

      {/* Tabs if HR/Admin */}
      {isHrOrAdmin && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('my')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 ${
                activeTab === 'my'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isRtl ? `سجلات إجازاتي (${myRecords.length})` : `My Leave Records (${myRecords.length})`}
            </button>
            <button
              onClick={() => setActiveTab('hr')}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 relative ${
                activeTab === 'hr'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
              }`}
            >
              {isRtl ? `صندوق تدقيق HR وجميع الإجازات (${allRecords.length})` : `HR Verification Inbox & All Absences (${allRecords.length})`}
              {allRecords.filter((r) => r.status === AbsenceStatus.PENDING).length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold animate-pulse">
                  {allRecords.filter((r) => r.status === AbsenceStatus.PENDING).length}
                </span>
              )}
            </button>
          </div>

          {activeTab === 'hr' && (
            <button
              onClick={handleRunAutoCheck}
              disabled={autoChecking}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 transition-all flex items-center gap-2"
              title={isRtl ? 'فحص تلقائي لحضور الموظفين اليوم وتسجيل الغياب' : 'Automatically checks attendance records for office employees today and logs missing workdays'}
            >
              {autoChecking ? (
                <div className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
              ) : (
                <span>⚡</span>
              )}
              {isRtl ? 'تشغيل التدقيق التلقائي اليوم (السبت-الخميس)' : 'Run Auto-Check Today (Sat-Thu)'}
            </button>
          )}
        </div>
      )}

      {/* Table Section */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (activeTab === 'my' ? myRecords : allRecords).length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            {isRtl ? 'لا توجد سجلات إجازات أو مغادرات.' : 'No absence or leave records found.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm`}>
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60">
                  {activeTab === 'hr' && (
                    <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                      {isRtl ? 'الموظف' : 'Employee'}
                    </th>
                  )}
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'التاريخ' : 'Date'}
                  </th>
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'نوع الإجازة' : 'Leave Type'}
                  </th>
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'السبب / التفاصيل والتقرير' : 'Reason / Details & Doc'}
                  </th>
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'تأثير الرصيد' : 'Allowance Impact'}
                  </th>
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('att_status')}
                  </th>
                  {activeTab === 'hr' && (
                    <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-left' : 'text-right'}`}>
                      {isRtl ? 'تدقيق الموارد البشرية' : 'HR Verification'}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(activeTab === 'my' ? myRecords : allRecords).map((record) => (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors duration-150">
                    {activeTab === 'hr' && (
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-semibold text-white">{record.userName || (isRtl ? 'موظف' : 'Employee')}</div>
                        <div className="text-xs text-slate-400" dir="ltr">{record.userEmail}</div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-white font-medium whitespace-nowrap">
                      {new Date(record.date).toLocaleDateString(isRtl ? 'ar-JO' : 'en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getTypeBadge(record.type)}
                      {record.earlyLeaveMinutes && (
                        <div className="text-[11px] text-amber-400 font-semibold mt-1">
                          {isRtl ? `مغادرة مبكرة ${record.earlyLeaveMinutes} دقيقة` : `Left ${record.earlyLeaveMinutes} mins early`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 max-w-xs">
                      <div className="text-slate-300 text-sm" title={record.reason || undefined} dir="auto">
                        {record.reason || <span className="text-slate-500 italic">{isRtl ? 'لا يوجد شرح' : 'No notes provided'}</span>}
                      </div>
                      {record.documentUrl && (
                        <a
                          href={getAssetUrl(record.documentUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 font-bold mt-1 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20"
                        >
                          <span>📄 {isRtl ? 'عرض التقرير الطبي' : 'Doctor Verification Note'}</span>
                          <span>↗</span>
                        </a>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.type === AbsenceType.HOURLY_OFF ? (
                        <span className="text-teal-400 font-semibold text-xs">{isRtl ? 'يوم عطلة مٌسجّل' : 'Reported Off Day'}</span>
                      ) : record.type === AbsenceType.EARLY_LEAVE ? (
                        <span className="text-amber-400 font-semibold text-xs" dir="ltr">+{record.earlyLeaveMinutes || 0}m to Counter</span>
                      ) : record.isPaid ? (
                        <span className="text-emerald-400 font-semibold text-xs">
                          {record.type === AbsenceType.SICK_LEAVE ? (isRtl ? '-1 يوم مرضية' : '-1 Sick Day') : (isRtl ? '-1 يوم سنوية' : '-1 Vacation Day')}
                        </span>
                      ) : (
                        <span className="text-red-400 font-semibold text-xs">{isRtl ? 'رصيد مستنفد (بدون أجر)' : 'Exhausted Balance (Unpaid)'}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(record.status)}
                    </td>
                    {activeTab === 'hr' && (
                      <td className={`px-6 py-4 whitespace-nowrap ${isRtl ? 'text-left' : 'text-right'} space-x-2`}>
                        {record.status === AbsenceStatus.PENDING ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(record.id, AbsenceStatus.APPROVED)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
                            >
                              {isRtl ? 'قبول ✓' : 'Accept ✓'}
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(record.id, AbsenceStatus.REJECTED)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-all"
                            >
                              {isRtl ? 'رفض ✕' : 'Reject ✕'}
                            </button>
                          </>
                        ) : (
                          <span className="text-xs text-slate-500 italic">{isRtl ? 'تم التدقيق' : 'Reviewed'}</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="glass-card w-full max-w-lg p-6 sm:p-8 space-y-6 relative border border-white/20 shadow-2xl bg-slate-900">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>{isPerHour ? (isRtl ? 'تسجيل عطلة / غياب' : 'Report Off Day / Absence') : (isRtl ? 'طلب إجازة أو مغادرة مبكرة' : 'Request Absence or Early Departure')}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xl"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitRequest} className="space-y-4">
              {!isPerHour ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    {isRtl ? 'اختر فئة الإجازة' : 'Select Leave Category'}
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setType(AbsenceType.VACATION)}
                      className={`p-3 rounded-xl border font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                        type === AbsenceType.VACATION
                          ? 'bg-indigo-600/30 border-indigo-500 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-base">🌴</span>
                      <span>{isRtl ? 'إجازة سنوية' : 'Vacation / Other'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType(AbsenceType.SICK_LEAVE)}
                      className={`p-3 rounded-xl border font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                        type === AbsenceType.SICK_LEAVE
                          ? 'bg-purple-600/30 border-purple-500 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-base">🩺</span>
                      <span>{isRtl ? 'إجازة مرضية' : 'Sick Leave'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setType(AbsenceType.EARLY_LEAVE)}
                      className={`p-3 rounded-xl border font-semibold text-xs flex flex-col items-center justify-center gap-1 transition-all ${
                        type === AbsenceType.EARLY_LEAVE
                          ? 'bg-amber-600/30 border-amber-500 text-white shadow-md'
                          : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <span className="text-base">⏳</span>
                      <span>{isRtl ? 'مغادرة مبكرة' : 'Early Departure'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300">
                  ⚡ {isRtl ? 'كموظف بنظام الساعة، يتم تسجيل اليوم مباشرة في سجلك بعد إضافة السبب الإجباري.' : 'As an hourly worker, reporting an off day automatically logs in your history with your mandatory reason.'}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  {isRtl ? 'التاريخ' : 'Date'}
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                  className="input-field"
                  dir="ltr"
                />
              </div>

              {!isPerHour && type === AbsenceType.EARLY_LEAVE && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-2">
                  <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider">
                    {isRtl ? 'مدة المغادرة المبكرة (بالدقائق)' : 'Early Departure Duration (in Minutes)'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    placeholder={isRtl ? 'مثال: 60 (لساعة واحدة)، 120 (لساعتين)' : 'e.g. 60 (for 1 hour), 120 (for 2 hours)'}
                    value={earlyLeaveMinutes}
                    onChange={(e) => setEarlyLeaveMinutes(e.target.value === '' ? '' : Number(e.target.value))}
                    required
                    className="input-field border-amber-500/40"
                    dir="ltr"
                  />
                  <p className="text-[11px] text-amber-300/80">
                    {isRtl ? 'قاعدة: كل 240 دقيقة متراكمة (4 ساعات) تتحول تلقائياً لخصم 1 يوم من الرصيد السنوي.' : 'Rule: Every 240 accumulated minutes (4 hours) automatically converts to 1 day deducted from your Vacation balance.'}
                  </p>
                </div>
              )}

              {!isPerHour && type === AbsenceType.SICK_LEAVE && (
                <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                  <label className="block text-xs font-bold text-purple-300 uppercase tracking-wider">
                    {isRtl ? 'رفع التقرير الطبي / الشهادة (مستحسن)' : 'Upload Doctor Verification Note / Certificate (Recommended)'}
                  </label>
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={(e) => setFile(e.target.files?.[0])}
                    className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-500 cursor-pointer"
                  />
                  <p className="text-[11px] text-purple-300/80">
                    {isRtl ? 'الصيغ المتاحة: PDF, JPG, PNG. يمكن لـ HR معاينة وتنزيل التقرير مباشرة.' : 'Accepted formats: PDF, JPG, PNG. HR can inspect or download the document directly.'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex justify-between">
                  <span>{isRtl ? 'السبب / التفاصيل' : 'Reason / Details'}</span>
                  {isPerHour && <span className="text-teal-400 font-bold">{isRtl ? '* إجباري' : '* Mandatory'}</span>}
                </label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder={
                    isPerHour 
                      ? (isRtl ? 'يرجى كتابة سبب طلب العطلة...' : 'Please explain why you cannot make it / requested off...')
                      : type === AbsenceType.EARLY_LEAVE
                      ? (isRtl ? 'يرجى كتابة سبب المغادرة المبكرة اليوم...' : 'Please provide the reason for leaving early today...')
                      : (isRtl ? 'اكتب تفاصيل أو سبب طلب الإجازة...' : 'Provide details regarding your leave request...')
                  }
                  required={isPerHour || type === AbsenceType.EARLY_LEAVE || type === AbsenceType.VACATION}
                  className="input-field resize-none"
                  dir="auto"
                />
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/10 text-slate-300 hover:bg-white/20 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="gradient-btn px-6 py-2.5 rounded-xl font-semibold text-sm flex items-center gap-2"
                >
                  {submitting && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {isRtl ? 'تقديم الطلب' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
