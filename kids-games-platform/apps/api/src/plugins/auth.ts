import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';
import { config } from '../config.js';
import '../types.js'; // ensure JWT type augmentations are loaded

async function authPluginFn(app: FastifyInstance): Promise<void> {
  await app.register(fastifyJwt, {
    secret: config.jwtSecret,
  });

  // Decorate with a reusable auth preHandler
  app.decorate(
    'authenticate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    },
  );
}

// fp() breaks encapsulation so `app.authenticate` and `app.jwt` are available
// to all sibling plugins/routes registered after this plugin.
export const authPlugin = fp(authPluginFn, { name: 'auth' });

declare module 'fastify' {
  interface FastifyInstance {
    authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  }
}
