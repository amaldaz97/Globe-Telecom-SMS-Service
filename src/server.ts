import 'dotenv/config';
import { createServer, Server } from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { validateSenderIdConfig } from './config/validate-sender';
import { logger } from './utils/logger';

validateSenderIdConfig();

const app = createApp();
const server: Server = createServer(app);

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Globe M360 SMS Service started');
});

function shutdown(signal: string): void {
  logger.info({ signal }, 'Received shutdown signal, closing server');

  server.close((error) => {
    if (error) {
      logger.error({ err: error }, 'Error during server shutdown');
      process.exit(1);
    }

    logger.info('Server closed gracefully');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
