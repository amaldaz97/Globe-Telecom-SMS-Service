import { Request, Response, NextFunction } from 'express';
import { moService } from '../services/mo.service';
import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors';

export async function handleMoWebhook(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await moService.processWebhook(req.query as Record<string, unknown>, req.requestId);
    res.status(200).json({ success: true });
  } catch (error) {
    if (error instanceof ZodError) {
      next(new ValidationError('Invalid MO webhook query parameters', error.flatten().fieldErrors));
      return;
    }
    next(error);
  }
}
