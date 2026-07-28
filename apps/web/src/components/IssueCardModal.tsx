import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CardType, CARD_POINT_VALUES } from '@hrms/shared';
import type { UserResponseDto } from '@hrms/shared';
import { cardsApi, usersApi } from '../api/client';
import { useLanguage } from '../context/LanguageContext';

interface IssueCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  employeeId?: string;
  employeeName?: string;
  onSuccess?: () => void;
}

interface CardOption {
  type: CardType;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  points: number;
  color: string;
  bg: string;
  border: string;
  glow: string;
  ring: string;
}

const cardOptions: CardOption[] = [
  {
    type: CardType.GOLD_PLUS_50,
    labelEn: 'Outstanding',
    labelAr: 'أداء استثنائي',
    descEn: 'Exceptional performance',
    descAr: 'تميز وإنجاز فارق',
    points: CARD_POINT_VALUES.GOLD_PLUS_50,
    color: 'text-amber-300',
    bg: 'bg-amber-500/10',
    border: 'border-amber-400/50',
    glow: 'shadow-amber-500/20',
    ring: 'ring-amber-500',
  },
  {
    type: CardType.BLUE_PLUS_30,
    labelEn: 'Excellence',
    labelAr: 'ممتاز',
    descEn: 'Outstanding performance',
    descAr: 'أداء عالي جداً',
    points: CARD_POINT_VALUES.BLUE_PLUS_30,
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    glow: 'shadow-blue-500/20',
    ring: 'ring-blue-500',
  },
  {
    type: CardType.GREEN_PLUS_10,
    labelEn: 'Good Work',
    labelAr: 'عمل جيد',
    descEn: 'Above expectations',
    descAr: 'فوق التوقعات',
    points: CARD_POINT_VALUES.GREEN_PLUS_10,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    glow: 'shadow-emerald-500/20',
    ring: 'ring-emerald-500',
  },
  {
    type: CardType.YELLOW_MINUS_10,
    labelEn: 'Needs Improvement',
    labelAr: 'يحتاج تحسين',
    descEn: 'Below expectations',
    descAr: 'أقل من التوقعات',
    points: CARD_POINT_VALUES.YELLOW_MINUS_10,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    glow: 'shadow-amber-500/20',
    ring: 'ring-amber-500',
  },
  {
    type: CardType.RED_MINUS_30,
    labelEn: 'Violation',
    labelAr: 'مخالفة',
    descEn: 'Serious concern',
    descAr: 'تقصير أو مخالفة جوهرية',
    points: CARD_POINT_VALUES.RED_MINUS_30,
    color: 'text-red-400',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    glow: 'shadow-red-500/20',
    ring: 'ring-red-500',
  },
];

export default function IssueCardModal({
  isOpen,
  onClose,
  employeeId: preSelectedId,
  employeeName: preSelectedName,
  onSuccess,
}: IssueCardModalProps) {
  const { t, isRtl } = useLanguage();
  const [employees, setEmployees] = useState<UserResponseDto[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState(preSelectedId || '');
  const [selectedCard, setSelectedCard] = useState<CardType | null>(null);
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (isOpen && !preSelectedId) {
      usersApi.getAll().then(setEmployees).catch(() => {});
    }
  }, [isOpen, preSelectedId]);

  useEffect(() => {
    if (isOpen) {
      setSelectedEmployee(preSelectedId || '');
      setSelectedCard(null);
      setReason('');
      setError('');
      setSuccess(false);
    }
  }, [isOpen, preSelectedId]);

  if (!isOpen) return null;

  const canSubmit =
    (selectedEmployee || preSelectedId) && selectedCard && reason.trim().length > 0;

  const handleSubmit = async () => {
    const empId = preSelectedId || selectedEmployee;
    if (!empId || !selectedCard || !reason.trim()) return;

    setSubmitting(true);
    setError('');
    try {
      await cardsApi.issue({
        employeeId: empId,
        cardType: selectedCard,
        reason: reason.trim(),
      });
      setSuccess(true);
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.response?.data?.message || (isRtl ? 'فشل إصدار البطاقة.' : 'Failed to issue card.'));
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg glass-card p-6 sm:p-8 space-y-6 animate-in max-h-[90vh] overflow-y-auto bg-slate-900 border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">
            {isRtl ? 'إصدار بطاقة أداء' : 'Issue Performance Card'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all duration-200"
          >
            ✕
          </button>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-lg font-semibold text-white">{isRtl ? 'تم إصدار البطاقة بنجاح!' : 'Card Issued Successfully!'}</p>
            <p className="text-sm text-slate-400">{isRtl ? 'تم تسجيل بطاقة الأداء ورصد نقاطها.' : 'The performance card has been recorded.'}</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {/* Employee selection */}
            {preSelectedId ? (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {isRtl ? 'الموظف' : 'Employee'}
                </label>
                <div className="input-field bg-white/5 text-white">
                  {preSelectedName || preSelectedId}
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  {isRtl ? 'اختر الموظف' : 'Select Employee'}
                </label>
                <select
                  value={selectedEmployee}
                  onChange={(e) => setSelectedEmployee(e.target.value)}
                  className="input-field bg-slate-900 text-white"
                >
                  <option value="" className="bg-slate-900">
                    {isRtl ? '...اختر موظفاً' : 'Choose an employee…'}
                  </option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id} className="bg-slate-900">
                      {emp.name} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Card Type Selection */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isRtl ? 'نوع البطاقة' : 'Card Type'}
              </label>
              <div className="grid grid-cols-2 gap-3">
                {cardOptions.map((option) => (
                  <button
                    key={option.type}
                    type="button"
                    onClick={() => setSelectedCard(option.type)}
                    className={`relative p-4 rounded-xl border ${isRtl ? 'text-right' : 'text-left'} transition-all duration-200 ${
                      selectedCard === option.type
                        ? `${option.bg} ${option.border} ring-2 ${option.ring} shadow-lg ${option.glow}`
                        : 'bg-white/5 border-white/10 hover:bg-white/10'
                    }`}
                  >
                    <div className={`text-2xl font-extrabold ${option.color}`} dir="ltr">
                      {option.points > 0 ? '+' : ''}
                      {option.points}
                    </div>
                    <div className={`text-sm font-semibold mt-1 ${option.color}`}>
                      {isRtl ? option.labelAr : option.labelEn}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {isRtl ? option.descAr : option.descEn}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {isRtl ? 'سبب إصدار البطاقة' : 'Reason'}
              </label>
              <textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="input-field resize-none"
                placeholder={isRtl ? 'اكتب سبب إصدار هذه البطاقة للموظف...' : 'Provide a reason for issuing this card…'}
                dir="auto"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-slate-400 bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
              >
                {t('cancel')}
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="gradient-btn flex-1 flex items-center justify-center font-bold"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  isRtl ? 'إصدار البطاقة' : 'Issue Card'
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
