# Audit Events

This service emits structured JSON audit events for OAuth callback lifecycle outcomes.

## Safety Rules

- Never include access tokens, refresh tokens, client secrets, auth headers, or raw OAuth codes.
- Emit only non-sensitive metadata needed for operational debugging.

## Event Contract

Common fields:

- `ts`: ISO timestamp
- `event`: event name

OAuth callback events:

- `oauth.callback.received`
  - `has_error`: boolean
  - `has_code`: boolean
  - `has_state`: boolean

- `oauth.callback.rejected`
  - `reason`: `provider_error` | `state_mismatch` | `missing_code`

- `oauth.callback.failed`
  - `reason`: one of:
    - `missing_required_provider_identifier`
    - `token_endpoint_unreachable`
    - `token_endpoint_rejected`
    - `token_response_missing_access_token`
    - `token_exchange_or_store_failure`

- `oauth.callback.succeeded`
  - `key_source`: `installation_id` | `workspace_id` | `generated`
  - `key_prefix`: `installation` | `workspace` | `generated`

## Change Policy

- Add new fields only when they provide clear operational value.
- Keep event names stable; if semantics must change, add a new event name.
