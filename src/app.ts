import express from 'express';
import pinoHttp from 'pino-http';
import smsRoutes from './routes/sms.routes';
import webhookRoutes from './routes/webhook.routes';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestIdMiddleware } from './middleware/request-id.middleware';
import { logger } from './utils/logger';

export function createApp(): express.Application {
  const app = express();

  app.use(requestIdMiddleware);

  app.use(
    pinoHttp({
      logger,
      autoLogging: {
        ignore: (req) => req.url === '/health',
      },
      customProps: (req) => ({
        requestId: req.requestId,
      }),
    }),
  );

  app.use(express.json({ limit: '100kb' }));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok' });
  });

  app.use('/api/sms', smsRoutes);
  app.use('/webhooks', webhookRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
