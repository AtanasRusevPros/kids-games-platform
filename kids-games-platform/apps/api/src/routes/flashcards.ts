import type { FastifyInstance } from 'fastify';
import { MarkKnownSchema, SavePositionSchema } from '@kids-games/shared';
import { getPool } from '../db/client.js';
import * as deckRepo from '../repositories/deck.repository.js';
import * as progressRepo from '../repositories/progress.repository.js';
import { mapDeck, mapCard } from '../mappers.js';

const FLASHCARD_GAME_ID = 'flashcards';

export async function flashcardRoutes(app: FastifyInstance): Promise<void> {
  // GET /flashcards/decks?lang=en
  app.get<{ Querystring: { lang?: string } }>(
    '/flashcards/decks',
    async (request, reply) => {
      const decks = await deckRepo.findDecks(
        getPool(),
        FLASHCARD_GAME_ID,
        request.query.lang,
      );
      return reply.send(decks.map(mapDeck));
    },
  );

  // GET /flashcards/decks/:deckId
  app.get<{ Params: { deckId: string } }>(
    '/flashcards/decks/:deckId',
    async (request, reply) => {
      const deck = await deckRepo.findDeckById(getPool(), request.params.deckId);
      if (!deck) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: 'Not Found', message: 'Deck not found' });
      }
      return reply.send(mapDeck(deck));
    },
  );

  // GET /flashcards/decks/:deckId/cards
  app.get<{ Params: { deckId: string } }>(
    '/flashcards/decks/:deckId/cards',
    async (request, reply) => {
      const deck = await deckRepo.findDeckById(getPool(), request.params.deckId);
      if (!deck) {
        return reply
          .status(404)
          .send({ statusCode: 404, error: 'Not Found', message: 'Deck not found' });
      }
      const cards = await deckRepo.findCardsByDeck(getPool(), request.params.deckId);
      return reply.send(cards.map(mapCard));
    },
  );

  // GET /flashcards/decks/:deckId/progress  (auth required)
  app.get<{ Params: { deckId: string } }>(
    '/flashcards/decks/:deckId/progress',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const pool = getPool();
      const [progress, knownCardIds] = await Promise.all([
        progressRepo.getDeckProgress(pool, request.user.userId, request.params.deckId),
        progressRepo.getKnownCardIds(pool, request.user.userId, request.params.deckId),
      ]);
      return reply.send({
        lastIndex: progress?.last_index ?? 0,
        knownCount: progress?.known_count ?? 0,
        knownCardIds,
        updatedAt: progress?.updated_at ?? null,
      });
    },
  );

  // POST /flashcards/decks/:deckId/progress/position  (auth required)
  app.post<{ Params: { deckId: string } }>(
    '/flashcards/decks/:deckId/progress/position',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

      if (idempotencyKey) {
        const cached = await progressRepo.getIdempotencyKey(
          getPool(),
          idempotencyKey,
        );
        if (cached) return reply.send(cached.response);
      }

      const body = SavePositionSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: body.error.errors[0]?.message ?? 'Validation error',
        });
      }

      await progressRepo.savePosition(
        getPool(),
        request.user.userId,
        request.params.deckId,
        body.data.lastIndex,
      );

      const response = { ok: true };

      if (idempotencyKey) {
        await progressRepo.saveIdempotencyKey(
          getPool(),
          idempotencyKey,
          request.user.userId,
          response,
        );
      }

      return reply.send(response);
    },
  );

  // POST /flashcards/decks/:deckId/progress/known  (auth required)
  app.post<{ Params: { deckId: string } }>(
    '/flashcards/decks/:deckId/progress/known',
    { onRequest: [app.authenticate] },
    async (request, reply) => {
      const idempotencyKey = request.headers['idempotency-key'] as string | undefined;

      if (idempotencyKey) {
        const cached = await progressRepo.getIdempotencyKey(
          getPool(),
          idempotencyKey,
        );
        if (cached) return reply.send(cached.response);
      }

      const body = MarkKnownSchema.safeParse(request.body);
      if (!body.success) {
        return reply.status(400).send({
          statusCode: 400,
          error: 'Bad Request',
          message: body.error.errors[0]?.message ?? 'Validation error',
        });
      }

      await progressRepo.setCardKnown(
        getPool(),
        request.user.userId,
        request.params.deckId,
        body.data.cardId,
        body.data.known,
      );

      const response = { ok: true };

      if (idempotencyKey) {
        await progressRepo.saveIdempotencyKey(
          getPool(),
          idempotencyKey,
          request.user.userId,
          response,
        );
      }

      return reply.send(response);
    },
  );
}
