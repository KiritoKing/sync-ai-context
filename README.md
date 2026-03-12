# context-sync

Config-driven context sync for AI tools with a single source of truth.

v1 includes:
- `source.kind=canonical|tool`
- target sync with `link` / `copy`
- integrity checks for link and copy targets
- `sync`, `check`, `doctor` CLI commands
- TDD workflow with `rstest`

## Install

```bash
pnpm install
```

## Build

```bash
pnpm run build
```

## TDD Workflow

```bash
pnpm run test
pnpm run check
```

## Config

Create `context-sync.config.json`:

```json
{
  "$schema": "https://raw.githubusercontent.com/bytedance/vibe-coder-manager/main/context-sync.schema.json",
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

Use `source.kind=canonical` if you want an independent source directory:

```json
{
  "$schema": "https://raw.githubusercontent.com/bytedance/vibe-coder-manager/main/context-sync.schema.json",
  "source": {
    "kind": "canonical",
    "skillsPath": ".aime/skills"
  },
  "targets": {
    "codex": {
      "skillsPath": ".agents/skills",
      "mode": "link"
    }
  }
}
```

## Init Command

Use the interactive bootstrap command to generate config in one shot:

```bash
context-sync init
```

What `init` provides:
- choose `source.kind=canonical|tool`
- select common target tools (multi-select)
- apply target mode strategy (`preset` / `link` / `copy`)
- write `$schema` automatically for editor autocomplete and validation
- protect existing config with overwrite confirmation

You can also set custom config location:

```bash
context-sync init --config configs/dev-context.json
```

## CLI

```bash
# interactive config bootstrap
context-sync init

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

## JSON Schema

The official schema is committed at:
- `context-sync.schema.json` (repo root)

Recommended schema URL styles:
- main branch (always latest):
  - `https://raw.githubusercontent.com/bytedance/vibe-coder-manager/main/context-sync.schema.json`
- versioned tag (stable for production):
  - `https://raw.githubusercontent.com/bytedance/vibe-coder-manager/<tag>/context-sync.schema.json`

## Programmatic API

```ts
import { loadConfigFromFile, syncContext, checkContext } from 'context-sync';

const config = await loadConfigFromFile(process.cwd());
await syncContext({ config, dryRun: false, force: false });
await checkContext({ config });
```

## Sync Behavior

- `link` mode:
  - ensures the target is a symlink to the source
  - `check` fails on symlink mismatch
- `copy` mode:
  - copies source tree to target
  - `check` reports `modified/missing/extra` drift
- `dry-run` prints planned actions without writing
- conflicts are blocked by default unless `--force` is used

## CI Example

```yaml
name: ci
on:
  push:
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run test
      - run: pnpm run check
      - run: pnpm run build
      - run: pnpm exec context-sync check
```
