# Audit Runbook

Operational guide for using OAuth callback audit events during troubleshooting.

## Data Source

- Events are emitted as single-line JSON to standard output.
- Primary keys:
  - `event`
  - `reason` (for rejected/failed outcomes)
  - `key_source` (for success outcomes)

## Quick Triage

1. Check failure rate:
   - Compare count of `oauth.callback.succeeded` vs `oauth.callback.failed`.
2. Identify dominant failure reason:
   - Group `oauth.callback.failed` by `reason`.
3. Validate request quality:
   - Inspect `oauth.callback.received` booleans (`has_code`, `has_state`, `has_error`).

## Query Examples

Assume logs are in `callback.log` (one JSON event per line).

PowerShell (failure counts by reason):

```powershell
Get-Content callback.log |
  ForEach-Object { $_ | ConvertFrom-Json } |
  Where-Object { $_.event -eq "oauth.callback.failed" } |
  Group-Object reason |
  Sort-Object Count -Descending |
  Select-Object Count, Name
```

Bash + jq (success counts by key source):

```bash
jq -r 'select(.event=="oauth.callback.succeeded") | .key_source' callback.log \
  | sort | uniq -c | sort -nr
```

Bash + jq (all callback events, newest first if logs are chronological):

```bash
jq -c 'select(.event | startswith("oauth.callback."))' callback.log
```

## Expected Patterns

- Normal: mostly `oauth.callback.succeeded`.
- Client/browser issues: elevated `oauth.callback.rejected` with `state_mismatch`.
- Provider/API issues: elevated `oauth.callback.failed` with
  `token_endpoint_unreachable` or `token_endpoint_rejected`.
- Integration contract drift: elevated `missing_required_provider_identifier`.

## Response Playbook

1. `state_mismatch` spikes:
   - verify cookie domain/path/proxy behavior and callback URL consistency.
2. `token_endpoint_unreachable` spikes:
   - check network/connectivity and provider status.
3. `token_endpoint_rejected` spikes:
   - verify OAuth client credentials and redirect URI registration.
4. `missing_required_provider_identifier` spikes:
   - verify `OAUTH_INSTALLATION_KEY_MODE` matches provider token response shape.
