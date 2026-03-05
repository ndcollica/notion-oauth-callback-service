import pg from "pg";

const { Client } = pg;

const connectionString = process.env.POSTGRES_URL;

if (!connectionString) {
  console.error("Missing POSTGRES_URL.");
  process.exit(1);
}

const client = new Client({ connectionString });

try {
  await client.connect();
  await client.query("SELECT 1");
  console.log("Postgres connection check passed.");
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Unknown Postgres error.";
  console.error(`Postgres connection check failed: ${message}`);
  process.exit(1);
} finally {
  await client.end().catch(() => undefined);
}
