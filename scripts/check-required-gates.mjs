// Auto-arming gates. Detects the project's shape from package.json + source,
// then FAILS the build until the checks that shape demands are wired in — and
// runs those checks when they are. Fails CLOSED: a known capability with no
// matching gate is an error, not a shrug.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const TEMPLATE_NAME = 'ts-physics-template';
const MOTHERSHIP_REPO = 'mlembke1/ts-physics-template';
const APPLY_RULESET =
  'gh api -X POST repos/{owner}/{repo}/rulesets --input .github/rulesets/main.json';
const BOOTSTRAP_HINT = [
  'This project has not been set up yet. Run:',
  '  pnpm bootstrap --name=<project-name> --team=solo|team --app=web|server|library|cli|none --license=proprietary|mit',
  '(it decides: name, solo or team, what you are building, license)',
  '',
  "pnpm's builtin setup and init commands will not configure this project.",
].join('\n');

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const has = (name) => Object.hasOwn(deps, name);
const hasAny = (...names) => names.some(has);

if (isUnconfigured() && !isMothership()) {
  console.error(BOOTSTRAP_HINT);
  process.exit(1);
}

const srcFiles = readSrcFiles();
const SCHEMA_LIBS = ['zod', 'valibot', 'arktype', '@t3-oss/env-core'];
const REACT_FAMILY = ['react', 'next', 'preact'];
const PAGE_WEIGHT = ['react', 'next', 'preact', 'vue', 'svelte', '@angular/core'];

const REQUIREMENTS = [
  {
    shape: 'web app (React/Next/Preact in dependencies)',
    detected: () => hasAny(...REACT_FAMILY),
    gates: [
      {
        name: 'accessibility linting',
        satisfied: () => has('eslint-plugin-jsx-a11y'),
        fix: 'pnpm add -D eslint-plugin-jsx-a11y   (base ESLint config activates it automatically once present)',
      },
    ],
  },
  {
    shape: 'bundled UI (React/Next/Preact/Vue/Svelte/Angular in dependencies)',
    detected: () => hasAny(...PAGE_WEIGHT),
    gates: [
      {
        name: 'page-weight budget',
        satisfied: () => has('size-limit') && sizeLimitBudgetCount() > 0,
        fix: 'pnpm add -D size-limit @size-limit/preset-app   and add a non-empty .size-limit.json budget',
        run: () => execFileSync('pnpm', ['exec', 'size-limit'], { stdio: 'inherit' }),
      },
    ],
  },
  {
    shape: 'publishable package (public, with an entry point)',
    detected: () => pkg.private !== true && Boolean(pkg.bin ?? pkg.exports ?? pkg.main),
    gates: [
      {
        name: 'release/version management',
        satisfied: () => has('@changesets/cli'),
        fix: 'pnpm add -D @changesets/cli   and run: pnpm changeset init',
        run: () => execFileSync('pnpm', ['exec', 'changeset', 'status'], { stdio: 'inherit' }),
      },
    ],
  },
  {
    shape: 'reads environment variables (process.env in src)',
    detected: () =>
      srcFiles.some((file) => /process\.env/.test(stripCommentsAndStrings(file.content))),
    gates: [
      {
        name: 'validated env at startup',
        satisfied: () => rawEnvFiles().length === 0,
        fix: 'pnpm add zod   and parse process.env through a schema module (never read it raw)',
      },
    ],
  },
];

const failures = [];
const runners = [];
for (const requirement of REQUIREMENTS) {
  if (!requirement.detected()) continue;
  for (const gate of requirement.gates) {
    if (!gate.satisfied()) failures.push({ shape: requirement.shape, gate });
    else if (gate.run) runners.push(gate.run);
  }
}

if (failures.length > 0) {
  console.error('Required gates are missing for this project shape:\n');
  for (const { shape, gate } of failures) {
    console.error(`  - ${shape}`);
    console.error(`    needs: ${gate.name}`);
    console.error(`    fix:   ${gate.fix}\n`);
  }
  console.error('Not optional for what this project has become — wire them in.');
  process.exit(1);
}

for (const run of runners) run();

assertMergeGate();

console.log('Required-gates check passed: every capability present has its gate wired.');

function isUnconfigured() {
  return existsSync('.needs-setup') || pkg.name === TEMPLATE_NAME;
}

function isMothership() {
  // CI: GitHub sets GITHUB_REPOSITORY. Local template maintainers may drop a
  // gitignored `.mothership` file. Origin URL is not identity — clones can spoof it.
  return process.env.GITHUB_REPOSITORY === MOTHERSHIP_REPO || existsSync('.mothership');
}

