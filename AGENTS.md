# AGENTS.md

Behavioral contract for Codex contributions in this repository.

## Operating Rules

- PR-first: all code/docs changes are prepared on a branch and reviewed through a PR.
- Hard proof gate: do not claim work is complete without a numbered PR URL and listed verification evidence.
- No-churn editing: change only files needed for the requested scope; avoid broad rewrites or style-only edits.
- Keep process proportional: prefer small, focused PRs over large mixed changes.
- Never log or print secrets/tokens (client secrets, access tokens, refresh tokens, raw auth headers).

## Fail-Fast Conditions

Stop and escalate immediately when any of the following occurs:

- Missing required environment variables or invalid runtime assumptions.
- Security-sensitive uncertainty (OAuth state handling, token exposure risk).
- Tooling/runtime blockers that prevent verification (for example, incompatible Node version).
- Scope ambiguity that would cause uncontrolled repo-wide churn.

## Branch and PR Guidance

- Use a unique branch per issue/task (example pattern: `feat/<short-scope>-<date-or-ticket>`).
- Do not stack unrelated work in the same branch.
- Link issues in PR body using `Closes #<n>` or `Relates #<n>`.
- Keep commits and PR description aligned with actual verification steps performed.

## Completion Standard

A task is not "done" unless:

1. A numbered PR URL exists.
2. Verification steps are explicitly listed with results.
3. Risks or follow-up TODOs are recorded.
