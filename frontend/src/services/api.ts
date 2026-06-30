import type { AnalyzeResponse, Correction, SessionSummary } from '../types';

const BASE_URL = 'http://localhost:3001/api';

/**
 * Checks backend health and Gemini configuration status.
 */
export async function checkHealth(): Promise<{ status: string; geminiConfigured: boolean }> {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

/**
 * Sends document text to the backend for PII analysis.
 * Pass empty string to use the built-in sample document.
 */
export async function analyzeDocument(
  documentText: string,
  documentName?: string
): Promise<AnalyzeResponse> {
  const res = await fetch(`${BASE_URL}/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ documentText, documentName }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Analysis failed');
  }

  return res.json();
}

/**
 * Saves user corrections for a session.
 */
export async function saveCorrections(
  sessionId: string,
  corrections: Correction[]
): Promise<{ success: boolean; summary: SessionSummary }> {
  const res = await fetch(`${BASE_URL}/corrections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, corrections }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? 'Failed to save corrections');
  }

  return res.json();
}

/**
 * Retrieves a session summary by ID.
 */
export async function getSessionSummary(sessionId: string): Promise<SessionSummary> {
  const res = await fetch(`${BASE_URL}/corrections/${sessionId}`);
  if (!res.ok) throw new Error('Session not found');
  return res.json();
}
