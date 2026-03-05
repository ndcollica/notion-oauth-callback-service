# Codex Operating Model

Minimal PR-first, evidence-first execution flow for this OAuth callback service.

## Standard Flow

1. Start from an issue with clear scope.
2. Create a unique branch for that issue/task.
3. Make the smallest viable change set.
4. Run local checks relevant to the change.
5. Open a PR using the repo template and include verification evidence.
6. Merge only after CI/review passes.

## Evidence Expectations

- Verification must match changed behavior (route changes verify routes; docs-only verifies formatting/links as needed).
- Completion claims require a numbered PR URL and evidence in the PR body.

## Maturity Triggers

Add stronger tests or gates only after repeated failures, regressions, or incidents:

- Repeated callback/state regressions -> add targeted route tests.
- Repeated token storage bugs -> add TokenStore contract tests.
- Repeated deploy misconfigurations -> add stricter env/deploy checks.

Do not add controls preemptively without failure evidence.
