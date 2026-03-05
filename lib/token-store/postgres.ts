import "server-only";
import { Pool } from "pg";
import type { InstallationRecord, TokenStore } from "@/lib/token-store/types";

const INSTALLATIONS_TABLE = "oauth_installations";

export class PostgresTokenStore implements TokenStore {
  private readonly pool: Pool;
  private readonly schemaReady: Promise<void>;

  constructor(connectionString: string) {
    this.pool = new Pool({ connectionString });
    this.schemaReady = this.ensureSchema();
  }

  private async ensureSchema(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${INSTALLATIONS_TABLE} (
        key TEXT PRIMARY KEY,
        access_token TEXT NOT NULL,
        refresh_token TEXT,
        token_type TEXT,
        scope TEXT,
        created_at TIMESTAMPTZ NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL,
        metadata JSONB
      )
    `);
  }

  async saveInstallation(installation: InstallationRecord): Promise<void> {
    await this.schemaReady;

    const createdAt = toDate(installation.created_at);
    const updatedAt = new Date();

    await this.pool.query(
      `
      INSERT INTO ${INSTALLATIONS_TABLE}
      (key, access_token, refresh_token, token_type, scope, created_at, updated_at, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
      ON CONFLICT (key) DO UPDATE SET
        access_token = EXCLUDED.access_token,
        refresh_token = EXCLUDED.refresh_token,
        token_type = EXCLUDED.token_type,
        scope = EXCLUDED.scope,
        updated_at = EXCLUDED.updated_at,
        metadata = EXCLUDED.metadata
      `,
      [
        installation.key,
        installation.access_token,
        installation.refresh_token ?? null,
        installation.token_type ?? null,
        installation.scope ?? null,
        createdAt,
        updatedAt,
        installation.metadata ? JSON.stringify(installation.metadata) : null,
      ]
    );
  }

  async getInstallation(key: string): Promise<InstallationRecord | null> {
    await this.schemaReady;

    const result = await this.pool.query<{
      key: string;
      access_token: string;
      refresh_token: string | null;
      token_type: string | null;
      scope: string | null;
      created_at: Date;
      updated_at: Date;
      metadata: Record<string, unknown> | null;
    }>(
      `
      SELECT key, access_token, refresh_token, token_type, scope, created_at, updated_at, metadata
      FROM ${INSTALLATIONS_TABLE}
      WHERE key = $1
      `,
      [key]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    return {
      key: row.key,
      access_token: row.access_token,
      refresh_token: row.refresh_token ?? undefined,
      token_type: row.token_type ?? undefined,
      scope: row.scope ?? undefined,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString(),
      metadata: row.metadata ?? undefined,
    };
  }

  async revokeInstallation(key: string): Promise<void> {
    await this.schemaReady;
    await this.pool.query(`DELETE FROM ${INSTALLATIONS_TABLE} WHERE key = $1`, [
      key,
    ]);
  }
}

function toDate(value: string | Date): Date {
  if (value instanceof Date) {
    return value;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return new Date();
  }
  return parsed;
}
