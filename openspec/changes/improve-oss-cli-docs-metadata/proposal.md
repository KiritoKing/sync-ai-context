## 为什么

当前仓库已具备 CLI 与基础说明，但尚未达到“开源 npm CLI 工具”可直接发布与可协作维护的标准：缺少完整的开源协作文档与 npm 包元信息。现在补齐这些基础资产，可以降低用户接入成本、避免发布/使用歧义，并为后续正式发布建立稳定基线。

## 变更内容

- 完善面向开源发布的核心文档：README 重构、安装与快速开始、CLI 命令参考、配置说明、开发与发布说明。
- 新增社区与协作文档：LICENSE、CONTRIBUTING、CODE_OF_CONDUCT、SECURITY、CHANGELOG（初始化结构）。
- 完善 npm 包元信息：`name`、`description`、`license`、`repository`、`homepage`、`bugs`、`keywords`、`engines`、`publishConfig`、`files` 与 `bin/exports` 的发布一致性校验。
- 建立标准开源发布流水线：CI 触发自动化发包、生成/更新 Release 与 Tag，保证发布动作来自受控流水线而非人工本地发布。
- 补齐开源可验证证明：在 README 中加入并维护 provenance/构建来源证明 badge，以及版本、下载量、CI 状态等常用数据 badge。
- 明确开源工具的发布边界与非目标：本变更不引入云端模板拉取和远程 registry，同步能力范围保持现有一期定义不变。

## 功能 (Capabilities)

### 新增功能
- `oss-cli-docs-and-metadata`: 定义开源 npm CLI 的文档最小完备集与包元信息最小完备集，以及可验收标准。
- `oss-cli-release-automation`: 定义开源 npm CLI 的自动化发布、Release/Tag 生成与来源证明要求。

### 修改功能
- `context-strategy-sync`: 补充“文档与元信息可发现性”相关要求，确保 CLI 能力与对外文档、包元信息保持一致。

## 影响

- 文档目录与根文件：`README.md`、新增开源协作文档。
- 包配置：`package.json`（发布与开源字段）。
- CI 与发布流程：`.github/workflows/*`（构建、发包、Release/Tag、provenance 相关动作）。
- 不影响既有核心同步算法与命令语义（`sync/check/doctor`）。
