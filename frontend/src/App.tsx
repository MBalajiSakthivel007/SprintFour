import React, { useState, useCallback, useEffect, useRef } from 'react';
import './index.css';
import { AnalyzeResponse, PIISpan } from './types';
import { analyzeDocument, checkHealth } from './services/api';
import { usePIICorrections } from './hooks/usePIICorrections';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { DocumentEditor } from './components/DocumentEditor';
import { FalsePositivePanel, DangerZonePanel } from './components/ReviewPanels';
import { ReviewGate } from './components/ReviewGate';

// ---------------------------------------------------------------------------
// App state machine
// ---------------------------------------------------------------------------
type AppState = 'landing' | 'loading' | 'reviewing' | 'gate' | 'finalized';

export default function App() {
  const [appState, setAppState] = useState<AppState>('landing');
  const [documentText, setDocumentText] = useState('');
  const [session, setSession] = useState<AnalyzeResponse | null>(null);
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Analyzing document...');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const allSpansOrderedRef = useRef<PIISpan[]>([]);

  const {
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
    correctionCount,
  } = usePIICorrections(session?.sessionId ?? '');

  // Check backend health on mount
  useEffect(() => {
    checkHealth()
      .then((h) => setGeminiAvailable(h.geminiConfigured))
      .catch(() => {}); // backend might not be up yet, that's fine
  }, []);

  // Build ordered list of all spans for Tab navigation
  useEffect(() => {
    if (session) {
      allSpansOrderedRef.current = [...session.spans].sort(
        (a, b) => a.startIndex - b.startIndex
      );
    }
  }, [session]);

  // ---------------------------------------------------------------------------
  // Navigation: Tab through spans
  // ---------------------------------------------------------------------------
  const focusNextSpan = useCallback(() => {
    const spans = allSpansOrderedRef.current;
    if (!spans.length) return;
    const idx = spans.findIndex((s) => s.id === focusedSpanId);
    const next = spans[(idx + 1) % spans.length];
    setFocusedSpanId(next.id);
    document.getElementById(`card-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    document.getElementById(`span-${next.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [focusedSpanId, setFocusedSpanId]);

  const focusPrevSpan = useCallback(() => {
    const spans = allSpansOrderedRef.current;
    if (!spans.length) return;
    const idx = spans.findIndex((s) => s.id === focusedSpanId);
    const prev = spans[(idx - 1 + spans.length) % spans.length];
    setFocusedSpanId(prev.id);
    document.getElementById(`card-${prev.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [focusedSpanId, setFocusedSpanId]);

  // Action on focused span
  const actOnFocused = useCallback((action: 'accept' | 'restore' | 'add' | 'dismiss') => {
    if (!focusedSpanId) return;
    if (action === 'accept') acceptRedaction(focusedSpanId);
    if (action === 'restore') restoreRedaction(focusedSpanId);
    if (action === 'add') addRedaction(focusedSpanId);
    if (action === 'dismiss') dismissMiss(focusedSpanId);
    // Auto-advance to next span after action
    setTimeout(focusNextSpan, 80);
  }, [focusedSpanId, acceptRedaction, restoreRedaction, addRedaction, dismissMiss, focusNextSpan]);

  // ---------------------------------------------------------------------------
  // Keyboard shortcuts
  // ---------------------------------------------------------------------------
  useKeyboardShortcuts(
    {
      tab: focusNextSpan,
      arrowdown: focusNextSpan,
      arrowup: focusPrevSpan,
      a: () => actOnFocused('accept'),
      r: () => actOnFocused('restore'),
      m: () => actOnFocused('add'),
      d: () => actOnFocused('dismiss'),
    },
    appState === 'reviewing'
  );

  // ---------------------------------------------------------------------------
  // Analyze document
  // ---------------------------------------------------------------------------
  const handleAnalyze = useCallback(async () => {
    setAppState('loading');
    setLoadingMessage('Sending document for analysis...');
    setErrorMessage(null);

    try {
      setLoadingMessage(
        geminiAvailable
          ? '✨ Gemini is detecting PII...'
          : '🔧 Running mock PII detection...'
      );
      const result = await analyzeDocument(documentText);
      setSession(result);
      setAppState('reviewing');
      // Auto-focus first span
      const firstSpan = [...result.spans].sort((a, b) => a.startIndex - b.startIndex)[0];
      if (firstSpan) setFocusedSpanId(firstSpan.id);
    } catch (err) {
      setErrorMessage((err as Error).message ?? 'Something went wrong');
      setAppState('landing');
    }
  }, [documentText, geminiAvailable, setFocusedSpanId]);

  const handleUseSample = useCallback(() => {
    setDocumentText(''); // Empty = use server sample
    handleAnalyze();
  }, [handleAnalyze]);

  // ---------------------------------------------------------------------------
  // Finalize flow
  // ---------------------------------------------------------------------------
  const handleRequestFinalize = useCallback(() => {
    setAppState('gate');
  }, []);

  const handleFinalizeConfirm = useCallback(async () => {
    await persistCorrections();
    setAppState('finalized');
  }, [persistCorrections]);

  const handleGateBack = useCallback(() => {
    setAppState('reviewing');
  }, []);

  const handleReset = useCallback(() => {
    setSession(null);
    setDocumentText('');
    setAppState('landing');
  }, []);

  // ---------------------------------------------------------------------------
  // Derived values for review state
  // ---------------------------------------------------------------------------
  const redactedSpans = session?.spans.filter((s) => s.isRedacted) ?? [];
  const missedSpans = session?.spans.filter((s) => !s.isRedacted) ?? [];
  const pendingSpans = session ? getPendingSpans(session.spans) : [];
  const dangerousUnchecked = session ? getDangerousUnchecked(session.spans) : [];
  const reviewedCount = (session?.spans.length ?? 0) - pendingSpans.length;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header__logo">
          <div className="header__logo-icon">🔍</div>
          <div>
            <div className="header__title">FixIt</div>
            <div className="header__subtitle">PII Correction Experience · Sprintfour 2026</div>
          </div>
        </div>
        <div className="header__status">
          <div className={`header__status-dot ${geminiAvailable ? '' : 'header__status-dot--mock'}`} />
          {geminiAvailable ? 'Gemini AI active' : 'Mock mode'}
          {appState === 'reviewing' && (
            <>
              <span style={{ color: 'var(--border-default)' }}>·</span>
              <span>{correctionCount} corrections made</span>
              <button
                className="btn btn--primary btn--sm"
                onClick={handleRequestFinalize}
                id="finalize-btn"
              >
                Finalize →
              </button>
            </>
          )}
        </div>
      </header>

      {/* Landing */}
      {appState === 'landing' && (
        <main className="upload-page">
          <div className="upload-page__hero">
            <div className="upload-page__eyebrow">Problem 3 · Fixing the Tool's Mistakes</div>
            <h1 className="upload-page__heading">
              Catch what the AI <span>missed</span>.
              <br />
              Fix what it got <span>wrong</span>.
            </h1>
            <p className="upload-page__description">
              Review AI-suggested PII redactions. The tool has made mistakes — some things are
              over-redacted, and some sensitive information was left visible. Your job is to
              correct both, quickly.
            </p>
          </div>

          <div className="upload-zone">
            <div className="upload-zone__icon">📋</div>
            <div className="upload-zone__label">Paste your document</div>
            <div className="upload-zone__sublabel">
              Or use the built-in sample legal document (recommended for demo)
            </div>
            <textarea
              className="upload-textarea"
              value={documentText}
              onChange={(e) => setDocumentText(e.target.value)}
              placeholder="Paste document text here, or leave empty to use sample document..."
              id="document-input"
              aria-label="Document text input"
            />
            {errorMessage && (
              <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>
                ⚠️ {errorMessage}
              </div>
            )}
            <div className="upload-zone__actions">
              <button
                className="btn btn--secondary"
                onClick={handleUseSample}
                id="use-sample-btn"
              >
                Use sample document
              </button>
              <button
                className="btn btn--primary"
                onClick={handleAnalyze}
                disabled={!documentText.trim()}
                id="analyze-btn"
              >
                ✨ Analyze document
              </button>
            </div>
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', justifyContent: 'center' }}>
            <LegendItem color="var(--accent-primary)" label="Tool-redacted span" />
            <LegendItem color="var(--danger)" label="Suspected missed PII" pulse />
            <LegendItem color="var(--success)" label="Accepted redaction" />
            <LegendItem color="var(--text-muted)" label="Restored / dismissed" />
          </div>
        </main>
      )}

      {/* Loading */}
      {appState === 'loading' && (
        <div className="loading-screen">
          <div className="loading-spinner" />
          <div className="loading-text">{loadingMessage}</div>
          <div className="loading-subtext">This takes 2–5 seconds</div>
        </div>
      )}

      {/* Review */}
      {appState === 'reviewing' && session && (
        <div className="review-layout">
          <FalsePositivePanel
            spans={redactedSpans}
            getSpanStatus={getSpanStatus}
            focusedSpanId={focusedSpanId}
            onFocus={(s) => setFocusedSpanId(s.id)}
            onAccept={acceptRedaction}
            onRestore={restoreRedaction}
          />
          <DocumentEditor
            documentText={session.documentText}
            spans={session.spans}
            getSpanStatus={getSpanStatus}
            focusedSpanId={focusedSpanId}
            onSpanClick={(s) => setFocusedSpanId(s.id)}
            totalSpans={session.spans.length}
            reviewedCount={reviewedCount}
            documentName={session.documentName}
            analysisMode={session.analysisMode}
          />
          <DangerZonePanel
            spans={missedSpans}
            getSpanStatus={getSpanStatus}
            focusedSpanId={focusedSpanId}
            onFocus={(s) => setFocusedSpanId(s.id)}
            onAdd={addRedaction}
            onDismiss={dismissMiss}
          />
        </div>
      )}

      {/* Review Gate */}
      {appState === 'gate' && session && (
        <>
          {/* Keep review visible behind the modal */}
          <div className="review-layout" style={{ filter: 'blur(2px)', pointerEvents: 'none' }}>
            <FalsePositivePanel
              spans={redactedSpans}
              getSpanStatus={getSpanStatus}
              focusedSpanId={null}
              onFocus={() => {}}
              onAccept={() => {}}
              onRestore={() => {}}
            />
            <DocumentEditor
              documentText={session.documentText}
              spans={session.spans}
              getSpanStatus={getSpanStatus}
              focusedSpanId={null}
              onSpanClick={() => {}}
              totalSpans={session.spans.length}
              reviewedCount={reviewedCount}
              analysisMode={session.analysisMode}
            />
            <DangerZonePanel
              spans={missedSpans}
              getSpanStatus={getSpanStatus}
              focusedSpanId={null}
              onFocus={() => {}}
              onAdd={() => {}}
              onDismiss={() => {}}
            />
          </div>
          <ReviewGate
            dangerousUnchecked={dangerousUnchecked}
            pendingCount={pendingSpans.length}
            onProceed={handleFinalizeConfirm}
            onGoBack={handleGateBack}
          />
        </>
      )}

      {/* Finalized */}
      {appState === 'finalized' && session && (
        <div className="finalized-screen">
          <div className="finalized-icon">🎉</div>
          <h1 className="finalized-title">Document finalized</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, maxWidth: 420, textAlign: 'center' }}>
            Your corrections have been saved. The document has been reviewed for PII.
          </p>
          <div className="finalized-stats">
            <div className="stat-card">
              <div className="stat-card__value" style={{ color: 'var(--accent-primary)' }}>
                {session.spans.filter((s) => s.isRedacted).length}
              </div>
              <div className="stat-card__label">Tool Redactions</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value" style={{ color: 'var(--danger)' }}>
                {session.spans.filter((s) => !s.isRedacted).length}
              </div>
              <div className="stat-card__label">Missed PII Found</div>
            </div>
            <div className="stat-card">
              <div className="stat-card__value" style={{ color: 'var(--success)' }}>
                {correctionCount}
              </div>
              <div className="stat-card__label">Corrections Made</div>
            </div>
          </div>
          {isSaving && <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Saving...</p>}
          <button className="btn btn--secondary" onClick={handleReset} id="review-another-btn">
            ← Review another document
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Small helper component
// ---------------------------------------------------------------------------
const LegendItem: React.FC<{ color: string; label: string; pulse?: boolean }> = ({
  color,
  label,
  pulse,
}) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
    <div
      style={{
        width: 12,
        height: 12,
        borderRadius: 3,
        background: color,
        opacity: 0.7,
        animation: pulse ? 'missed-pulse 1.8s ease-in-out infinite' : undefined,
      }}
    />
    {label}
  </div>
);
