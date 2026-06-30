// Shared TypeScript interfaces for FixIt application
// Balaji Sakthivel Marimuthu — Sprintfour Hackathon 2026

export type PIIType =
  | 'NAME'
  | 'EMAIL'
  | 'PHONE'
  | 'ADDRESS'
  | 'DATE_OF_BIRTH'
  | 'ID_NUMBER'
  | 'FINANCIAL'
  | 'ORGANIZATION'
  | 'OTHER';

/**
 * A single detected PII span in a document.
 */
export interface PIISpan {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  type: PIIType;
  /** Confidence score from 0.0 to 1.0 */
  confidence: number;
  /** Human-readable explanation of why this was flagged */
  reason: string;
  /** Whether the tool originally redacted this (true) or left it visible (false = suspected miss) */
  isRedacted: boolean;
}

/**
 * User's correction decision for a single PII span.
 */
export type CorrectionAction =
  | 'ACCEPTED'       // User confirmed redaction is correct
  | 'RESTORED'       // User removed redaction (was false positive)
  | 'ADDED'          // User added redaction to missed PII
  | 'DISMISSED'      // User dismissed suspected miss (it's not actually PII)
  | 'PENDING';       // Not yet reviewed

export interface Correction {
  spanId: string;
  action: CorrectionAction;
  timestamp: string;
}

/**
 * Request body for document analysis.
 */
export interface AnalyzeRequest {
  documentText: string;
  documentName?: string;
}

/**
 * Response from the analyze endpoint.
 */
export interface AnalyzeResponse {
  sessionId: string;
  documentText: string;
  spans: PIISpan[];
  analysisMode: 'gemini' | 'mock';
  analyzedAt: string;
  documentName?: string;
}

/**
 * Request body to save corrections.
 */
export interface SaveCorrectionsRequest {
  sessionId: string;
  corrections: Correction[];
}

/**
 * Summary stats for a review session.
 */
export interface SessionSummary {
  sessionId: string;
  totalSpans: number;
  redactedCount: number;
  missedCount: number;
  correctedCount: number;
  pendingCount: number;
  corrections: Correction[];
}
