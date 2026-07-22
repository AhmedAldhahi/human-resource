import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DraftPayrollDto, EmployeeType, PayrollStatus } from '@hrms/shared';
import { payrollApi } from '../api/client';

interface WageProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  draft: DraftPayrollDto | null;
  month: string;
  onSuccess: () => void;
}

export default function WageProcessingModal({ isOpen, onClose, draft, month, onSuccess }: WageProcessingModalProps) {
  const [approvedHours, setApprovedHours] = useState(0);
  const [bonuses, setBonuses] = useState<{ amount: number; notes: string }[]>([{ amount: 0, notes: '' }]);
  const [deductions, setDeductions] = useState<{ amount: number; notes: string }[]>([{ amount: 0, notes: '' }]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && draft) {
      setApprovedHours(draft.savedApprovedHours ?? draft.trackedHours);
      if (draft.savedBonusAmount !== undefined) {
        setBonuses([{ amount: draft.savedBonusAmount, notes: draft.savedBonusNotes || '' }]);
      } else {
        setBonuses([{ amount: 0, notes: '' }]);
      }
      if (draft.savedDeductionAmount !== undefined) {
        setDeductions([{ amount: draft.savedDeductionAmount, notes: draft.savedDeductionNotes || '' }]);
      } else {
        setDeductions([{ amount: 0, notes: '' }]);
      }
      setError('');
    }
  }, [isOpen, draft]);

  if (!isOpen || !draft) return null;

  const isFixed = draft.employeeType === EmployeeType.FIXED;
  const baseWage = isFixed 
    ? draft.monthlySalary 
    : Number((approvedHours * draft.hourlyWage).toFixed(2));
    
  // Card points are typically 1 JOD = 1 Point, or whatever the logic is. We will use 1 JOD = 1 Point here.
  const pointsJOD = draft.cardPointsReference;

  const totalBonusAmount = bonuses.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalDeductionAmount = deductions.reduce((sum, d) => sum + (d.amount || 0), 0);

  const finalPayout = Number(
    (
      baseWage +
      draft.transportationAllowance +
      draft.recurringBonus -
      draft.transportationDeductions +
      totalBonusAmount -
      totalDeductionAmount
    ).toFixed(2)
  );

  const handleSave = async (status: PayrollStatus) => {
    setLoading(true);
    setError('');

    const bonusNotesStr = bonuses.filter(b => b.amount > 0 || b.notes).map(b => `${b.notes || 'Bonus'} (${b.amount} JOD)`).join(' | ');
    const deductionNotesStr = deductions.filter(d => d.amount > 0 || d.notes).map(d => `${d.notes || 'Deduction'} (${d.amount} JOD)`).join(' | ');

    try {
      await payrollApi.save({
        userId: draft.userId,
        month,
        baseWage,
        transportationAllowance: draft.transportationAllowance,
        recurringBonus: draft.recurringBonus,
        approvedHours,
        transportationDeductions: draft.transportationDeductions,
        bonusAmount: totalBonusAmount,
        bonusNotes: bonusNotesStr,
        deductionAmount: totalDeductionAmount,
        deductionNotes: deductionNotesStr,
        cardPointsReference: pointsJOD,
        finalPayout,
        status,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save payroll record');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-white/10 shrink-0">
          <h2 className="text-xl font-extrabold text-white">Process Wage: {draft.name}</h2>
          <p className="text-slate-400 text-sm mt-1">Month: {month} | Type: {draft.employeeType}</p>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5 space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Tracked Hours</label>
              <p className="text-xl font-bold text-white">{draft.trackedHours}h</p>
            </div>
            <div className="p-4 rounded-xl bg-slate-800/50 border border-white/5 space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase">Approved Hours</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={approvedHours}
                onFocus={(e) => e.target.select()}
                onChange={(e) => {
                  const val = e.target.value;
                  setApprovedHours(val === '' ? ('' as any) : Number(val));
                }}
                onBlur={() => {
                  if (approvedHours === ('' as any) || Number(approvedHours) < 0) {
                    setApprovedHours(draft.trackedHours);
                  }
                }}
                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-white font-bold"
              />
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-emerald-400 border-b border-emerald-500/20 pb-2">Earnings</h3>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Base Wage {isFixed ? '(Fixed)' : '(Hourly)'}</span>
              <span className="text-white font-bold">{baseWage.toFixed(2)} JOD</span>
            </div>
            {draft.transportationAllowance > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Transportation Allowance</span>
                <span className="text-white font-bold">+{draft.transportationAllowance.toFixed(2)} JOD</span>
              </div>
            )}
            {draft.recurringBonus > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Recurring Bonus</span>
                <span className="text-white font-bold">+{draft.recurringBonus.toFixed(2)} JOD</span>
              </div>
            )}
            {pointsJOD > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Net Card Points Bonus (Ref)</span>
                <span className="text-emerald-400 font-bold">+{pointsJOD.toFixed(2)} JOD</span>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-red-400 border-b border-red-500/20 pb-2">Deductions</h3>
            {draft.transportationDeductions > 0 && (
              <div className="flex justify-between text-sm text-red-400">
                <span>WFH Transportation Deduction ({draft.wfhDays} days)</span>
                <span className="font-bold">-{draft.transportationDeductions.toFixed(2)} JOD</span>
              </div>
            )}
            {pointsJOD < 0 && (
              <div className="flex justify-between text-sm text-red-400">
                <span>Net Card Points Penalty (Ref)</span>
                <span className="font-bold">{pointsJOD.toFixed(2)} JOD</span>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-4 border-t border-white/10">
            <h3 className="text-sm font-bold text-indigo-400">Manual Adjustments</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-emerald-400">Bonuses (JOD)</label>
                  <button onClick={() => setBonuses([...bonuses, {amount: 0, notes: ''}])} className="text-xs font-bold text-emerald-400/80 hover:text-emerald-300 bg-emerald-500/10 px-2 py-1 rounded">+ Add</button>
                </div>
                {bonuses.map((b, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      type="number"
                      min="0"
                      value={b.amount || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => { const newB = [...bonuses]; newB[idx].amount = e.target.value === '' ? 0 : Number(e.target.value); setBonuses(newB); }}
                      className="w-1/3 bg-slate-950 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:border-emerald-500/50"
                      placeholder="0.00"
                    />
                    <input
                      type="text"
                      value={b.notes}
                      onChange={(e) => { const newB = [...bonuses]; newB[idx].notes = e.target.value; setBonuses(newB); }}
                      className="w-2/3 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-emerald-500/50"
                      placeholder="Reason..."
                    />
                    {bonuses.length > 1 && (
                      <button onClick={() => setBonuses(bonuses.filter((_, i) => i !== idx))} className="text-red-400/70 hover:text-red-400 mt-2 text-lg leading-none shrink-0 w-6">✕</button>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-red-400">Deductions (JOD)</label>
                  <button onClick={() => setDeductions([...deductions, {amount: 0, notes: ''}])} className="text-xs font-bold text-red-400/80 hover:text-red-300 bg-red-500/10 px-2 py-1 rounded">+ Add</button>
                </div>
                {deductions.map((d, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <input
                      type="number"
                      min="0"
                      value={d.amount || ''}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => { const newD = [...deductions]; newD[idx].amount = e.target.value === '' ? 0 : Number(e.target.value); setDeductions(newD); }}
                      className="w-1/3 bg-slate-950 border border-white/10 rounded-lg px-2 py-2 text-white text-sm focus:border-red-500/50"
                      placeholder="0.00"
                    />
                    <input
                      type="text"
                      value={d.notes}
                      onChange={(e) => { const newD = [...deductions]; newD[idx].notes = e.target.value; setDeductions(newD); }}
                      className="w-2/3 bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-red-500/50"
                      placeholder="Reason..."
                    />
                    {deductions.length > 1 && (
                      <button onClick={() => setDeductions(deductions.filter((_, i) => i !== idx))} className="text-red-400/70 hover:text-red-400 mt-2 text-lg leading-none shrink-0 w-6">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
        
        <div className="p-6 border-t border-white/10 bg-slate-900/80 shrink-0 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Final Net Payout</p>
            <p className="text-3xl font-black text-emerald-400">{finalPayout.toFixed(2)} JOD</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => handleSave(PayrollStatus.DRAFT)}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-indigo-600/20 text-indigo-400 hover:bg-indigo-600/30 border border-indigo-500/30 transition-colors"
            >
              Save Draft
            </button>
            <button
              onClick={() => handleSave(PayrollStatus.FINALIZED)}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-colors"
            >
              {loading ? 'Saving...' : 'Finalize Wage'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
