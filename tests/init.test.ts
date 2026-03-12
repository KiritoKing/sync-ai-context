import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, test } from '@rstest/core';
import { runCli } from '../src/cli';
import type { PromptAdapter, PromptChoice } from '../src/init';
import {
  cleanupTempDir,
  createSymlink,
  createTempDir,
  writeSkillsTree,
  writeTextFile,
} from './fixtures';

interface MockPromptPlan {
  select: string[];
  multiSelect: string[][];
  input: string[];
  confirm: boolean[];
}

class MockPromptAdapter implements PromptAdapter {
  private readonly selectQueue: string[];
  private readonly multiSelectQueue: string[][];
  private readonly inputQueue: string[];
  private readonly confirmQueue: boolean[];

  constructor(plan: MockPromptPlan) {
    this.selectQueue = [...plan.select];
    this.multiSelectQueue = [...plan.multiSelect];
    this.inputQueue = [...plan.input];
    this.confirmQueue = [...plan.confirm];
  }

  async select<T extends string>(
    _message: string,
    choices: PromptChoice<T>[],
    _defaultValue?: T,
  ): Promise<T> {
    const next = this.selectQueue.shift();
    if (!next) {
      throw new Error('Missing select answer in mock prompt adapter');
    }
    const matched = choices.find((choice) => choice.value === next);
    if (!matched) {
      throw new Error(`Invalid select value: ${next}`);
    }
    return matched.value;
  }

  async multiSelect<T extends string>(
    _message: string,
    choices: PromptChoice<T>[],
    _defaultValues?: T[],
  ): Promise<T[]> {
    const next = this.multiSelectQueue.shift();
    if (!next) {
      throw new Error('Missing multiSelect answer in mock prompt adapter');
    }
    const validValues = new Set(choices.map((choice) => choice.value));
    for (const selected of next) {
      if (!validValues.has(selected as T)) {
        throw new Error(`Invalid multiSelect value: ${selected}`);
      }
    }
    return next as T[];
  }

  async input(_message: string, defaultValue?: string): Promise<string> {
    const next = this.inputQueue.shift();
    if (next === undefined) {
      if (defaultValue === undefined) {
        throw new Error('Missing input answer in mock prompt adapter');
      }
      return defaultValue;
    }
    return next;
  }

  async confirm(_message: string, defaultValue = false): Promise<boolean> {
    const next = this.confirmQueue.shift();
    return next ?? defaultValue;
  }
}

const tempDirs: string[] = [];

afterEach(async () => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) {
      await cleanupTempDir(dir);
    }
  }
});

describe('init command', () => {
  test('fails on unknown option', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    const output: string[] = [];
    const code = await runCli(['init', '--unknown'], {
      cwd: repoRoot,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });
    expect(code).toBe(1);
    expect(output.join('\n')).toContain('Unknown option');
  });

  test('writes default config path for canonical source with preset modes', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);

    const promptAdapter = new MockPromptAdapter({
      select: ['canonical', 'preset'],
      multiSelect: [['codex', 'cursor']],
      input: ['.aime/skills', 'context-sync.config.json'],
      confirm: [],
    });

    const code = await runCli(['init'], {
      cwd: repoRoot,
      promptAdapter,
    });
    expect(code).toBe(0);

    const content = await readFile(
      path.join(repoRoot, 'context-sync.config.json'),
      'utf8',
    );
    const config = JSON.parse(content) as {
      source: { kind: string };
      targets: Record<string, { mode: string }>;
      $schema?: string;
    };
    expect(config.source.kind).toBe('canonical');
    expect(config.targets.codex.mode).toBe('link');
    expect(config.targets.cursor.mode).toBe('copy');
    expect(config.$schema).toContain('context-sync.schema.json');
  });

  test('writes custom config path for tool source and supports force copy mode', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);

    const promptAdapter = new MockPromptAdapter({
      select: ['tool', 'copy'],
      multiSelect: [['codex', 'cline']],
      input: ['claude', '.claude/skills', 'configs/dev-context.json'],
      confirm: [],
    });

    const code = await runCli(
      ['init', '--config', 'configs/dev-context.json'],
      {
        cwd: repoRoot,
        promptAdapter,
      },
    );
    expect(code).toBe(0);

    const content = await readFile(
      path.join(repoRoot, 'configs/dev-context.json'),
      'utf8',
    );
    const config = JSON.parse(content) as {
      source: { kind: string; tool?: string };
      targets: Record<string, { mode: string }>;
    };
    expect(config.source.kind).toBe('tool');
    expect(config.source.tool).toBe('claude');
    expect(config.targets.codex.mode).toBe('copy');
    expect(config.targets.cline.mode).toBe('copy');
  });

  test('rejects overwriting existing config without confirmation', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeTextFile(
      repoRoot,
      'context-sync.config.json',
      JSON.stringify(
        {
          source: { kind: 'canonical', skillsPath: '.old/skills' },
          targets: { codex: { skillsPath: '.agents/skills', mode: 'copy' } },
        },
        null,
        2,
      ),
    );

    const promptAdapter = new MockPromptAdapter({
      select: ['canonical', 'preset'],
      multiSelect: [['codex']],
      input: ['.aime/skills', 'context-sync.config.json'],
      confirm: [false],
    });

    const output: string[] = [];
    const code = await runCli(['init'], {
      cwd: repoRoot,
      promptAdapter,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });

    expect(code).toBe(1);
    const content = await readFile(
      path.join(repoRoot, 'context-sync.config.json'),
      'utf8',
    );
    expect(content).toContain('.old/skills');
    expect(output.join('\n')).toContain('aborted');
  });

  test('check keeps symlink mismatch and copy drift failures with init-generated config', async () => {
    const repoRoot = await createTempDir();
    tempDirs.push(repoRoot);
    await writeSkillsTree(repoRoot, '.aime/skills');
    await writeSkillsTree(repoRoot, '.other/skills');

    const promptAdapter = new MockPromptAdapter({
      select: ['canonical', 'preset'],
      multiSelect: [['codex', 'cursor']],
      input: ['.aime/skills', 'context-sync.config.json'],
      confirm: [],
    });

    const initCode = await runCli(['init'], {
      cwd: repoRoot,
      promptAdapter,
    });
    expect(initCode).toBe(0);

    const syncCode = await runCli(['sync'], { cwd: repoRoot });
    expect(syncCode).toBe(0);

    await rm(path.join(repoRoot, '.agents/skills'), {
      recursive: true,
      force: true,
    });
    await createSymlink(repoRoot, '.agents/skills', '.other/skills');
    await writeTextFile(repoRoot, '.cursor/skills/skill-a/SKILL.md', 'drift');

    const output: string[] = [];
    const checkCode = await runCli(['check'], {
      cwd: repoRoot,
      stdout: (line) => output.push(line),
      stderr: (line) => output.push(line),
    });
    expect(checkCode).toBe(1);
    const merged = output.join('\n');
    expect(merged).toContain('symlink mismatch');
    expect(merged).toContain('copy drift');
  });
});
