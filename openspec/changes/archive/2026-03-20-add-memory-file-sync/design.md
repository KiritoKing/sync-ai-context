## 上下文

当前仓库的配置模型、schema 和 adapter 预设已经包含 `memoryPath`，并为多个目标工具填入了 `AGENTS.md`、`CLAUDE.md`、`.cursor/rules/project.mdc` 等单文件路径。但执行层只消费 `skillsPath`，导致以下问题同时存在：

- 配置字段已公开，但运行时无效果。
- README 和 capability 语义提到 rules/skills，同步实现却只有 skills。
- 目标工具对单文件记忆上下文的支持已足够主流，继续把问题升级成目录级 rules 映射只会扩大范围。

本次变更需要在不引入 `rulesPath` 的前提下，把“单个 memory file”纳入与 `skills` 一致的同步与检查闭环。

## 目标 / 非目标

**目标：**

- 让 `source.memoryPath` 与 `targets.*.memoryPath` 成为真正生效的可选配置。
- 为单个 memory file 提供与 `skillsPath` 一致的 `link`、`copy`、`check` 语义。
- 保持未配置 `memoryPath` 的现有用户完全兼容。
- 让 `init`、adapter 预设、README、schema 与实际行为一致。
- 通过 `rstest` 先补测试，再落地实现。

**非目标：**

- 不引入 `rulesPath`、目录级 rules 映射或文件名转换规则。
- 不尝试自动把一个源文件拆分成多个目标 rules 文件。
- 不引入新的 source 类型；仍保持 `canonical|tool`。
- 不修改 `sync/check/doctor` 的命令入口与基本输出协议。

## 决策

### 决策 1: 将同步对象抽象为“目录型 artifact + 文件型 artifact”

- 选择：保留 `skillsPath` 作为目录型 artifact，新增对 `memoryPath` 这个文件型 artifact 的统一处理；`sync`、`check`、`doctor` 依次处理两类 artifact。
- 理由：现有实现已经完整覆盖目录同步语义，单文件同步只是同一模式在文件粒度上的扩展，不需要为其发明新的命令模型。
- 备选：继续只支持目录。缺点是公开配置与实际行为长期不一致。
- 备选：直接抽象 `rulesPath` 目录。缺点是引入额外映射和命名规则，超出本次范围。

### 决策 2: `memoryPath` 仅在 source 与 target 都显式配置时参与同步

- 选择：只有当 source 声明 `memoryPath` 且某个 target 也声明 `memoryPath` 时，才对该 target 执行 memory file 同步与检查。
- 理由：不同工具对记忆文件名称和位置并不统一，系统不应该猜测目标文件名或自动派生路径。
- 备选：仅 source 配置时自动推导 target。缺点是推导规则不稳定，且容易误写入用户仓库。

### 决策 3: memory file 复用既有 `link/copy/check` 语义，但冲突检查按文件规则实现

- 选择：
  - `link` 模式：目标 memory file 必须是指向源 memory file 的符号链接。
  - `copy` 模式：目标 memory file 内容必须与源一致；若目标存在不同内容、错误类型或缺失，则报告 drift/conflict。
- 理由：用户已经理解目录级 `link/copy/check`；单文件同步应尽量复用相同心智模型。
- 备选：对 memory file 只支持 copy。缺点是本地支持 symlink 的工作流会失去一致性。

### 决策 4: `init` 和内置 adapter 继续把 `memoryPath` 视为单文件预设，而不是 rules 目录预设

- 选择：保留现有 adapter 中的 `memoryPath` 预设；当 source/target 选择的工具具备已知单文件路径时，生成配置时直接写出该字段。
- 理由：仓库已经有这层数据，只是未完成执行闭环；复用现状能让变更更小。
- 备选：在 `init` 中移除 `memoryPath`。缺点是会回避现有语义缺口，而不是修复它。

### 决策 5: 测试继续采用 rstest + TDD，新增文件级 fixture

- 选择：先增加 memory file 的单元测试和 CLI 级用例，再实现执行层。
- 理由：文件和目录的冲突语义不同，若不先写测试，很容易在 `force`、`dry-run`、missing path 场景下出现行为回退。
- 备选：沿用现有目录测试间接覆盖。缺点是无法验证文件级 edge case。

## 风险 / 权衡

- [用户期望同步整个 rules 目录] → 在 proposal、spec 和 README 中明确本次仅支持单文件 memory，同步目录规则留待后续能力。
- [file/dir 语义混用导致冲突判断复杂] → 将文件型 artifact 和目录型 artifact 分开建模，在每种模式下分别校验目标类型。
- [部分目标工具官方推荐的是 rules 目录而不是单文件] → 仍允许通过 `memoryPath` 同步一个主规则文件，但不宣称已覆盖该工具的全部原生规则能力。
- [现有 schema 已接受 `memoryPath`，实现补齐后可能暴露旧配置问题] → 保持字段可选，且只在显式配置时生效，避免破坏未使用该字段的用户。

## 迁移计划

1. 先补 `memoryPath` 的 rstest 单元测试和 CLI 级测试，定义 `link/copy/check` 与冲突行为。
2. 调整执行层，增加文件型 artifact 的同步、检查与 doctor 输出。
3. 调整 `init`、README、schema 示例与 adapter 预设说明，确保文档和实现一致。
4. 运行测试、lint、类型检查，确认既有 skills-only 场景没有回归。

回滚策略：

- 若文件级同步语义在实现中引入不稳定性，可仅回滚 memoryPath 执行逻辑，保留现有 skills-only 能力不变。

## 待定问题

- `doctor` 是否要区分“未配置 memoryPath”和“已配置但源文件不存在”的输出文案，可在实现时根据现有 CLI 风格定稿。
