import path from 'node:path';
import { describe, expect, test } from '@rstest/core';
import { parseConfig } from '../src/index';

describe('parseConfig', () => {
  test('accepts canonical source and resolves relative paths', () => {
    const config = parseConfig(
      {
        source: {
          kind: 'canonical',
          skillsPath: '.aime/skills',
          memoryPath: '.aime/AGENTS.md',
        },
        targets: {
          codex: {
            skillsPath: '.agents/skills',
            memoryPath: 'AGENTS.md',
            mode: 'link',
          },
        },
      },
      '/repo',
    );

    expect(config.source.kind).toBe('canonical');
    expect(config.source.skillsPath).toBe(path.join('/repo', '.aime/skills'));
    expect(config.source.memoryPath).toBe(
      path.join('/repo', '.aime/AGENTS.md'),
    );
    expect(config.targets.codex.skillsPath).toBe(
      path.join('/repo', '.agents/skills'),
    );
    expect(config.targets.codex.memoryPath).toBe(
      path.join('/repo', 'AGENTS.md'),
    );
  });

  test('accepts tool source', () => {
    const config = parseConfig(
      {
        source: { kind: 'tool', tool: 'claude', skillsPath: '.claude/skills' },
        targets: {
          codex: { skillsPath: '.agents/skills', mode: 'copy' },
        },
      },
      '/repo',
    );

    expect(config.source.kind).toBe('tool');
    expect(config.source.tool).toBe('claude');
  });

  test('throws on invalid mode', () => {
    expect(() =>
      parseConfig(
        {
          source: { kind: 'canonical', skillsPath: '.aime/skills' },
          targets: {
            codex: { skillsPath: '.agents/skills', mode: 'invalid' },
          },
        },
        '/repo',
      ),
    ).toThrow(/mode/i);
  });
});
