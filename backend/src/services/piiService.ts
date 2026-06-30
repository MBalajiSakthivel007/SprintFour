import { GoogleGenerativeAI } from '@google/generative-ai';
import { v4 as uuidv4 } from 'uuid';
import { PIISpan, PIIType } from '../types';

// ---------------------------------------------------------------------------
// Mock data — used when no Gemini API key is configured.
// Realistic sample document with intentional false positives + missed PII.
// ---------------------------------------------------------------------------

export const SAMPLE_DOCUMENT = `LEGAL CASE SUMMARY — CASE NO. 2024-CR-08821

Client: James Harrington
Date of Birth: March 14, 1982
Contact: james.h.personal@gmail.com | (415) 293-7741
Address: 847 Maple Street, San Francisco, CA 94102

Referring Attorney: Sarah Mitchell
Firm: Mitchell & Associates Legal Group
Bar Number: CA-2019-04471

Financial Records:
  Bank Account: 3847291056 (Wells Fargo)
  Case Retainer: $15,000 USD
  Invoice Date: 14 January 2024

Case Notes:
  The defendant was arraigned on January 10, 2024 at the San Francisco
  County Courthouse. The case involves allegations of wire fraud under
  18 U.S.C. § 1343. The statute of limitations applies.
  
  Expert witness Dr. Patricia Okonkwo (License #MED-TX-2291) testified
  regarding the defendant's mental health evaluation conducted on
  December 2, 2023.

  The defendant's employer, Meridian Technologies Inc., is not a party
  to this case. Their HR contact is listed as reference only.
  
Emergency Contact: Robert Harrington — (415) 882-0034
SSN (partial): ***-**-7721
`;

// Spans pre-annotated for the mock — mix of true PII, false positives, missed PII
const MOCK_SPANS: Omit<PIISpan, 'id'>[] = [
  // TRUE POSITIVES (correctly redacted)
  {
    text: 'James Harrington',
    startIndex: 50,
    endIndex: 66,
    type: 'NAME',
    confidence: 0.98,
    reason: 'Full personal name of case client — direct identifier.',
    isRedacted: true,
  },
  {
    text: 'March 14, 1982',
    startIndex: 82,
    endIndex: 96,
    type: 'DATE_OF_BIRTH',
    confidence: 0.97,
    reason: 'Date of birth — highly sensitive personal identifier.',
    isRedacted: true,
  },
  {
    text: 'james.h.personal@gmail.com',
    startIndex: 107,
    endIndex: 133,
    type: 'EMAIL',
    confidence: 0.99,
    reason: 'Personal email address — direct contact information.',
    isRedacted: true,
  },
  {
    text: '(415) 293-7741',
    startIndex: 136,
    endIndex: 150,
    type: 'PHONE',
    confidence: 0.99,
    reason: 'Personal phone number — direct contact identifier.',
    isRedacted: true,
  },
  {
    text: '847 Maple Street, San Francisco, CA 94102',
    startIndex: 160,
    endIndex: 201,
    type: 'ADDRESS',
    confidence: 0.97,
    reason: 'Home address — location identifier for the client.',
    isRedacted: true,
  },
  {
    text: 'CA-2019-04471',
    startIndex: 262,
    endIndex: 275,
    type: 'ID_NUMBER',
    confidence: 0.94,
    reason: 'Attorney bar number — identifies a specific licensed individual.',
    isRedacted: true,
  },
  {
    text: '3847291056',
    startIndex: 309,
    endIndex: 319,
    type: 'FINANCIAL',
    confidence: 0.96,
    reason: 'Bank account number — highly sensitive financial identifier.',
    isRedacted: true,
  },
  {
    text: '***-**-7721',
    startIndex: 775,
    endIndex: 786,
    type: 'ID_NUMBER',
    confidence: 0.99,
    reason: 'Partial Social Security Number — even partial SSNs are sensitive.',
    isRedacted: true,
  },

  // FALSE POSITIVES (over-redacted — should be restored)
  {
    text: 'Mitchell & Associates Legal Group',
    startIndex: 235,
    endIndex: 267,
    type: 'ORGANIZATION',
    confidence: 0.55,
    reason: 'Law firm name — this is a registered business entity, not personal PII. Public information.',
    isRedacted: true,
  },
  {
    text: 'Meridian Technologies Inc.',
    startIndex: 617,
    endIndex: 643,
    type: 'ORGANIZATION',
    confidence: 0.51,
    reason: 'Employer name — this is a company, not a private individual. Publicly registered entity.',
    isRedacted: true,
  },
  {
    text: '18 U.S.C. § 1343',
    startIndex: 529,
    endIndex: 546,
    type: 'ID_NUMBER',
    confidence: 0.42,
    reason: 'US federal statute citation — this is public legal text, not a personal identifier.',
    isRedacted: true,
  },

  // MISSED PII (false negatives — left visible, should be redacted)
  {
    text: 'Sarah Mitchell',
    startIndex: 212,
    endIndex: 226,
    type: 'NAME',
    confidence: 0.91,
    reason: 'Referring attorney\'s full name — identifies a specific individual in a professional capacity.',
    isRedacted: false,
  },
  {
    text: 'Dr. Patricia Okonkwo',
    startIndex: 576,
    endIndex: 596,
    type: 'NAME',
    confidence: 0.93,
    reason: 'Expert witness full name — identifies a specific licensed professional.',
    isRedacted: false,
  },
  {
    text: 'MED-TX-2291',
    startIndex: 607,
    endIndex: 618,
    type: 'ID_NUMBER',
    confidence: 0.88,
    reason: 'Medical license number — uniquely identifies a healthcare professional.',
    isRedacted: false,
  },
  {
    text: 'Robert Harrington',
    startIndex: 721,
    endIndex: 738,
    type: 'NAME',
    confidence: 0.96,
    reason: 'Emergency contact\'s full name — third-party personal identifier.',
    isRedacted: false,
  },
  {
    text: '(415) 882-0034',
    startIndex: 743,
    endIndex: 757,
    type: 'PHONE',
    confidence: 0.99,
    reason: 'Emergency contact phone number — direct personal contact information for a third party.',
    isRedacted: false,
  },
];

