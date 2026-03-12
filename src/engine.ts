import { lstat } from 'node:fs/promises';
import path from 'node:path';
import {
  buildFileHashMap,
  diffHashMaps,
  pathExists,
  replaceWithCopy,
  replaceWithLink,
  resolveSymlinkTarget,
} from './fs-utils';
import type { OperationResult, ParsedConfig, TargetConfig } from './types';

export interface SyncOptions {
  config: ParsedConfig;
  target?: string;
  dryRun?: boolean;
  force?: boolean;
}

export interface CheckOptions {
  config: ParsedConfig;
  target?: string;
}

function selectTargets(
  config: ParsedConfig,
  target?: string,
): Array<[string, TargetConfig]> {
  if (!target || target === 'all') {
    return Object.entries(config.targets);
  }
  const selected = config.targets[target];
  if (!selected) {
    throw new Error(`Unknown target: ${target}`);
  }
  return [[target, selected]];
}

function formatDiff(prefix: string, items: string[]): string {
  if (items.length === 0) return `${prefix}: 0`;
  return `${prefix}: ${items.length} (${items.slice(0, 3).join(', ')})`;
}

async function syncCopy(
  sourceDir: string,
  targetDir: string,
  dryRun: boolean,
  force: boolean,
): Promise<{ actions: string[]; errors: string[] }> {
  const actions: string[] = [];
  const errors: string[] = [];

  const exists = await pathExists(targetDir);
  if (exists && !force) {
    const stat = await lstat(targetDir);
    if (!stat.isDirectory()) {
      errors.push(
        `copy conflict: target exists and is not a directory (${targetDir})`,
      );
      return { actions, errors };
    }
    const [sourceMap, targetMap] = await Promise.all([
      buildFileHashMap(sourceDir),
      buildFileHashMap(targetDir),
    ]);
    const diff = diffHashMaps(sourceMap, targetMap);
    if (diff.modified.length > 0 || diff.extra.length > 0) {
      errors.push(
        `copy conflict: ${targetDir} has local changes; ${formatDiff('modified', diff.modified)}; ${formatDiff('extra', diff.extra)}`,
      );
      return { actions, errors };
    }
  }

  if (dryRun) {
    actions.push(`[dry-run] copy ${sourceDir} -> ${targetDir}`);
    return { actions, errors };
  }
  await replaceWithCopy(sourceDir, targetDir);
  actions.push(`synced copy ${targetDir}`);
  return { actions, errors };
}

async function syncLink(
  sourceDir: string,
  targetDir: string,
  dryRun: boolean,
  force: boolean,
): Promise<{ actions: string[]; errors: string[] }> {
  const actions: string[] = [];
  const errors: string[] = [];
  const sourceResolved = path.resolve(sourceDir);
  const exists = await pathExists(targetDir);

  if (exists) {
    const stat = await lstat(targetDir);
    if (stat.isSymbolicLink()) {
      const actual = await resolveSymlinkTarget(targetDir);
      if (actual === sourceResolved) {
        actions.push(`link ok ${targetDir}`);
        return { actions, errors };
      }
      if (!force) {
        errors.push(`link conflict: symlink mismatch for ${targetDir}`);
        return { actions, errors };
      }
    } else if (!force) {
      errors.push(
        `link conflict: target exists and is not a symlink (${targetDir})`,
      );
      return { actions, errors };
    }
  }

  if (dryRun) {
    actions.push(`[dry-run] link ${targetDir} -> ${sourceDir}`);
    return { actions, errors };
  }

  await replaceWithLink(sourceDir, targetDir);
  actions.push(`synced link ${targetDir}`);
  return { actions, errors };
}

export async function syncContext(
  options: SyncOptions,
): Promise<OperationResult> {
  const { config, target, dryRun = false, force = false } = options;
  const actions: string[] = [];
  const errors: string[] = [];
  const sourceDir = config.source.skillsPath;

  if (!(await pathExists(sourceDir))) {
    return {
      success: false,
      actions,
      errors: [`source path not found: ${sourceDir}`],
    };
  }

  const selectedTargets = selectTargets(config, target);
  for (const [name, targetConfig] of selectedTargets) {
    if (path.resolve(targetConfig.skillsPath) === path.resolve(sourceDir)) {
      actions.push(`skip ${name}: target equals source`);
      continue;
    }
    const result =
      targetConfig.mode === 'copy'
        ? await syncCopy(sourceDir, targetConfig.skillsPath, dryRun, force)
        : await syncLink(sourceDir, targetConfig.skillsPath, dryRun, force);
    actions.push(...result.actions);
    errors.push(...result.errors);
  }

  return {
    success: errors.length === 0,
    actions,
    errors,
  };
}

export async function checkContext(
  options: CheckOptions,
): Promise<OperationResult> {
  const { config, target } = options;
  const actions: string[] = [];
  const errors: string[] = [];
  const sourceDir = config.source.skillsPath;
  if (!(await pathExists(sourceDir))) {
    return {
      success: false,
      actions,
      errors: [`source path not found: ${sourceDir}`],
    };
  }

  const selectedTargets = selectTargets(config, target);
  for (const [name, targetConfig] of selectedTargets) {
    const targetDir = targetConfig.skillsPath;
    if (!(await pathExists(targetDir))) {
      errors.push(`missing target: ${name} (${targetDir})`);
      continue;
    }

    if (targetConfig.mode === 'link') {
      const stat = await lstat(targetDir);
      if (!stat.isSymbolicLink()) {
        errors.push(`symlink mismatch: ${targetDir} is not a symlink`);
        continue;
      }
      const resolved = await resolveSymlinkTarget(targetDir);
      if (resolved !== path.resolve(sourceDir)) {
        errors.push(
          `symlink mismatch: expected ${path.resolve(sourceDir)}, actual ${resolved}`,
        );
        continue;
      }
      actions.push(`check ok ${name} (link)`);
      continue;
    }

    const [sourceMap, targetMap] = await Promise.all([
      buildFileHashMap(sourceDir),
      buildFileHashMap(targetDir),
    ]);
    const diff = diffHashMaps(sourceMap, targetMap);
    if (diff.modified.length || diff.missing.length || diff.extra.length) {
      errors.push(
        `copy drift: ${name}; ${formatDiff('modified', diff.modified)}; ${formatDiff('missing', diff.missing)}; ${formatDiff('extra', diff.extra)}`,
      );
      continue;
    }
    actions.push(`check ok ${name} (copy)`);
  }

  return { success: errors.length === 0, actions, errors };
}

export async function doctorContext(
  options: CheckOptions,
): Promise<OperationResult> {
  const { config, target } = options;
  const actions: string[] = [];
  const errors: string[] = [];
  const sourceDir = config.source.skillsPath;
  if (!(await pathExists(sourceDir))) {
    errors.push(`source path not found: ${sourceDir}`);
  } else {
    actions.push(`source ok: ${sourceDir}`);
  }

  const selectedTargets = selectTargets(config, target);
  for (const [name, targetConfig] of selectedTargets) {
    actions.push(
      `target registered: ${name} (${targetConfig.mode}) -> ${targetConfig.skillsPath}`,
    );
  }

  return { success: errors.length === 0, actions, errors };
}
