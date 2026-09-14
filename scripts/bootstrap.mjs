// One-time project setup.
//
// Runs automatically on `pnpm install` when a human is at the keyboard (via the
// postinstall hook, with --auto). Otherwise it stays out of the way. It NEVER guesses
// the decisions only a person can make: run it non-interactively without answers and it
// stops and lists what it needs — so whoever is driving (you, or an AI agent) has to
// surface them rather than silently pick defaults.
//
// Do not document pnpm's builtin setup or init commands — they will not run this
// script. The command is `pnpm bootstrap`.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';
import process from 'node:process';

const root = process.cwd();
const pkgPath = `${root}/package.json`;
const rulesetPath = `${root}/.github/rulesets/main.json`;
const licensePath = `${root}/LICENSE`;
const marker = `${root}/.needs-setup`;
const APPLY_RULESET =
  'gh api -X POST repos/{owner}/{repo}/rulesets --input .github/rulesets/main.json';

const TEAMS = ['solo', 'team'];
const APPS = ['web', 'server', 'library', 'cli', 'none'];
const LICENSES = ['proprietary', 'mit'];

const flags = new Map(
  process.argv
    .slice(2)
    .filter((arg) => arg.startsWith('--'))
    .map((arg) => {
      const [key, value] = arg.slice(2).split('=');
      return [key, value ?? 'true'];
    }),
);
const auto = flags.has('auto');
const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY) && !process.env.CI;

if (!existsSync(marker)) {
  if (!auto) process.stdout.write('Already set up — nothing to do.\n');
  process.exit(0);
}

if (interactive) {
  runInterview().then(finish, (error) => fail(String(error)));
} else if (['name', 'team', 'app', 'license'].every((key) => flags.has(key))) {
  finish({
    name: flags.get('name'),
    team: flags.get('team'),
    app: flags.get('app'),
    license: flags.get('license'),
  });
} else if (auto) {
  // First install, no human present: leave a breadcrumb, don't nag, don't guess.
  process.stdout.write('\n▲ One-time setup pending. Run:  pnpm bootstrap\n\n');
} else {
  // Someone ran `pnpm bootstrap` with no human and no answers (e.g. an AI agent).
  // Fail closed — surface the decisions instead of inventing them.
  process.stderr.write(
    [
      'Setup needs decisions that must not be guessed. Ask the user, then re-run with',
      'the answers as flags:',
      '  --name=<project-name>',
      `  --team=<${TEAMS.join('|')}>`,
      `  --app=<${APPS.join('|')}>`,
      `  --license=<${LICENSES.join('|')}>`,
      '',
      'e.g.  pnpm bootstrap --name=my-app --team=solo --app=library --license=proprietary',
      '',
      "pnpm's builtin setup and init commands will not configure this project.",
      '',
    ].join('\n'),
  );
  process.exit(1);
}

async function runInterview() {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    process.stdout.write('\nSetting up your project — a few quick questions.\n\n');
    const name = (await rl.question('Project name: ')).trim();
    const team = await pick(rl, 'Who is working on this?', TEAMS);
    const app = await pick(rl, 'What are you building?', APPS);
    const license = await pick(rl, 'License?', LICENSES);
    return { name, team, app, license };
  } finally {
    rl.close();
  }
}

async function pick(rl, question, options) {
  process.stdout.write(`${question}\n`);
  options.forEach((option, index) => process.stdout.write(`  ${index + 1}) ${option}\n`));
  for (;;) {
    const answer = (await rl.question('> ')).trim();
    const byNumber = options[Number(answer) - 1];
    if (byNumber) return byNumber;
    if (options.includes(answer)) return answer;
    process.stdout.write('Pick a number from the list.\n');
  }
}

function finish(answers) {
  const name = String(answers.name ?? '').trim();
  if (!name) fail('a project name is required');
  if (name === 'ts-physics-template') fail('pick a project name other than ts-physics-template');
  if (!TEAMS.includes(answers.team)) fail(`team must be one of: ${TEAMS.join(', ')}`);
  if (!APPS.includes(answers.app)) fail(`app must be one of: ${APPS.join(', ')}`);
  if (!LICENSES.includes(answers.license)) fail(`license must be one of: ${LICENSES.join(', ')}`);

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  pkg.name = name;
  pkg.license = answers.license === 'mit' ? 'MIT' : 'UNLICENSED';
  pkg.private = answers.app !== 'library';
  if (answers.app === 'library') {
    pkg.exports = pkg.exports ?? './src/index.ts';
  }
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);

  if (answers.license === 'mit') {
    writeFileSync(licensePath, mitLicense(name));
  } else {
    writeFileSync(
      licensePath,
      [
        'UNLICENSED',
        '',
        `Copyright (c) ${new Date().getFullYear()} ${name}`,
        'All rights reserved.',
        '',
      ].join('\n'),
    );
  }

  if (existsSync(rulesetPath)) {
    const ruleset = JSON.parse(readFileSync(rulesetPath, 'utf8'));
    const pullRequest = ruleset.rules?.find((rule) => rule.type === 'pull_request');
    if (pullRequest) {
      pullRequest.parameters.required_approving_review_count = answers.team === 'team' ? 1 : 0;
      pullRequest.parameters.require_code_owner_review = answers.team === 'team';
    }
    writeFileSync(rulesetPath, `${JSON.stringify(ruleset, null, 2)}\n`);
  }

  if (answers.team === 'team') {
    writeFileSync(
      `${root}/.github/CODEOWNERS`,
      [
        '# Replace CHANGE_ME with your GitHub user or team, e.g. @acme/engineers',
        '* @CHANGE_ME',
        '',
        'package.json',
        'pnpm-lock.yaml',
        'eslint.config.js',
        'vitest.config.ts',
        'stryker.conf.json',
        '.dependency-cruiser.cjs',
        'knip.json',
        'tsconfig.json',
        'scripts/',
        '.github/',
        '',
      ].join('\n'),
    );
  }

  rmSync(marker, { force: true });

  const nextForApp = {
    web: 'Add React/Next and the accessibility + page-weight gates arm themselves.',
    server: 'Read env through a schema (zod) and the config gate arms itself.',
    library: 'The publishing gate is armed — install changesets when verify asks.',
    cli: 'The base floor covers it — build away.',
    none: 'The base floor covers it — build away.',
  };

  const gateApplied = tryApplyRuleset();

  process.stdout.write(
    [
      '',
      `✓ Set up "${name}"  (${answers.team}, ${answers.app}, ${answers.license}).`,
      `  ${nextForApp[answers.app]}`,
      '',
      'Next:  pnpm verify',
      gateApplied
        ? '  Merge gate is active on the remote.'
        : `  Copies do not inherit the merge gate. Apply it with:\n    ${APPLY_RULESET}`,
      '',
    ].join('\n'),
  );
  process.exit(0);
}

function tryApplyRuleset() {
  if (!existsSync(rulesetPath)) return false;
  try {
    execFileSync(
      'gh',
      ['api', '-X', 'POST', 'repos/{owner}/{repo}/rulesets', '--input', rulesetPath],
      { stdio: 'pipe' },
    );
    return true;
  } catch {
    return false;
  }
}

function mitLicense(holder) {
  const year = new Date().getFullYear();
  return `MIT License

Copyright (c) ${year} ${holder}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
`;
}

function fail(message) {
  process.stderr.write(`Setup error: ${message}\n`);
  process.exit(1);
}
