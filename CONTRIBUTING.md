# Contributing

## Prerequisites

- Node.js `>=18`
- `pnpm`

## Setup

```bash
pnpm install
```

## Development Workflow

1. Create a feature branch.
2. Add or update tests first.
3. Implement minimal changes required by tests.
4. Run checks locally:

```bash
pnpm run test
pnpm run build
pnpm run check:oss
pnpm run check:badges
```

## Pull Request Checklist

- Tests cover behavior changes.
- No TypeScript type regressions.
- README and package metadata stay consistent with CLI behavior.
- If release behavior changes, update `.github/workflows/release.yml` and docs.

## Commit and Release

- Use clear, scoped commit messages.
- Release/tag and npm publish are executed by CI workflows.
- Do not run manual local publish for official releases.
