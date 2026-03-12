import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type {
  ConfigInput,
  ParsedConfig,
  SourceInput,
  SyncMode,
  TargetInput,
} from './types';

const VALID_MODES: ReadonlySet<string> = new Set(['link', 'copy']);

function resolveMaybePath(
  repoRoot: string,
  value: string | undefined,
): string | undefined {
  if (!value) return undefined;
  if (path.isAbsolute(value)) return value;
  return path.join(repoRoot, value);
}

function validateSource(source: SourceInput): void {
  if (source.kind === 'tool' && !source.tool) {
    throw new Error('source.tool is required when source.kind=tool');
  }
  if (!source.skillsPath) {
    throw new Error('source.skillsPath is required');
  }
}

function validateTarget(name: string, target: TargetInput): void {
  if (!target.skillsPath) {
    throw new Error(`targets.${name}.skillsPath is required`);
  }
  if (!VALID_MODES.has(target.mode)) {
    throw new Error(`targets.${name}.mode must be link or copy`);
  }
}

export function parseConfig(
  input: ConfigInput,
  repoRoot: string = process.cwd(),
): ParsedConfig {
  if (!input || typeof input !== 'object') {
    throw new Error('Config must be an object');
  }
  if (!input.source) {
    throw new Error('source is required');
  }
  if (!input.targets || typeof input.targets !== 'object') {
    throw new Error('targets is required');
  }

  validateSource(input.source);
  const source = {
    ...input.source,
    skillsPath: resolveMaybePath(repoRoot, input.source.skillsPath) ?? '',
    memoryPath: resolveMaybePath(repoRoot, input.source.memoryPath),
  };

  const targets: ParsedConfig['targets'] = {};
  for (const [name, target] of Object.entries(input.targets)) {
    validateTarget(name, target);
    targets[name] = {
      mode: target.mode as SyncMode,
      skillsPath: resolveMaybePath(repoRoot, target.skillsPath) ?? '',
      memoryPath: resolveMaybePath(repoRoot, target.memoryPath),
    };
  }

  return {
    repoRoot,
    source,
    targets,
  };
}

export async function loadConfigFromFile(
  cwd: string,
  configFile = 'context-sync.config.json',
): Promise<ParsedConfig> {
  const configPath = path.isAbsolute(configFile)
    ? configFile
    : path.join(cwd, configFile);
  const raw = await readFile(configPath, 'utf8');
  const json = JSON.parse(raw) as ConfigInput;
  return parseConfig(json, cwd);
}
