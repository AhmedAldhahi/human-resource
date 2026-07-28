import { getAssetUrl, getSocketUrl } from '../api/client';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { usersApi } from '../api/client';
import { Role, EmployeeType, UserResponseDto } from '@hrms/shared';
import { useLanguage } from '../context/LanguageContext';

interface EmployeeWageModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  onSuccess: () => void;
}

export default function EmployeeWageModal({
  isOpen,
  onClose,
  employeeId,
  onSuccess,
}: EmployeeWageModalProps) {
  const { t, isRtl } = useLanguage();
  const [user, setUser] = useState<UserResponseDto | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [saveLoading, setSaveLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Form fields
  const [employeeType, setEmployeeType] = useState<EmployeeType>(EmployeeType.FIXED);
  const [monthlySalary, setMonthlySalary] = useState<number | string>(0);
  const [transportationAllowance, setTransportationAllowance] = useState<number | string>(0);
  const [recurringBonus, setRecurringBonus] = useState<number | string>(0);
  const [defaultSimulatedHours, setDefaultSimulatedHours] = useState<number | string>(208);
  const [maxDailyHours, setMaxDailyHours] = useState<number | string>(12);
  const [hourlyWage, setHourlyWage] = useState<number | string>(0);
  const [role, setRole] = useState<Role>(Role.EMPLOYEE);
  const [department, setDepartment] = useState<string>('');
  const [tsUsername, setTsUsername] = useState<string>('');

  // Photo & Absence states
  const [photoFile, setPhotoFile] = useState<File | undefined>();
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);
  const [resettingAbsence, setResettingAbsence] = useState<boolean>(false);

  const fetchUserData = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError('');
    try {
      const data = await usersApi.getById(employeeId);
      setUser(data);
      setEmployeeType(data.employeeType ?? EmployeeType.FIXED);
      setMonthlySalary(data.monthlySalary ?? 0);
      setTransportationAllowance(data.transportationAllowance ?? 0);
      setRecurringBonus(data.recurringBonus ?? 0);
      setDefaultSimulatedHours(data.defaultSimulatedHours ?? 208);
      setMaxDailyHours(data.maxDailyHours ?? 12);
      setHourlyWage(data.hourlyWage ?? 0);
      setRole(data.role);
      setDepartment(data.department || '');
      setTsUsername(data.tsUsername || '');
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل تحميل بيانات الموظف.' : 'Failed to load employee details.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && employeeId) {
      setSuccessMsg('');
      setError('');
      setPhotoFile(undefined);
      fetchUserData();
    }
  }, [isOpen, employeeId]);

  if (!isOpen) return null;

  const handleSaveWage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) return;
    setSaveLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      if (Number(hourlyWage) < 0 || Number(monthlySalary) < 0) {
        setError(isRtl ? 'معدلات الراتب والأجر لا يمكن أن تكون بالسالب.' : 'Salary and wage rates cannot be negative.');
        setSaveLoading(false);
        return;
      }

      await Promise.all([
        usersApi.updateWage(employeeId, {
          hourlyWage: Number(hourlyWage),
          transportationAllowance: Number(transportationAllowance),
          recurringBonus: Number(recurringBonus),
          defaultSimulatedHours: Number(defaultSimulatedHours),
          maxDailyHours: Number(maxDailyHours),
          role,
          department,
        }),
        usersApi.updateEmployeeType(employeeId, {
          employeeType,
          monthlySalary: Number(monthlySalary),
          hourlyWage: Number(hourlyWage),
          transportationAllowance: Number(transportationAllowance),
          recurringBonus: Number(recurringBonus),
          defaultSimulatedHours: Number(defaultSimulatedHours),
          maxDailyHours: Number(maxDailyHours),
        }),
        usersApi.updateProfile(employeeId, { tsUsername }),
      ]);

      setSuccessMsg(isRtl ? 'تم تحديث هيكل الأجر والراتب والبيانات بنجاح.' : 'Employee type, salary/wage rate, and designation updated successfully.');
      onSuccess();
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل تحديث أجر وموديل الموظف.' : 'Failed to update employee wage/type.'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!employeeId || !photoFile) return;
    setUploadingPhoto(true);
    setError('');
    try {
      await usersApi.uploadPhoto(employeeId, photoFile);
      setSuccessMsg(isRtl ? 'تم رفع الصورة الشخصية بنجاح.' : 'Profile photo uploaded successfully.');
      setPhotoFile(undefined);
      await fetchUserData();
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل رفع الصورة.' : 'Failed to upload photo.'));
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleResetAbsence = async () => {
    if (!employeeId) return;
    if (!window.confirm(isRtl ? 'هل أنت تأكد من رغبتك في إعادة ضبط أرصدة إجازات هذا الموظف إلى 14 يوم مرضية + 14 يوم سنوية؟' : 'Are you sure you want to reset this employee\'s annual absence balances back to 14 Sick + 14 Vacation days?')) {
      return;
    }
    setResettingAbsence(true);
    setError('');
    try {
      await usersApi.resetAbsenceBalance(employeeId);
      setSuccessMsg(isRtl ? 'تمت إعادة ضبط أرصدة الإجازات إلى 14 مرضية + 14 سنوية.' : 'Absence balances reset to 14 Sick + 14 Vacation days.');
      await fetchUserData();
      onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل تصفير رصيد الإجازات.' : 'Failed to reset absence balance.'));
    } finally {
      setResettingAbsence(false);
    }
  };

  // Projected calculations (208 hours standard = 26 days * 8h)
  const hourlyWageNum = Number(hourlyWage) || 0;
  const monthlySalaryNum = Number(monthlySalary) || 0;
  const projectedMonthlyFromHourly = hourlyWageNum * 208;
  const projectedAnnualFromMonthly = monthlySalaryNum * 12;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="glass-card border border-white/10 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl rounded-2xl bg-slate-900">
        {/* Header */}
        <div className="p-6 sm:p-7 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-emerald-500/15 via-teal-500/15 to-transparent">
          <div className="flex items-center gap-4">
            <div className="relative">
              {user?.photoUrl ? (
                <img
                  src={getAssetUrl(user.photoUrl)}
                  alt={user.name}
                  loading="lazy"
                  decoding="async"
                  className="w-14 h-14 rounded-2xl object-cover border-2 border-emerald-500 shadow-lg"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-xl font-extrabold text-white shadow-lg shadow-emerald-500/30">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'E'}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-2xl font-bold text-white">{user?.name || (isRtl ? 'تعديل ملف الموظف والأجر' : 'Adjust Profile & Compensation')}</h2>
                {user?.role && (
                  <span className="badge bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs px-2.5 py-0.5 rounded-full font-bold">
                    {user.role}
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm mt-0.5" dir="ltr">{user?.email}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            ✕
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          </div>
        ) : (
          <form onSubmit={handleSaveWage} className="p-6 sm:p-8 space-y-6 overflow-y-auto">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400 flex items-center justify-between">
                <span>{error}</span>
                <button type="button" onClick={() => setError('')} className="text-red-400 font-bold">✕</button>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-400 flex items-center justify-between animate-fadeIn">
                <span>✓ {successMsg}</span>
                <button type="button" onClick={() => setSuccessMsg('')} className="text-emerald-400 font-bold">✕</button>
              </div>
            )}

            {/* Photo & Absence Quick Control Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 space-y-2">
                <label className="text-xs font-bold text-slate-300 block">{isRtl ? 'تحديث الصورة الشخصية' : 'Update Profile Photo'}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png"
                    onChange={(e) => setPhotoFile(e.target.files?.[0])}
                    className="block w-full text-xs text-slate-400 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-600 file:text-white cursor-pointer"
                  />
                  {photoFile && (
                    <button
                      type="button"
                      onClick={handleUploadPhoto}
                      disabled={uploadingPhoto}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-500 shrink-0"
                    >
                      {uploadingPhoto ? '...' : (isRtl ? 'رفع' : 'Upload')}
                    </button>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold text-slate-300 block">{isRtl ? 'أرصدة الإجازات (سنوياً)' : 'Absence Balances (Annual)'}</span>
                  <div className="text-xs font-extrabold text-indigo-300 mt-0.5 space-x-2">
                    <span>{isRtl ? `مرضية: ${user?.sickDaysLeft ?? 14}/14` : `Sick: ${user?.sickDaysLeft ?? 14}/14`}</span>
                    <span>|</span>
                    <span>{isRtl ? `سنوية: ${user?.vacationDaysLeft ?? 14}/14` : `Vac: ${user?.vacationDaysLeft ?? 14}/14`}</span>
                  </div>
                  <div className="text-[11px] text-amber-400 mt-0.5">
                    {isRtl ? `متتبع المغادرات: ${user?.earlyLeaveMinutesAccumulated ?? 0} د / 240 د` : `Early Dep Counter: ${user?.earlyLeaveMinutesAccumulated ?? 0}m / 240m`}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleResetAbsence}
                  disabled={resettingAbsence}
                  className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 transition-all shrink-0"
                >
                  {resettingAbsence ? (isRtl ? 'جاري التصفير...' : 'Resetting...') : (isRtl ? '🔄 تصفير 14+14' : '🔄 Reset 14+14')}
                </button>
              </div>
            </div>

            {/* Employee Type Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                {isRtl ? 'نظام الهيكل المالي والأجر' : 'Compensation Model (Employee Type)'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setEmployeeType(EmployeeType.FIXED)}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    employeeType === EmployeeType.FIXED
                      ? 'bg-indigo-600/30 border-indigo-500 text-white ring-2 ring-indigo-500/40 shadow-lg'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className="font-bold text-sm">{isRtl ? '👔 راتب ثابت' : '👔 Fixed Income'}</span>
                  <span className="text-[11px] text-slate-400">{isRtl ? 'راتب شهري محدد' : 'Monthly salaried rate'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setEmployeeType(EmployeeType.PER_HOUR)}
                  className={`p-3.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    employeeType === EmployeeType.PER_HOUR
                      ? 'bg-indigo-600/30 border-indigo-500 text-white ring-2 ring-indigo-500/40 shadow-lg'
                      : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                  }`}
                >
                  <span className="font-bold text-sm">{isRtl ? '⏱️ أجر بالساعة' : '⏱️ Per-Hour Wage'}</span>
                  <span className="text-[11px] text-slate-400">{isRtl ? 'أجر حسب ساعات العمل' : 'Hourly tracked rate'}</span>
                </button>
              </div>
            </div>

            {/* Wage/Salary Input Box */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/30 to-slate-900 border border-emerald-500/30 space-y-4">
              {employeeType === EmployeeType.FIXED ? (
                <div>
                  <label className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block mb-1.5">
                    {isRtl ? 'الراتب الشهري الرسمي (دينار / شهر)' : 'Official Monthly Salary (JOD / month)'}
                  </label>
                  <div className="relative">
                    <span className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm`}>JOD</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={monthlySalary}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setMonthlySalary(val === '' ? '' : Number(val));
                      }}
                      onBlur={() => {
                        if (monthlySalary === '' || Number(monthlySalary) < 0) {
                          setMonthlySalary(0);
                        }
                      }}
                      className={`input-field ${isRtl ? 'pr-12 pl-16' : 'pl-12 pr-16'} py-3 text-2xl font-black text-white bg-slate-900/90 border-emerald-500/40 focus:border-emerald-400`}
                      placeholder="0.00"
                      dir="ltr"
                    />
                    <span className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm`}>{isRtl ? '/ شهر' : '/ mo'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-500/20 text-xs mt-3">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                      <span className="text-slate-400 block font-medium">{isRtl ? 'المكافئ بالساعة (208س)' : 'Equiv. Hourly (208h)'}</span>
                      <span className="text-base font-extrabold text-emerald-300 mt-0.5 block" dir="ltr">
                        {(monthlySalaryNum / 208).toFixed(2)} {isRtl ? 'دينار / ساعة' : 'JOD / hr'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                      <span className="text-slate-400 block font-medium">{isRtl ? 'الراتب السنوي الإجمالي' : 'Annualized Salary'}</span>
                      <span className="text-base font-extrabold text-white mt-0.5 block" dir="ltr">
                        {projectedAnnualFromMonthly.toFixed(2)} {isRtl ? 'دينار' : 'JOD'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-emerald-500/20">
                    <label className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block mb-1.5">
                      {isRtl ? 'بدل التنقلات الشهري (دينار / شهر)' : 'Transportation Allowance (JOD / month)'}
                    </label>
                    <div className="relative">
                      <span className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm`}>JOD</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        value={transportationAllowance}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTransportationAllowance(val === '' ? '' : Number(val));
                        }}
                        onBlur={() => {
                          if (transportationAllowance === '' || Number(transportationAllowance) < 0) {
                            setTransportationAllowance(0);
                          }
                        }}
                        className={`input-field ${isRtl ? 'pr-12 pl-16' : 'pl-12 pr-16'} py-3 text-xl font-bold text-white bg-slate-900/90 border-emerald-500/40 focus:border-emerald-400`}
                        placeholder="0.00"
                        dir="ltr"
                      />
                      <span className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm`}>{isRtl ? '/ شهر' : '/ mo'}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider block mb-1.5">
                    {isRtl ? 'الأجر الرسمي بالساعة (دينار / ساعة)' : 'Official Hourly Wage (JOD / hr)'}
                  </label>
                  <div className="relative">
                    <span className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-emerald-400 font-bold text-sm`}>JOD</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={hourlyWage}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        const val = e.target.value;
                        setHourlyWage(val === '' ? '' : Number(val));
                      }}
                      onBlur={() => {
                        if (hourlyWage === '' || Number(hourlyWage) < 0) {
                          setHourlyWage(0);
                        }
                      }}
                      className={`input-field ${isRtl ? 'pr-12 pl-14' : 'pl-12 pr-14'} py-3 text-2xl font-black text-white bg-slate-900/90 border-emerald-500/40 focus:border-emerald-400`}
                      placeholder="0.00"
                      dir="ltr"
                    />
                    <span className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm`}>{isRtl ? '/ ساعة' : '/ hr'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-3 border-t border-emerald-500/20 text-xs mt-3">
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                      <span className="text-slate-400 block font-medium">{isRtl ? 'الشهري المتوقع (208س)' : 'Projected Monthly (208h)'}</span>
                      <span className="text-base font-extrabold text-emerald-300 mt-0.5 block" dir="ltr">
                        {projectedMonthlyFromHourly.toFixed(2)} {isRtl ? 'دينار' : 'JOD'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-900/60 border border-white/5">
                      <span className="text-slate-400 block font-medium">{isRtl ? 'السنوي المتوقع (2,496س)' : 'Projected Annual (2,496h)'}</span>
                      <span className="text-base font-extrabold text-white mt-0.5 block" dir="ltr">
                        {(projectedMonthlyFromHourly * 12).toFixed(2)} {isRtl ? 'دينار' : 'JOD'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-indigo-500/20">
                <label className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider block mb-1.5">
                  {isRtl ? 'المكافأة الشهرية الثابتة (دينار / شهر)' : 'Permanent Recurring Bonus (JOD / month)'}
                </label>
                <div className="relative">
                  <span className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-sm`}>JOD</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={recurringBonus}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRecurringBonus(val === '' ? '' : Number(val));
                    }}
                    onBlur={() => {
                      if (recurringBonus === '' || Number(recurringBonus) < 0) {
                        setRecurringBonus(0);
                      }
                    }}
                    className={`input-field ${isRtl ? 'pr-12 pl-16' : 'pl-12 pr-16'} py-3 text-xl font-bold text-white bg-slate-900/90 border-indigo-500/40 focus:border-indigo-400`}
                    placeholder="0.00"
                    dir="ltr"
                  />
                  <span className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm`}>{isRtl ? '/ شهر' : '/ mo'}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{isRtl ? 'تضاف هذه المكافأة تلقائياً لصافي الراتب النهائي المحسوب كل شهر.' : 'This bonus will be added automatically to the final calculated wage every month.'}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-indigo-500/20">
                <label className="text-xs font-extrabold text-indigo-300 uppercase tracking-wider block mb-1.5">
                  {isRtl ? 'الساعات الافتراضية لمحاكي الراتب الشهري (ساعة / شهر)' : 'Default Monthly Simulator Hours (hrs / month)'}
                </label>
                <div className="relative">
                  <span className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-indigo-400 font-bold text-sm`}>⏱️</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max="400"
                    value={defaultSimulatedHours}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDefaultSimulatedHours(val === '' ? '' : Number(val));
                    }}
                    onBlur={() => {
                      if (defaultSimulatedHours === '' || Number(defaultSimulatedHours) <= 0) {
                        setDefaultSimulatedHours(208);
                      }
                    }}
                    className={`input-field ${isRtl ? 'pr-12 pl-16' : 'pl-12 pr-16'} py-3 text-xl font-bold text-white bg-slate-900/90 border-indigo-500/40 focus:border-indigo-400`}
                    placeholder="208"
                    dir="ltr"
                  />
                  <span className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm`}>{isRtl ? 'ساعة / شهر' : 'hrs / mo'}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{isRtl ? 'الساعات الشهرية التي تظهر كقيمة افتراضية في محاكي الراتب لهذا الموظف.' : 'Default monthly hours initialized in this employee\'s Pay Simulator.'}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-indigo-500/20">
                <label className="text-xs font-extrabold text-amber-300 uppercase tracking-wider block mb-1.5">
                  {isRtl ? 'الحد الأقصى لساعات الدوام اليومي قبل الاستثناء (ساعة / يوم)' : 'Daily Work Hours Limit Before Overtime Exception (hrs / day)'}
                </label>
                <div className="relative">
                  <span className={`absolute ${isRtl ? 'right-4' : 'left-4'} top-1/2 -translate-y-1/2 text-amber-400 font-bold text-sm`}>⏳</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max="24"
                    value={maxDailyHours}
                    onFocus={(e) => e.target.select()}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMaxDailyHours(val === '' ? '' : Number(val));
                    }}
                    onBlur={() => {
                      if (maxDailyHours === '' || Number(maxDailyHours) <= 0) {
                        setMaxDailyHours(12);
                      }
                    }}
                    className={`input-field ${isRtl ? 'pr-12 pl-16' : 'pl-12 pr-16'} py-3 text-xl font-bold text-white bg-slate-900/90 border-amber-500/40 focus:border-amber-400`}
                    placeholder="12"
                    dir="ltr"
                  />
                  <span className={`absolute ${isRtl ? 'left-4' : 'right-4'} top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm`}>{isRtl ? 'ساعة / يوم' : 'hrs / day'}</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-1">{isRtl ? 'إذا تجاوز الموظف هذا العدد من الساعات في اليوم (مثال: 8 ساعات)، سيُطلب منه إدخال اسم المدير المرخص وسيتم إرسال طلب استثناء لـ HR.' : 'If the employee exceeds this daily limit (e.g., 8 hrs), the authorization window will pop up upon clock out and create an HR exception request.'}</p>
              </div>
            </div>

            {/* Role & Department */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">{isRtl ? 'الصلاحيات ودور الموظف' : 'User Role & Access'}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="input-field py-2.5 text-sm bg-slate-900 border-white/10 font-bold text-indigo-300"
                >
                  <option value={Role.EMPLOYEE}>{isRtl ? 'EMPLOYEE (موظف قياسي)' : 'EMPLOYEE (Standard)'}</option>
                  <option value={Role.HR}>{isRtl ? 'HR (مدير موارد بشرية)' : 'HR (Human Resources Manager)'}</option>
                  <option value={Role.ADMIN}>{isRtl ? 'ADMIN (مدير عام للنظام)' : 'ADMIN (Super Administrator)'}</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">{isRtl ? 'القسم / الفريق' : 'Department / Team'}</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder={isRtl ? 'مثال: التطوير، المبيعات، HR' : 'e.g. Engineering, Sales, HR'}
                  className="input-field py-2.5 text-sm bg-slate-900 border-white/10 font-medium w-full"
                  dir="auto"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-bold text-slate-300 block mb-1.5">{isRtl ? 'اسم مستخدم الويندوز (المتتبع)' : 'Windows Username (Tracker)'}</label>
                <input
                  type="text"
                  value={tsUsername}
                  onChange={(e) => setTsUsername(e.target.value)}
                  placeholder="e.g. jdoe, Administrator"
                  className="input-field py-2.5 text-sm bg-slate-900 border-white/10 font-medium w-full"
                  dir="ltr"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={saveLoading}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-white/10 hover:bg-white/20 text-slate-300 transition-all"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={saveLoading}
                className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2"
              >
                {saveLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {isRtl ? 'حفظ الأجر والملف الشخصي' : 'Save Compensation & Profile'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
