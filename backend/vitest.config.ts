import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL:
        process.env.TEST_DATABASE_URL ??
        'postgresql://jobtracker:jobtracker@localhost:5433/jobtracker_test',
      JWT_ACCESS_SECRET: 'test-access-secret-at-least-32-characters-long!!',
      JWT_REFRESH_SECRET: 'test-refresh-secret-at-least-32-characters-long!',
      ACCESS_TOKEN_TTL: '15m',
      REFRESH_TOKEN_TTL: '7d',
      COOKIE_SECURE: 'false',
      LOG_LEVEL: 'silent',
    },
    // Integration tests share a single Postgres database, so run files serially
    // to avoid cross-file data races while keeping it simple.
    fileParallelism: false,
    hookTimeout: 30000,
    testTimeout: 30000,
  },
});
