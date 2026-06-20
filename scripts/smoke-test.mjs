import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const fixtureRoot = 'reports/smoke-input';
const dryReport = 'reports/smoke-dry.txt';
const executeReport = 'reports/smoke-execute.txt';
const errorLog = 'reports/smoke-errors.txt';
const cliEntry = process.argv.includes('--bundle')
  ? 'release/remover-duplicados.mjs'
  : 'dist/index.js';

function main() {
  resetFixture();
  runCli(['--path', fixtureRoot, '--dry-run', '--report', dryReport, '--error-log', errorLog]);
  assertDryRun();

  runCli(['--path', fixtureRoot, '--execute', '--report', executeReport, '--error-log', errorLog]);
  assertExecute();

  console.log('Smoke test passed.');
}

function resetFixture() {
  rmSync(fixtureRoot, { recursive: true, force: true });
  rmSync(dryReport, { force: true });
  rmSync(executeReport, { force: true });
  rmSync(errorLog, { force: true });

  mkdirSync(join(fixtureRoot, 'nested'), { recursive: true });
  writeFileSync(join(fixtureRoot, 'keep-a.txt'), 'same-content');
  writeFileSync(join(fixtureRoot, 'nested', 'dup-a.txt'), 'same-content');
  writeFileSync(join(fixtureRoot, 'unique.txt'), 'unique-content');
  writeFileSync(join(fixtureRoot, 'same-size-a.txt'), 'xxxx');
  writeFileSync(join(fixtureRoot, 'nested', 'same-size-b.txt'), 'yyyy');
}

function runCli(args) {
  const result = spawnSync('node', [cliEntry, ...args], {
    encoding: 'utf8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`CLI failed with status ${result.status}`);
  }
}

function assertDryRun() {
  assert(existsSync(join(fixtureRoot, 'nested', 'dup-a.txt')), 'dry-run removed duplicate file');

  const report = readFileSync(dryReport, 'utf8');
  assert(report.includes('Mode: dry-run'), 'dry-run report missing mode');
  assert(report.includes('Duplicate groups: 1'), 'dry-run report should find one duplicate group');
  assert(
    report.includes('Would remove: nested/dup-a.txt'),
    'dry-run report missing planned removal',
  );
}

function assertExecute() {
  const files = listFiles(fixtureRoot);

  assert(!files.includes('nested/dup-a.txt'), 'execute did not remove duplicate file');
  assert(files.includes('keep-a.txt'), 'execute removed kept file');
  assert(files.includes('same-size-a.txt'), 'execute removed same-size different-content file');
  assert(
    files.includes('nested/same-size-b.txt'),
    'execute removed same-size different-content file',
  );

  const report = readFileSync(executeReport, 'utf8');
  assert(report.includes('Mode: execute'), 'execute report missing mode');
  assert(report.includes('Removed: nested/dup-a.txt'), 'execute report missing removed file');
}

function listFiles(root, base = root) {
  const files = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const absolutePath = join(root, entry.name);
    const relativePath = absolutePath.slice(base.length + 1);

    if (entry.isDirectory()) {
      files.push(...listFiles(absolutePath, base));
      continue;
    }

    files.push(relativePath);
  }

  return files.sort();
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

main();