// ---------------------------------------------------------------------------
// Gemini-based detection
// ---------------------------------------------------------------------------

const GEMINI_SYSTEM_PROMPT = `You are a precise PII (Personally Identifying Information) detection engine.
Analyze the given document text and identify ALL PII spans.

Return a JSON array of objects with this exact schema:
{
  "text": "exact substring from document",
  "startIndex": <character index where text starts>,
  "endIndex": <character index where text ends>,
  "type": one of ["NAME","EMAIL","PHONE","ADDRESS","DATE_OF_BIRTH","ID_NUMBER","FINANCIAL","ORGANIZATION","OTHER"],
  "confidence": <float 0.0-1.0>,
  "reason": "one sentence explaining why this is or might be PII",
  "isRedacted": <boolean — true if you recommend redacting, false if you think it might be a false positive or missed>
}

Rules:
1. Include TRUE POSITIVES: real PII that should be redacted (isRedacted: true, confidence > 0.7)
2. Include FALSE POSITIVES: things that look like PII but aren't (isRedacted: true, confidence < 0.6) — company names, public statutes, etc.
3. Include MISSED PII: sensitive info that a naive detector might skip (isRedacted: false)
4. Be precise with startIndex/endIndex — they must match the exact position in the input string.
5. Return ONLY valid JSON array, no markdown, no explanation outside the array.`;

/**
 * Detects PII in document text using Google Gemini.
 */
async function detectWithGemini(documentText: string): Promise<PIISpan[]> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('No Gemini API key configured');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

  const prompt = `${GEMINI_SYSTEM_PROMPT}\n\nDocument text:\n\`\`\`\n${documentText}\n\`\`\``;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().trim();

  // Strip markdown code fences if present
  const jsonText = responseText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/, '')
    .trim();

  const rawSpans = JSON.parse(jsonText) as Array<{
    text: string;
    startIndex: number;
    endIndex: number;
    type: string;
    confidence: number;
    reason: string;
    isRedacted: boolean;
  }>;

  return rawSpans.map((span) => ({
    id: uuidv4(),
    text: span.text,
    startIndex: span.startIndex,
    endIndex: span.endIndex,
    type: (span.type as PIIType) || 'OTHER',
    confidence: Math.max(0, Math.min(1, span.confidence)),
    reason: span.reason,
    isRedacted: span.isRedacted,
  }));
}

/**
 * Returns mock PII spans for the built-in sample document.
 */
function detectWithMock(): PIISpan[] {
  return MOCK_SPANS.map((span) => ({
    id: uuidv4(),
    ...span,
  }));
}

/**
 * Main PII detection entry point.
 * Uses Gemini if API key is available; falls back to mock otherwise.
 */
export async function detectPII(
  documentText: string
): Promise<{ spans: PIISpan[]; mode: 'gemini' | 'mock' }> {
  try {
    const spans = await detectWithGemini(documentText);
    return { spans, mode: 'gemini' };
  } catch (err) {
    console.warn(
      '[piiService] Gemini unavailable, using mock backend:',
      (err as Error).message
    );
    return { spans: detectWithMock(), mode: 'mock' };
  }
}
