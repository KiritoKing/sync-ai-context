import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();

function fail(message) {
  console.error(`[check-readme-badges] ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function hasBadge(readme, pattern) {
  return pattern.test(readme);
}

async function main() {
  const readme = await readFile(path.join(repoRoot, 'README.md'), 'utf8');

  assert(hasBadge(readme, /\[!\[CI\]\(/), 'README must include CI badge');
  assert(
    hasBadge(readme, /\[!\[npm version\]\(/i),
    'README must include npm version badge',
  );
  assert(
    hasBadge(readme, /\[!\[npm downloads\]\(/i),
    'README must include npm downloads badge',
  );
  assert(
    hasBadge(readme, /\[!\[License\]\(/),
    'README must include license badge',
  );
  assert(
    hasBadge(readme, /\[!\[Provenance\]\(/),
    'README must include provenance badge',
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
});
