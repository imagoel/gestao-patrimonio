import { spawnSync } from 'node:child_process';
import { randomUUID, createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

const scriptsDir = fileURLToPath(new URL('.', import.meta.url));
const projectRoot = resolve(scriptsDir, '..');

loadEnv({ path: resolve(projectRoot, '..', '.env') });
loadEnv({ path: resolve(projectRoot, '.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL nao informado para o bootstrap do banco.');
  process.exit(1);
}

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ(3),
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ(3),
      "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    );
  `);

  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS "_prisma_migrations_migration_name_key"
    ON "_prisma_migrations"("migration_name");
  `);
}

function listMigrationEntries(migrationsDir) {
  if (!existsSync(migrationsDir)) {
    return [];
  }

  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const sqlPath = join(migrationsDir, entry.name, 'migration.sql');

      return {
        migrationName: entry.name,
        sqlPath,
      };
    })
    .filter((entry) => existsSync(entry.sqlPath))
    .sort((left, right) => left.migrationName.localeCompare(right.migrationName));
}

function buildChecksum(sqlContent) {
  return createHash('sha256').update(sqlContent).digest('hex');
}

async function applyPendingMigrations(client) {
  const migrationsDir = resolve(projectRoot, 'prisma', 'migrations');
  const migrationEntries = listMigrationEntries(migrationsDir);

  if (migrationEntries.length === 0) {
    console.log('Nenhuma migration SQL encontrada para aplicar.');
    return;
  }

  const appliedRows = await client.query(`
    SELECT "migration_name"
    FROM "_prisma_migrations"
    WHERE "finished_at" IS NOT NULL
      AND "rolled_back_at" IS NULL
  `);

  const appliedMigrationNames = new Set(
    appliedRows.rows.map((row) => row.migration_name),
  );

  for (const entry of migrationEntries) {
    if (appliedMigrationNames.has(entry.migrationName)) {
      continue;
    }

    const sqlContent = readFileSync(entry.sqlPath, 'utf8');
    const checksum = buildChecksum(sqlContent);
    const migrationId = randomUUID();

    console.log(`Aplicando migration ${entry.migrationName}...`);

    await client.query(
      `
        DELETE FROM "_prisma_migrations"
        WHERE "migration_name" = $1
          AND "finished_at" IS NULL
      `,
      [entry.migrationName],
    );

    await client.query(
      `
        INSERT INTO "_prisma_migrations" (
          "id",
          "checksum",
          "migration_name",
          "started_at",
          "applied_steps_count"
        )
        VALUES ($1, $2, $3, CURRENT_TIMESTAMP, 0)
      `,
      [migrationId, checksum, entry.migrationName],
    );

    try {
      await client.query('BEGIN');
      await client.query(sqlContent);
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      await client.query(
        `
          UPDATE "_prisma_migrations"
          SET "logs" = $2
          WHERE "id" = $1
        `,
        [migrationId, error instanceof Error ? error.stack ?? error.message : String(error)],
      );
      throw error;
    }

    await client.query(
      `
        UPDATE "_prisma_migrations"
        SET
          "finished_at" = CURRENT_TIMESTAMP,
          "applied_steps_count" = 1
        WHERE "id" = $1
      `,
      [migrationId],
    );

    console.log(`Migration ${entry.migrationName} aplicada com sucesso.`);
  }
}

function runCompiledSeed() {
  const seedFilePath = resolve(projectRoot, 'dist', 'prisma', 'seed.js');

  if (!existsSync(seedFilePath)) {
    throw new Error(
      `Seed compilado nao encontrado em ${seedFilePath}. Execute o build do backend antes do bootstrap.`,
    );
  }

  console.log('Executando seed compilado...');

  const command = process.platform === 'win32' ? 'node.exe' : 'node';
  const seedResult = spawnSync(command, [seedFilePath], {
    cwd: projectRoot,
    env: process.env,
    stdio: 'inherit',
  });

  if (seedResult.error) {
    throw seedResult.error;
  }

  if (seedResult.status !== 0) {
    throw new Error(`Seed compilado falhou com codigo ${seedResult.status ?? 1}.`);
  }
}

async function main() {
  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();

  try {
    await ensureMigrationTable(client);
    await applyPendingMigrations(client);
  } finally {
    await client.end();
  }

  runCompiledSeed();
}

main().catch((error) => {
  console.error('Falha no bootstrap do banco.', error);
  process.exit(1);
});
