import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function createTempDir(prefix = 'ctx-sync-'): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function cleanupTempDir(dir: string): Promise<void> {
  await rm(dir, { recursive: true, force: true });
}

export async function writeTextFile(
  rootDir: string,
  relPath: string,
  content: string,
): Promise<void> {
  const fullPath = path.join(rootDir, relPath);
  await mkdir(path.dirname(fullPath), { recursive: true });
  await writeFile(fullPath, content, 'utf8');
}

export async function readTextFile(
  rootDir: string,
  relPath: string,
): Promise<string> {
  return readFile(path.join(rootDir, relPath), 'utf8');
}

export async function writeSkillsTree(
  rootDir: string,
  baseDir: string,
): Promise<void> {
  await writeTextFile(
    rootDir,
    path.join(baseDir, 'skill-a/SKILL.md'),
    '# Skill A\n',
  );
  await writeTextFile(
    rootDir,
    path.join(baseDir, 'skill-b/SKILL.md'),
    '# Skill B\n',
  );
}

export async function createSymlink(
  rootDir: string,
  targetRel: string,
  sourceRel: string,
): Promise<void> {
  const targetPath = path.join(rootDir, targetRel);
  await mkdir(path.dirname(targetPath), { recursive: true });
  const sourcePath = path.join(rootDir, sourceRel);
  const relative = path.relative(path.dirname(targetPath), sourcePath);
  await symlink(relative, targetPath, 'dir');
}
