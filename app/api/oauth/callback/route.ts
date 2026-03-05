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

  if (error) {
    // Keep provider error output minimal to avoid leaking sensitive details.
    return withClearedStateCookie(
      new NextResponse("OAuth authorization failed.", { status: 400 })
    );
  }

  const stateFromCookie = request.cookies.get(OAUTH_STATE_COOKIE_NAME)?.value;

  // State validation is required to prevent CSRF.
  if (!stateFromQuery || !stateFromCookie || stateFromQuery !== stateFromCookie) {
    return withClearedStateCookie(
      new NextResponse("Invalid OAuth state.", { status: 400 })
    );
  }

  if (!code) {
    return withClearedStateCookie(
      new NextResponse("Missing authorization code.", { status: 400 })
    );
  }

  try {
    const tokenResponse = await exchangeCodeForToken(code);
    const { key, source } = deriveInstallationKey(tokenResponse);

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

    const response = NextResponse.redirect(new URL("/success", url.origin));
    response.cookies.set({
      name: OAUTH_STATE_COOKIE_NAME,
      value: "",
      path: "/",
      maxAge: 0,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    return withClearedStateCookie(response);
  } catch {
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
