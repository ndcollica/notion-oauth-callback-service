import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    service: "notion-oauth-callback-service",
    status: "ok",
  });
}
