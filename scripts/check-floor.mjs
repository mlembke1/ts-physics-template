// Fails if the merge-critical floor was edited into a no-op: gutted verify,
// lowered thresholds, ignored scripts, unpinned Actions, missing license.
import { existsSync, readFileSync } from 'node:fs';

const problems = [];
const note = (message) => problems.push(message);

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const verifySteps = String(pkg.scripts?.verify ?? '')
  .split('&&')
  .map((step) => step.trim().replace(/^pnpm\s+(?:run\s+)?/, ''));

const requiredSteps = [
  'typecheck',
  'typecov',
  'lint',
  'format:check',
  'arch',
  'require:check',
  'floor',
  'gates',
  'deadcode',
  'spell',
  'license:check',
  'audit',
  'test',
  'mutation',
];

let lastIndex = -1;
for (const step of requiredSteps) {
  const index = verifySteps.indexOf(step);
  if (index === -1) note(`scripts.verify is missing \`${step}\``);
  else if (index < lastIndex) note(`scripts.verify runs \`${step}\` out of order`);
  else lastIndex = index;
}

if (pkg.scripts?.setup) {
  note('do not name a script `setup` — that collides with a pnpm builtin; use `bootstrap`');
}
if (!String(pkg.scripts?.bootstrap ?? '').includes('bootstrap.mjs')) {
  note('scripts.bootstrap must run scripts/bootstrap.mjs');
}

const typecov = String(pkg.scripts?.typecov ?? '');
const atLeast = /--at-least\s+(\d+)/.exec(typecov);
if (!atLeast || Number(atLeast[1]) < 100) {
  note('typecov must keep `--at-least` at 100 or higher');
}

if (!existsSync('vitest.config.ts')) note('vitest.config.ts is missing');
else {
  const vitest = readFileSync('vitest.config.ts', 'utf8');
  for (const key of ['lines', 'functions', 'branches', 'statements']) {
    const match = new RegExp(`${key}:\\s*(\\d+)`).exec(vitest);
    if (!match || Number(match[1]) < 90) {
      note(`vitest coverage threshold \`${key}\` must be >= 90`);
    }
  }
}

if (!existsSync('stryker.conf.json')) note('stryker.conf.json is missing');
else {
  const stryker = JSON.parse(readFileSync('stryker.conf.json', 'utf8'));
  if ((stryker.thresholds?.break ?? 0) < 80) {
    note('stryker thresholds.break must be >= 80');
  }
}

if (!existsSync('eslint.config.js')) note('eslint.config.js is missing');
else {
  const eslint = readFileSync('eslint.config.js', 'utf8');
  if (/['"]scripts\/\*\*['"]/.test(eslint)) {
    note('eslint.config.js must not ignore scripts/**');
  }
  if (!eslint.includes('no-restricted-disable')) {
    note('eslint.config.js must restrict eslint-disable comments');
  }
  if (!eslint.includes('eslint-comments')) {
    note('eslint.config.js must load @eslint-community/eslint-plugin-eslint-comments');
  }
  if (!eslint.includes('no-explicit-any')) {
    note('eslint.config.js must keep @typescript-eslint/no-explicit-any');
  }
  if (!eslint.includes('ban-ts-comment')) {
    note('eslint.config.js must keep @typescript-eslint/ban-ts-comment');
  }
}

if (!existsSync('.github/workflows/ci.yml')) note('.github/workflows/ci.yml is missing');
else {
  const ci = readFileSync('.github/workflows/ci.yml', 'utf8');
  if (!ci.includes('scripts/check-floor.mjs')) {
    note('CI must run node scripts/check-floor.mjs as its own job');
  }
  if (!ci.includes('pnpm verify')) note('CI must run pnpm verify');
  if (!ci.includes('sha256sum -c')) {
    note('CI gitleaks install must checksum the tarball (sha256sum -c)');
  }
  if (!ci.includes('node-version-file')) {
    note('CI must pin Node with node-version-file: .node-version');
  }
  const uses = [...ci.matchAll(/^\s*-\s*uses:\s*(\S+)/gm)].map((match) => match[1]);
  if (uses.length === 0) note('CI has no uses: actions to pin');
  for (const spec of uses) {
    const sha = spec.split('@')[1] ?? '';
    if (!/^[0-9a-f]{40}$/i.test(sha)) {
      note(`CI action is not SHA-pinned: ${spec}`);
    }
  }
}

if (!existsSync('LICENSE')) note('LICENSE file is missing');
if (!existsSync('.github/CODEOWNERS')) note('.github/CODEOWNERS is missing');
if (!existsSync('scripts/bootstrap.mjs')) note('scripts/bootstrap.mjs is missing');

if (problems.length > 0) {
  console.error('Floor check failed — the merge-critical gates were weakened:\n');
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log('Floor check passed: verify chain, thresholds, CI pins, and license are intact.');
