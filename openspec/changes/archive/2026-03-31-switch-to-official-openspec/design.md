# Design

## Overview

This is a workflow-integration migration, not a product-code migration. The repository keeps its current package identity and behavior, while the OpenSpec entrypoints used by contributors move from repo-local localized wording back to the official `openspec` CLI.

## Decisions

### Use Official Generated Core Skills

- Source of truth: `@fission-ai/openspec@1.2.0`
- Delivery scope: the four official `core` Codex skills already tracked in `.codex/skills/`
- No local translation or command rewriting after generation

This keeps the repo aligned with upstream updates and avoids a second, drifting skill dialect.

### Keep Chinese Artifacts Via Project Config

The repo keeps `openspec/config.yaml` and extends its `context` block with explicit multi-language instructions:

- all artifacts are written in Simplified Chinese
- technical terms may stay in English when clearer
- code snippets, file paths, command names, and schema IDs stay in English

This preserves current team ergonomics while using the official CLI.

### Document Contributor Setup Instead Of Changing Product Docs

The migration updates `CONTRIBUTING.md`, not the public README files. The contributor guide documents:

- official package name `@fission-ai/openspec`
- bootstrap command for Codex
- required refresh command `openspec update`
- the split between repo-tracked `.codex/skills/` and global Codex prompts managed by OpenSpec

## Validation Strategy

- TDD with `rstest`
- add regression coverage for official skill contents, project config language rules, and contributor docs
- run the existing repo verification suite after the migration:
  - `pnpm run test`
  - `pnpm run build`
  - `pnpm run check:oss`
  - `pnpm run check:badges`

## Risks And Mitigations

- Risk: stale repo-tracked skills drift from official output
  - Mitigation: replace them directly from official generated files and document `openspec update`
- Risk: contributors confuse repo-tracked skills with global Codex prompts
  - Mitigation: document the boundary explicitly in `CONTRIBUTING.md`
