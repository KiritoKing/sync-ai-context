## 上下文

当前脚本实现已经验证了以下关键模式：single-source、`link/copy` 双模式、`dry-run/force`、基于哈希的 copy 一致性检查、基于 readlink 的 link 校验。问题在于它仍是单仓定制脚本，缺少开源工具所需的可配置接口、稳定命令语义与适配扩展机制。

本设计将其升级为通用 CLI + Library：
- CLI 面向团队工作流与 CI（`sync/check`）。
- Library 面向后续二次封装与插件扩展。

## 目标 / 非目标

**目标：**
- 提供 single-source 驱动的多工具 rules + skills 同步能力。
- 支持 `source.kind=canonical|tool`，满足“直接把某工具作为 source”的诉求。
- 提供 `link/copy` 双模式与严格 `check`。
- 提供声明式配置与清晰错误输出。
- 形成可扩展的 adapter 接口，便于新增工具。

**非目标：**
- 不实现云端模板拉取、远程 registry 或在线安装。
- 不实现复杂权限系统、组织级审批流。
- 不在 v1 引入 UI，仅提供 CLI 和程序化 API。

## 决策

### 决策 1: 采用三层结构（Config -> Planner -> Executor）
- 选择：先解析配置与环境，再生成执行计划，最后执行文件系统动作。
- 理由：便于支持 `dry-run`、`--json` 报告与可测试性。
- 备选：命令中直接执行文件操作。缺点是难以复用与测试。

### 决策 2: source 类型显式建模为 `canonical|tool`
- 选择：配置层显式区分 source 类型。
- 理由：满足“无需独立 source 文件夹”的一期核心需求，并保留向远程 source 扩展的演进空间。
- 备选：只支持 canonical。缺点是不能直接复用现有工具目录。

### 决策 3: target 使用 adapter 抽象
- 选择：内置主流工具 adapter（codex/claude/cursor/copilot/continue/cline），统一输出 `skillsPath`、`memoryPath`。
- 理由：避免目标映射硬编码在业务逻辑中，后续可插件化。
- 备选：仅维护固定 target map。缺点是扩展成本高。

### 决策 4: 一致性检查按模式分治
- 选择：
  - link: 检查目标是否为符号链接且解析后路径等于 source。
  - copy: 构建源与目标哈希映射，报告 modified/missing/extra。
- 理由：与用户运行环境问题（本地 link、云端 copy）直接匹配。
- 备选：统一做文本 diff。缺点是无法验证链接语义。

### 决策 5: 冲突处理保持保守默认
- 选择：默认阻断冲突，`force` 才允许覆盖。
- 理由：避免误覆盖团队本地改动，符合开源工具安全默认值。
- 备选：默认覆盖。缺点是高风险。

### 决策 6: 测试采用 rstest 且执行 TDD（测试先行）
- 选择：统一使用 `rstest` 作为测试框架，并要求每个功能在实现前先落地失败测试用例（red -> green -> refactor）。
- 理由：文件系统与路径行为容易出现平台差异，测试先行能更早暴露边界问题并稳定 CLI 契约。
- 备选：实现后补测试。缺点是回归风险高，行为约束不清晰。

## 风险 / 权衡

- [跨平台 symlink 差异] → 默认策略允许按 target 或环境切换到 copy；在报错信息中明确建议。
- [target 手工编辑导致漂移] → `check` 报告细粒度差异并在 CI 中阻断。
- [配置复杂度上升] → 提供最小配置与内置默认 adapter，降低上手成本。
- [首发覆盖面与维护成本冲突] → v1 仅覆盖主流工具，采用 adapter 接口控制扩展边界。

## 迁移计划

1. 从现有脚本提取纯函数能力（路径解析、哈希、link/copy/check）进入 `core`。
2. 引入配置 schema 与解析器，兼容默认 target map。
3. 实现 CLI：`sync`、`check`、`doctor`（基础检查）。
4. 先基于 `rstest` 编写失败测试（source 解析、link/copy、check、冲突策略），再实现对应功能使测试通过。
5. 添加 fixture 测试（link/copy 冲突与 check 结果）。
6. 在 README 中给出两种 source 示例（canonical/tool）与测试命令。

回滚策略：
- 如果新 CLI 不稳定，可保留原脚本作为 fallback 命令直到 v1 验证完成。

## 待定问题

- v1 的 `doctor` 输出粒度是否需要机器可读 JSON（建议支持）。
- 是否在 v1 就引入 `manifest` 文件（当前建议 v1.1 处理）。
