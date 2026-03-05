import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { initPool, closePool } from '../db/client.js';
import { config } from '../config.js';

interface DbPluginOpts {
  databaseUrl?: string | undefined;
}

async function dbPluginFn(app: FastifyInstance, opts: DbPluginOpts): Promise<void> {
  initPool(opts.databaseUrl ?? config.databaseUrl);

  app.addHook('onClose', async () => {
    await closePool();
  });
}

export const dbPlugin = fp(dbPluginFn, { name: 'db' });
