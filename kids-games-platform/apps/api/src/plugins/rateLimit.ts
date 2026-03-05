import type { FastifyInstance } from 'fastify';
import fastifyRateLimit from '@fastify/rate-limit';
import { config } from '../config.js';

export async function rateLimitPlugin(app: FastifyInstance): Promise<void> {
  await app.register(fastifyRateLimit, {
    global: false, // apply only to routes that opt in via config.rateLimit
    max: 100,
    timeWindow: '1 minute',
    redis: config.valKeyUrl
      ? // lazy import to avoid requiring ioredis when not configured
        await (async () => {
          const { Redis } = await import('ioredis');
          return new Redis(config.valKeyUrl!);
        })()
      : undefined,
    keyGenerator: (request) =>
      request.headers['x-forwarded-for']?.toString() ?? request.ip,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: 'Too Many Requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)}s.`,
    }),
  });
}
