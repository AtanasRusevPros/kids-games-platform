import Fastify from 'fastify';
import cors from '@fastify/cors';
import { config } from './config.js';
import { dbPlugin } from './plugins/db.js';
import { authPlugin } from './plugins/auth.js';
import { rateLimitPlugin } from './plugins/rateLimit.js';
import { healthRoutes } from './routes/health.js';
import { authRoutes } from './routes/auth.js';
import { gameRoutes } from './routes/games.js';
import { flashcardRoutes } from './routes/flashcards.js';
import { pointsRoutes } from './routes/points.js';

export async function createApp(opts: { logger?: boolean; databaseUrl?: string } = {}) {
  const app = Fastify({
    logger:
      opts.logger ??
      (config.nodeEnv !== 'test'
        ? { level: 'info', transport: { target: 'pino-pretty' } }
        : false),
    disableRequestLogging: config.nodeEnv === 'test',
  });

  // CORS
  await app.register(cors, {
    origin: [...config.corsOrigins],
    credentials: true,
  });

  // Plugins
  await app.register(dbPlugin, { databaseUrl: opts.databaseUrl });
  await app.register(authPlugin);
  await app.register(rateLimitPlugin);

  // Routes
  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(gameRoutes);
  await app.register(flashcardRoutes);
  await app.register(pointsRoutes);

  return app;
}
