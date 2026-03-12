import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, test } from '@rstest/core';

function getRepoRoot(): string {
  const currentFile = fileURLToPath(import.meta.url);
  return path.resolve(path.dirname(currentFile), '..');
}

async function readPackageJson(): Promise<Record<string, unknown>> {
  const file = await readFile(path.join(getRepoRoot(), 'package.json'), 'utf8');
  return JSON.parse(file) as Record<string, unknown>;
}

function expectHttpsUrl(value: unknown, label: string): void {
  expect(typeof value).toBe('string');
  const url = new URL(value as string);
  expect(url.protocol).toBe('https:');
  expect(url.host.length > 0).toBe(true);
  expect(label.length > 0).toBe(true);
}

describe('open-source package metadata', () => {
  test('contains required npm metadata fields', async () => {
    const pkg = await readPackageJson();
    expect(typeof pkg.name).toBe('string');
    expect(typeof pkg.description).toBe('string');
    expect(typeof pkg.license).toBe('string');
    expect(typeof pkg.repository).toBe('object');
    expect(typeof pkg.homepage).toBe('string');
    expect(typeof pkg.bugs).toBe('object');
    expect(Array.isArray(pkg.keywords)).toBe(true);
    expect(typeof pkg.engines).toBe('object');
    expect(typeof pkg.publishConfig).toBe('object');
  });

  test('contains valid URLs for homepage and bugs', async () => {
    const pkg = await readPackageJson();
    expectHttpsUrl(pkg.homepage, 'homepage');
    const bugs = pkg.bugs as Record<string, unknown>;
    expectHttpsUrl(bugs.url, 'bugs.url');
  });

  test('has publish-ready cli entry metadata', async () => {
    const pkg = await readPackageJson();
    const files = pkg.files as string[];
    const bin = pkg.bin as Record<string, unknown>;
    const exportsMap = pkg.exports as Record<string, unknown>;

    expect(files.includes('dist')).toBe(true);
    expect(bin['context-sync']).toBe('./dist/bin.js');
    expect(typeof exportsMap['.']).toBe('object');
    expect(typeof exportsMap['./cli']).toBe('object');
    expect(pkg.private).toBe(undefined);
  });
});

describe('release automation workflow', () => {
  test('release workflow enforces build/test before publish', async () => {
    const workflow = await readFile(
      path.join(getRepoRoot(), '.github/workflows/release.yml'),
      'utf8',
    );
    expect(workflow.includes('jobs:')).toBe(true);
    expect(workflow.includes('verify:')).toBe(true);
    expect(workflow.includes('publish:')).toBe(true);
    expect(workflow.includes('needs: verify')).toBe(true);
    expect(workflow.includes('pnpm run test')).toBe(true);
    expect(workflow.includes('pnpm run build')).toBe(true);
    expect(workflow.includes('pnpm publish --provenance --access public')).toBe(
      true,
    );
  });

  test('release workflow includes tag and github release steps', async () => {
    const workflow = await readFile(
      path.join(getRepoRoot(), '.github/workflows/release.yml'),
      'utf8',
    );
    expect(workflow.includes('workflow_dispatch:')).toBe(true);
    expect(workflow.includes('refs/tags/v')).toBe(true);
    expect(workflow.includes('Create release tag')).toBe(true);
    expect(workflow.includes('softprops/action-gh-release')).toBe(true);
  });
});
