import { useState, useCallback } from 'react';
import type { PIISpan, Correction, CorrectionAction, SpanStatus } from '../types';
import { saveCorrections as apiSaveCorrections } from '../services/api';

/**
 * Manages the correction state for a single review session.
 * Provides helpers to accept, restore, add, and dismiss spans,
 * and tracks which spans are still pending review.
 */
export function usePIICorrections(sessionId: string) {
  const [corrections, setCorrections] = useState<Map<string, Correction>>(new Map());
  const [focusedSpanId, setFocusedSpanId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  /**
   * Applies a correction action to a span.
   */
  const applyCorrection = useCallback(
    (spanId: string, action: CorrectionAction) => {
      setCorrections((prev) => {
        const next = new Map(prev);
        next.set(spanId, {
          spanId,
          action,
          timestamp: new Date().toISOString(),
        });
        return next;
      });
    },
    []
  );

  const acceptRedaction = useCallback(
    (spanId: string) => applyCorrection(spanId, 'ACCEPTED'),
    [applyCorrection]
  );

  const restoreRedaction = useCallback(
    (spanId: string) => applyCorrection(spanId, 'RESTORED'),
    [applyCorrection]
  );

  const addRedaction = useCallback(
    (spanId: string) => applyCorrection(spanId, 'ADDED'),
    [applyCorrection]
  );

  const dismissMiss = useCallback(
    (spanId: string) => applyCorrection(spanId, 'DISMISSED'),
    [applyCorrection]
  );

  /**
   * Derives the display status of a span based on its original state + correction.
   */
  const getSpanStatus = useCallback(
    (span: PIISpan): SpanStatus => {
      const correction = corrections.get(span.id);

      if (span.isRedacted) {
        if (!correction) return 'redacted-pending';
        if (correction.action === 'ACCEPTED') return 'redacted-accepted';
        if (correction.action === 'RESTORED') return 'redacted-restored';
        return 'redacted-pending';
      } else {
        if (!correction) return 'missed-pending';
        if (correction.action === 'ADDED') return 'missed-added';
        if (correction.action === 'DISMISSED') return 'missed-dismissed';
        return 'missed-pending';
      }
    },
    [corrections]
  );

  /**
   * Returns spans that are still pending review.
   */
  const getPendingSpans = useCallback(
    (spans: PIISpan[]): PIISpan[] =>
      spans.filter((span) => {
        const status = getSpanStatus(span);
        return status === 'redacted-pending' || status === 'missed-pending';
      }),
    [getSpanStatus]
  );

  /**
   * Returns low-confidence redacted spans still pending (the dangerous ones Sam might miss).
   */
  const getDangerousUnchecked = useCallback(
    (spans: PIISpan[]): PIISpan[] =>
      spans.filter((span) => {
        const status = getSpanStatus(span);
        return (
          (status === 'missed-pending' ||
            (status === 'redacted-pending' && span.confidence < 0.65)) 
        );
      }),
    [getSpanStatus]
  );

  /**
   * Saves all corrections to the backend.
   */
  const persistCorrections = useCallback(async () => {
    setIsSaving(true);
    try {
      await apiSaveCorrections(sessionId, Array.from(corrections.values()));
    } finally {
      setIsSaving(false);
    }
  }, [sessionId, corrections]);

  return {
    corrections,
    focusedSpanId,
    setFocusedSpanId,
    isSaving,
    acceptRedaction,
    restoreRedaction,
    addRedaction,
    dismissMiss,
    getSpanStatus,
    getPendingSpans,
    getDangerousUnchecked,
    persistCorrections,
    correctionCount: corrections.size,
  };
}
