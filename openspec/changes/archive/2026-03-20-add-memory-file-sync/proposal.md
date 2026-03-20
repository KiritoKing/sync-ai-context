## 为什么

当前工具的数据模型、adapter 预设和 schema 已经暴露了 `memoryPath`，但 `sync`、`check`、`doctor` 实际只处理 `skillsPath`。这会让配置和对外语义出现落差：用户以为可以同步 `AGENTS.md`、`CLAUDE.md` 或 `project.md` 这类单文件记忆上下文，结果运行时并不会生效。

## 变更内容

- 为 `source.memoryPath` 与 `targets.*.memoryPath` 增加真正的同步语义，支持将单个 memory file 作为 `skills` 之外的可选同步对象。
- 在 `link` 模式下支持 memory file 级别的符号链接同步；在 `copy` 模式下支持 memory file 级别的文件复制同步。
- 扩展 `check` 与 `doctor`，让它们覆盖 memory file 的注册状态、一致性与失败条件。
- 扩展 `init` 生成逻辑与预设，使支持单文件记忆上下文的工具可以保留或生成 `memoryPath` 配置。
- 补充 `rstest` 单元测试与 CLI 级端到端测试，覆盖 memory file 的 `link/copy/check` 行为与冲突场景。
- 明确本次变更不引入 `rulesPath` 或目录级 rules 映射；范围仅限单文件记忆上下文。

## 功能 (Capabilities)

### 新增功能

- 无

### 修改功能

- `context-strategy-sync`: 将同步对象从“仅 skills 目录”扩展为“skills 目录 + 可选单个 memory file”。

## 影响

- 受影响模块包括配置解析、target adapter 预设、同步执行引擎、检查逻辑、`init` 交互生成和 CLI 文档。
- 现有仅配置 `skillsPath` 的用户保持兼容；未配置 `memoryPath` 时行为不变。
- 新增测试将覆盖文件级 link/copy、冲突处理和 `check` 失败语义，确保 README 与实现保持一致。
