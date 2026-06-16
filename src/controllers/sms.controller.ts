import { Request, Response, NextFunction } from 'express';
import { smsService } from '../services/sms.service';
import { ValidationError } from '../utils/errors';
import { sendSmsSchema } from '../utils/validation';

export async function sendSms(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = sendSmsSchema.safeParse(req.body);

    if (!parsed.success) {
      throw new ValidationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const result = await smsService.send(parsed.data, { requestId: req.requestId });
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
