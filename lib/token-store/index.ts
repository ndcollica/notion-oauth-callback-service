import "server-only";
import { env } from "@/lib/config";
import { InMemoryTokenStore } from "@/lib/token-store/inmemory";
import { PostgresTokenStore } from "@/lib/token-store/postgres";
import type { TokenStore } from "@/lib/token-store/types";

function createTokenStore(): TokenStore {
  switch (env.tokenStoreDriver) {
    case "inmemory":
      return new InMemoryTokenStore();
    case "postgres":
      if (!env.postgresUrl) {
        throw new Error(
          "Missing POSTGRES_URL for TOKEN_STORE_DRIVER=postgres."
        );
      }
      return new PostgresTokenStore(env.postgresUrl);
    default:
      throw new Error(
        `Unsupported TOKEN_STORE_DRIVER: ${env.tokenStoreDriver}. ` +
          "Expected one of: inmemory, postgres."
      );
  }
}

export const tokenStore = createTokenStore();

export type { InstallationRecord, TokenStore } from "@/lib/token-store/types";
