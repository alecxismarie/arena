# Branch Protection Checklist (Required)

Configure this once in GitHub repository settings to block merges until CI passes.

## Target branch

- `main` (and `master` if still used)

## Required settings

1. Enable **Require a pull request before merging**.
2. Enable **Require status checks to pass before merging**.
3. Add required check:
   - `CI / quality-and-migrations`
4. Enable **Require branches to be up to date before merging**.
5. Enable **Require conversation resolution before merging**.
6. Disable direct pushes by enabling branch protection for admins too (recommended).

## Why this matters

This guarantees every PR passes:

- lint
- typecheck
- production build
- prisma migrate deploy
- prisma migrate status

before it can be merged.
