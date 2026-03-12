import type { TargetInput } from './types';

export const DEFAULT_TARGETS: Readonly<Record<string, TargetInput>> = {
  codex: {
    skillsPath: '.agents/skills',
    memoryPath: 'AGENTS.md',
    mode: 'link',
  },
  claude: {
    skillsPath: '.claude/skills',
    memoryPath: 'CLAUDE.md',
    mode: 'link',
  },
  cursor: {
    skillsPath: '.cursor/skills',
    memoryPath: '.cursor/rules/project.mdc',
    mode: 'copy',
  },
  copilot: {
    skillsPath: '.github/instructions/skills',
    memoryPath: '.github/copilot-instructions.md',
    mode: 'copy',
  },
  continue: {
    skillsPath: '.continue/skills',
    memoryPath: '.continue/rules/project.md',
    mode: 'copy',
  },
  cline: {
    skillsPath: '.clinerules/skills',
    memoryPath: '.clinerules/project.md',
    mode: 'copy',
  },
};
