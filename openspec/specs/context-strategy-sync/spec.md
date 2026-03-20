# context-strategy-sync 规范

## 目的
待定 - 由归档变更 add-context-sync-v1 创建。归档后请更新目的。
## 需求
### 需求:支持可配置的 single-source
系统必须允许通过配置声明上下文 single-source，并且 source 类型必须支持 `canonical` 与 `tool` 两种模式。

#### 场景:使用独立目录作为 source
- **当** 用户在配置中声明 `source.kind=canonical` 且提供 source 路径
- **那么** 系统必须从该路径读取 rules/skills 作为唯一源进行后续同步

#### 场景:使用工具目录作为 source
- **当** 用户在配置中声明 `source.kind=tool` 且指定工具标识与路径（例如 claude）
- **那么** 系统必须将该工具目录视为唯一源而无需额外独立 source 目录

### 需求:支持 link 与 copy 两种同步模式
系统必须对每个 target 支持 `link` 与 `copy` 模式，并按配置对 `skillsPath` 以及显式配置的 `memoryPath` 执行对应文件系统动作。

#### 场景:target 为 link 模式
- **当** 某 target 配置为 `mode=link`
- **那么** 系统必须为该 target 已声明的同步对象创建或校正符号链接，使其分别指向 source 对应路径

#### 场景:target 为 copy 模式
- **当** 某 target 配置为 `mode=copy`
- **那么** 系统必须将该 target 已声明的 source 内容拷贝到目标路径，并覆盖目标状态

### 需求:提供一致性检查能力
系统必须提供 `check` 能力，对不同模式下的 `skillsPath` 和显式配置的 `memoryPath` 执行可验证的一致性校验，并以非零退出码报告失败。

#### 场景:link 目标检查
- **当** target 为 link 模式且任一已配置同步对象的实际链接指向错误路径
- **那么** 系统必须报告 symlink mismatch 并返回失败

#### 场景:copy 目标检查
- **当** target 为 copy 模式且任一已配置同步对象存在 modified、missing 或 extra 文件，或者 memory file 内容不一致/缺失
- **那么** 系统必须报告差异摘要并返回失败

### 需求:支持 dry-run 与 force 冲突策略
系统必须支持 `dry-run` 预览和 `force` 强制覆盖，以便在冲突场景下实现可控操作。

#### 场景:dry-run 执行
- **当** 用户启用 `dry-run`
- **那么** 系统必须仅输出计划动作且不修改文件系统

#### 场景:未启用 force 的冲突
- **当** 目标路径存在冲突且用户未启用 `force`
- **那么** 系统必须阻断执行并输出冲突说明

### 需求:支持声明式配置驱动同步
系统必须通过配置文件声明 source、targets、mode 与策略，并在配置无效时给出明确错误。

#### 场景:配置合法时执行
- **当** 配置文件满足 schema 约束
- **那么** 系统必须按照配置解析结果执行同步与检查

#### 场景:配置非法时执行
- **当** 配置文件缺失必要字段或字段值非法
- **那么** 系统必须立即失败并输出具体字段级错误

### 需求:提供基于 rstest 的行为测试保障
系统必须提供基于 `rstest` 的自动化测试套件，覆盖核心同步与校验行为，并可在 CI 中稳定执行。

#### 场景:核心行为存在自动化测试
- **当** 开发者运行测试命令
- **那么** 系统必须通过 `rstest` 执行并验证 source 解析、link/copy 同步、check 差异报告和冲突策略

#### 场景:新增行为先由测试定义
- **当** 新增或修改同步行为
- **那么** 变更必须先增加或更新 `rstest` 测试用例，再实现对应功能

### 需求:提供交互式 init 配置初始化命令
系统必须提供 `init` 命令，通过交互式流程引导用户生成可执行的配置文件，并支持常用工具预置的一键选择。

#### 场景:首次初始化并选择常用工具
- **当** 用户执行 `context-sync init` 且在交互流程中选择多个常用工具
- **那么** 系统必须一次性生成包含对应 `targets` 的配置文件，且每个 target 必须包含 `mode`、`skillsPath` 和预设可用的 `memoryPath` 字段

#### 场景:配置文件已存在且未确认覆盖
- **当** 用户执行 `context-sync init` 且目标配置文件已存在且用户未确认覆盖
- **那么** 系统必须终止写入并返回失败

### 需求:init 生成配置必须兼容既有 source 模型
系统必须保证 `init` 生成的配置满足 `source.kind=canonical|tool` 既有契约，不得引入新的 source 类型破坏兼容性。

#### 场景:选择 canonical 作为 source
- **当** 用户在 `init` 流程中选择 `canonical`
- **那么** 系统必须生成 `source.kind=canonical` 且包含合法的 `skillsPath`

