// Shared TypeScript interfaces — frontend mirror of backend types
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

export interface PIISpan {
  id: string;
  text: string;
  startIndex: number;
  endIndex: number;
  type: PIIType;
  confidence: number;
  reason: string;
  isRedacted: boolean;
}

export type CorrectionAction =
  | 'ACCEPTED'
  | 'RESTORED'
  | 'ADDED'
  | 'DISMISSED'
  | 'PENDING';

export interface Correction {
  spanId: string;
  action: CorrectionAction;
  timestamp: string;
}

export interface AnalyzeResponse {
  sessionId: string;
  documentText: string;
  spans: PIISpan[];
  analysisMode: 'gemini' | 'mock';
  analyzedAt: string;
  documentName?: string;
}

export interface SessionSummary {
  sessionId: string;
  totalSpans: number;
  redactedCount: number;
  missedCount: number;
  correctedCount: number;
  pendingCount: number;
  corrections: Correction[];
}

// UI state per span (enriched from correction state)
export type SpanStatus =
  | 'redacted-accepted'    // Tool redacted it, user confirmed
  | 'redacted-pending'     // Tool redacted it, user hasn't reviewed
  | 'redacted-restored'    // Tool redacted it, user restored (false positive)
  | 'missed-pending'       // Tool missed it, user hasn't acted
  | 'missed-added'         // Tool missed it, user added redaction
  | 'missed-dismissed';    // Tool missed it, user dismissed (not PII)
