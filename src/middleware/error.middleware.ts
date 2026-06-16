import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { isAppError } from '../utils/errors';
import { logger } from '../utils/logger';

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    error: 'Not found',
  });
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (isAppError(error)) {
    logger.error(
      {
        err: error,
        code: error.code,
        statusCode: error.statusCode,
      },
      error.message,
    );

    res.status(error.statusCode).json({
      success: false,
      error: error.message,
      code: error.code,
      ...(error.details !== undefined && { details: error.details }),
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Internal server error';

  logger.error({ err: error }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: env.NODE_ENV === 'production' ? 'Internal server error' : message,
    code: 'INTERNAL_ERROR',
  });
}
