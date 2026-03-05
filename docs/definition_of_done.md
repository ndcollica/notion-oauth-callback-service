# Definition of Done

Use this checklist before requesting merge.

## Merge Checklist

- Scope is bounded to the stated task (no unrelated churn).
- Issue linkage is present in PR (`Closes #...` or `Relates #...`).
- Verification steps are listed and reproducible.
- No secrets are committed (`.env.local`, tokens, client secrets, credentials).
- Risks, caveats, or deferred follow-ups are noted.

## Proportionality Rule

- Docs-only changes may skip heavier checks (for example route-level runtime checks) if no executable behavior changed.
- Code-path changes must include at least one direct verification of affected behavior.
