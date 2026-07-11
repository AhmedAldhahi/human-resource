import React, { useState } from 'react';
import IssueCardModal from '../components/IssueCardModal';

export default function IssueCardPage() {
  /* This page simply opens the modal in a full-page context */
  const [modalOpen, setModalOpen] = useState(true);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white">Issue Card</h1>
        <p className="text-slate-400 mt-1">
          Issue a performance card to an employee
        </p>
      </div>

      {!modalOpen && (
        <div className="glass-card p-12 text-center space-y-4 max-w-lg">
          <p className="text-slate-400">
            Click the button below to issue a new performance card.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="gradient-btn inline-flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 4v16m8-8H4"
              />
            </svg>
            Issue New Card
          </button>
        </div>
      )}

      <IssueCardModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
