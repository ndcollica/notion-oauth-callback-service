import { emitAuditEvent } from "@/lib/audit";
import { env } from "@/lib/config";
import { exchangeCodeForToken } from "@/lib/oauth";
import { deriveInstallationKey } from "@/lib/installation-key";
import { tokenStore } from "@/lib/token-store";
import { NextRequest, NextResponse } from "next/server";

const OAUTH_STATE_COOKIE_NAME = "oauth_state";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const error = params.get("error");
  const code = params.get("code");
  const stateFromQuery = params.get("state");
  emitAuditEvent("oauth.callback.received", {
    has_error: Boolean(error),
    has_code: Boolean(code),
    has_state: Boolean(stateFromQuery),
  });

  if (error) {
    // Keep provider error output minimal to avoid leaking sensitive details.
    emitAuditEvent("oauth.callback.rejected", {
      reason: "provider_error",
    });
    return withClearedStateCookie(
      new NextResponse("OAuth authorization failed.", { status: 400 })
    );
  }

  const stateFromCookie = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  // State validation is required to prevent CSRF.
  if (!stateFromQuery || !stateFromCookie || stateFromQuery !== stateFromCookie) {
    emitAuditEvent("oauth.callback.rejected", {
      reason: "state_mismatch",
    });
    return withClearedStateCookie(
      new NextResponse("Invalid OAuth state.", { status: 400 })
    );
  }

  if (!code) {
    emitAuditEvent("oauth.callback.rejected", {
      reason: "missing_code",
    });
    return withClearedStateCookie(
      new NextResponse("Missing authorization code.", { status: 400 })
    );
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const { key, source } = deriveInstallationKey(tokenResponse, {
      mode: env.oauthInstallationKeyMode,
    });
    const keyPrefix = key.split(":", 1)[0] ?? "unknown";

    const now = new Date().toISOString();
    await tokenStore.saveInstallation({
      key,
      access_token: tokenResponse.access_token,
      refresh_token:
        typeof tokenResponse.refresh_token === "string"
          ? tokenResponse.refresh_token
          : undefined,
      token_type:
        typeof tokenResponse.token_type === "string"
          ? tokenResponse.token_type
          : undefined,
      scope:
        typeof tokenResponse.scope === "string" ? tokenResponse.scope : undefined,
      created_at: now,
      updated_at: now,
      metadata: {
        key_source: source,
        // Placeholder fields for provider-specific IDs and extra token response fields.
        workspace_id:
          typeof tokenResponse.workspace_id === "string"
            ? tokenResponse.workspace_id
            : undefined,
        installation_id:
          typeof tokenResponse.installation_id === "string"
            ? tokenResponse.installation_id
            : undefined,
      },
    });

    emitAuditEvent("oauth.callback.succeeded", {
      key_source: source,
      key_prefix: keyPrefix,
    });

    const response = NextResponse.redirect(new URL("/success", url.origin));
    return withClearedStateCookie(response);
  } catch (error) {
    emitAuditEvent("oauth.callback.failed", {
      reason: classifyFailureReason(error),
    });
    return withClearedStateCookie(
      new NextResponse("OAuth callback failed.", { status: 500 })
    );
  }
}

function withClearedStateCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: OAUTH_STATE_COOKIE_NAME,
    value: "",
    path: "/",
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

function classifyFailureReason(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (message.includes("Token response missing required")) {
    return "missing_required_provider_identifier";
  }
  if (message.includes("Token endpoint request failed")) {
    return "token_endpoint_unreachable";
  }
  if (message.includes("Token exchange failed with HTTP")) {
    return "token_endpoint_rejected";
  }
  if (message.includes("Token response missing access_token")) {
    return "token_response_missing_access_token";
  }
  return "token_exchange_or_store_failure";
}
