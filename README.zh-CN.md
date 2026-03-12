# sync-ai-context

[![CI](https://github.com/KiritoKing/sync-ai-context/actions/workflows/ci.yml/badge.svg)](https://github.com/KiritoKing/sync-ai-context/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/sync-ai-context.svg)](https://www.npmjs.com/package/sync-ai-context)
[![npm downloads](https://img.shields.io/npm/dm/sync-ai-context.svg)](https://www.npmjs.com/package/sync-ai-context)
[![License](https://img.shields.io/github/license/KiritoKing/sync-ai-context.svg)](./LICENSE)
[![Provenance](https://github.com/KiritoKing/sync-ai-context/actions/workflows/release.yml/badge.svg)](https://github.com/KiritoKing/sync-ai-context/actions/workflows/release.yml)

面向 AI 工具规则与技能目录的配置驱动同步 CLI，支持单一源、多目标同步与一致性校验。

## 功能特性

- 支持 `source.kind=canonical|tool` 单一来源
- 支持 `link` 与 `copy` 两种目标模式
- 提供 `sync`、`check`、`doctor` 命令
- 支持 `--dry-run` 与 `--force` 冲突策略
- 支持 CI 自动发包、Release/Tag 与 provenance 证明

## 安装

```bash
npm install -g sync-ai-context
```

不全局安装也可直接运行：

```bash
npx sync-ai-context sync --dry-run
```

## 快速开始

在项目根目录创建 `context-sync.config.json`：

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

执行同步：

```bash
context-sync sync
```

## 命令说明

```bash
# 同步所有目标
context-sync sync

# 同步单个目标
context-sync sync --target codex

# 仅预览，不写入
context-sync sync --dry-run

# 强制覆盖冲突
context-sync sync --force

# 校验目标一致性
context-sync check

# 基础健康检查
context-sync doctor
```

## 行为语义

### source.kind

- `canonical`: 使用独立目录作为唯一来源
- `tool`: 直接使用工具目录作为唯一来源

### target mode

- `link` 模式：
  - 目标目录应为指向源目录的符号链接
  - `check` 发现目标不一致时返回 `symlink mismatch`
- `copy` 模式：
  - 将源目录内容复制到目标目录
  - `check` 发现漂移时返回 `copy drift`（`modified/missing/extra`）

### 冲突策略

- `--dry-run`: 只输出计划动作，不写入文件系统
- `--force`: 冲突时允许覆盖目标状态

## 开发

```bash
pnpm install
pnpm run test
pnpm run build
pnpm run check:oss
pnpm run check:badges
```

## 发布与供应链证明

- 发版工作流：`.github/workflows/release.yml`
- npm 发包通过 CI 执行并使用 `--provenance`
- README 中 `Provenance` 徽章用于展示流水线构建发布状态

## 徽章维护

- 必需徽章：`CI`、`npm version`、`npm downloads`、`License`、`Provenance`
- 通过 `pnpm run check:badges` 做自动校验

## 协作与安全

- 贡献指南：[CONTRIBUTING.md](./CONTRIBUTING.md)
- 行为准则：[CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- 安全策略：[SECURITY.md](./SECURITY.md)
- 变更记录：[CHANGELOG.md](./CHANGELOG.md)

## 许可证

MIT，见 [LICENSE](./LICENSE)。
