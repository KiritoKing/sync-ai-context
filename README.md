# sync-ai-context

[![CI](https://github.com/KiritoKing/sync-ai-context/actions/workflows/ci.yml/badge.svg)](https://github.com/KiritoKing/sync-ai-context/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/sync-ai-context.svg)](https://www.npmjs.com/package/sync-ai-context)
[![npm downloads](https://img.shields.io/npm/dm/sync-ai-context.svg)](https://www.npmjs.com/package/sync-ai-context)
[![License](https://img.shields.io/github/license/KiritoKing/sync-ai-context.svg)](./LICENSE)
[![Provenance](https://github.com/KiritoKing/sync-ai-context/actions/workflows/release.yml/badge.svg)](https://github.com/KiritoKing/sync-ai-context/actions/workflows/release.yml)

Config-driven context sync for AI tools with a single source of truth.

中文文档: [README.zh-CN.md](./README.zh-CN.md)

## Features

- `source.kind=canonical|tool` as single source
- `link` and `copy` target modes
- `sync`, `check`, `doctor` commands
- `--dry-run` and `--force` conflict strategy
- CI-driven npm publish with release/tag automation and provenance

## Install

```bash
npm install -g sync-ai-context
```

Or run without global install:

```bash
npx sync-ai-context sync --dry-run
```

## Quick Start

Create `context-sync.config.json`:

```json
{
  "source": {
    "kind": "tool",
    "tool": "claude",
    "skillsPath": ".claude/skills"
  },
  "targets": {
    "codex": {
      "skillsPath": ".agents/skills",
      "mode": "link"
    },
    "cursor": {
      "skillsPath": ".cursor/skills",
      "mode": "copy"
    }
  }
}
```

Run sync:

```bash
context-sync sync
```

## CLI Reference

```bash
# sync all targets
context-sync sync

# sync one target
context-sync sync --target codex

# dry-run without writing files
context-sync sync --dry-run

# force overwrite on conflicts
context-sync sync --force

# verify target integrity
context-sync check

# basic health checks
context-sync doctor
```

## Behavior Semantics

### source.kind

- `canonical`: use an independent source directory as the only source.
- `tool`: use a tool directory directly as the only source.

### target mode

- `link` mode:
  - ensures target path is a symlink to source path
  - `check` fails with `symlink mismatch` when link target is wrong
- `copy` mode:
  - copies source tree to target path
  - `check` fails with `copy drift` when `modified/missing/extra` exists

### conflict strategy

- `--dry-run`: preview actions, no filesystem writes
- `--force`: allow replacing conflicting target state

## Programmatic API

```ts
import { checkContext, loadConfigFromFile, syncContext } from 'sync-ai-context';

const config = await loadConfigFromFile(process.cwd());
await syncContext({ config, dryRun: false, force: false });
await checkContext({ config });
```

## Development

```bash
pnpm install
pnpm run test
pnpm run build
pnpm run check:oss
pnpm run check:badges
```

## Release and Provenance

- Release/tag automation is managed by `.github/workflows/release.yml`.
- npm publish runs in CI with `--provenance` and OIDC (`id-token: write`).
- The `Provenance` badge indicates pipeline-backed release execution status.

## Badge Maintenance Policy

- Required badges: `CI`, `npm version`, `npm downloads`, `License`, `Provenance`.
- CI validates badge presence via `pnpm run check:badges`.
- If a badge link or data source is invalid, CI should fail before release.

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).

## Security

See [SECURITY.md](./SECURITY.md).

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).

## License

MIT, see [LICENSE](./LICENSE).
