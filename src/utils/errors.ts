export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class M360ApiError extends AppError {
  constructor(message: string, statusCode = 502, details?: unknown) {
    super(message, statusCode, 'M360_API_ERROR', details);
  }
}

export class NetworkError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 503, 'NETWORK_ERROR', details);
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export const M360_ERROR_MESSAGES: Record<number, string> = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Invalid app_key/app_secret',
  410: 'Credits Consumed',
};
