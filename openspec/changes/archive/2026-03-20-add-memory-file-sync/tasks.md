## 1. 测试定义

- [x] 1.1 为 `parseConfig`、`syncContext` 和 `checkContext` 增加 `memoryPath` 文件级场景测试，先覆盖 link、copy、dry-run、conflict 和 drift
- [x] 1.2 增加 `init` 相关测试，验证带 `memoryPath` 的 target 预设和生成配置可被后续命令正确解析
- [x] 1.3 增加 CLI 级端到端测试，验证包含 `memoryPath` 的配置可通过 `sync/check/doctor`

## 2. 核心实现

- [x] 2.1 重构同步执行层，抽象目录型和文件型 artifact，并让 `memoryPath` 参与 `sync` 与 `doctor`
- [x] 2.2 实现 `memoryPath` 在 `link`/`copy` 模式下的冲突处理与 `check` 校验逻辑
- [x] 2.3 调整 `init` 和相关配置生成逻辑，使内置预设在合适场景下输出 `memoryPath`

## 3. 文档与验证

- [x] 3.1 更新 README、README.zh-CN 和示例配置，明确支持范围为 `skills + single memory file`
- [x] 3.2 运行 `pnpm run test`、`pnpm run build` 和必要的 lint/类型检查，确认新增行为通过且既有 skills-only 场景无回归
