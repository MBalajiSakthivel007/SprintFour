import React from 'react';
import { PIISpan, SpanStatus } from '../types';
import { PIITypeBadge, ConfidenceBar } from './PIIBadge';

interface FalsePositivePanelProps {
  spans: PIISpan[];       // Only isRedacted=true spans
  getSpanStatus: (span: PIISpan) => SpanStatus;
  focusedSpanId: string | null;
  onFocus: (span: PIISpan) => void;
  onAccept: (spanId: string) => void;
  onRestore: (spanId: string) => void;
}

/**
 * Left panel — shows all tool-redacted spans.
 * Separates them into "confirmed" vs "suspicious" (low confidence = potential false positives).
 */
export const FalsePositivePanel: React.FC<FalsePositivePanelProps> = ({
  spans,
  getSpanStatus,
  focusedSpanId,
  onFocus,
  onAccept,
  onRestore,
}) => {
  const suspicious = spans.filter((s) => s.confidence < 0.65);
  const solid = spans.filter((s) => s.confidence >= 0.65);

  const pendingCount = spans.filter((s) => {
    const st = getSpanStatus(s);
    return st === 'redacted-pending';
  }).length;

  return (
    <div className="fp-panel">
      <div className="panel__header">
        <div className="panel__title">Tool Redactions</div>
        <div>
          <span className="panel__count">{spans.length}</span>
          <span className="panel__count-label">
            {' '}items &nbsp;·&nbsp; {pendingCount} pending
          </span>
        </div>
      </div>

      <div className="panel__body">
        {/* Suspicious / possible false positives first */}
        {suspicious.length > 0 && (
          <>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)', letterSpacing: '0.8px', textTransform: 'uppercase', padding: '4px 0' }}>
              ⚠️ Possible false positives ({suspicious.length})
            </div>
            {suspicious.map((span) => (
              <SpanCard
                key={span.id}
                span={span}
                status={getSpanStatus(span)}
                isFocused={focusedSpanId === span.id}
                onFocus={() => onFocus(span)}
                onAccept={() => onAccept(span.id)}
                onRestore={() => onRestore(span.id)}
                variant="fp"
              />
            ))}
            {solid.length > 0 && (
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.8px', textTransform: 'uppercase', padding: '4px 0', marginTop: 8 }}>
                ✅ High-confidence ({solid.length})
              </div>
            )}
          </>
        )}
        {solid.map((span) => (
          <SpanCard
            key={span.id}
            span={span}
            status={getSpanStatus(span)}
            isFocused={focusedSpanId === span.id}
            onFocus={() => onFocus(span)}
            onAccept={() => onAccept(span.id)}
            onRestore={() => onRestore(span.id)}
            variant="fp"
          />
        ))}
        {spans.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">🎉</div>
            <div className="empty-state__text">No tool redactions to review</div>
          </div>
        )}
      </div>

      {/* Keyboard hints at bottom of left panel */}
      <div className="kbd-hints">
        <div className="kbd-hint"><span className="kbd">A</span> Accept</div>
        <div className="kbd-hint"><span className="kbd">R</span> Restore</div>
        <div className="kbd-hint"><span className="kbd">Tab</span> Next</div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------

interface DangerZonePanelProps {
  spans: PIISpan[];       // Only isRedacted=false spans (missed PII)
  getSpanStatus: (span: PIISpan) => SpanStatus;
  focusedSpanId: string | null;
  onFocus: (span: PIISpan) => void;
  onAdd: (spanId: string) => void;
  onDismiss: (spanId: string) => void;
}

/**
 * Right panel — shows suspected missed PII.
 * These are the dangerous items Sam might skip over.
 */
