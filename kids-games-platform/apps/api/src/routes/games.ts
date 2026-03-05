import type { FastifyInstance } from 'fastify';
import { getPool } from '../db/client.js';
import * as gameRepo from '../repositories/game.repository.js';
import { mapGame } from '../mappers.js';

export async function gameRoutes(app: FastifyInstance): Promise<void> {
  // GET /games
  app.get('/games', async (_request, reply) => {
    const games = await gameRepo.findAllGames(getPool());
    return reply.send(games.map(mapGame));
  });

  // GET /games/:gameId
  app.get<{ Params: { gameId: string } }>(
    '/games/:gameId',
    async (request, reply) => {
      const game = await gameRepo.findGameById(getPool(), request.params.gameId);
      if (!game) {
        return reply.status(404).send({
          statusCode: 404,
          error: 'Not Found',
          message: 'Game not found',
        });
      }
      return reply.send(mapGame(game));
    },
  );
}
