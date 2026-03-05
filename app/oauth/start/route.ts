import { env } from "@/lib/config";
import { NextResponse } from "next/server";

const OAUTH_STATE_COOKIE_NAME = "oauth_state";

function createState(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export const runtime = "edge";

export async function GET() {
  const state = createState();

  const redirectUrl = new URL(env.oauthAuthorizationUrl);
  redirectUrl.searchParams.set("client_id", env.oauthClientId);
  // This must match exactly what is registered with the OAuth provider.
  redirectUrl.searchParams.set("redirect_uri", env.oauthRedirectUri);
  redirectUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(redirectUrl);
  response.cookies.set({
    name: OAUTH_STATE_COOKIE_NAME,
    value: state,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production", // In local dev this is typically false over http://localhost.
    maxAge: 60 * 10,
  });

  return response;
}
