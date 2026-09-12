// Fails if any PRODUCTION dependency uses a license outside the allow-list.
// Dev dependencies are intentionally excluded: they build the project, they are
// not distributed, so their licenses place no obligations on shipped code.
import { execFileSync } from 'node:child_process';

const ALLOWED = new Set([
  'MIT',
  'ISC',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  '0BSD',
  'BlueOak-1.0.0',
  'CC0-1.0',
  'Unlicense',
  'MPL-2.0',
]);

const raw = execFileSync('pnpm', ['licenses', 'list', '--prod', '--json'], {
  encoding: 'utf8',
}).trim();
// pnpm prints a plain-text notice (not JSON) when there are no production deps.
const byLicense = /^[[{]/.test(raw) ? JSON.parse(raw) : {};

// Accept a plain id, or an "(A OR B)" expression where any option is allowed.
const isAllowed = (spdx) =>
  spdx
    .replaceAll(/[()]/g, '')
    .split(/\s+OR\s+/i)
    .map((part) => part.trim())
    .some((option) => ALLOWED.has(option));

const violations = [];
for (const [license, packages] of Object.entries(byLicense)) {
  if (isAllowed(license)) continue;
  for (const pkg of packages) {
    violations.push(`${pkg.name} — ${license}`);
  }
}

if (violations.length > 0) {
  console.error('Disallowed production-dependency licenses:');
  for (const line of violations) console.error(`  ${line}`);
  console.error(`\nAllowed: ${[...ALLOWED].join(', ')}`);
  process.exit(1);
}

console.log('License check passed: all production dependencies use allowed licenses.');
