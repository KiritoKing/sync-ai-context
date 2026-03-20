## 新增需求

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

## 修改需求

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

### 需求:提供交互式 init 配置初始化命令
系统必须提供 `init` 命令，通过交互式流程引导用户生成可执行的配置文件，并支持常用工具预置的一键选择。

#### 场景:首次初始化并选择常用工具
- **当** 用户执行 `context-sync init` 且在交互流程中选择多个常用工具
- **那么** 系统必须一次性生成包含对应 `targets` 的配置文件，且每个 target 必须包含 `mode`、`skillsPath` 和预设可用的 `memoryPath` 字段

#### 场景:配置文件已存在且未确认覆盖
- **当** 用户执行 `context-sync init` 且目标配置文件已存在且用户未确认覆盖
- **那么** 系统必须终止写入并返回失败

## 移除需求
