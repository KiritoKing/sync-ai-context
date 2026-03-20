import { afterEach, describe, expect, test } from '@rstest/core';
import { checkContext, parseConfig, syncContext } from '../src/index';
import {
  cleanupTempDir,
  createFileSymlink,
  createSymlink,
  createTempDir,
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

describe('checkContext', () => {
  test('detects symlink mismatch in link mode', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeSkillsTree(repoRoot, '.aime/skills');
    await writeSkillsTree(repoRoot, '.other/skills');
    await createSymlink(repoRoot, '.agents/skills', '.other/skills');

    const config = parseConfig(
      {
        source: { kind: 'canonical', skillsPath: '.aime/skills' },
        targets: { codex: { skillsPath: '.agents/skills', mode: 'link' } },
      },
      repoRoot,
    );

    const result = await checkContext({ config });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('symlink');
  });

  test('detects modified file in copy mode', async () => {
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

    await writeTextFile(repoRoot, '.agents/skills/skill-a/SKILL.md', 'drift');
    const result = await checkContext({ config });
    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('modified');
  });

  test('detects memory file drift in copy mode', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeSkillsTree(repoRoot, '.aime/skills');
    await writeTextFile(repoRoot, '.aime/AGENTS.md', '# Source Memory\n');
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
            mode: 'copy',
          },
        },
      },
      repoRoot,
    );
    await syncContext({ config });

    await writeTextFile(repoRoot, 'AGENTS.md', 'drift');
    const result = await checkContext({ config });
    expect(result.success).toBe(false);
    expect(result.errors.join('\n')).toContain('AGENTS.md');
  });

  test('detects memory file symlink mismatch in link mode', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeSkillsTree(repoRoot, '.aime/skills');
    await writeTextFile(repoRoot, '.aime/AGENTS.md', '# Source Memory\n');
    await writeTextFile(repoRoot, '.other/AGENTS.md', '# Other Memory\n');
    await createSymlink(repoRoot, '.agents/skills', '.aime/skills');
    await createFileSymlink(repoRoot, 'AGENTS.md', '.other/AGENTS.md');

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
      repoRoot,
    );

    const result = await checkContext({ config });
    expect(result.success).toBe(false);
    expect(result.errors.join('\n')).toContain('AGENTS.md');
    expect(result.errors.join('\n')).toContain('symlink mismatch');
  });
});
