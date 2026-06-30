import React from 'react';
import type { PIISpan } from '../types';

interface ReviewGateProps {
  dangerousUnchecked: PIISpan[];
  pendingCount: number;
  onProceed: () => void;
  onGoBack: () => void;
}

/**
 * Modal shown before finalizing — acts as a safety net for Sam.
 * Lists items he may have missed, forces a conscious decision.
 */
export const ReviewGate: React.FC<ReviewGateProps> = ({
  dangerousUnchecked,
  pendingCount,
  onProceed,
  onGoBack,
}) => {
  const hasDangers = dangerousUnchecked.length > 0 || pendingCount > 0;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="gate-title">
      <div className="modal">
        <span className="modal__icon">{hasDangers ? '⚠️' : '✅'}</span>
        <h2 className="modal__title" id="gate-title">
          {hasDangers ? 'You may have missed something' : 'Ready to finalize'}
        </h2>

        {hasDangers ? (
          <>
            <p className="modal__body">
              Before finalizing, here are items that need your attention. These are the mistakes that tend to slip through.
            </p>
            <ul className="modal__warning-list">
              {dangerousUnchecked.map((span) => (
                <li key={span.id} className="modal__warning-item">
                  <span>⚡</span>
                  <span>
                    <strong>{span.type}</strong>: "{span.text}"
                    {!span.isRedacted && ' — left visible by tool (possible missed PII)'}
                    {span.isRedacted && span.confidence < 0.65 && ' — low confidence redaction, unreviewed'}
                  </span>
                </li>
              ))}
              {pendingCount > dangerousUnchecked.length && (
                <li className="modal__warning-item">
                  <span>📋</span>
                  <span>{pendingCount - dangerousUnchecked.length} other items not yet reviewed</span>
                </li>
              )}
            </ul>
            <p className="modal__body" style={{ marginBottom: 0 }}>
              You can still proceed — but these are the mistakes that slip through when moving fast.
            </p>
          </>
        ) : (
          <p className="modal__body">
            You've reviewed all flagged items. The document is ready to be finalized and shared safely.
          </p>
        )}

        <div className="modal__actions">
          <button className="btn btn--secondary" onClick={onGoBack}>
            ← Go back and review
          </button>
          <button
            className={`btn ${hasDangers ? 'btn--danger' : 'btn--primary'}`}
            onClick={onProceed}
          >
            {hasDangers ? 'Proceed anyway' : '✓ Finalize document'}
          </button>
        </div>
      </div>
    </div>
  );
};
