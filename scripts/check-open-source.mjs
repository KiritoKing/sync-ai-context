import { readFile } from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();

function fail(message) {
  console.error(`[check-open-source] ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) {
    fail(message);
  }
}

function isHttpsUrl(value) {
  if (typeof value !== 'string') {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' && parsed.host.length > 0;
  } catch {
    return false;
  }
}

async function main() {
  const packagePath = path.join(repoRoot, 'package.json');
  const workflowPath = path.join(repoRoot, '.github/workflows/release.yml');
  const packageRaw = await readFile(packagePath, 'utf8');
  const workflow = await readFile(workflowPath, 'utf8');
  const pkg = JSON.parse(packageRaw);

  const requiredFields = [
    'name',
    'description',
    'license',
    'repository',
    'homepage',
    'bugs',
    'keywords',
    'engines',
    'publishConfig',
  ];
  for (const field of requiredFields) {
    assert(pkg[field] !== undefined, `missing package.json field: ${field}`);
  }

  assert(
    pkg.private === undefined,
    'package.json must not contain private=true',
  );
  assert(
    pkg.bin?.['context-sync'] === './dist/bin.js',
    'bin.context-sync must point to ./dist/bin.js',
  );
  assert(
    Array.isArray(pkg.files) && pkg.files.includes('dist'),
    'files must include dist',
  );
  assert(
    pkg.publishConfig?.access === 'public',
    'publishConfig.access must be public',
  );
  assert(
    pkg.publishConfig?.provenance === true,
    'publishConfig.provenance must be true',
  );
  assert(isHttpsUrl(pkg.homepage), 'homepage must be a valid https URL');
  assert(isHttpsUrl(pkg.bugs?.url), 'bugs.url must be a valid https URL');

  assert(
    workflow.includes('pnpm publish --provenance --access public'),
    'release workflow must publish with provenance',
  );
  assert(
    workflow.includes('needs: verify'),
    'release workflow publish job must depend on verify job',
  );
  assert(
    workflow.includes('softprops/action-gh-release'),
    'release workflow must create GitHub release',
  );
  assert(
    workflow.includes('id-token: write'),
    'release workflow must request OIDC id-token permission',
  );
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  fail(message);
});
