import crypto from 'node:crypto';
import fsSync from 'node:fs';
import { cp, lstat, mkdir, readdir, readlink, rm } from 'node:fs/promises';
import path from 'node:path';
import type { DiffSummary } from './types';

export async function pathExists(filePath: string): Promise<boolean> {
  try {
    await lstat(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function ensureParentDir(filePath: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
}

export async function listFilesRecursive(rootDir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(currentDir: string): Promise<void> {
    const entries = await readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === '.DS_Store') continue;
      const absPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(absPath);
      } else if (entry.isFile()) {
        results.push(absPath);
      }
    }
  }

  await walk(rootDir);
  return results;
}

export async function hashFile(filePath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = fsSync.createReadStream(filePath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', resolve);
  });
  return hash.digest('hex');
}

export async function buildFileHashMap(
  rootDir: string,
): Promise<Map<string, string>> {
  const files = await listFilesRecursive(rootDir);
  const map = new Map<string, string>();
  for (const absPath of files) {
    const relPath = path.relative(rootDir, absPath);
    map.set(relPath, await hashFile(absPath));
  }
  return map;
}

export async function resolveSymlinkTarget(linkPath: string): Promise<string> {
  const linkValue = await readlink(linkPath);
  return path.resolve(path.dirname(linkPath), linkValue);
}

export async function replaceWithCopy(
  sourceDir: string,
  targetDir: string,
): Promise<void> {
  await rm(targetDir, { recursive: true, force: true });
  await ensureParentDir(targetDir);
  await cp(sourceDir, targetDir, { recursive: true });
}

export async function replaceWithLink(
  sourceDir: string,
  targetDir: string,
): Promise<void> {
  await rm(targetDir, { recursive: true, force: true });
  await ensureParentDir(targetDir);
  const relative = path.relative(path.dirname(targetDir), sourceDir);
  await fsSync.promises.symlink(relative, targetDir, 'dir');
}

export function diffHashMaps(
  source: Map<string, string>,
  target: Map<string, string>,
): DiffSummary {
  const modified: string[] = [];
  const missing: string[] = [];
  const extra: string[] = [];

  for (const [relPath, targetHash] of Array.from(target.entries())) {
    const sourceHash = source.get(relPath);
    if (!sourceHash) {
      extra.push(relPath);
      continue;
    }
    if (sourceHash !== targetHash) {
      modified.push(relPath);
    }
  }

  for (const relPath of Array.from(source.keys())) {
    if (!target.has(relPath)) {
      missing.push(relPath);
    }
  }

  return { modified, missing, extra };
}
