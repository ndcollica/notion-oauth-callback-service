# Definition of Done

Use this checklist before requesting merge.

## Merge Checklist

- Scope is bounded to the stated task (no unrelated churn).
- Issue linkage is present in PR (`Closes #...` or `Relates #...`).
- Verification steps are listed and reproducible.
- No secrets are committed (`.env.local`, tokens, client secrets, credentials).
- Risks, caveats, or deferred follow-ups are noted.

## Auth Flow Verification Gate

For PRs that modify OAuth flow behavior, required evidence is:

- `corepack pnpm verify:all`
- `corepack pnpm verify:callback-success`
- `corepack pnpm verify:callback-strict`

Include a brief rollback note in PR text for auth-flow changes.

## Proportionality Rule

- Docs-only changes may skip heavier checks (for example route-level runtime checks) if no executable behavior changed.
- Code-path changes must include at least one direct verification of affected behavior.
