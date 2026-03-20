import { readFile } from 'node:fs/promises';
import path from 'node:path';
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

describe('cli', () => {
  test('sync command works with config file', async () => {
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

    const output: string[] = [];
    const code = await runCli(['sync'], {
      cwd: repoRoot,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });
    expect(code).toBe(0);
    const content = await readFile(
      path.join(repoRoot, '.agents/skills/skill-a/SKILL.md'),
      'utf8',
    );
    expect(content).toContain('Skill A');
    expect(output.some((line) => line.includes('synced'))).toBe(true);
  });

  test('sync/check/doctor include configured memory file behavior', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeSkillsTree(repoRoot, '.aime/skills');
    await writeTextFile(repoRoot, '.aime/AGENTS.md', '# Source Memory\n');
    await writeTextFile(
      repoRoot,
      'context-sync.config.json',
      JSON.stringify(
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
        null,
        2,
      ),
    );

    const syncOutput: string[] = [];
    const syncCode = await runCli(['sync'], {
      cwd: repoRoot,
      stdout: (line) => syncOutput.push(line),
      stderr: (line) => syncOutput.push(line),
    });
    expect(syncCode).toBe(0);
    expect(await readFile(path.join(repoRoot, 'AGENTS.md'), 'utf8')).toContain(
      'Source Memory',
    );

    const doctorOutput: string[] = [];
    const doctorCode = await runCli(['doctor'], {
      cwd: repoRoot,
      stdout: (line) => doctorOutput.push(line),
      stderr: (line) => doctorOutput.push(line),
    });
    expect(doctorCode).toBe(0);
    expect(doctorOutput.join('\n')).toContain('AGENTS.md');

    await writeTextFile(repoRoot, 'AGENTS.md', '# Drifted\n');
    const checkOutput: string[] = [];
    const checkCode = await runCli(['check'], {
      cwd: repoRoot,
      stdout: (line) => checkOutput.push(line),
      stderr: (line) => checkOutput.push(line),
    });
    expect(checkCode).toBe(1);
    expect(checkOutput.join('\n')).toContain('AGENTS.md');
  });

  test('doctor command reports missing source', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeTextFile(
      repoRoot,
      'context-sync.config.json',
      JSON.stringify(
        {
          source: { kind: 'canonical', skillsPath: '.missing/skills' },
          targets: { codex: { skillsPath: '.agents/skills', mode: 'copy' } },
        },
        null,
        2,
      ),
    );
    const messages: string[] = [];
    const code = await runCli(['doctor'], {
      cwd: repoRoot,
      stdout: (message) => messages.push(message),
      stderr: (message) => messages.push(message),
    });
    expect(code).toBe(1);
    expect(messages.join('\n')).toContain('source');
  });
});
