import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const cliFixtureRoot = 'reports/smoke-cli-input';
const apiFixtureRoot = 'reports/smoke-api-input';
const maxBytesFixtureRoot = 'reports/smoke-max-bytes-input';
const defaultDryReport = 'reports/smoke-default-dry.txt';
const defaultExecuteReport = 'reports/smoke-default-execute.txt';
const recursiveDryReport = 'reports/smoke-recursive-dry.txt';
const recursiveExecuteReport = 'reports/smoke-recursive-execute.txt';
const maxBytesReport = 'reports/smoke-max-bytes.txt';
const apiDefaultReport = 'reports/smoke-api-default.txt';
const apiRecursiveReport = 'reports/smoke-api-recursive.txt';
const apiMaxBytesReport = 'reports/smoke-api-max-bytes.txt';
const errorLog = 'reports/smoke-errors.txt';
const cliEntry = process.argv.includes('--bundle')
  ? 'release/remover-duplicados.mjs'
  : 'dist/cli.js';

async function main() {
  resetFixture(cliFixtureRoot);
  runCli([
    '--path',
    cliFixtureRoot,
    '--dry-run',
    '--report',
    defaultDryReport,
    '--error-log',
    errorLog,
  ]);
  assertDefaultDryRun();

  runCli([
    '--path',
    cliFixtureRoot,
    '--execute',
    '--report',
    defaultExecuteReport,
    '--error-log',
    errorLog,
  ]);
  assertDefaultExecute();

  runCli([
    '--path',
    cliFixtureRoot,
    '--recursive',
    '--dry-run',
    '--report',
    recursiveDryReport,
    '--error-log',
    errorLog,
  ]);
  assertRecursiveDryRun();

  runCli([
    '--path',
    cliFixtureRoot,
    '--recursive',
    '--execute',
    '--report',
    recursiveExecuteReport,
    '--error-log',
    errorLog,
  ]);
  assertRecursiveExecute();

  resetMaxBytesFixture(maxBytesFixtureRoot);
  runCli([
    '--path',
    maxBytesFixtureRoot,
    '--recursive',
    '--dry-run',
    '--max-bytes',
    '4',
    '--report',
    maxBytesReport,
    '--error-log',
    errorLog,
  ]);
  assertMaxBytesDryRun();

  await assertImportedApi();

  console.log('Smoke test passed.');
}

function resetFixture(root) {
  rmSync(root, { recursive: true, force: true });
  rmSync(defaultDryReport, { force: true });
  rmSync(defaultExecuteReport, { force: true });
  rmSync(recursiveDryReport, { force: true });
  rmSync(recursiveExecuteReport, { force: true });
  rmSync(maxBytesReport, { force: true });
  rmSync(apiDefaultReport, { force: true });
  rmSync(apiRecursiveReport, { force: true });
  rmSync(apiMaxBytesReport, { force: true });
  rmSync(errorLog, { force: true });

  mkdirSync(join(root, 'nested'), { recursive: true });
  writeFileSync(join(root, 'keep-a.txt'), 'same-content');
  writeFileSync(join(root, 'nested', 'dup-a.txt'), 'same-content');
  writeFileSync(join(root, 'unique.txt'), 'unique-content');
  writeFileSync(join(root, 'same-size-a.txt'), 'xxxx');
  writeFileSync(join(root, 'nested', 'same-size-b.txt'), 'yyyy');
}

