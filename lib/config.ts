import "server-only";

type AppConfig = {
  oauthClientId: string;
  oauthClientSecret: string;
  oauthRedirectUri: string;
  oauthAuthorizationUrl: string;
  oauthTokenUrl: string;
  tokenStoreDriver: "inmemory" | "postgres";
  postgresUrl?: string;
};

function readRequiredEnvVar(name: string): string {
  const value = process.env[name];
  if (!value || value.trim() === "") {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in .env.local (see .env.example).`
    );
  }
  return value;
}

function assertValidUrl(name: string, rawUrl: string): string {
  try {
    new URL(rawUrl);
    return rawUrl;
  } catch {
    throw new Error(
      `Invalid URL in environment variable: ${name}. ` +
        `Set a valid absolute URL in .env.local (see .env.example).`
    );
  }
}

function readTokenStoreDriver(): "inmemory" | "postgres" {
  const value = readRequiredEnvVar("TOKEN_STORE_DRIVER");
  if (value === "inmemory" || value === "postgres") {
    return value;
  }
  throw new Error(
    "Invalid TOKEN_STORE_DRIVER. Expected one of: inmemory, postgres."
  );
}

const tokenStoreDriver = readTokenStoreDriver();
const postgresUrl =
  tokenStoreDriver === "postgres"
    ? readRequiredEnvVar("POSTGRES_URL")
    : process.env.POSTGRES_URL?.trim() || undefined;

export const env: AppConfig = {
  oauthClientId: readRequiredEnvVar("OAUTH_CLIENT_ID"),
  oauthClientSecret: readRequiredEnvVar("OAUTH_CLIENT_SECRET"),
  oauthRedirectUri: assertValidUrl(
    "OAUTH_REDIRECT_URI",
    readRequiredEnvVar("OAUTH_REDIRECT_URI")
  ),
  oauthAuthorizationUrl: assertValidUrl(
    "OAUTH_AUTHORIZATION_URL",
    readRequiredEnvVar("OAUTH_AUTHORIZATION_URL")
  ),
  oauthTokenUrl: assertValidUrl("OAUTH_TOKEN_URL", readRequiredEnvVar("OAUTH_TOKEN_URL")),
  tokenStoreDriver,
  postgresUrl,
};
