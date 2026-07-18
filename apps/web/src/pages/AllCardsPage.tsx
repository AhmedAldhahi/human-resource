import React, { useEffect, useState, useMemo } from 'react';
import { cardsApi } from '../api/client';
import { CardType, CARD_POINT_VALUES } from '@hrms/shared';
import type { CardResponseDto } from '@hrms/shared';

function cardBadge(type: CardType) {
  switch (type) {
    case CardType.GOLD_PLUS_50:
      return { label: 'Outstanding', classes: 'bg-amber-500/20 text-amber-300 border border-amber-400/50' };
    case CardType.BLUE_PLUS_30:
      return { label: 'Excellence', classes: 'bg-blue-500/20 text-blue-400 border border-blue-500/30' };
    case CardType.GREEN_PLUS_10:
      return { label: 'Good Work', classes: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' };
    case CardType.YELLOW_MINUS_10:
      return { label: 'Needs Improvement', classes: 'bg-amber-500/20 text-amber-400 border border-amber-500/30' };
    case CardType.RED_MINUS_30:
      return { label: 'Violation', classes: 'bg-red-500/20 text-red-400 border border-red-500/30' };
  }
}

const TYPE_FILTER_OPTIONS: { label: string; value: CardType | 'ALL' }[] = [
  { label: 'All Types', value: 'ALL' },
  { label: 'Outstanding (+50)', value: CardType.GOLD_PLUS_50 },
  { label: 'Excellence (+30)', value: CardType.BLUE_PLUS_30 },
  { label: 'Good Work (+10)', value: CardType.GREEN_PLUS_10 },
  { label: 'Needs Improvement (-10)', value: CardType.YELLOW_MINUS_10 },
  { label: 'Violation (-30)', value: CardType.RED_MINUS_30 },
];

export default function AllCardsPage() {
  const [cards, setCards] = useState<CardResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<CardType | 'ALL'>('ALL');
  const [monthFilter, setMonthFilter] = useState<string>('ALL');

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
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (key === currentMonthKey) {
      return `${label} (Current Month - Resets on 1st)`;
    }
    return label;
  }

  // Count current month cards
  const currentMonthCardsCount = useMemo(() => {
    return cards.filter((c) => c.issuedAt.startsWith(currentMonthKey)).length;
  }, [cards, currentMonthKey]);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Explanation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Organization Cards</h1>
            <span className="text-xs bg-indigo-500/20 text-indigo-300 font-bold px-3 py-1 rounded-full border border-indigo-500/30">
              Monthly Auto-Reset Active
            </span>
          </div>
          <p className="text-slate-400 mt-1.5 text-sm">
            Employee card scores reset automatically on the 1st of every month to 0. Full history is preserved below.
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="input-field py-2 text-sm bg-slate-900 border-white/10 text-white font-medium min-w-[200px]"
          >
            <option value="ALL">📅 All Months (Grouped View)</option>
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
            {TYPE_FILTER_OPTIONS.map((opt) => (
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
              Active Month Activity ({formatMonthLabel(currentMonthKey).split(' ')[0]})
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-black text-white">{currentMonthCardsCount}</span>
              <span className="text-sm text-slate-400 font-semibold">cards issued this month</span>
            </div>
            <p className="text-xs text-indigo-300/80 mt-1">
              Active month scores dictate current salary adjustments
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-2xl border border-indigo-500/30">
            📆
          </div>
        </div>

        <div className="glass-card p-6 border border-white/10 bg-slate-900/40 shadow-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase text-slate-400 tracking-wider">
              All-Time Organization History
            </span>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-4xl font-extrabold text-slate-200">{cards.length}</span>
              <span className="text-sm text-slate-500 font-semibold">total historical cards</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Permanently archived across all employees & departments
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
              ? 'No cards match your current month or type filters.'
              : 'No performance cards have been issued across the organization yet.'}
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
              {(groupedCards[monthFilter] || []).length} records
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.02]">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Card Type</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Points</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Issued By</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
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
                        <span className={`badge ${badge.classes}`}>{badge.label}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap font-mono">
                        <span className={`font-black ${points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          {points > 0 ? '+' : ''}{points}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 max-w-sm truncate">{card.reason}</td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{card.issuerName || card.issuerId}</td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(card.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* All Months Grouped Tables */
        <div className="space-y-10">
          {monthKeys.map((key) => {
            const monthCards = groupedCards[key] || [];
            if (monthCards.length === 0) return null;
            const monthNet = monthCards.reduce((sum, c) => sum + (CARD_POINT_VALUES[c.cardType] || 0), 0);
            return (
              <div key={key} className="glass-card overflow-hidden border border-white/10 shadow-xl">
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-900/95 to-transparent border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <div>
                      <h3 className="font-extrabold text-white text-base">{formatMonthLabel(key)}</h3>
                      <p className="text-xs text-slate-400">{monthCards.length} historical cards in this month</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 px-3.5 py-1.5 rounded-xl border border-white/5 font-mono">
                    <span className="text-xs text-slate-400 font-sans font-bold">Month Impact:</span>
                    <span className={`font-black text-base ${monthNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {monthNet >= 0 ? '+' : ''}{monthNet} pts
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 bg-white/[0.01]">
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Employee</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Card Type</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Points</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Reason</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Issued By</th>
                        <th className="text-left px-6 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Date</th>
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
                              <span className={`badge ${badge.classes}`}>{badge.label}</span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap font-mono">
                              <span className={`font-black ${points > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                {points > 0 ? '+' : ''}{points}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-300 max-w-sm truncate">{card.reason}</td>
                            <td className="px-6 py-4 text-slate-400 whitespace-nowrap">{card.issuerName || card.issuerId}</td>
                            <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                              {new Date(card.issuedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
