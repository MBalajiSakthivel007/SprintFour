import { Router, Request, Response } from 'express';
import {
  saveCorrections,
  getSessionSummary,
  getSession,
} from '../services/documentService';
import { SaveCorrectionsRequest } from '../types';

const router = Router();

/**
 * POST /api/corrections
 * Saves user corrections for a session.
 * Body: { sessionId: string, corrections: Correction[] }
 */
router.post('/', (req: Request, res: Response): void => {
  const { sessionId, corrections }: SaveCorrectionsRequest = req.body;

  if (!sessionId || typeof sessionId !== 'string') {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  if (!Array.isArray(corrections)) {
    res.status(400).json({ error: 'corrections must be an array' });
    return;
  }

  const session = getSession(sessionId);
  if (!session) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  saveCorrections(sessionId, corrections);
  const summary = getSessionSummary(sessionId);

  res.status(200).json({ success: true, summary });
});

/**
 * GET /api/corrections/:sessionId
 * Returns the correction summary for a session.
 */
router.get('/:sessionId', (req: Request, res: Response): void => {
  const { sessionId } = req.params;
  const summary = getSessionSummary(sessionId);

  if (!summary) {
    res.status(404).json({ error: 'Session not found' });
    return;
  }

  res.status(200).json(summary);
});

export default router;
