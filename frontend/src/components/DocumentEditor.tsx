import React, { useMemo } from 'react';
import { PIISpan, SpanStatus } from '../types';
import { PIITypeBadge } from './PIIBadge';

interface DocumentEditorProps {
  documentText: string;
  spans: PIISpan[];
  getSpanStatus: (span: PIISpan) => SpanStatus;
  focusedSpanId: string | null;
  onSpanClick: (span: PIISpan) => void;
  totalSpans: number;
  reviewedCount: number;
  documentName?: string;
  analysisMode: 'gemini' | 'mock';
}

/**
 * Renders the document with inline PII highlights.
 * Splits the plain text into segments (plain text + highlighted spans)
 * by sorting spans by startIndex and interleaving plain text in between.
 */
export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  documentText,
  spans,
  getSpanStatus,
  focusedSpanId,
  onSpanClick,
  totalSpans,
  reviewedCount,
  documentName,
  analysisMode,
}) => {
  // Sort spans by start index for rendering
  const sortedSpans = useMemo(
    () => [...spans].sort((a, b) => a.startIndex - b.startIndex),
    [spans]
  );

  // Build an array of segments: { type: 'text' | 'span', content, span? }
  const segments = useMemo(() => {
    const result: Array<
      | { kind: 'text'; content: string }
      | { kind: 'span'; span: PIISpan }
    > = [];

    let cursor = 0;
    for (const span of sortedSpans) {
      // Guard against overlapping or out-of-bounds spans
      if (span.startIndex < cursor || span.startIndex > documentText.length) continue;
      if (span.startIndex > cursor) {
        result.push({ kind: 'text', content: documentText.slice(cursor, span.startIndex) });
      }
      result.push({ kind: 'span', span });
      cursor = span.endIndex;
    }
    if (cursor < documentText.length) {
      result.push({ kind: 'text', content: documentText.slice(cursor) });
    }
    return result;
  }, [documentText, sortedSpans]);

  const progressPct = totalSpans > 0 ? Math.round((reviewedCount / totalSpans) * 100) : 0;

  return (
    <div className="document-panel">
      {/* Toolbar */}
      <div className="document-panel__toolbar">
        <div className="document-panel__toolbar-left">
          <span className="document-name">
            📄 {documentName ?? 'Legal Case Summary'}
          </span>
          <span className={`document-mode-badge document-mode-badge--${analysisMode}`}>
            {analysisMode === 'gemini' ? '✨ Gemini AI' : '🔧 Mock Mode'}
          </span>
        </div>
        <div className="document-panel__progress">
          <span className="progress-text">
            {reviewedCount} / {totalSpans} reviewed
          </span>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <span className="progress-text">{progressPct}%</span>
        </div>
      </div>

      {/* Document body */}
      <div className="document-body">
        <div className="document-content">
          {segments.map((seg, i) => {
            if (seg.kind === 'text') {
              return <React.Fragment key={i}>{seg.content}</React.Fragment>;
            }

            const { span } = seg;
            const status = getSpanStatus(span);
            const isFocused = focusedSpanId === span.id;

            return (
              <SpanHighlight
                key={span.id}
                span={span}
                status={status}
                isFocused={isFocused}
                onClick={() => onSpanClick(span)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface SpanHighlightProps {
  span: PIISpan;
  status: SpanStatus;
  isFocused: boolean;
  onClick: () => void;
}

const SpanHighlight: React.FC<SpanHighlightProps> = ({ span, status, isFocused, onClick }) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  const typeClass =
    status === 'missed-pending' || status === 'missed-added'
      ? ''
      : `highlight-${span.type}`;

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <span
        className={[
          'pii-highlight',
          `pii-highlight--${status}`,
          typeClass,
          isFocused ? 'pii-highlight--focused' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onClick={onClick}
        role="button"
        tabIndex={0}
        aria-label={`${span.type}: ${span.text}`}
        onKeyDown={(e) => e.key === 'Enter' && onClick()}
        id={`span-${span.id}`}
      >
        {span.text}
      </span>
      {showTooltip && (
        <span className="tooltip">
          <PIITypeBadge type={span.type} showIcon={false} />
          &nbsp;
          {span.reason}
        </span>
      )}
    </span>
  );
};
