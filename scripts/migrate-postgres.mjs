import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const { Client } = pg;

const connectionString = process.env.POSTGRES_URL;
if (!connectionString) {
  console.error("Missing POSTGRES_URL.");
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../db/migrations");

const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const files = (await readdir(migrationsDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const migrationId = file;
    const alreadyApplied = await client.query(
      "SELECT 1 FROM schema_migrations WHERE id = $1 LIMIT 1",
      [migrationId]
    );
    if (alreadyApplied.rowCount && alreadyApplied.rowCount > 0) {
      continue;
    }

    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (id) VALUES ($1)",
        [migrationId]
      );
      await client.query("COMMIT");
      console.log(`Applied migration: ${migrationId}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    }
  }

  console.log("Postgres migrations complete.");
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unknown migration error.";
  console.error(`Postgres migration failed: ${message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
