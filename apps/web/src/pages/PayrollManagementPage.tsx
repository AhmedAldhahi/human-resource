import React, { useState, useEffect } from 'react';
import { payrollApi } from '../api/client';
import { DraftPayrollDto, EmployeeType } from '@hrms/shared';
import WageProcessingModal from '../components/WageProcessingModal';

export default function PayrollManagementPage() {
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

  const fetchDrafts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await payrollApi.getDraft(selectedMonth);
      setDrafts(data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to fetch payroll drafts');
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
      'WFH Deductions', 'Points Ref', 'Approved Hrs', 'Bonus Amt', 
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
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Payroll Processing</h1>
          <p className="text-slate-400 mt-1 text-sm">Review, edit, and finalize employee wages for the selected month.</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={exportCsv}
            disabled={drafts.length === 0}
            className="gradient-btn px-4 py-2 text-sm font-bold shadow-md disabled:opacity-50"
          >
            Export CSV
          </button>
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-slate-900 border border-white/10 rounded-xl px-4 py-2 text-white font-medium"
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
          <div className="p-12 text-center text-slate-400">Loading payroll data...</div>
        ) : drafts.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No active employees found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02]">
                  <th className="px-6 py-4 text-left font-semibold text-slate-400">Employee</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-400">Type</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-400">Base Wage</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-400">Tracked Hrs</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-400">WFH Deductions</th>
                  <th className="px-6 py-4 text-left font-semibold text-slate-400">Points (Ref)</th>
                  <th className="px-6 py-4 text-right font-semibold text-slate-400">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {drafts.map(d => (
                  <tr key={d.userId} className="hover:bg-white/5">
                    <td className="px-6 py-4 font-bold text-white">{d.name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold ${d.employeeType === EmployeeType.FIXED ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' : 'bg-rose-500/25 text-rose-400 border border-rose-500/40 shadow-sm'}`}>
                        {d.employeeType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {d.employeeType === EmployeeType.FIXED ? `${d.monthlySalary} JOD/mo` : `${d.hourlyWage} JOD/hr`}
                    </td>
                    <td className="px-6 py-4 text-emerald-400 font-bold">{d.trackedHours}h</td>
                    <td className="px-6 py-4 text-amber-400">
                      {d.transportationDeductions > 0 ? `-${d.transportationDeductions.toFixed(2)} JOD (${d.wfhDays}d)` : '-'}
                    </td>
                    <td className="px-6 py-4 text-slate-300">{d.cardPointsReference > 0 ? `+${d.cardPointsReference}` : d.cardPointsReference}</td>
                    <td className="px-6 py-4 text-right">
                      {d.savedStatus === 'FINALIZED' ? (
                        <span className="text-slate-400 font-bold px-4 py-2">Finalized</span>
                      ) : (
                        <button 
                          onClick={() => { setSelectedDraft(d); setIsModalOpen(true); }}
                          className={`${d.savedStatus === 'DRAFT' ? 'bg-indigo-600 hover:bg-indigo-500' : 'bg-emerald-600 hover:bg-emerald-500'} text-white px-4 py-2 rounded-lg font-bold text-xs transition-colors`}
                        >
                          {d.savedStatus === 'DRAFT' ? 'Resume Draft' : 'Process Wage'}
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
    </div>
  );
}
