import { lstat, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from '@rstest/core';

function getRepoRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..');
}

function getLegacyOpenSpecCliName(): string {
  return ['openspec', 'cn'].join('-');
}

async function collectFilePaths(directoryPath: string): Promise<string[]> {
  const stat = await lstat(directoryPath);
  if (stat.isFile()) {
    return [directoryPath];
  }

  const entries = await readdir(directoryPath, { withFileTypes: true });
  const filePaths = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.isDirectory()) {
        return collectFilePaths(entryPath);
      }
      return [entryPath];
    }),
  );
  return filePaths.flat().sort();
}

describe('official openspec codex workflow', () => {
  test('ships only the official core codex skills', async () => {
    const repoRoot = getRepoRoot();
    const skillsDir = path.join(repoRoot, '.codex/skills');
    const skillPaths = await collectFilePaths(skillsDir);
    const relativeSkillPaths = skillPaths.map((skillPath) =>
      path.relative(repoRoot, skillPath).replaceAll(path.sep, '/'),
    );

    expect(relativeSkillPaths).toEqual([
      '.codex/skills/openspec-apply-change/SKILL.md',
      '.codex/skills/openspec-archive-change/SKILL.md',
      '.codex/skills/openspec-explore/SKILL.md',
      '.codex/skills/openspec-propose/SKILL.md',
    ]);

    for (const skillPath of skillPaths) {
      const content = await readFile(skillPath, 'utf8');
      expect(content.includes(getLegacyOpenSpecCliName())).toBe(false);
      expect(content.includes('compatibility: Requires openspec CLI.')).toBe(
        true,
      );
      expect(content.includes('openspec ')).toBe(true);
    }
  });

  test('does not leave tracked legacy cli references in repo workflow files', async () => {
    const repoRoot = getRepoRoot();
    const pathsToScan = [
      path.join(repoRoot, '.codex'),
      path.join(repoRoot, 'openspec'),
      path.join(repoRoot, 'CONTRIBUTING.md'),
    ];
    const filePaths = (
      await Promise.all(
        pathsToScan.map((scanPath) => collectFilePaths(scanPath)),
      )
    ).flat();

    for (const filePath of filePaths) {
      const content = await readFile(filePath, 'utf8');
      expect(content.includes(getLegacyOpenSpecCliName())).toBe(false);
    }
  });
});

describe('openspec project configuration', () => {
  test('keeps spec-driven schema, chinese language instructions, and repo rules', async () => {
    const configPath = path.join(getRepoRoot(), 'openspec/config.yaml');
    const content = await readFile(configPath, 'utf8');

    expect(content.includes('schema: spec-driven')).toBe(true);
    expect(content.includes('语言：中文（简体）')).toBe(true);
    expect(content.includes('所有产出物必须用简体中文撰写。')).toBe(true);
    expect(
      content.includes(
        '技术术语如 API、REST、GraphQL、OpenSpec 在更清晰时保留英文。',
      ),
    ).toBe(true);
    expect(
      content.includes('代码示例、文件路径、命令名、schema ID 保持英文。'),
    ).toBe(true);
    expect(content.includes('采用 TDD（red -> green -> refactor）。')).toBe(
      true,
    );
    expect(content.includes('所有测试统一使用 rstest。')).toBe(true);
  });
});

describe('contributor guidance for official openspec', () => {
  test('documents official cli install and update flow', async () => {
    const content = await readFile(
      path.join(getRepoRoot(), 'CONTRIBUTING.md'),
      'utf8',
    );

    expect(content.includes('@fission-ai/openspec')).toBe(true);
    expect(
      content.includes('npx @fission-ai/openspec@latest init --tools codex'),
    ).toBe(true);
    expect(content.includes('npx @fission-ai/openspec@latest update')).toBe(
      true,
    );
    expect(
      content.includes(
        'Codex project skills are committed in `.codex/skills/`.',
      ),
    ).toBe(true);
  });
});
