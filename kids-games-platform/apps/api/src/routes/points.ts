import type { FastifyInstance } from 'fastify';
import { AddPointsSchema } from '@kids-games/shared';
import { getPool } from '../db/client.js';
import * as pointsRepo from '../repositories/points.repository.js';

export async function pointsRoutes(app: FastifyInstance): Promise<void> {
  // GET /points  (auth required)
  app.get(
    '/points',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const row = await pointsRepo.getUserPoints(getPool(), request.user.userId);
      return reply.send({ totalPoints: row?.total_points ?? 0 });
    },
  );

  // POST /points/add  (auth required, client-callable — intentionally insecure for MVP)
  app.post(
    '/points/add',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const body = AddPointsSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: body.error.errors[0]?.message ?? 'Validation error',
        });
      }

      const result = await pointsRepo.addPoints(
        getPool(),
        request.user.userId,
        body.data.gameId,
        body.data.points,
      );

      return reply.send(result);
    },
  );
}
