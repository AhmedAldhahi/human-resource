import React, { useEffect, useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { cardsApi } from '../api/client';
import { CardType, CARD_POINT_VALUES } from '@hrms/shared';
import type { CardResponseDto } from '@hrms/shared';

function cardMeta(type: CardType) {
  switch (type) {
    case CardType.GOLD_PLUS_50:
      return {
        label: 'Outstanding',
        color: 'text-amber-300',
        bg: 'bg-amber-500/20',
        border: 'border-amber-400/50',
        glow: 'shadow-amber-500/20',
      };
    case CardType.BLUE_PLUS_30:
      return {
        label: 'Excellence',
        color: 'text-blue-400',
        bg: 'bg-blue-500/10',
        border: 'border-blue-500/30',
        glow: 'shadow-blue-500/10',
      };
    case CardType.GREEN_PLUS_10:
      return {
        label: 'Good Work',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        glow: 'shadow-emerald-500/10',
      };
    case CardType.YELLOW_MINUS_10:
      return {
        label: 'Needs Improvement',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        glow: 'shadow-amber-500/10',
      };
    case CardType.RED_MINUS_30:
      return {
        label: 'Violation',
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        glow: 'shadow-red-500/10',
      };
  }
}

export default function MyCardsPage() {
  const { user } = useAuth();
  const [cards, setCards] = useState<CardResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');

  useEffect(() => {
    if (!user) return;
    cardsApi
      .getByEmployee(user.id)
      .then(setCards)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  // All-time lifetime points
  const allTimePoints = useMemo(
    () => cards.reduce((sum, c) => sum + (CARD_POINT_VALUES[c.cardType] || 0), 0),
    [cards]
  );

  // Current month string YYYY-MM
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
  }, []);

  // Current month points
  const currentMonthPoints = useMemo(() => {
    return cards
      .filter((c) => c.issuedAt.startsWith(currentMonthKey))
      .reduce((sum, c) => sum + (CARD_POINT_VALUES[c.cardType] || 0), 0);
  }, [cards, currentMonthKey]);

  // Group cards by month YYYY-MM
  const { groupedCards, monthKeys } = useMemo(() => {
    const groups: Record<string, CardResponseDto[]> = {};
    for (const card of cards) {
      const key = card.issuedAt.substring(0, 7); // YYYY-MM
      if (!groups[key]) groups[key] = [];
      groups[key].push(card);
    }
    const keys = Object.keys(groups).sort().reverse();
    return { groupedCards: groups, monthKeys: keys };
  }, [cards]);

  function formatMonthLabel(key: string) {
    const [year, month] = key.split('-').map(Number);
    const date = new Date(year, month - 1, 1);
    const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    if (key === currentMonthKey) {
      return `${label} (Current Month)`;
    }
    return label;
  }

  if (!user) return null;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">My Cards</h1>
          <p className="text-slate-400 text-sm mt-1">
            Performance card score and monthly history
          </p>
        </div>

        {/* Month Selector */}
        {cards.length > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Filter Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="input-field py-2 text-sm bg-slate-900 border-white/10 text-white font-medium min-w-[200px]"
            >
              <option value="ALL">📅 All Months (Grouped History)</option>
              {monthKeys.map((key) => (
                <option key={key} value={key}>
                  {formatMonthLabel(key)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Stats Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Current Month Box (Resets on 1st) */}
        <div className="glass-card p-6 sm:p-7 border border-indigo-500/30 bg-gradient-to-br from-indigo-900/20 via-slate-900/50 to-slate-900/80 relative overflow-hidden shadow-xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 tracking-wide uppercase">
                  Current Month Score
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span
                  className={`text-5xl font-black tracking-tight ${
                    currentMonthPoints >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {currentMonthPoints >= 0 ? '+' : ''}
                  {currentMonthPoints}
                </span>
                <span className="text-sm font-semibold text-slate-400">pts</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-2xl shadow-inner">
              🔄
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-400 font-medium">
            <span className="flex items-center gap-1.5 text-indigo-300">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
              Resets automatically on 1st of every month to 0
            </span>
            <span>{formatMonthLabel(currentMonthKey).replace(' (Current Month)', '')}</span>
          </div>
        </div>

        {/* All-Time Lifetime Box */}
        <div className="glass-card p-6 sm:p-7 border border-white/10 bg-slate-900/40 relative overflow-hidden shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                All-Time Lifetime Points
              </p>
              <div className="flex items-baseline gap-2 mt-2">
                <span
                  className={`text-4xl font-extrabold tracking-tight ${
                    allTimePoints >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}
                >
                  {allTimePoints >= 0 ? '+' : ''}
                  {allTimePoints}
                </span>
                <span className="text-sm font-semibold text-slate-500">pts</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-white/5 flex items-center justify-center text-2xl">
              🏆
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-white/5 text-xs text-slate-500 font-medium">
            Accumulated across all {cards.length} card{cards.length !== 1 ? 's' : ''} in permanent history
          </div>
        </div>
      </div>

      {/* Cards Display */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <div className="glass-card p-12 text-center border border-white/10">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 mx-auto flex items-center justify-center text-3xl mb-4">
            📭
          </div>
          <h3 className="text-lg font-bold text-white">No Performance Cards Yet</h3>
          <p className="text-slate-400 text-sm mt-1 max-w-md mx-auto">
            When your manager or HR issues you performance cards, they will appear here organized by month.
          </p>
        </div>
      ) : selectedMonth !== 'ALL' ? (
        /* Single Month View */
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/90 px-5 py-3.5 rounded-2xl border border-white/10 shadow-md">
            <div className="flex items-center gap-2.5">
              <span className="text-xl">📅</span>
              <h3 className="font-bold text-white text-base">{formatMonthLabel(selectedMonth)}</h3>
            </div>
            <span className="text-xs font-semibold text-slate-400 bg-white/5 px-3 py-1 rounded-full">
              {(groupedCards[selectedMonth] || []).length} card{(groupedCards[selectedMonth] || []).length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(groupedCards[selectedMonth] || []).map((card) => {
              const meta = cardMeta(card.cardType);
              const points = CARD_POINT_VALUES[card.cardType];
              return (
                <div
                  key={card.id}
                  className={`rounded-2xl border p-5 space-y-3 transition-all duration-200 hover:scale-[1.02] shadow-lg ${meta.bg} ${meta.border} ${meta.glow}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`badge ${meta.bg} ${meta.color} border ${meta.border}`}>
                      {meta.label}
                    </span>
                    <span className={`text-2xl font-extrabold ${meta.color}`}>
                      {points > 0 ? '+' : ''}
                      {points}
                    </span>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{card.reason}</p>
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/5">
                    <span>By {card.issuerName || 'Unknown'}</span>
                    <span>
                      {new Date(card.issuedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* All Months Grouped View */
        <div className="space-y-10">
          {monthKeys.map((key) => {
            const monthCards = groupedCards[key] || [];
            const monthNet = monthCards.reduce((sum, c) => sum + (CARD_POINT_VALUES[c.cardType] || 0), 0);
            return (
              <div key={key} className="space-y-4">
                <div className="flex items-center justify-between bg-gradient-to-r from-slate-900 via-slate-900/90 to-transparent px-6 py-4 rounded-2xl border border-white/10 shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📅</span>
                    <div>
                      <h3 className="font-extrabold text-white text-lg tracking-tight">
                        {formatMonthLabel(key)}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {monthCards.length} card{monthCards.length !== 1 ? 's' : ''} recorded during this month
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-xs text-slate-500 block uppercase font-bold tracking-wider">Month Score</span>
                      <span className={`font-black text-lg ${monthNet >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {monthNet >= 0 ? '+' : ''}{monthNet} pts
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {monthCards.map((card) => {
                    const meta = cardMeta(card.cardType);
                    const points = CARD_POINT_VALUES[card.cardType];
                    return (
                      <div
                        key={card.id}
                        className={`rounded-2xl border p-5 space-y-3 transition-all duration-200 hover:scale-[1.02] shadow-lg ${meta.bg} ${meta.border} ${meta.glow}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`badge ${meta.bg} ${meta.color} border ${meta.border}`}>
                            {meta.label}
                          </span>
                          <span className={`text-2xl font-extrabold ${meta.color}`}>
                            {points > 0 ? '+' : ''}
                            {points}
                          </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed">{card.reason}</p>
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-white/5">
                          <span>By {card.issuerName || 'Unknown'}</span>
                          <span>
                            {new Date(card.issuedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
