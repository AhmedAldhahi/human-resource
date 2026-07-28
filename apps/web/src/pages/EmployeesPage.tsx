import { getAssetUrl, getSocketUrl } from '../api/client';
import React, { useEffect, useState } from 'react';
import type { UserResponseDto, OnlineStatusRecordDto } from '@hrms/shared';
import { Role, EmployeeType, PresenceStatus } from '@hrms/shared';
import { usersApi, presenceApi, attendanceApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';
import IssueCardModal from '../components/IssueCardModal';
import EmployeeHoursModal from '../components/EmployeeHoursModal';
import EmployeeWageModal from '../components/EmployeeWageModal';
import type { AttendanceResponseDto } from '@hrms/shared';

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

export default function EmployeesPage() {
  const { t, isRtl } = useLanguage();
  const [employees, setEmployees] = useState<UserResponseDto[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, OnlineStatusRecordDto>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'EMPLOYEES' | 'EXCEPTIONS'>('EMPLOYEES');
  const [exceptions, setExceptions] = useState<AttendanceResponseDto[]>([]);

  const [showInactive, setShowInactive] = useState(false);

  // Issue card modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Hours & history modal
  const [hoursModalOpen, setHoursModalOpen] = useState(false);
  const [selectedEmpForHours, setSelectedEmpForHours] = useState<{
    id: string;
    name: string;
    role: Role;
  } | null>(null);

  // Wage & profile modal
  const [wageModalOpen, setWageModalOpen] = useState(false);
  const [selectedEmpForWage, setSelectedEmpForWage] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const fetchEmployees = async () => {
    try {
      const [data, liveData] = await Promise.all([
        usersApi.getAll(showInactive),
        presenceApi.getLive(),
      ]);
      setEmployees(data);
      const map: Record<string, OnlineStatusRecordDto> = {};
      liveData.forEach((r) => {
        map[r.userId] = r;
      });
      setPresenceMap(map);

      const pendingExceptions = await attendanceApi.getPendingExceptions();
      setExceptions(pendingExceptions);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [showInactive]);

  const handleToggleStatus = async (emp: UserResponseDto) => {
    const confirmMsg = isRtl
      ? `هل أنت تأكد من ${emp.isActive ? 'تعطيل' : 'إعادة تفعيل'} حساب الموظف ${emp.name}؟`
      : `Are you sure you want to ${emp.isActive ? 'deactivate' : 'reactivate'} ${emp.name}?`;
    if (confirm(confirmMsg)) {
      try {
        await usersApi.updateStatus(emp.id, !emp.isActive);
        fetchEmployees();
      } catch (e) {
        alert(isRtl ? 'فشل تحديث حالة الموظف' : 'Failed to update status');
      }
    }
  };

  const filtered = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      e.role.toLowerCase().includes(search.toLowerCase()) ||
      (e.department && e.department.toLowerCase().includes(search.toLowerCase()))
  );

  const handleIssueCard = (emp: UserResponseDto) => {
    setSelectedEmp({ id: emp.id, name: emp.name });
    setModalOpen(true);
  };

  const handleViewHours = (emp: UserResponseDto) => {
    setSelectedEmpForHours({ id: emp.id, name: emp.name, role: emp.role });
    setHoursModalOpen(true);
  };

  const handleWageProfile = (emp: UserResponseDto) => {
    setSelectedEmpForWage({ id: emp.id, name: emp.name });
    setWageModalOpen(true);
  };

  const handleResolveException = async (id: string, status: 'ACCEPTED' | 'REJECTED') => {
    try {
      await attendanceApi.resolveException(id, status);
      fetchEmployees();
    } catch {
      alert(isRtl ? 'فشل معالجة الاستثناء.' : 'Failed to resolve exception.');
    }
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('emp_title')}</h1>
          <p className="text-slate-400 mt-1">
            {isRtl
              ? `إدارة فريق العمل (الإجمالي ${employees.length}) وهيكل المستحقات`
              : `Manage your workforce (${employees.length} total) & compensation structures`}
          </p>
        </div>

        {/* Actions & Search */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex bg-slate-900/60 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('EMPLOYEES')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === 'EMPLOYEES'
                  ? 'bg-indigo-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isRtl ? 'دليل الموظفين' : 'Directory'}
            </button>
            <button
              onClick={() => setActiveTab('EXCEPTIONS')}
              className={`px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === 'EXCEPTIONS'
                  ? 'bg-red-500 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {isRtl ? 'الاستثناءات' : 'Exceptions'}
              {exceptions.length > 0 && (
                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                  {exceptions.length}
                </span>
              )}
            </button>
          </div>
          
          {activeTab === 'EMPLOYEES' && (
            <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500"
              />
              {isRtl ? 'إظهار الحسابات المعطلة' : 'Show Inactive'}
            </label>
          )}

          <div className="relative w-full sm:w-80">
            <svg
              className={`absolute ${isRtl ? 'right-3.5' : 'left-3.5'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={activeTab === 'EMPLOYEES' ? t('emp_search_placeholder') : (isRtl ? 'بحث في الاستثناءات...' : 'Search exceptions...')}
              className={`input-field ${isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'}`}
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-400">
            {search ? (isRtl ? 'لم يتم العثور على نتائج' : 'No matches found.') : (activeTab === 'EMPLOYEES' ? (isRtl ? 'لا يوجد موظفون' : 'No employees found.') : (isRtl ? 'لا توجد استثناءات معلقة!' : 'No pending exceptions!'))}
          </p>
        </div>
      ) : activeTab === 'EMPLOYEES' ? (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm`}>
              <thead>
                <tr className="border-b border-white/10 bg-slate-900/60">
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'الاسم والقسم' : 'Name & Dept'}
                  </th>
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('emp_total_hours')}
                  </th>
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'نوع الهيكل المالي والأجر' : 'Comp. Type & Rate'}
                  </th>
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                    {isRtl ? 'رصيد الإجازات المتبقي' : 'Absence Left'}
                  </th>
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>
                    {t('dash_card_points')}
                  </th>
                  <th className={`px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-left' : 'text-right'}`}>
                    {isRtl ? 'الإجراءات' : 'Actions'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((emp) => {
                  const mins = emp.totalMinutesWorked ?? 0;
                  const hrs = Math.floor(mins / 60);
                  const remMins = mins % 60;
                  const formattedHours = hrs === 0 && remMins === 0 
                    ? (isRtl ? '0 س 0 د' : '0h 0m') 
                    : remMins === 0 
                    ? (isRtl ? `${hrs} س` : `${hrs}h`) 
                    : (isRtl ? `${hrs} س ${remMins} د` : `${hrs}h ${remMins}m`);

                  return (
                  <tr
                    key={emp.id}
                    className="hover:bg-white/5 transition-colors duration-150"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {emp.photoUrl ? (
                            <img
                              src={getAssetUrl(emp.photoUrl)}
                              alt={emp.name}
                              loading="lazy"
                              decoding="async"
                              className="w-10 h-10 rounded-xl object-cover border border-emerald-500/40 shadow-md"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                              {emp.name.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[#0f172a] ${
                              presenceMap[emp.id]?.isOnline
                                ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]'
                                : presenceMap[emp.id]?.status === PresenceStatus.ON_LEAVE
                                ? 'bg-amber-400'
                                : 'bg-slate-500'
                            }`}
                          />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium block">
                              {emp.name}
                              {!emp.isActive && <span className="ml-2 text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">{isRtl ? 'معطل' : 'Deactivated'}</span>}
                            </span>
                            <span
                              className={`text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                                presenceMap[emp.id]?.isOnline
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : presenceMap[emp.id]?.status === PresenceStatus.ON_LEAVE
                                  ? 'bg-amber-500/20 text-amber-400'
                                  : 'bg-slate-800 text-slate-500'
                              }`}
                            >
                              {presenceMap[emp.id]?.isOnline ? (isRtl ? '🟢 متصل' : '🟢 Online') : presenceMap[emp.id]?.status === PresenceStatus.ON_LEAVE ? (isRtl ? '🏖️ في إجازة' : '🏖️ Leave') : (isRtl ? '⚫ غير متصل' : '⚫ Offline')}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-medium">{emp.department || (isRtl ? 'عام' : 'Unassigned')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 shadow-sm" dir="ltr">
                        <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formattedHours}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col gap-1 items-start">
                        <span className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold ${
                          emp.employeeType === EmployeeType.FIXED
                            ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                        }`}>
                          {emp.employeeType === EmployeeType.FIXED ? (isRtl ? '👔 راتب ثابت' : '👔 Fixed Income') : (isRtl ? '⏱️ بالساعة' : '⏱️ Per-Hour')}
                        </span>
                        <span className="font-extrabold text-emerald-400 text-xs tracking-tight" dir="ltr">
                          {emp.employeeType === EmployeeType.FIXED
                            ? `${emp.monthlySalary ?? 0} ${isRtl ? 'دينار / شهر' : 'JOD / mo'}`
                            : `${(emp.hourlyWage ?? 0).toFixed(2)} ${isRtl ? 'دينار / ساعة' : 'JOD / hr'}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {emp.employeeType === EmployeeType.PER_HOUR ? (
                        <span className="font-extrabold px-2.5 py-1 rounded-lg text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm">
                          {isRtl ? 'أيام عطل مرنة' : 'Flexible Off Days'}
                        </span>
                      ) : (
                        <div className="flex flex-col gap-1 text-xs font-bold">
                          <span className="px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            🩺 {isRtl ? 'مرضية:' : 'Sick:'} {emp.sickDaysLeft ?? 14} / 14
                          </span>
                          <span className="px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                            🌴 {isRtl ? 'سنوية:' : 'Vac:'} {emp.vacationDaysLeft ?? 14} / 14
                          </span>
                          {(emp.earlyLeaveMinutesAccumulated ?? 0) > 0 && (
                            <span className="text-[10px] text-amber-400 font-semibold">
                              ⏳ {isRtl ? 'مغادرة:' : 'Early:'} {emp.earlyLeaveMinutesAccumulated}{isRtl ? 'د / 240د' : 'm / 240m'}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`font-extrabold text-sm ${
                          emp.netCardPoints > 0
                            ? 'text-emerald-400'
                            : emp.netCardPoints < 0
                            ? 'text-red-400'
                            : 'text-slate-400'
                        }`}
                        dir="ltr"
                      >
                        {emp.netCardPoints > 0 ? '+' : ''}
                        {emp.netCardPoints}
                      </span>
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap ${isRtl ? 'text-left' : 'text-right'}`}>
                      <div className={`flex items-center gap-2 ${isRtl ? 'justify-start' : 'justify-end'}`}>
                        <button
                          onClick={() => handleWageProfile(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 transition-all duration-200 shadow-sm"
                          title={isRtl ? 'تعديل الهيكل المالي والمسمى الوظيفي' : 'Adjust Wage, Designation & Type'}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {isRtl ? 'الملف والأجر ($)' : 'Profile & Rate ($)'}
                        </button>
                        <button
                          onClick={() => handleViewHours(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all duration-200 shadow-sm"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {isRtl ? 'ساعات العمل' : 'Hours'}
                        </button>
                        <button
                          onClick={() => handleIssueCard(emp)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 transition-all duration-200 shadow-sm"
                        >
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                            />
                          </svg>
                          {t('emp_issue_card')}
                        </button>
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 shadow-sm border ${
                            emp.isActive
                              ? 'text-red-400 bg-red-500/10 border-red-500/20 hover:bg-red-500/20'
                              : 'text-slate-300 bg-slate-500/10 border-slate-500/30 hover:bg-slate-500/20'
                          }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            {emp.isActive ? (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                            ) : (
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            )}
                          </svg>
                          {isRtl ? (emp.isActive ? 'تعطيل' : 'تفعيل') : (emp.isActive ? 'Deactivate' : 'Reactivate')}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-lg font-bold text-red-400">
            {isRtl ? 'استثناءات تجاوز الدوام (>12 ساعة) المعلقة' : 'Pending >12h Overtime Exceptions'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exceptions.map(ex => {
              const emp = employees.find(e => e.id === ex.employeeId);
              return (
                <div key={ex.id} className="bg-slate-900/60 border border-red-500/30 rounded-xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">{emp?.name || (isRtl ? 'موظف غير معروف' : 'Unknown Employee')}</span>
                    <span className="text-xs text-slate-400" dir="ltr">{new Date(ex.clockInTime).toLocaleDateString()}</span>
                  </div>
                  <div className="text-sm text-slate-300">
                    <p><strong className="text-slate-400">{isRtl ? 'تم الترخيص بواسطة:' : 'Authorized By:'}</strong> {ex.authorizationName}</p>
                    <p><strong className="text-slate-400">{isRtl ? 'المهمة:' : 'Task:'}</strong> {ex.intendedTask}</p>
                  </div>
                  <div className="flex gap-2 mt-4 pt-4 border-t border-white/5">
                    <button
                      onClick={() => handleResolveException(ex.id, 'ACCEPTED')}
                      className="flex-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 py-2 rounded-lg text-xs font-bold transition"
                    >
                      {isRtl ? 'قبول' : 'Accept'}
                    </button>
                    <button
                      onClick={() => {
                        if (emp) handleViewHours(emp);
                      }}
                      className="flex-1 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 py-2 rounded-lg text-xs font-bold transition"
                    >
                      {isRtl ? 'تعديل الساعات' : 'Edit Hours'}
                    </button>
                    <button
                      onClick={() => handleResolveException(ex.id, 'REJECTED')}
                      className="flex-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 py-2 rounded-lg text-xs font-bold transition"
                    >
                      {isRtl ? 'رفض' : 'Reject'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Issue Card Modal */}
      <IssueCardModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedEmp(null);
        }}
        employeeId={selectedEmp?.id}
        employeeName={selectedEmp?.name}
        onSuccess={fetchEmployees}
      />

      {/* Employee Hours & History Modal */}
      <EmployeeHoursModal
        isOpen={hoursModalOpen}
        onClose={() => {
          setHoursModalOpen(false);
          setSelectedEmpForHours(null);
        }}
        employeeId={selectedEmpForHours?.id}
        employeeName={selectedEmpForHours?.name}
        employeeRole={selectedEmpForHours?.role}
      />

      {/* Employee Wage & Profile Modal */}
      <EmployeeWageModal
        isOpen={wageModalOpen}
        onClose={() => {
          setWageModalOpen(false);
          setSelectedEmpForWage(null);
        }}
        employeeId={selectedEmpForWage?.id}
        onSuccess={fetchEmployees}
      />
    </div>
  );
}
