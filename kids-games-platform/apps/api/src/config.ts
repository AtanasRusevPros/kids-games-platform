export const config = {
  port: parseInt(process.env['PORT'] ?? '3000', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  databaseUrl: process.env['DATABASE_URL'] ?? 'postgresql://postgres:postgres@localhost:5432/kids_games_dev',
  jwtSecret: process.env['JWT_SECRET'] ?? 'dev-jwt-secret-change-in-prod-min-32',
  refreshSecret: process.env['REFRESH_SECRET'] ?? 'dev-refresh-secret-change-in-prod-min-32',
  jwtExpiresIn: '15m',
  refreshExpiresInMs: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  valKeyUrl: process.env['VALKEY_URL'],
  corsOrigins: ['http://localhost:5173', 'http://localhost', 'https://localhost'],
} as const;

export const testConfig = {
  ...config,
  get databaseUrl() {
    const url = process.env['TEST_DATABASE_URL'];
    if (!url)
      throw new Error(
        'TEST_DATABASE_URL is required for integration tests. Run ./scripts/dev-db.sh first.',
      );
    return url;
  },
};
