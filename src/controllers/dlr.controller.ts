import { Request, Response, NextFunction } from 'express';
import { dlrService } from '../services/dlr.service';
import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export async function handleDlrWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await dlrService.processWebhook(req.query as Record<string, unknown>, req.requestId);
    res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ValidationError('Invalid DLR webhook query parameters', error.flatten().fieldErrors));
      return;
    }
    next(error);
  }
}
