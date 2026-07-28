import React, { useEffect, useState, useMemo } from 'react';
import { cardsApi } from '../api/client';
import { CardType, CARD_POINT_VALUES } from '@hrms/shared';
import type { CardResponseDto } from '@hrms/shared';
import { useLanguage } from '../context/LanguageContext';

export default function AllCardsPage() {
  const { t, isRtl } = useLanguage();
  const [cards, setCards] = useState<CardResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<CardType | 'ALL'>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function cardBadge(type: CardType) {
    switch (type) {
      case CardType.GOLD_PLUS_50:
        return { label: isRtl ? 'أداء استثنائي' : 'Outstanding', classes: 'bg-amber-500/20 text-amber-300 border border-amber-400/50' };
      case CardType.BLUE_PLUS_30:
        return { label: isRtl ? 'ممتاز' : 'Excellence', classes: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
      case CardType.GREEN_PLUS_10:
        return { label: isRtl ? 'عمل جيد' : 'Good Work', classes: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
      case CardType.YELLOW_MINUS_10:
        return { label: isRtl ? 'يحتاج تحسين' : 'Needs Improvement', classes: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
      case CardType.RED_MINUS_30:
        return { label: isRtl ? 'مخالفة' : 'Violation', classes: 'bg-red-500/20 text-red-400 border border-red-500/30' };
    }
  }

  const typeFilterOptions = [
    { label: isRtl ? 'جميع الأنواع' : 'All Types', value: 'ALL' as const },
    { label: isRtl ? 'أداء استثنائي (+50)' : 'Outstanding (+50)', value: CardType.GOLD_PLUS_50 },
    { label: isRtl ? 'ممتاز (+30)' : 'Excellence (+30)', value: CardType.BLUE_PLUS_30 },
    { label: isRtl ? 'عمل جيد (+10)' : 'Good Work (+10)', value: CardType.GREEN_PLUS_10 },
    { label: isRtl ? 'يحتاج تحسين (-10)' : 'Needs Improvement (-10)', value: CardType.YELLOW_MINUS_10 },
    { label: isRtl ? 'مخالفة (-30)' : 'Violation (-30)', value: CardType.RED_MINUS_30 },
  ];

  const handleDelete = async (id: string) => {
    if (!window.confirm(isRtl ? 'هل أنت تأكد من رغبتك في حذف هذه البطاقة؟ لا يمكن التراجع عن هذا الإجراء.' : 'Are you sure you want to delete this card? This action cannot be undone.')) {
      return;
    }
    setDeletingId(id);
    try {
      await cardsApi.delete(id);
      setCards((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      console.error('Failed to delete card', err);
    } finally {
      setDeletingId(null);
    }
  };

  useEffect(() => {
    cardsApi
      .getAll()
      .then(setCards)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Current month string YYYY-MM
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  // Filter cards by type
  const typeFiltered = useMemo(() => {
    return typeFilter === 'ALL' ? cards : cards.filter((c) => c.cardType === typeFilter);
  }, [cards, typeFilter]);

  // Group cards by month YYYY-MM
  const { groupedCards, monthKeys } = useMemo(() => {
    const groups: Record<string, CardResponseDto[]> = {};
    for (const card of typeFiltered) {
      const key = card.issuedAt.substring(0, 7); // YYYY-MM
      if (!groups[key]) groups[key] = [];
      groups[key].push(card);
    }
    const keys = Object.keys(groups).sort().reverse();
    return { groupedCards: groups, monthKeys: keys };
  }, [typeFiltered]);

  function formatMonthLabel(key: string) {
    const [year, month] = key.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const label = date.toLocaleDateString(isRtl ? 'ar-JO' : 'en-US', { month: 'long', year: 'numeric' });
    if (key === currentMonthKey) {
      return `${label} (${isRtl ? 'الشهر الحالي - يتصفر في 1' : 'Current Month - Resets on 1st'})`;
    }
    return label;
  }

  // Count current month cards
  const currentMonthCardsCount = useMemo(() => {
    return cards.filter((c) => c.issuedAt.startsWith(currentMonthKey)).length;
  }, [cards, currentMonthKey]);

  return (
    <div className="space-y-8 animate-fadeIn max-w-7xl mx-auto">
      {/* Header & Explanation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              {isRtl ? 'بطاقات المؤسسة والأداء' : 'Organization Cards'}
            </h1>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-3 py-1 rounded-full border border-indigo-500/30">
              {isRtl ? 'التصفير التلقائي الشهري نشط' : 'Monthly Auto-Reset Active'}
            </span>
          </div>
          <p className="text-slate-400 mt-1.5 text-sm">
            {isRtl
              ? 'تتم إعادة ضبط نقاط بطاقات الموظفين تلقائياً إلى 0 في أول كل شهر، مع حفظ السجل الكامل أدناه.'
              : 'Employee card scores reset automatically on the 1st of every month to 0. Full history is preserved below.'}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="input-field py-2 text-sm bg-slate-900 border-white/10 text-white font-medium min-w-[200px]"
          >
            <option value="ALL">{isRtl ? '📅 جميع الأشهر (عرض مجمّع)' : '📅 All Months (Grouped View)'}</option>
            {monthKeys.map((key) => (
              <option key={key} value={key}>
                {formatMonthLabel(key)}
              </option>
            ))}
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as CardType | 'ALL')}
            className="input-field py-2 text-sm bg-slate-900 border-white/10 text-white font-medium min-w-[170px]"
          >
            {typeFilterOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Info Cards Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="glass-card p-6 border border-indigo-500/30 bg-gradient-to-br from-indigo-950/40 via-slate-900/60 to-slate-900 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs font-extrabold uppercase text-indigo-300 tracking-wider">
              {isRtl ? 'نشاط الشهر الحالي' : 'Active Month Activity'} ({formatMonthLabel(currentMonthKey).split(' ')[0]})
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-white" dir="ltr">{currentMonthCardsCount}</span>
              <span className="text-sm text-slate-400 font-semibold">{isRtl ? 'بطاقة صادرة هذا الشهر' : 'cards issued this month'}</span>
            </div>
            <p className="text-xs text-indigo-300/80 mt-1">
              {isRtl ? 'نقاط الشهر الحالي تؤثر مباشرة على تعديلات راتب الشهر' : 'Active month scores dictate current salary adjustments'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl border border-indigo-500/30">
            📆
          </div>
        </div>

        <div className="glass-card p-6 border border-white/10 bg-slate-900/40 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              {isRtl ? 'سجل المؤسسة التراكمي' : 'All-Time Organization History'}
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-slate-200" dir="ltr">{cards.length}</span>
              <span className="text-sm text-slate-500 font-semibold">{isRtl ? 'إجمالي البطاقات الصادرة' : 'total historical cards'}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {isRtl ? 'محفوظة بشكل دائم لجميع الموظفين والأقسام' : 'Permanently archived across all employees & departments'}
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center text-2xl border border-white/5">
            🗄️
          </div>
        </div>
      </div>

      {/* Main Table Display */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : Object.keys(groupedCards).length === 0 ? (
        <div className="glass-card p-12 text-center border border-white/10">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-3xl mb-4">
            🔍
          </div>
          <p className="text-slate-400 font-medium">
            {typeFilter !== 'ALL' || monthFilter !== 'ALL'
              ? (isRtl ? 'لا توجد بطاقات تطابق التصفية الحالية.' : 'No cards match your current month or type filters.')
              : (isRtl ? 'لم يتم إصدار أي بطاقات أداء في المؤسسة حتى الآن.' : 'No performance cards have been issued across the organization yet.')}
          </p>
        </div>
      ) : monthFilter !== 'ALL' ? (
        /* Single Month Table */
        <div className="glass-card overflow-hidden border border-white/10 shadow-xl">
          <div className="px-6 py-4 bg-slate-900/80 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-extrabold text-white flex items-center gap-2">
              <span>📅</span> {formatMonthLabel(monthFilter)}
            </h3>
            <span className="text-xs font-bold text-slate-400">
              {isRtl ? `${(groupedCards[monthFilter] || []).length} سجلات` : `${(groupedCards[monthFilter] || []).length} records`}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm`}>
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الموظف' : 'Employee'}</th>
                  <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'نوع البطاقة' : 'Card Type'}</th>
                  <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'النقاط' : 'Points'}</th>
                  <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'السبب' : 'Reason'}</th>
                  <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الصادرة عن' : 'Issued By'}</th>
                  <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'التاريخ' : 'Date'}</th>
                  <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-left' : 'text-right'}`}>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(groupedCards[monthFilter] || []).map((card) => {
                  const badge = cardBadge(card.cardType);
                  const points = CARD_POINT_VALUES[card.cardType];
                  return (
                    <tr key={card.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-white font-bold whitespace-nowrap">{card.employeeName || card.employeeId}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${badge.classes}`}>{badge.label}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono" dir="ltr">
                        <span className={`font-black ${points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {points > 0 ? '+' : ''}{points}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 max-w-sm truncate" dir="auto">{card.reason}</td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{card.issuerName || card.issuerId}</td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(card.issuedAt).toLocaleDateString(isRtl ? 'ar-JO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap ${isRtl ? 'text-left' : 'text-right'}`}>
                        <button
                          onClick={() => handleDelete(card.id)}
                          disabled={deletingId === card.id}
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded transition-colors disabled:opacity-50"
                          title={isRtl ? 'حذف البطاقة' : 'Delete Card'}
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grouped View across Months */
        <div className="space-y-6">
          {monthKeys.map((key) => {
            const monthCards = groupedCards[key] || [];
            return (
              <div key={key} className="glass-card overflow-hidden border border-white/10 shadow-xl">
                <div className="px-6 py-4 bg-slate-900/80 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-extrabold text-white flex items-center gap-2">
                    <span>📅</span> {formatMonthLabel(key)}
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    {isRtl ? `${monthCards.length} سجلات` : `${monthCards.length} records`}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className={`w-full ${isRtl ? 'text-right' : 'text-left'} text-sm`}>
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.02]">
                        <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الموظف' : 'Employee'}</th>
                        <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'نوع البطاقة' : 'Card Type'}</th>
                        <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'النقاط' : 'Points'}</th>
                        <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'السبب' : 'Reason'}</th>
                        <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'الصادرة عن' : 'Issued By'}</th>
                        <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-right' : 'text-left'}`}>{isRtl ? 'التاريخ' : 'Date'}</th>
                        <th className={`px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider ${isRtl ? 'text-left' : 'text-right'}`}>{isRtl ? 'الإجراءات' : 'Actions'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {monthCards.map((card) => {
                        const badge = cardBadge(card.cardType);
                        const points = CARD_POINT_VALUES[card.cardType];
                        return (
                          <tr key={card.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 text-white font-bold whitespace-nowrap">{card.employeeName || card.employeeId}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${badge.classes}`}>{badge.label}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono" dir="ltr">
                              <span className={`font-black ${points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {points > 0 ? '+' : ''}{points}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-300 max-w-sm truncate" dir="auto">{card.reason}</td>
                            <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{card.issuerName || card.issuerId}</td>
                            <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                              {new Date(card.issuedAt).toLocaleDateString(isRtl ? 'ar-JO' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </td>
                            <td className={`px-6 py-4 whitespace-nowrap ${isRtl ? 'text-left' : 'text-right'}`}>
                              <button
                                onClick={() => handleDelete(card.id)}
                                disabled={deletingId === card.id}
                                className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-1.5 rounded transition-colors disabled:opacity-50"
                                title={isRtl ? 'حذف البطاقة' : 'Delete Card'}
                              >
                                🗑️
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
