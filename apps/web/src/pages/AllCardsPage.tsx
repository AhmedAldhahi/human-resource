import React, { useEffect, useState } from 'react';
import { cardsApi } from '../api/client';
import { CardType, CARD_POINT_VALUES } from '@hrms/shared';
import type { CardResponseDto } from '@hrms/shared';

function cardBadge(type: CardType) {
  switch (type) {
    case CardType.BLUE_PLUS_30:
      return { label: 'Excellence', classes: 'bg-blue-500/20 text-blue-400' };
    case CardType.GREEN_PLUS_10:
      return { label: 'Good Work', classes: 'bg-emerald-500/20 text-emerald-400' };
    case CardType.YELLOW_MINUS_10:
      return {
        label: 'Needs Improvement',
        classes: 'bg-amber-500/20 text-amber-400',
      };
    case CardType.RED_MINUS_30:
      return { label: 'Violation', classes: 'bg-red-500/20 text-red-400' };
  }
}

const FILTER_OPTIONS: { label: string; value: CardType | 'ALL' }[] = [
  { label: 'All Types', value: 'ALL' },
  { label: 'Excellence (+30)', value: CardType.BLUE_PLUS_30 },
  { label: 'Good Work (+10)', value: CardType.GREEN_PLUS_10 },
  { label: 'Needs Improvement (-10)', value: CardType.YELLOW_MINUS_10 },
  { label: 'Violation (-30)', value: CardType.RED_MINUS_30 },
];

export default function AllCardsPage() {
  const [cards, setCards] = useState<CardResponseDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<CardType | 'ALL'>('ALL');

  useEffect(() => {
    cardsApi
      .getAll()
      .then(setCards)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === 'ALL' ? cards : cards.filter((c) => c.cardType === filter);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">All Cards</h1>
          <p className="text-slate-400 mt-1">
            Performance cards across the organization ({cards.length} total)
          </p>
        </div>

        {/* Filter */}
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as CardType | 'ALL')}
          className="input-field w-full sm:w-64"
        >
          {FILTER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-400">
            {filter !== 'ALL'
              ? 'No cards match this filter.'
              : 'No performance cards issued yet.'}
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Card Type
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Points
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Issued By
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filtered.map((card) => {
                  const badge = cardBadge(card.cardType);
                  const points = CARD_POINT_VALUES[card.cardType];
                  return (
                    <tr
                      key={card.id}
                      className="hover:bg-white/5 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 text-white font-medium whitespace-nowrap">
                        {card.employeeName || card.employeeId}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`badge ${badge.classes}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`font-semibold ${
                            points > 0 ? 'text-emerald-400' : 'text-red-400'
                          }`}
                        >
                          {points > 0 ? '+' : ''}
                          {points}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-300 max-w-xs truncate">
                        {card.reason}
                      </td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                        {card.issuerName || card.issuerId}
                      </td>
                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                        {new Date(card.issuedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