export const DangerZonePanel: React.FC<DangerZonePanelProps> = ({
  spans,
  getSpanStatus,
  focusedSpanId,
  onFocus,
  onAdd,
  onDismiss,
}) => {
  const pendingCount = spans.filter((s) => getSpanStatus(s) === 'missed-pending').length;

  return (
    <div className="danger-panel">
      <div className="danger-panel__header">
        <div className="danger-badge">
          Missed PII — Danger Zone
        </div>
        <div>
          <span className="panel__count" style={{ color: pendingCount > 0 ? 'var(--danger)' : 'var(--text-primary)' }}>
            {pendingCount}
          </span>
          <span className="panel__count-label"> unreviewed</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
          Things the tool left visible that may be sensitive
        </div>
      </div>

      <div className="panel__body">
        {spans.map((span) => (
          <SpanCard
            key={span.id}
            span={span}
            status={getSpanStatus(span)}
            isFocused={focusedSpanId === span.id}
            onFocus={() => onFocus(span)}
            onAdd={() => onAdd(span.id)}
            onDismiss={() => onDismiss(span.id)}
            variant="miss"
          />
        ))}
        {spans.length === 0 && (
          <div className="empty-state">
            <div className="empty-state__icon">✅</div>
            <div className="empty-state__text">No missed PII detected</div>
          </div>
        )}
      </div>

      <div className="kbd-hints">
        <div className="kbd-hint"><span className="kbd">M</span> Mark PII</div>
        <div className="kbd-hint"><span className="kbd">D</span> Dismiss</div>
      </div>
    </div>
  );
};

// -------------------------------------------------------------------------

interface SpanCardProps {
  span: PIISpan;
  status: SpanStatus;
  isFocused: boolean;
  onFocus: () => void;
  onAccept?: () => void;
  onRestore?: () => void;
  onAdd?: () => void;
  onDismiss?: () => void;
  variant: 'fp' | 'miss';
}

const SpanCard: React.FC<SpanCardProps> = ({
  span,
  status,
  isFocused,
  onFocus,
  onAccept,
  onRestore,
  onAdd,
  onDismiss,
}) => {
  const isResolved =
    status === 'redacted-accepted' ||
    status === 'redacted-restored' ||
    status === 'missed-added' ||
    status === 'missed-dismissed';

  const isDangerous = status === 'missed-pending' || 
    (status === 'redacted-pending' && span.confidence < 0.5);

  return (
    <div
      className={[
        'span-card',
        isFocused ? 'span-card--focused' : '',
        isDangerous ? 'span-card--danger' : '',
        isResolved ? 'span-card--resolved' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onFocus}
      id={`card-${span.id}`}
    >
      <PIITypeBadge type={span.type} />
      <div className="span-card__text">"{span.text}"</div>
      <div className="span-card__reason">{span.reason}</div>
      <ConfidenceBar value={span.confidence} />

      {/* Status label */}
      {isResolved && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          {status === 'redacted-accepted' && '✅ Accepted'}
          {status === 'redacted-restored' && '↩️ Restored'}
          {status === 'missed-added' && '🔴 Marked as PII'}
          {status === 'missed-dismissed' && '🚫 Dismissed'}
        </div>
      )}

      {/* Actions — only shown when not resolved */}
      {!isResolved && (
        <div className="span-card__actions">
          {onAccept && (
            <button className="btn btn--sm btn--success" onClick={(e) => { e.stopPropagation(); onAccept(); }}>
              ✓ Accept
            </button>
          )}
          {onRestore && (
            <button className="btn btn--sm btn--secondary" onClick={(e) => { e.stopPropagation(); onRestore(); }}>
              ↩ Restore
            </button>
          )}
          {onAdd && (
            <button className="btn btn--sm btn--danger" onClick={(e) => { e.stopPropagation(); onAdd(); }}>
              🔴 Mark PII
            </button>
          )}
          {onDismiss && (
            <button className="btn btn--sm btn--ghost" onClick={(e) => { e.stopPropagation(); onDismiss(); }}>
              Dismiss
            </button>
          )}
        </div>
      )}
    </div>
  );
};
