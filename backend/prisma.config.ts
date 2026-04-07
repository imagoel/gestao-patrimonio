import { resolve } from 'node:path';
import { cwd } from 'node:process';
import { config as loadEnv } from 'dotenv';
import { defineConfig } from 'prisma/config';

loadEnv({ path: resolve(cwd(), '..', '.env') });
loadEnv();

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx ts-node --transpile-only prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
    shadowDatabaseUrl: process.env.SHADOW_DATABASE_URL,
  },
});
