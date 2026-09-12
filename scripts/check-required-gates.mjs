// Auto-arming gates. Detects the project's shape from package.json + source,
// then FAILS the build until the checks that shape demands are wired in.
// Fails CLOSED: a known capability with no matching gate is an error, not a shrug.
// This is what makes the optional packs physics instead of a recipe someone
// has to remember to follow.
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// Fail closed until first-time setup has run — but never on the template repo itself
// (identified by its remote). A fresh clone carries .needs-setup; `pnpm setup` removes it.
function isCanonicalTemplate() {
  try {
    const url = execFileSync('git', ['config', '--get', 'remote.origin.url'], {
      encoding: 'utf8',
    }).trim();
    return /[:/]mlembke1\/ts-physics-template(\.git)?$/i.test(url);
  } catch {
    return false;
  }
}
if (existsSync('.needs-setup') && !isCanonicalTemplate()) {
  console.error('This project has not been set up yet. Run:  pnpm setup');
  console.error('(it decides: name, solo or team, what you are building, license)');
  process.exit(1);
}

const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const deps = { ...pkg.dependencies, ...pkg.devDependencies };
const has = (name) => Object.hasOwn(deps, name);
const hasAny = (...names) => names.some(has);

function readSrc() {
  const chunks = [];
  const walk = (dir) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx|mts|cts)$/.test(entry.name)) chunks.push(readFileSync(full, 'utf8'));
    }
  };
  walk('src');
  return chunks.join('\n');
}
const src = readSrc();

const REQUIREMENTS = [
  {
    shape: 'web app (React/Next/Vue/Svelte/Angular in dependencies)',
    detected: () => hasAny('react', 'next', 'vue', 'svelte', '@angular/core'),
    gates: [
      {
        name: 'accessibility linting',
        satisfied: () => has('eslint-plugin-jsx-a11y'),
        fix: 'pnpm add -D eslint-plugin-jsx-a11y   (base ESLint config activates it automatically once present)',
      },
      {
        name: 'page-weight budget',
        satisfied: () => has('size-limit') && existsSync('.size-limit.json'),
        fix: 'pnpm add -D size-limit @size-limit/preset-app   and add a .size-limit.json budget',
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
      },
    ],
  },
  {
    shape: 'reads environment variables (process.env in src)',
    detected: () => /process\.env/.test(src),
    gates: [
      {
        name: 'validated env at startup',
        satisfied: () => hasAny('zod', 'valibot', 'arktype', '@t3-oss/env-core'),
        fix: 'pnpm add zod   and parse process.env through a schema module (never read it raw)',
      },
    ],
  },
];

const failures = [];
for (const requirement of REQUIREMENTS) {
  if (!requirement.detected()) continue;
  for (const gate of requirement.gates) {
    if (!gate.satisfied()) failures.push({ shape: requirement.shape, gate });
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

console.log('Required-gates check passed: every capability present has its gate wired.');
