import { lstat } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, test } from '@rstest/core';
import { parseConfig, syncContext } from '../src/index';
import {
  cleanupTempDir,
  createTempDir,
  readTextFile,
  writeSkillsTree,
  writeTextFile,
} from './fixtures';

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await cleanupTempDir(dir);
    }
  }
});

describe('syncContext', () => {
  test('creates symlink target in link mode', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeSkillsTree(repoRoot, '.claude/skills');

    const config = parseConfig(
      {
        source: { kind: 'tool', tool: 'claude', skillsPath: '.claude/skills' },
        targets: { codex: { skillsPath: '.agents/skills', mode: 'link' } },
      },
      repoRoot,
    );

    const result = await syncContext({ config });
    expect(result.success).toBe(true);

    const targetPath = path.join(repoRoot, '.agents/skills');
    const stat = await lstat(targetPath);
    expect(stat.isSymbolicLink()).toBe(true);
  });

  test('copies files in copy mode', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeSkillsTree(repoRoot, '.aime/skills');

    const config = parseConfig(
      {
        source: { kind: 'canonical', skillsPath: '.aime/skills' },
        targets: { codex: { skillsPath: '.agents/skills', mode: 'copy' } },
      },
      repoRoot,
    );

    await syncContext({ config });
    const content = await readTextFile(
      repoRoot,
      '.agents/skills/skill-a/SKILL.md',
    );
    expect(content).toContain('Skill A');
  });

  test('dry-run does not mutate target', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeSkillsTree(repoRoot, '.aime/skills');
    await writeTextFile(repoRoot, '.agents/skills/skill-a/SKILL.md', 'custom');

    const config = parseConfig(
      {
        source: { kind: 'canonical', skillsPath: '.aime/skills' },
        targets: { codex: { skillsPath: '.agents/skills', mode: 'copy' } },
      },
      repoRoot,
    );

    await syncContext({ config, dryRun: true });
    const content = await readTextFile(
      repoRoot,
      '.agents/skills/skill-a/SKILL.md',
    );
    expect(content).toBe('custom');
  });
});
