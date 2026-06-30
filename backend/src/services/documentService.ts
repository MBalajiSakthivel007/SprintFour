import { v4 as uuidv4 } from 'uuid';
import { AnalyzeResponse, Correction, SessionSummary } from '../types';

// In-memory session store (suitable for hackathon prototype)
// In production, this would be a database
const sessions = new Map<string, AnalyzeResponse>();
const corrections = new Map<string, Correction[]>();

/**
 * Creates and stores a new analysis session.
 */
export function createSession(data: Omit<AnalyzeResponse, 'sessionId'>): AnalyzeResponse {
  const sessionId = uuidv4();
  const session: AnalyzeResponse = { sessionId, ...data };
  sessions.set(sessionId, session);
  corrections.set(sessionId, []);
  return session;
}

/**
 * Retrieves a session by ID.
 */
export function getSession(sessionId: string): AnalyzeResponse | undefined {
  return sessions.get(sessionId);
}

/**
 * Saves corrections for a session (upsert by spanId).
 */
export function saveCorrections(sessionId: string, newCorrections: Correction[]): void {
  const existing = corrections.get(sessionId) ?? [];

  // Upsert: replace existing correction for same spanId
  const merged = [...existing];
  for (const correction of newCorrections) {
    const idx = merged.findIndex((c) => c.spanId === correction.spanId);
    if (idx >= 0) {
      merged[idx] = correction;
    } else {
      merged.push(correction);
    }
  }

  corrections.set(sessionId, merged);
}

/**
 * Returns a summary of review progress for a session.
 */
export function getSessionSummary(sessionId: string): SessionSummary | null {
  const session = sessions.get(sessionId);
  if (!session) return null;

  const sessionCorrections = corrections.get(sessionId) ?? [];
  const correctedIds = new Set(sessionCorrections.map((c) => c.spanId));

  return {
    sessionId,
    totalSpans: session.spans.length,
    redactedCount: session.spans.filter((s) => s.isRedacted).length,
    missedCount: session.spans.filter((s) => !s.isRedacted).length,
    correctedCount: correctedIds.size,
    pendingCount: session.spans.length - correctedIds.size,
    corrections: sessionCorrections,
  };
}