#### 场景:选择 tool 作为 source
- **当** 用户在 `init` 流程中选择 `tool`
- **那么** 系统必须生成 `source.kind=tool` 且包含 `tool` 标识与合法的 `skillsPath`

### 需求:配置文件必须支持可公开引用的 JSON Schema
系统必须提供并维护官方 JSON Schema，并允许配置文件通过 `$schema` 字段引用 GitHub 可访问地址以获得编辑器补全与校验能力。

#### 场景:init 生成 schema 引用
- **当** 用户通过 `init` 创建新配置
- **那么** 生成的配置必须包含 `$schema` 字段并指向官方 schema URL

#### 场景:解析包含 schema 字段的配置
- **当** 用户执行 `sync/check/doctor` 且配置中包含 `$schema`
- **那么** 系统必须保持与既有行为一致并继续解析配置，不得因 `$schema` 字段导致失败

### 需求:init 生成配置必须保留 link 与 copy 的差异化语义
系统必须确保由 `init` 生成的 target 配置仍遵循 `link` 与 `copy` 的既有执行差异。

#### 场景:target 选择 link 模式
- **当** 用户在 `init` 中将某个 target 设为 `link`
- **那么** 后续 `sync` 执行必须创建或校正符号链接

#### 场景:target 选择 copy 模式
- **当** 用户在 `init` 中将某个 target 设为 `copy`
- **那么** 后续 `sync` 执行必须进行文件拷贝而非符号链接

### 需求:check 失败条件必须继续覆盖 link mismatch 与 copy drift
系统必须保持 `check` 的失败判定：link 模式下的 symlink mismatch 与 copy 模式下的 modified/missing/extra 仍必须返回失败。

#### 场景:link symlink mismatch
- **当** 由 `init` 生成配置的某 link 目标实际指向错误路径
- **那么** `check` 必须报告 symlink mismatch 并返回失败

#### 场景:copy drift
- **当** 由 `init` 生成配置的某 copy 目标出现 modified、missing 或 extra 文件
- **那么** `check` 必须报告差异摘要并返回失败

### 需求:新增行为必须遵循 rstest 与测试先行
系统必须使用 `rstest` 覆盖 `init` 与 schema 新行为，并在实现前先提交失败测试用例。

#### 场景:新增 init 行为有失败测试
- **当** 开发者新增 `init` 交互或 schema 相关能力
- **那么** 必须先新增对应的失败测试，再实现功能使其通过

#### 场景:测试命令覆盖新增能力
- **当** 开发者执行测试命令
- **那么** `rstest` 套件必须覆盖 init 生成结果、schema 引用与兼容性校验场景

### 需求:同步能力声明必须与对外文档和包元信息一致
系统必须确保 `context-strategy-sync` 的公开说明与实际行为一致，且在开源发布时可被用户发现与验证。

#### 场景:source.kind 语义一致
- **当** 用户在 README 或命令文档中查看 source 配置说明
- **那么** 文档必须准确声明 `source.kind=canonical|tool` 的支持范围，且与实际实现一致

#### 场景:命令语义一致
- **当** 用户查看包元信息中的 CLI 入口并执行命令
- **那么** 文档中对 `sync/check/doctor`、`link/copy`、`dry-run`、`force` 的描述必须与运行结果一致

#### 场景:测试策略声明一致
- **当** 仓库声明测试策略
- **那么** 文档必须明确以 `rstest` 执行为基线，并要求新增或修改行为先补测试再实现

### 需求:支持可选的单文件 memory 同步
系统必须允许通过 `source.memoryPath` 与 `targets.*.memoryPath` 声明单个 memory file，并在显式配置时将其作为 `skills` 之外的可选同步对象。

#### 场景:source 与 target 都声明 memoryPath
- **当** 用户在 source 与某个 target 中都声明合法的 `memoryPath`
- **那么** 系统必须在该 target 上同步对应的单个 memory file

#### 场景:target 未声明 memoryPath
- **当** source 声明 `memoryPath` 但某个 target 未声明 `memoryPath`
- **那么** 系统必须仅同步该 target 的 `skillsPath`，且不得猜测或创建目标 memory file 路径

### 需求:init 与内置预设必须保留单文件 memory 配置
系统必须在 `init` 和内置 adapter 预设中保留单文件 memory file 的配置能力，以便支持 `AGENTS.md`、`CLAUDE.md` 或其他单文件记忆入口。

#### 场景:选择带 memoryPath 预设的目标工具
- **当** 用户在 `init` 中选择带有已知单文件记忆入口的目标工具
- **那么** 生成的 target 配置必须包含对应的 `memoryPath`

#### 场景:解析包含 memoryPath 的配置
- **当** 用户执行 `sync`、`check` 或 `doctor` 且配置中包含合法的 `memoryPath`
- **那么** 系统必须继续解析并执行该字段，不得将其视为无效或忽略

