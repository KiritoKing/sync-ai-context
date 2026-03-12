## 1. 测试先行（TDD）基线

- [x] 1.1 使用 `rstest` 建立测试目录、fixture 约定和辅助断言工具
- [x] 1.2 先编写 source 解析失败/成功用例（含 canonical 与 tool 模式）
- [x] 1.3 先编写 `link/copy` 同步行为用例（含 dry-run、force、冲突阻断）
- [x] 1.4 先编写 `check` 行为用例（link mismatch、copy modified/missing/extra）
- [x] 1.5 先编写 CLI 级端到端用例（`sync`、`check`、`doctor`）

## 2. 项目骨架与配置模型

- [x] 2.1 定义 v1 配置 schema（source、targets、mode、policy）并实现加载与校验
- [x] 2.2 实现 `source.kind=canonical|tool` 的统一解析模型
- [x] 2.3 实现内置 target adapter 映射（codex/claude/cursor/copilot/continue/cline）

## 3. 同步引擎实现

- [x] 3.1 实现执行计划层（解析配置后生成 sync/check 计划）
- [x] 3.2 实现 `copy` 模式同步（目录复制、父目录创建、冲突阻断）
- [x] 3.3 实现 `link` 模式同步（相对链接创建、目标替换策略）
- [x] 3.4 实现 `dry-run` 与 `force` 行为并统一输出结果

## 4. 一致性检查能力

- [x] 4.1 实现 `link` 模式检查（链接存在性、类型、解析路径一致性）
- [x] 4.2 实现 `copy` 模式检查（source/target 哈希比对与差异分类）
- [x] 4.3 实现统一失败码与差异摘要输出（modified/missing/extra）

## 5. CLI 与对外接口

- [x] 5.1 实现 `sync` 命令（按 target/all 执行）
- [x] 5.2 实现 `check` 命令（全量或按 target 校验）
- [x] 5.3 实现 `doctor` 命令（配置、路径、source/target 可达性基础检查）
- [x] 5.4 导出程序化 API（`syncContext`、`checkContext`）

## 6. 测试收敛与文档

- [x] 6.1 补全遗漏边界用例并重构测试夹具，确保 `rstest` 套件稳定可复现
- [x] 6.2 验证所有功能任务完成后测试全绿并固定回归场景
- [x] 6.3 更新 README：快速开始、配置示例、TDD 约定、link/copy 使用建议
- [x] 6.4 增加 CI 校验示例（`check` 阻断漂移 + `pnpm run test`）