function rawEnvFiles() {
  return srcFiles
    .filter((file) => /process\.env/.test(stripCommentsAndStrings(file.content)))
    .filter((file) => !importsSchemaLib(file.content))
    .map((file) => file.path);
}

function importsSchemaLib(content) {
  const names = SCHEMA_LIBS.map((name) => name.replaceAll('/', '\\/')).join('|');
  return new RegExp(`from\\s*['"](?:${names})['"]`).test(content);
}

function sizeLimitBudgetCount() {
  if (!existsSync('.size-limit.json')) return 0;
  try {
    const budget = JSON.parse(readFileSync('.size-limit.json', 'utf8'));
    return Array.isArray(budget) ? budget.length : 0;
  } catch {
    return 0;
  }
}

function readSrcFiles() {
  const files = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) {
        files.push({ path: full, content: readFileSync(full, 'utf8') });
      }
    }
  };
  walk('src');
  return files;
}

function stripCommentsAndStrings(source) {
  let result = '';
  let index = 0;
  const { length } = source;
  while (index < length) {
    const current = source[index];
    const next = source[index + 1];
    if (current === '/' && next === '/') {
      index += 2;
      while (index < length && source[index] !== '\n') index += 1;
      continue;
    }
    if (current === '/' && next === '*') {
      index += 2;
      while (index + 1 < length && !(source[index] === '*' && source[index + 1] === '/')) {
        index += 1;
      }
      index += 2;
      continue;
    }
    if (current === "'" || current === '"') {
      const quote = current;
      index += 1;
      while (index < length && source[index] !== quote) {
        if (source[index] === '\\') index += 1;
        index += 1;
      }
      index += 1;
      result += '""';
      continue;
    }
    if (current === '`') {
      index += 1;
      while (index < length && source[index] !== '`') {
        if (source[index] === '\\') {
          index += 2;
          continue;
        }
        if (source[index] === '$' && source[index + 1] === '{') {
          const interpolation = readInterpolation(source, index + 2);
          result += stripCommentsAndStrings(interpolation.expression);
          index = interpolation.end;
          continue;
        }
        index += 1;
      }
      index += 1;
      continue;
    }
    result += current;
    index += 1;
  }
  return result;
}

function readInterpolation(source, start) {
  let depth = 1;
  let index = start;
  let expression = '';
  while (index < source.length && depth > 0) {
    if (source[index] === '{') depth += 1;
    else if (source[index] === '}') depth -= 1;
    if (depth > 0) expression += source[index];
    index += 1;
  }
  return { expression, end: index };
}

function assertMergeGate() {
  if (isMothership()) return;
  if (!hasGh()) {
    console.error(
      `Merge gate not verified (gh is not installed). Apply it with:\n  ${APPLY_RULESET}`,
    );
    return;
  }
  const inspected = inspectRulesets();
  if (inspected === 'ok') return;
  if (inspected === 'missing') {
    console.error('No active ruleset requiring `verify` and `secrets` with empty bypass actors.');
    console.error(`Apply it with:\n  ${APPLY_RULESET}`);
    process.exit(1);
  }
  console.error(
    `Merge gate not verified (GitHub API not readable). Apply it with:\n  ${APPLY_RULESET}`,
  );
}

function hasGh() {
  try {
    execFileSync('gh', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function inspectRulesets() {
  try {
    const listed = JSON.parse(
      execFileSync('gh', ['api', 'repos/{owner}/{repo}/rulesets'], {
        encoding: 'utf8',
        stdio: 'pipe',
      }),
    );
    if (!Array.isArray(listed) || listed.length === 0) return 'missing';
    for (const entry of listed) {
      const detailed = entry.rules
        ? entry
        : JSON.parse(
            execFileSync('gh', ['api', `repos/{owner}/{repo}/rulesets/${entry.id}`], {
              encoding: 'utf8',
              stdio: 'pipe',
            }),
          );
      if (rulesetSatisfies(detailed)) return 'ok';
    }
    return 'missing';
  } catch {
    return 'unavailable';
  }
}

function rulesetSatisfies(ruleset) {
  if (ruleset.enforcement !== 'active') return false;
  const bypass = ruleset.bypass_actors ?? [];
  if (bypass.length > 0) return false;
  const checks = (ruleset.rules ?? []).find((rule) => rule.type === 'required_status_checks');
  const contexts = (checks?.parameters?.required_status_checks ?? []).map((check) => check.context);
  return contexts.includes('verify') && contexts.includes('secrets');
}
