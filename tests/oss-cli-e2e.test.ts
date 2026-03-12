import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, test } from '@rstest/core';
import { runCli } from '../src/cli';
import {
  cleanupTempDir,
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

function getRepoRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..');
}

describe('cli e2e command coverage', () => {
  test('sync/check/doctor are callable and error help is readable', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeSkillsTree(repoRoot, '.aime/skills');
    await writeTextFile(
      repoRoot,
      'context-sync.config.json',
      JSON.stringify(
        {
          source: { kind: 'canonical', skillsPath: '.aime/skills' },
          targets: { codex: { skillsPath: '.agents/skills', mode: 'copy' } },
        },
        null,
        2,
      ),
    );

    const messages: string[] = [];
    const syncCode = await runCli(['sync', '--dry-run'], {
      cwd: repoRoot,
      stdout: (line) => messages.push(line),
      stderr: (line) => messages.push(line),
    });
    const checkCode = await runCli(['check'], {
      cwd: repoRoot,
      stdout: (line) => messages.push(line),
      stderr: (line) => messages.push(line),
    });
    const doctorCode = await runCli(['doctor'], {
      cwd: repoRoot,
      stdout: (line) => messages.push(line),
      stderr: (line) => messages.push(line),
    });
    const helpMessages: string[] = [];
    const helpCode = await runCli([], {
      cwd: repoRoot,
      stderr: (line) => helpMessages.push(line),
    });

    expect(syncCode).toBe(0);
    expect(checkCode).toBe(1);
    expect(doctorCode).toBe(0);
    expect(helpCode).toBe(1);
    expect(helpMessages.join('\n')).toContain('Unknown command. Use');
    expect(messages.some((line) => line.includes('[dry-run]'))).toBe(true);
  });

  test('readme dry-run and force examples match behavior', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeSkillsTree(repoRoot, '.aime/skills');
    await writeTextFile(
      repoRoot,
      'context-sync.config.json',
      JSON.stringify(
        {
          source: { kind: 'canonical', skillsPath: '.aime/skills' },
          targets: { codex: { skillsPath: '.agents/skills', mode: 'copy' } },
        },
        null,
        2,
      ),
    );
    const readme = await readFile(
      path.join(getRepoRoot(), 'README.md'),
      'utf8',
    );
    expect(readme.includes('context-sync sync --dry-run')).toBe(true);
    expect(readme.includes('context-sync sync --force')).toBe(true);

    const dryRunMessages: string[] = [];
    const dryRunCode = await runCli(['sync', '--dry-run'], {
      cwd: repoRoot,
      stdout: (line) => dryRunMessages.push(line),
      stderr: (line) => dryRunMessages.push(line),
    });
    expect(dryRunCode).toBe(0);
    await expect(
      access(path.join(repoRoot, '.agents/skills/skill-b/SKILL.md')),
    ).rejects.toBeDefined();

    await writeTextFile(
      repoRoot,
      '.agents/skills/skill-a/SKILL.md',
      'local modification',
    );

    const blockedMessages: string[] = [];
    const blockedCode = await runCli(['sync'], {
      cwd: repoRoot,
      stdout: (line) => blockedMessages.push(line),
      stderr: (line) => blockedMessages.push(line),
    });
    expect(blockedCode).toBe(1);
    expect(blockedMessages.join('\n')).toContain('copy conflict');

    const forceCode = await runCli(['sync', '--force'], {
      cwd: repoRoot,
    });
    expect(forceCode).toBe(0);
    const synced = await readFile(
      path.join(repoRoot, '.agents/skills/skill-b/SKILL.md'),
      'utf8',
    );
    expect(synced).toContain('Skill B');
  });
});
