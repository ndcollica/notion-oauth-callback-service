# notion-oauth-callback-service

OAuth callback edge service built with Next.js App Router.  
This service starts an OAuth flow, validates callback state to prevent CSRF, exchanges authorization codes for tokens, and stores installation tokens through a pluggable `TokenStore` abstraction.

## Purpose

This project provides an MVP OAuth callback service suitable for edge-friendly deployment:

- Starts OAuth authorization (`/oauth/start`)
- Handles provider callback (`/api/oauth/callback`)
- Persists installation tokens through a pluggable `TokenStore` (`inmemory` or `postgres`)
- Exposes a simple health endpoint (`/health`)

## Local Run

Prerequisites:

- Node.js `20.19.0` (see `.nvmrc`; minimum supported is `>=20.19.0`)
- Docker Desktop running

1. Install dependencies.

```bash
corepack pnpm install
```

2. Copy the environment template.

```bash
cp .env.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

3. Start local Postgres.

```bash
corepack pnpm db:up
```

4. Run migrations (required for Postgres mode).

```bash
corepack pnpm db:migrate
```

5. Start the dev server.

```bash
corepack pnpm dev
```

6. In a second terminal, run smoke checks against the running app.

```bash
corepack pnpm verify:smoke
corepack pnpm verify:callback
# or run both:
corepack pnpm verify:all
# success-path callback integration (requires Postgres up + migrated):
corepack pnpm verify:callback-success
# strict-mode regression check (missing provider identifier should fail safely):
corepack pnpm verify:callback-strict
```

Default local URL: `http://localhost:3000`

To stop Postgres:

```bash
corepack pnpm db:down
```

Check Postgres status and connectivity:

```bash
corepack pnpm db:status
corepack pnpm db:check
```

## Environment Variables Overview

Defined in `.env.example`:

- `OAUTH_CLIENT_ID`: OAuth client/application ID issued by your provider.
- `OAUTH_CLIENT_SECRET`: OAuth client secret used during token exchange.
- `OAUTH_REDIRECT_URI`: Callback URL for this service. Must exactly match what is registered with the provider.
- `OAUTH_AUTHORIZATION_URL`: Provider authorization endpoint used by `/oauth/start`.
- `OAUTH_TOKEN_URL`: Provider token endpoint used by `/api/oauth/callback`.
- `OAUTH_INSTALLATION_KEY_MODE`: Installation key guard mode (`either`, `installation_id`, `workspace_id`). Use strict modes to require provider-specific IDs.
- `TOKEN_STORE_DRIVER`: Token store backend selector (`inmemory` or `postgres`).
- `POSTGRES_USER`: Local Docker Postgres username.
- `POSTGRES_PASSWORD`: Local Docker Postgres password.
- `POSTGRES_DB`: Local Docker Postgres database name.
- `POSTGRES_PORT`: Local Docker Postgres host port.
- `POSTGRES_URL`: Connection string for the Postgres-backed token store.

## Routes Overview

- `GET /oauth/start`:
  - Generates a cryptographically secure `state`
  - Stores `state` in an HttpOnly cookie
  - Redirects to `OAUTH_AUTHORIZATION_URL` with `client_id`, `redirect_uri`, and `state`

- `GET /api/oauth/callback`:
  - Reads `code`, `state`, `error`, `error_description`
  - Handles provider errors with minimal, safe messages
  - Validates callback `state` against cookie (CSRF protection)
  - Derives installation key per `OAUTH_INSTALLATION_KEY_MODE`:
    - `either` (default): `installation:<installation_id>` -> `workspace:<workspace_id>` -> `generated:<uuid>`
    - `installation_id`: requires `installation_id`
    - `workspace_id`: requires `workspace_id`
  - Exchanges `code` for tokens and saves installation via `TokenStore`
  - Emits structured, non-sensitive audit events for callback outcomes (no tokens or secrets logged)
  - Redirects to `/success` on completion
  - Event schema: `docs/audit_events.md`
  - Provider mapping contract: `docs/provider_mapping_contract.md`

- `GET /success`:
  - Simple confirmation page: `Authorization complete.`

- `GET /health`:
  - Returns `200 OK` JSON:
  - `{ "service": "notion-oauth-callback-service", "status": "ok" }`

## Deployment Notes

- Recommended platform: **Vercel** (works well with Next.js App Router and edge runtime).
- Ensure all production environment variables are set in your deployment target.
- `OAUTH_REDIRECT_URI` must match your OAuth provider configuration **exactly** (scheme, host, path, and trailing slash behavior). Mismatch will break the callback/token exchange flow.
- Cookie security:
  - HttpOnly is enabled.
  - `Secure` is enabled in production (`NODE_ENV=production`).

## Postgres Later Plan

- Add robust multi-install support across workspace/installation identities.
- Add structured audit logging for authorization lifecycle events.

## Dependency Policy

Dependencies are intentionally minimal to keep this service small, portable, and easy to audit.
