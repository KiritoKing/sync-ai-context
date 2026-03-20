import { lstat } from 'node:fs/promises';
import path from 'node:path';
import {
  buildFileHashMap,
  diffHashMaps,
  hashFile,
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

interface ArtifactPair {
  kind: 'dir' | 'file';
  label: 'skillsPath' | 'memoryPath';
  sourcePath: string;
  targetPath: string;
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

function getArtifactsForTarget(
  config: ParsedConfig,
  targetConfig: TargetConfig,
): ArtifactPair[] {
  const artifacts: ArtifactPair[] = [
    {
      kind: 'dir',
      label: 'skillsPath',
      sourcePath: config.source.skillsPath,
      targetPath: targetConfig.skillsPath,
    },
  ];

  if (config.source.memoryPath && targetConfig.memoryPath) {
    artifacts.push({
      kind: 'file',
      label: 'memoryPath',
      sourcePath: config.source.memoryPath,
      targetPath: targetConfig.memoryPath,
    });
  }

  return artifacts;
}

async function syncCopy(
  artifact: ArtifactPair,
  dryRun: boolean,
  force: boolean,
): Promise<{ actions: string[]; errors: string[] }> {
  const actions: string[] = [];
  const errors: string[] = [];
  const { sourcePath, targetPath, kind } = artifact;

  const exists = await pathExists(targetPath);
  if (exists && !force) {
    const stat = await lstat(targetPath);
    if (kind === 'dir') {
      if (!stat.isDirectory()) {
        errors.push(
          `copy conflict: target exists and is not a directory (${targetPath})`,
        );
        return { actions, errors };
      }
      const [sourceMap, targetMap] = await Promise.all([
        buildFileHashMap(sourcePath),
        buildFileHashMap(targetPath),
      ]);
      const diff = diffHashMaps(sourceMap, targetMap);
      if (diff.modified.length > 0 || diff.extra.length > 0) {
        errors.push(
          `copy conflict: ${targetPath} has local changes; ${formatDiff('modified', diff.modified)}; ${formatDiff('extra', diff.extra)}`,
        );
        return { actions, errors };
      }
    } else {
      if (!stat.isFile()) {
        errors.push(
          `copy conflict: target exists and is not a file (${targetPath})`,
        );
        return { actions, errors };
      }
      const [sourceHash, targetHash] = await Promise.all([
        hashFile(sourcePath),
        hashFile(targetPath),
      ]);
      if (sourceHash !== targetHash) {
        errors.push(`copy conflict: target file has local changes (${targetPath})`);
        return { actions, errors };
      }
    }
  }

  if (dryRun) {
    actions.push(`[dry-run] copy ${sourcePath} -> ${targetPath}`);
    return { actions, errors };
  }
  await replaceWithCopy(sourcePath, targetPath);
  actions.push(`synced copy ${targetPath}`);
  return { actions, errors };
}

async function syncLink(
  artifact: ArtifactPair,
  dryRun: boolean,
  force: boolean,
): Promise<{ actions: string[]; errors: string[] }> {
  const actions: string[] = [];
  const errors: string[] = [];
  const { sourcePath, targetPath, kind } = artifact;
  const sourceResolved = path.resolve(sourcePath);
  const exists = await pathExists(targetPath);

  if (exists) {
    const stat = await lstat(targetPath);
    if (stat.isSymbolicLink()) {
      const actual = await resolveSymlinkTarget(targetPath);
      if (actual === sourceResolved) {
        actions.push(`link ok ${targetPath}`);
        return { actions, errors };
      }
      if (!force) {
        errors.push(`link conflict: symlink mismatch for ${targetPath}`);
        return { actions, errors };
      }
    } else if (!force) {
      errors.push(
        `link conflict: target exists and is not a symlink (${targetPath})`,
      );
      return { actions, errors };
    }
  }

  if (dryRun) {
    actions.push(`[dry-run] link ${targetPath} -> ${sourcePath}`);
    return { actions, errors };
  }

  await replaceWithLink(sourcePath, targetPath, kind);
  actions.push(`synced link ${targetPath}`);
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
    for (const artifact of getArtifactsForTarget(config, targetConfig)) {
      if (!(await pathExists(artifact.sourcePath))) {
        errors.push(`source path not found: ${artifact.sourcePath}`);
        continue;
      }
      if (path.resolve(artifact.targetPath) === path.resolve(artifact.sourcePath)) {
        actions.push(`skip ${name}: ${artifact.label} target equals source`);
        continue;
      }
      const result =
        targetConfig.mode === 'copy'
          ? await syncCopy(artifact, dryRun, force)
          : await syncLink(artifact, dryRun, force);
      actions.push(...result.actions);
      errors.push(...result.errors);
    }
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
    for (const artifact of getArtifactsForTarget(config, targetConfig)) {
      const { sourcePath, targetPath, kind, label } = artifact;
      if (!(await pathExists(sourcePath))) {
        errors.push(`source path not found: ${sourcePath}`);
        continue;
      }
      if (!(await pathExists(targetPath))) {
        errors.push(`missing target: ${name} (${targetPath})`);
        continue;
      }

      if (targetConfig.mode === 'link') {
        const stat = await lstat(targetPath);
        if (!stat.isSymbolicLink()) {
          errors.push(`symlink mismatch: ${targetPath} is not a symlink`);
          continue;
        }
        const resolved = await resolveSymlinkTarget(targetPath);
        if (resolved !== path.resolve(sourcePath)) {
          errors.push(
            `symlink mismatch: expected ${path.resolve(sourcePath)}, actual ${resolved} (${targetPath})`,
          );
          continue;
        }
        actions.push(`check ok ${name} (${label}, link)`);
        continue;
      }

      if (kind === 'dir') {
        const [sourceMap, targetMap] = await Promise.all([
          buildFileHashMap(sourcePath),
          buildFileHashMap(targetPath),
        ]);
        const diff = diffHashMaps(sourceMap, targetMap);
        if (diff.modified.length || diff.missing.length || diff.extra.length) {
          errors.push(
            `copy drift: ${name} (${targetPath}); ${formatDiff('modified', diff.modified)}; ${formatDiff('missing', diff.missing)}; ${formatDiff('extra', diff.extra)}`,
          );
          continue;
        }
      } else {
        const stat = await lstat(targetPath);
        if (!stat.isFile()) {
          errors.push(`copy drift: ${name} (${targetPath}); target is not a file`);
          continue;
        }
        const [sourceHash, targetHash] = await Promise.all([
          hashFile(sourcePath),
          hashFile(targetPath),
        ]);
        if (sourceHash !== targetHash) {
          errors.push(`copy drift: ${name} (${targetPath}); modified: 1 (${path.basename(targetPath)})`);
          continue;
        }
      }
      actions.push(`check ok ${name} (${label}, copy)`);
    }
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
  if (config.source.memoryPath) {
    if (!(await pathExists(config.source.memoryPath))) {
      errors.push(`source path not found: ${config.source.memoryPath}`);
    } else {
      actions.push(`source memory ok: ${config.source.memoryPath}`);
    }
  }

  const selectedTargets = selectTargets(config, target);
  for (const [name, targetConfig] of selectedTargets) {
    actions.push(
      `target registered: ${name} (${targetConfig.mode}) -> ${targetConfig.skillsPath}`,
    );
    if (targetConfig.memoryPath) {
      actions.push(
        `target memory registered: ${name} (${targetConfig.mode}) -> ${targetConfig.memoryPath}`,
      );
    }
  }

  return { success: errors.length === 0, actions, errors };
}
