import React, { useState, useEffect } from 'react';
import { payrollApi } from '../api/client';
import { DraftPayrollDto, EmployeeType } from '@hrms/shared';
import WageProcessingModal from '../components/WageProcessingModal';
import SalaryAdvancesModal from '../components/SalaryAdvancesModal';
import { useLanguage } from '../context/LanguageContext';

export default function PayrollManagementPage() {
  const { t, isRtl } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState<DraftPayrollDto[]>([]);
  
  // Default to current month
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [selectedDraft, setSelectedDraft] = useState<DraftPayrollDto | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAdvancesModalOpen, setIsAdvancesModalOpen] = useState(false);

  const fetchDrafts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await payrollApi.getDraft(selectedMonth);
      setDrafts(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل جلب مسودة الرواتب' : 'Failed to fetch payroll drafts'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [selectedMonth]);

  const exportCsv = () => {
    if (drafts.length === 0) return;
    const headers = [
      'Name', 'Email', 'Type', 'Monthly Salary', 'Hourly Wage', 
      'Transp. Allowance', 'Recurring Bonus', 'Tracked Hours', 'WFH Days', 
      'WFH Deductions', 'Advance Deduction', 'Points Ref', 'Approved Hrs', 'Bonus Amt', 
      'Bonus Notes', 'Ded. Amt', 'Ded. Notes', 'Status'
    ];
    
    const rows = drafts.map(d => [
      `"${d.name}"`,
      `"${d.email}"`,
      d.employeeType,
      d.monthlySalary,
      d.hourlyWage,
      d.transportationAllowance,
      d.recurringBonus,
      d.trackedHours,
      d.wfhDays,
      d.transportationDeductions,
      d.activeAdvanceDeduction ?? 0,
      d.cardPointsReference,
      d.savedApprovedHours ?? '',
      d.savedBonusAmount ?? '',
      d.savedBonusNotes ? `"${d.savedBonusNotes.replace(/"/g, '""')}"` : '',
      d.savedDeductionAmount ?? '',
      d.savedDeductionNotes ? `"${d.savedDeductionNotes.replace(/"/g, '""')}"` : '',
      d.savedStatus || 'PENDING'
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `payroll_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            {isRtl ? 'معالجة ومسير الرواتب' : 'Payroll Processing'}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {isRtl ? 'مراجعة وتعديل واعتماد أجور الموظفين للشهر المحدد.' : 'Review, edit, and finalize employee wages for the selected month.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsAdvancesModalOpen(true)}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-1.5"
          >
            <span>💳</span>
            <span>{isRtl ? 'سُلف الراتب والقروض' : 'Salary Advances'}</span>
          </button>
          <button 
            onClick={exportCsv}
            disabled={drafts.length === 0}
            className="gradient-btn px-4 py-2 text-sm font-bold shadow-md disabled:opacity-50"
          >
            {isRtl ? 'تصدير CSV' : 'Export CSV'}
          </button>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white font-medium"
            dir="ltr"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">{isRtl ? 'جاري تحميل بيانات الرواتب...' : 'Loading payroll data...'}</div>
        ) : drafts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">{isRtl ? 'لم يتم العثور على موظفين نشطين.' : 'No active employees found.'}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm`}>
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className={`px-6 py-4 font-semibold text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الموظف' : 'Employee'}</th>
                  <th className={`px-6 py-4 font-semibold text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'نوع الهيكل' : 'Type'}</th>
                  <th className={`px-6 py-4 font-semibold text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الأجر الأساسي' : 'Base Wage'}</th>
                  <th className={`px-6 py-4 font-semibold text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'ساعات العمل' : 'Tracked Hrs'}</th>
                  <th className={`px-6 py-4 font-semibold text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'خصومات العمل المنزلي' : 'WFH Deductions'}</th>
                  <th className={`px-6 py-4 font-semibold text-slate-400 ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'نقاط البطاقات' : 'Points (Ref)'}</th>
                  <th className={`px-6 py-4 font-semibold text-slate-400 ${isRtl ? 'text-left' : 'text-right'}`}>{isRtl ? 'الإجراء' : 'Action'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {drafts.map(d => (
                  <tr key={d.userId} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-bold text-white">
                      <div>{d.name}</div>
                      <div className="text-xs text-slate-400 font-normal" dir="ltr">{d.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${d.employeeType === EmployeeType.FIXED ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-rose-500/25 text-rose-400 border border-rose-500/40 shadow-sm'}`}>
                        {d.employeeType === EmployeeType.FIXED ? (isRtl ? 'راتب ثابت' : 'FIXED') : (isRtl ? 'بالساعة' : 'PER_HOUR')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300 whitespace-nowrap" dir="ltr">
                      {d.employeeType === EmployeeType.FIXED ? `${d.monthlySalary} ${isRtl ? 'دينار/شهر' : 'JOD/mo'}` : `${d.hourlyWage} ${isRtl ? 'دينار/ساعة' : 'JOD/hr'}`}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-bold whitespace-nowrap" dir="ltr">{d.trackedHours} {isRtl ? 'ساعة' : 'h'}</td>
                    <td className="px-6 py-4 text-amber-400 whitespace-nowrap" dir="ltr">
                      {d.transportationDeductions > 0 ? `-${d.transportationDeductions.toFixed(2)} JOD (${d.wfhDays}d)` : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-300 whitespace-nowrap" dir="ltr">{d.cardPointsReference > 0 ? `+${d.cardPointsReference}` : d.cardPointsReference}</td>
                    <td className={`px-6 py-4 ${isRtl ? 'text-left' : 'text-right'} whitespace-nowrap`}>
                      {d.savedStatus === 'FINALIZED' ? (
                        <span className="text-emerald-400 font-bold px-4 py-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                          {isRtl ? 'تم الاعتماد ✓' : 'Finalized'}
                        </span>
                      ) : (
                        <button 
                          onClick={() => { setSelectedDraft(d); setIsModalOpen(true); }}
                          className={`${d.savedStatus === 'DRAFT' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors`}
                        >
                          {d.savedStatus === 'DRAFT' ? (isRtl ? 'متابعة المسودة' : 'Resume Draft') : (isRtl ? 'معالجة الأجر' : 'Process Wage')}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <WageProcessingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        draft={selectedDraft}
        month={selectedMonth}
        onSuccess={() => {
          fetchDrafts();
        }}
      />

      <SalaryAdvancesModal
        isOpen={isAdvancesModalOpen}
        onClose={() => setIsAdvancesModalOpen(false)}
        onSuccess={() => {
          fetchDrafts();
        }}
      />
    </div>
  );
}
