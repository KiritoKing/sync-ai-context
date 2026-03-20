# AGENTS.md

You are an expert in JavaScript, Rspack, Rsbuild, Rslib, and library development. You write maintainable, performant, and accessible code.

## General Context Rules

- 通用规范只允许承载跨任务稳定成立的上下文，例如编码规则、硬性规范、边界围栏、工程约束与协作约定。
- 通用规范不得夹带业务逻辑、阶段性产品决策或“暂时不实现 xxx”这类需求结论；这类内容必须进入 OpenSpec proposal/design/specs/tasks。
- 修改代码时必须修复 ESLint Error 和 TypeScript Error。
- 忽略 ESLint Warning 与纯格式化问题（Prettier），优先保证逻辑正确性。
- 禁止使用 `any`。
- 优先使用 Root-Import（`@/`）。

## Delivery Process

- 实现流程必须遵循 TDD：先写或先补失败测试，再进行实现，再做必要重构。
- 所有新增或变更行为默认使用 `rstest` 建立测试基线。
- 任务完成后必须检查相关文档是否需要更新；若实现影响用法、约束、示例、流程或对外说明，则必须同步更新文档。

## Commands

- `pnpm run build` - Build the library for production
- `pnpm run dev` - Turn on watch mode, watch for changes and rebuild the library

## Docs

- Rslib: https://rslib.rs/llms.txt
- Rsbuild: https://rsbuild.rs/llms.txt
- Rspack: https://rspack.rs/llms.txt
- Rstest: https://rstest.rs/llms.txt

## Tools

### Biome

- Run `pnpm run lint` to lint your code
- Run `pnpm run format` to format your code

### Rstest

- Run `pnpm run test` to run tests
- Run `pnpm run test:watch` to run tests in watch mode
