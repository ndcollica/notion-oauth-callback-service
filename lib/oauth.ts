import "server-only";
import { env } from "@/lib/config";

export type OAuthTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  workspace_id?: string;
  installation_id?: string;
  [key: string]: unknown;
};

export async function exchangeCodeForToken(
  code: string
): Promise<OAuthTokenResponse> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    client_id: env.oauthClientId,
    client_secret: env.oauthClientSecret,
    // This must match exactly what is registered with the OAuth provider.
    redirect_uri: env.oauthRedirectUri,
  });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);

  // TODO: Add retry/backoff and circuit-breaker policy for transient failures.
  // TODO: Add typed mapping for installation/workspace identifiers per provider.
  let response: Response;
  try {
    response = await fetch(env.oauthTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: body.toString(),
      cache: "no-store",
      signal: controller.signal,
    });
  } catch {
    throw new Error("Token endpoint request failed.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new Error(`Token exchange failed with HTTP ${response.status}.`);
  }

  const json = (await response.json()) as OAuthTokenResponse;
  if (!json.access_token) {
    throw new Error("Token response missing access_token.");
  }

  return json;
}
