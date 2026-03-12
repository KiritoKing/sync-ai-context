import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, test } from '@rstest/core';
import { parseConfig } from '../src/index';

describe('context sync schema', () => {
  test('schema file exists and declares source/targets contracts', async () => {
    const schemaPath = path.join(process.cwd(), 'context-sync.schema.json');
    const content = await readFile(schemaPath, 'utf8');
    const schema = JSON.parse(content) as {
      type?: string;
      properties?: Record<string, unknown>;
      required?: string[];
    };
    expect(schema.type).toBe('object');
    expect(Boolean(schema.properties?.source)).toBe(true);
    expect(Boolean(schema.properties?.targets)).toBe(true);
    expect(schema.required).toContain('source');
    expect(schema.required).toContain('targets');
  });

  test('config with $schema stays compatible with parser', () => {
    const parsed = parseConfig(
      {
        $schema:
          'https://raw.githubusercontent.com/bytedance/vibe-coder-manager/main/context-sync.schema.json',
        source: { kind: 'canonical', skillsPath: '.aime/skills' },
        targets: { codex: { skillsPath: '.agents/skills', mode: 'link' } },
      },
      '/repo',
    );
    expect(parsed.source.kind).toBe('canonical');
    expect(parsed.targets.codex.mode).toBe('link');
  });
});
