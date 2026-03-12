## 1. 测试先行：init 与 schema 基线

- [ ] 1.1 使用 `rstest` 新增 `init` 参数解析失败/成功用例（未知命令、默认路径、可选覆盖）
- [ ] 1.2 使用 `rstest` 新增交互流程测试（基于 Prompt Adapter mock，覆盖 source.kind=canonical|tool、工具多选、mode 选择）
- [ ] 1.3 使用 `rstest` 新增配置文件已存在且拒绝覆盖的失败用例
- [ ] 1.4 使用 `rstest` 新增 schema 字段兼容性测试（包含 `$schema` 时 `sync/check/doctor` 仍可解析）
- [ ] 1.5 使用 `rstest` 新增 check 失败回归测试（symlink mismatch、copy drift）并确保由 init 生成配置也覆盖

## 2. Schema 与配置模型实现

- [ ] 2.1 新增官方 JSON Schema 文件并覆盖 source/targets/mode 约束
- [ ] 2.2 在配置类型定义中加入可选 `$schema` 字段并保持现有字段语义不变
- [ ] 2.3 更新配置解析逻辑，允许 `$schema` 存在且不影响业务校验
- [ ] 2.4 增加 schema 有效性自检（schema 与当前配置示例一致）

## 3. init 交互式命令实现

- [ ] 3.1 扩展 CLI 命令解析，新增 `init` 子命令入口
- [ ] 3.2 引入成熟第三方交互式 CLI 库并固定兼容版本范围
- [ ] 3.3 实现 Prompt Adapter 抽象层，隔离第三方交互库与业务逻辑
- [ ] 3.4 基于 Adapter 实现 init 交互向导模块（便于测试与替换实现）
- [ ] 3.5 实现常用工具预置 registry 与多选生成 `targets` 逻辑
- [ ] 3.6 实现配置写入器（默认输出 `context-sync.config.json`、包含 `$schema`、支持覆盖确认）
- [ ] 3.7 实现 `source.kind=canonical|tool` 的输入分支与字段完整性校验

## 4. 集成验证与文档

- [ ] 4.1 新增 CLI 端到端测试：`context-sync init` 生成配置后可直接执行 `sync/check`
- [ ] 4.2 补充回归测试，确认 `link/copy` 执行语义与 `check` 失败判定未回归
- [ ] 4.3 更新 README：init 使用示例、常用工具一键配置示例、`$schema` 配置示例
- [ ] 4.4 文档化 GitHub schema 地址策略（版本化 URL 与 main URL 的使用建议）
