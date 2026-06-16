import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestIdMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const headerValue = req.headers['x-request-id'];
  req.requestId =
    typeof headerValue === 'string' && headerValue.length > 0 ? headerValue : randomUUID();
  next();
}
