# Provider Mapping Contract

This document defines how OAuth token responses are mapped to installation keys.

## Installation Key Modes

Configured via `OAUTH_INSTALLATION_KEY_MODE`:

- `either` (default)
  - precedence:
    1. `installation_id` -> `installation:<installation_id>`
    2. `workspace_id` -> `workspace:<workspace_id>`
    3. fallback -> `generated:<uuid>`

- `installation_id`
  - requires `installation_id` in token response
  - missing value causes callback failure (`500`) and no persistence

- `workspace_id`
  - requires `workspace_id` in token response
  - missing value causes callback failure (`500`) and no persistence

## Safety and Behavior

- Never infer identifiers from untrusted fields beyond `installation_id` / `workspace_id`.
- Never persist partial installation records when strict mode requirements are not met.
- Emit non-sensitive audit failure reason:
  - `missing_required_provider_identifier`

## Operational Recommendation

- Use `either` during early integration discovery.
- Move to strict mode (`installation_id` or `workspace_id`) once provider response shape is stable.
