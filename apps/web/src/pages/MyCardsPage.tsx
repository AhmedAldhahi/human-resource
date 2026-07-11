import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { cardsApi } from '../api/client';
import { CardType, CARD_POINT_VALUES } from '@hrms/shared';
import type { CardResponseDto } from '@hrms/shared';

function cardMeta(type: CardType) {
  switch (type) {
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

  useEffect(() => {
    if (!user) return;
    cardsApi
      .getByEmployee(user.id)
      .then(setCards)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const netPoints = cards.reduce(
    (sum, card) => sum + CARD_POINT_VALUES[card.cardType],
    0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">My Cards</h1>
        <p className="text-slate-400 mt-1">Your performance card history</p>
      </div>

      {/* Net Points */}
      <div className="glass-card p-6 sm:p-8 max-w-sm">
        <p className="text-sm font-medium text-slate-400 mb-2">
          Net Performance Points
        </p>
        <div className="flex items-baseline gap-2">
          <span
            className={`text-5xl font-extrabold ${
              netPoints >= 0 ? 'text-emerald-400' : 'text-red-400'
            }`}
          >
            {netPoints >= 0 ? '+' : ''}
            {netPoints}
          </span>
          <span className="text-sm text-slate-500">points</span>
        </div>
        <p className="text-xs text-slate-500 mt-2">
          From {cards.length} card{cards.length !== 1 ? 's' : ''} received
        </p>
      </div>

      {/* Cards Grid */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
        </div>
      ) : cards.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-slate-400">
            You haven&rsquo;t received any performance cards yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cards.map((card) => {
            const meta = cardMeta(card.cardType);
            const points = CARD_POINT_VALUES[card.cardType];
            return (
              <div
                key={card.id}
                className={`rounded-2xl border p-5 space-y-3 transition-all duration-200 hover:scale-[1.02] shadow-lg ${meta.bg} ${meta.border} ${meta.glow}`}
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <span className={`badge ${meta.bg} ${meta.color} border ${meta.border}`}>
                    {meta.label}
                  </span>
                  <span className={`text-2xl font-extrabold ${meta.color}`}>
                    {points > 0 ? '+' : ''}
                    {points}
                  </span>
                </div>

                {/* Reason */}
                <p className="text-sm text-slate-300 leading-relaxed">
                  {card.reason}
                </p>

                {/* Footer */}
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
      )}
    </div>
  );
}
