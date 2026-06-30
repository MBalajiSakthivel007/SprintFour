import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  status?: number;
}

/**
 * Global Express error handler.
 * Catches any error thrown or passed to next() in routes.
 */
export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  const status = err.status ?? 500;
  const message = err.message ?? 'Internal Server Error';

  console.error(`[ErrorHandler] ${status} — ${message}`);

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}
