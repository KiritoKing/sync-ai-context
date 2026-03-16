## 1. 测试基线与校验脚手架

- [x] 1.1 新增 `rstest` 单元测试：校验 `package.json` 必填开源字段（`name/description/license/repository/homepage/bugs/keywords/engines/publishConfig`）存在且格式合法
- [x] 1.2 新增 `rstest` 单元测试：校验 `bin`、`exports`、`files` 与构建产物约定一致，避免发布后命令入口失效
- [x] 1.3 新增端到端测试：在临时目录执行安装/构建后验证 `context-sync sync/check/doctor` 命令可调用且帮助信息可读
- [x] 1.4 新增端到端测试：验证 README 中的关键命令示例（含 `--dry-run`、`--force`）与实际 CLI 参数行为一致
- [x] 1.5 新增 CI 流程测试：验证发布流水线在构建或测试失败时必须阻断发包步骤
- [x] 1.6 新增 CI 流程测试：验证发布成功后存在对应版本的 Tag 与 Release 元信息

## 2. 开源文档体系完善

- [x] 2.1 重构 `README.md`，补齐开源 npm CLI 所需章节（价值说明、安装、快速开始、命令参考入口、配置示例、开发与测试）
- [x] 2.2 新增或完善协作文档：`CONTRIBUTING.md`、`CODE_OF_CONDUCT.md`、`SECURITY.md`、`CHANGELOG.md`
- [x] 2.3 补齐许可证文件 `LICENSE`，并确保许可证类型与 `package.json` 的 `license` 字段一致
- [x] 2.4 在文档中明确 `source.kind=canonical|tool`、`link/copy` 差异、`check` 失败条件（`symlink mismatch`、copy drift）
- [x] 2.5 完善 README badges：补齐 CI、npm version、npm downloads、License、provenance（自动化构建来源证明）徽章并统一展示位置
- [x] 2.6 增加 badges 校验说明与维护策略，确保失效链接或状态失真可被 CI 发现

## 3. npm 包元信息与发布就绪

- [x] 3.1 更新 `package.json` 为公开 npm CLI 形态（移除 `private: true`，补齐公开包名与描述）
- [x] 3.2 补齐开源元信息字段（`repository/homepage/bugs/keywords/engines/publishConfig`）并校对 URL 与仓库实际地址
- [x] 3.3 校验发布白名单与入口配置（`files`、`bin`、`exports`、`types`）满足最小可发布集
- [x] 3.4 如需变更包名，统一更新 README、示例命令与测试断言，确保无陈旧引用
- [x] 3.5 配置 npm provenance 所需发布参数与权限策略，确保发布产物具备可验证来源信息

## 4. 发布自动化流水线

- [x] 4.1 实现 GitHub Actions 发布工作流：在受控触发条件下自动执行构建、测试、发包
- [x] 4.2 在发布工作流中自动创建或更新版本 Tag 与 GitHub Release，写入本次版本变更说明
- [x] 4.3 为发包流程配置最小权限与密钥使用策略，避免人工本地发包成为正式路径
- [x] 4.4 增加流水线来源证明产物输出与对外可见链接，支撑 README provenance badge

## 5. 集成验证与收尾

- [x] 5.1 执行测试与检查：`pnpm run test`、`pnpm run build`，并修复新增变更导致的失败
- [x] 5.2 执行文档与元信息一致性检查（含命令示例可执行性、字段完整性、badge 链接可用性）并确认全部通过
- [x] 5.3 复核变更范围，确认未引入云端模板拉取或远程 registry 相关实现
- [x] 5.4 更新变更说明，准备进入 `/opsx:apply` 实施阶段
