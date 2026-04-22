/**
 * Standalone migration runner using raw pg.
 * Avoids Prisma binary runtime dependencies in production container.
 * Mirrors `prisma migrate deploy` behavior with _prisma_migrations table tracking.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import pg from "pg";

const MIGRATIONS_DIR = path.resolve(__dirname, "migrations");

interface AppliedRow {
  migration_name: string;
  finished_at: Date | null;
}

async function ensureMigrationsTable(client: pg.PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id"                    VARCHAR(36) PRIMARY KEY NOT NULL,
      "checksum"              VARCHAR(64) NOT NULL,
      "finished_at"           TIMESTAMPTZ,
      "migration_name"        VARCHAR(255) NOT NULL,
      "logs"                  TEXT,
      "rolled_back_at"        TIMESTAMPTZ,
      "started_at"            TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count"   INTEGER NOT NULL DEFAULT 0
    );
  `);
}

async function listApplied(client: pg.PoolClient): Promise<Set<string>> {
  const { rows } = await client.query<AppliedRow>(
    `SELECT migration_name, finished_at FROM "_prisma_migrations" WHERE rolled_back_at IS NULL`
  );
  return new Set(rows.filter((r) => r.finished_at !== null).map((r) => r.migration_name));
}

async function applyMigration(client: pg.PoolClient, name: string, sql: string) {
  const id = crypto.randomUUID();
  const checksum = crypto.createHash("sha256").update(sql).digest("hex");

  await client.query(
    `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, applied_steps_count)
     VALUES ($1, $2, $3, now(), 0)`,
    [id, checksum, name]
  );

  await client.query(sql);

  await client.query(
    `UPDATE "_prisma_migrations"
     SET finished_at = now(), applied_steps_count = 1
     WHERE id = $1`,
    [id]
  );
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString: url, max: 1 });
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    const applied = await listApplied(client);

    const dirs = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((entry) => {
        const full = path.join(MIGRATIONS_DIR, entry);
        return fs.statSync(full).isDirectory();
      })
      .sort();

    let newCount = 0;
    for (const dir of dirs) {
      const sqlPath = path.join(MIGRATIONS_DIR, dir, "migration.sql");
      if (!fs.existsSync(sqlPath)) continue;
      if (applied.has(dir)) continue;

      const sql = fs.readFileSync(sqlPath, "utf8");
      console.log(`→ Applying ${dir}`);
      await applyMigration(client, dir, sql);
      console.log(`✓ ${dir}`);
      newCount++;
    }

    if (newCount === 0) {
      console.log("No pending migrations.");
    } else {
      console.log(`Applied ${newCount} migration(s).`);
    }
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
