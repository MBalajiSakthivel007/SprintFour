import { Router, Request, Response } from 'express';
import { detectPII, SAMPLE_DOCUMENT } from '../services/piiService';
import { createSession } from '../services/documentService';
import { AnalyzeRequest } from '../types';

const router = Router();

/**
 * POST /api/analyze
 * Analyzes a document for PII.
 * Body: { documentText: string, documentName?: string }
 * If documentText is empty, uses the built-in sample document.
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { documentText, documentName }: AnalyzeRequest = req.body;

  if (typeof documentText !== 'string') {
    res.status(400).json({ error: 'documentText must be a string' });
    return;
  }

  // Use sample document if no text provided
  const textToAnalyze = documentText.trim() || SAMPLE_DOCUMENT;

  try {
    const { spans, mode } = await detectPII(textToAnalyze);

    const session = createSession({
      documentText: textToAnalyze,
      spans,
      analysisMode: mode,
      analyzedAt: new Date().toISOString(),
      documentName,
    });

    res.status(200).json(session);
  } catch (error) {
    console.error('[analyze] Unexpected error:', error);
    res.status(500).json({ error: 'Analysis failed. Please try again.' });
  }
});

export default router;
