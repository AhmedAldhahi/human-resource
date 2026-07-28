import React, { useState, useEffect } from 'react';
import { salaryAdvanceApi, usersApi } from '../api/client';
import {
  SalaryAdvanceDto,
  UserResponseDto,
  AdvanceStatus,
} from '@hrms/shared';
import { useLanguage } from '../context/LanguageContext';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function SalaryAdvancesModal({ isOpen, onClose, onSuccess }: Props) {
  const { isRtl } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [advances, setAdvances] = useState<SalaryAdvanceDto[]>([]);
  const [employees, setEmployees] = useState<UserResponseDto[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'>('ACTIVE');

  // New Advance Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [totalAmount, setTotalAmount] = useState<number | string>('');
  const [monthlyInstallment, setMonthlyInstallment] = useState<number | string>('');
  const [startMonth, setStartMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [notes, setNotes] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [advData, empData] = await Promise.all([
        salaryAdvanceApi.getAll(),
        usersApi.getAll(),
      ]);
      setAdvances(advData);
      setEmployees(empData.filter((e) => e.isActive));
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل تحميل بيانات السُلف' : 'Failed to load advances'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCreateAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setError(isRtl ? 'يرجى اختيار الموظف' : 'Please select an employee');
      return;
    }
    if (!totalAmount || Number(totalAmount) <= 0) {
      setError(isRtl ? 'يرجى أدخال مبلغ سلفة صحيح' : 'Please enter a valid total amount');
      return;
    }
    if (!monthlyInstallment || Number(monthlyInstallment) <= 0) {
      setError(isRtl ? 'يرجى أدخال القسط الشهرى المخصوم' : 'Please enter a valid monthly installment');
      return;
    }

    setSaveLoading(true);
    setError('');
    setSuccessMsg('');
    try {
      await salaryAdvanceApi.create({
        userId: selectedUserId,
        totalAmount: Number(totalAmount),
        monthlyInstallment: Number(monthlyInstallment),
        startMonth,
        notes,
      });

      setSuccessMsg(isRtl ? 'تم إضافة سلفة الراتب بنجاح.' : 'Salary advance created successfully.');
      setIsFormOpen(false);
      setSelectedUserId('');
      setTotalAmount('');
      setMonthlyInstallment('');
      setNotes('');
      await fetchData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل إضافة السلفة' : 'Failed to create advance'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleCancelAdvance = async (id: string) => {
    if (!window.confirm(isRtl ? 'هل أنت تأكد من إلغاء سلفة الراتب هذه؟' : 'Are you sure you want to cancel this salary advance?')) return;
    setSaveLoading(true);
    setError('');
    try {
      await salaryAdvanceApi.cancel(id);
      setSuccessMsg(isRtl ? 'تم إلغاء سلفة الراتب.' : 'Salary advance cancelled.');
      await fetchData();
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل إلغاء السلفة' : 'Failed to cancel advance'));
    } finally {
      setSaveLoading(false);
    }
  };

  const filteredAdvances = advances.filter((a) => {
    if (statusFilter === 'ALL') return true;
    return a.status === statusFilter;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="glass-card border border-white/10 max-w-4xl w-full p-6 space-y-6 shadow-2xl rounded-2xl bg-slate-900 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xl text-indigo-400">
              💳
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">
                {isRtl ? 'إدارة سُلف الراتب والقروض المباشرة' : 'Salary Advances & Loan Management'}
              </h2>
              <p className="text-xs text-slate-400">
                {isRtl
                  ? 'إعداد وسداد سُلف الموظفين عبر الخصم الشهري التلقائي من مسير الرواتب.'
                  : 'Setup and track employee salary advances deducted automatically via monthly payroll.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="gradient-btn px-3.5 py-2 text-xs font-bold shadow-md flex items-center gap-1.5"
            >
              <span>{isFormOpen ? '✕' : '+'}</span>
              <span>{isFormOpen ? (isRtl ? 'إغلاق النموذج' : 'Close Form') : (isRtl ? 'إضافة سُلفة جديدة' : 'Issue New Advance')}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="overflow-y-auto space-y-6 flex-1 pr-1">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-3 rounded-xl text-xs flex items-center justify-between">
              <span>✓ {successMsg}</span>
              <button onClick={() => setSuccessMsg('')} className="text-slate-400 hover:text-white">✕</button>
            </div>
          )}

          {/* New Advance Form */}
          {isFormOpen && (
            <form onSubmit={handleCreateAdvance} className="p-5 rounded-2xl bg-slate-950/80 border border-indigo-500/30 space-y-4 animate-fadeIn">
              <h3 className="text-sm font-extrabold text-indigo-300 uppercase tracking-wider">
                {isRtl ? '📝 إضافة سُلفة جديدة لموظف' : '📝 Issue New Employee Salary Advance'}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'اختر الموظف *' : 'Select Employee *'}</label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="input-field py-2 text-xs bg-slate-900 text-white font-bold"
                  >
                    <option value="">{isRtl ? '-- اختر موظفاً --' : '-- Select Employee --'}</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'شهر بدء الخصم (YYYY-MM) *' : 'Start Month (YYYY-MM) *'}</label>
                  <input
                    type="month"
                    value={startMonth}
                    onChange={(e) => setStartMonth(e.target.value)}
                    className="input-field py-2 text-xs bg-slate-900 text-white font-bold"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'إجمالي مبلغ السُلفة (دينار) *' : 'Total Advance Amount (JOD) *'}</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={totalAmount}
                    onChange={(e) => setTotalAmount(e.target.value)}
                    placeholder="e.g. 200.00"
                    className="input-field py-2 text-xs bg-slate-900 text-white font-mono"
                    dir="ltr"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'القسط الشهري المخصوم (دينار / شهر) *' : 'Monthly Deduction Installment (JOD / mo) *'}</label>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    value={monthlyInstallment}
                    onChange={(e) => setMonthlyInstallment(e.target.value)}
                    placeholder="e.g. 50.00"
                    className="input-field py-2 text-xs bg-slate-900 text-white font-mono"
                    dir="ltr"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">{isRtl ? 'السبب / الملاحظات' : 'Notes / Description'}</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={isRtl ? 'مثال: سلفة طوارئ طبية...' : 'e.g. Emergency medical advance...'}
                  className="input-field py-2 text-xs bg-slate-900 text-white"
                  dir="auto"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white/5 hover:bg-white/10 text-slate-400"
                >
                  {isRtl ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="gradient-btn px-5 py-2 text-xs font-bold shadow-md flex items-center gap-1.5"
                >
                  {saveLoading && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {isRtl ? 'حفظ وإصدار السُلفة' : 'Save & Issue Advance'}
                </button>
              </div>
            </form>
          )}

          {/* Filter Tabs */}
          <div className="flex items-center justify-between gap-4">
            <div className="inline-flex rounded-xl bg-slate-950/80 p-1 border border-white/10 text-xs font-bold">
              <button
                onClick={() => setStatusFilter('ACTIVE')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'ACTIVE'
                    ? 'bg-emerald-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? 'نشطة (قيد السداد)' : 'Active'}
              </button>
              <button
                onClick={() => setStatusFilter('COMPLETED')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'COMPLETED'
                    ? 'bg-indigo-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? 'مكتملة السداد' : 'Completed'}
              </button>
              <button
                onClick={() => setStatusFilter('CANCELLED')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'CANCELLED'
                    ? 'bg-red-600 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? 'ملغاة' : 'Cancelled'}
              </button>
              <button
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  statusFilter === 'ALL'
                    ? 'bg-slate-700 text-white font-extrabold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {isRtl ? 'الكل' : 'All'}
              </button>
            </div>

            <span className="text-xs text-slate-400 font-semibold">
              {isRtl ? `إجمالي السجلات: ${filteredAdvances.length}` : `Total records: ${filteredAdvances.length}`}
            </span>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-3 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
            </div>
          ) : filteredAdvances.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 bg-slate-950/60 rounded-xl border border-white/5" dir="auto">
              {isRtl ? 'لا توجد سُلف راتب في هذا التبويب.' : 'No salary advances found in this tab.'}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-xs`}>
                <thead>
                  <tr className="bg-slate-950/80 text-slate-400 border-b border-white/10 font-bold uppercase tracking-wider">
                    <th className="px-4 py-3">{isRtl ? 'الموظف' : 'Employee'}</th>
                    <th className="px-4 py-3">{isRtl ? 'إجمالي السُلفة' : 'Total Loan'}</th>
                    <th className="px-4 py-3">{isRtl ? 'الخصم الشهري' : 'Monthly Installment'}</th>
                    <th className="px-4 py-3">{isRtl ? 'تقدم السداد' : 'Repayment Progress'}</th>
                    <th className="px-4 py-3">{isRtl ? 'المتبقي' : 'Remaining'}</th>
                    <th className="px-4 py-3">{isRtl ? 'الحالة' : 'Status'}</th>
                    <th className="px-4 py-3 text-center">{isRtl ? 'إجراء' : 'Action'}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 bg-slate-900/60">
                  {filteredAdvances.map((adv) => {
                    const percent = Math.min(100, Math.round((adv.paidAmount / adv.totalAmount) * 100));
                    const isActive = adv.status === AdvanceStatus.ACTIVE;
                    const isCompleted = adv.status === AdvanceStatus.COMPLETED;

                    return (
                      <tr key={adv.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-4 py-3 font-semibold text-white">
                          <p>{adv.userName || 'Employee'}</p>
                          <p className="text-[10px] text-slate-400 font-mono" dir="ltr">{adv.userEmail}</p>
                          {adv.notes && <p className="text-[10px] text-indigo-300/80 italic mt-0.5" dir="auto">"{adv.notes}"</p>}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-amber-300" dir="ltr">
                          {adv.totalAmount.toFixed(2)} JOD
                        </td>
                        <td className="px-4 py-3 font-mono text-emerald-400 font-bold" dir="ltr">
                          -{adv.monthlyInstallment.toFixed(2)} JOD / mo
                        </td>
                        <td className="px-4 py-3 min-w-[140px]">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-bold">
                              <span className="text-emerald-400" dir="ltr">{adv.paidAmount.toFixed(2)} JOD</span>
                              <span className="text-slate-400">{percent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-300 ${
                                  isCompleted ? 'bg-emerald-500' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-white" dir="ltr">
                          {adv.remainingBalance.toFixed(2)} JOD
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            isActive
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              : isCompleted
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                              : 'bg-red-500/20 text-red-400 border-red-500/40'
                          }`}>
                            {isActive && (isRtl ? '🟢 نشطة' : '🟢 Active')}
                            {isCompleted && (isRtl ? '🏁 مكتملة' : '🏁 Completed')}
                            {adv.status === AdvanceStatus.CANCELLED && (isRtl ? '❌ ملغاة' : '❌ Cancelled')}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          {isActive && (
                            <button
                              onClick={() => handleCancelAdvance(adv.id)}
                              className="px-2.5 py-1 rounded text-[11px] font-bold bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/30"
                            >
                              {isRtl ? 'إلغاء' : 'Cancel'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