function resetMaxBytesFixture(root) {
  rmSync(root, { recursive: true, force: true });
  mkdirSync(join(root, 'nested'), { recursive: true });
  writeFileSync(join(root, 'small-keep.txt'), 'tiny');
  writeFileSync(join(root, 'nested', 'small-dup.txt'), 'tiny');
  writeFileSync(join(root, 'large-keep.txt'), 'large-content');
  writeFileSync(join(root, 'nested', 'large-dup.txt'), 'large-content');
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

function assertDefaultDryRun() {
  assert(
    existsSync(join(cliFixtureRoot, 'nested', 'dup-a.txt')),
    'default dry-run removed nested duplicate file',
  );

  const report = readFileSync(defaultDryReport, 'utf8');
  assert(report.includes('Mode: dry-run'), 'default dry-run report missing mode');
  assert(report.includes('Duplicate groups: 0'), 'default dry-run should not scan subfolders');
  assert(
    !report.includes('Would remove: nested/dup-a.txt'),
    'default dry-run should not plan nested duplicate removal',
  );
}

function assertDefaultExecute() {
  const files = listFiles(cliFixtureRoot);

  assert(
    files.includes('nested/dup-a.txt'),
    'default execute removed nested duplicate without --recursive',
  );

  const report = readFileSync(defaultExecuteReport, 'utf8');
  assert(report.includes('Mode: execute'), 'default execute report missing mode');
  assert(
    report.includes('Duplicate groups: 0'),
    'default execute should not find nested duplicate group',
  );
}

function assertRecursiveDryRun() {
  assert(
    existsSync(join(cliFixtureRoot, 'nested', 'dup-a.txt')),
    'recursive dry-run removed duplicate file',
  );

  const report = readFileSync(recursiveDryReport, 'utf8');
  assert(report.includes('Mode: dry-run'), 'recursive dry-run report missing mode');
  assert(
    report.includes('Duplicate groups: 1'),
    'recursive dry-run should find one duplicate group',
  );
  assert(
    report.includes('Would remove: nested/dup-a.txt'),
    'recursive dry-run report missing planned removal',
  );
}

function assertRecursiveExecute() {
  const files = listFiles(cliFixtureRoot);

  assert(!files.includes('nested/dup-a.txt'), 'recursive execute did not remove duplicate file');
  assert(files.includes('keep-a.txt'), 'recursive execute removed kept file');
  assert(
    files.includes('same-size-a.txt'),
    'recursive execute removed same-size different-content file',
  );
  assert(
    files.includes('nested/same-size-b.txt'),
    'recursive execute removed same-size different-content file',
  );

  const report = readFileSync(recursiveExecuteReport, 'utf8');
  assert(report.includes('Mode: execute'), 'recursive execute report missing mode');
  assert(
    report.includes('Removed: nested/dup-a.txt'),
    'recursive execute report missing removed file',
  );
}

function assertMaxBytesDryRun() {
  const report = readFileSync(maxBytesReport, 'utf8');

  assert(report.includes('Duplicate groups: 1'), 'max-bytes should keep one small duplicate group');
  assert(
    report.includes('Would remove: small-keep.txt'),
    'max-bytes report missing small planned removal',
  );
  assert(
    !report.includes('Would remove: nested/large-dup.txt'),
    'max-bytes should skip duplicate files over the limit',
  );
}

async function assertImportedApi() {
  const { removerDuplicados } = await import('../dist/index.js');

  resetFixture(apiFixtureRoot);
  const defaultResult = await removerDuplicados({
    targetPath: apiFixtureRoot,
    mode: 'dry-run',
    reportPath: apiDefaultReport,
    errorLogPath: errorLog,
  });

  assert(defaultResult.recursive === false, 'API default should be non-recursive');
  assert(defaultResult.duplicateGroupsFound === 0, 'API default should not scan subfolders');
  assert(
    existsSync(join(apiFixtureRoot, 'nested', 'dup-a.txt')),
    'API default removed nested duplicate file',
  );

  const recursiveResult = await removerDuplicados({
    targetPath: apiFixtureRoot,
    mode: 'execute',
    recursive: true,
    reportPath: apiRecursiveReport,
    errorLogPath: errorLog,
  });

  assert(recursiveResult.recursive === true, 'API recursive result missing recursive flag');
  assert(
    recursiveResult.duplicateGroupsFound === 1,
    'API recursive should find one duplicate group',
  );
  assert(
    !existsSync(join(apiFixtureRoot, 'nested', 'dup-a.txt')),
    'API recursive execute did not remove nested duplicate',
  );

  resetMaxBytesFixture(maxBytesFixtureRoot);
  const maxBytesResult = await removerDuplicados({
    targetPath: maxBytesFixtureRoot,
    mode: 'dry-run',
    recursive: true,
    maxBytes: 4,
    reportPath: apiMaxBytesReport,
    errorLogPath: errorLog,
  });

  assert(maxBytesResult.maxBytes === 4, 'API maxBytes result missing maxBytes flag');
  assert(
    maxBytesResult.duplicateGroupsFound === 1,
    'API maxBytes should find only the small duplicate group',
  );
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

await main();
