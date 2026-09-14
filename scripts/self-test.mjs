// Negative fixtures for the floor. If these stop failing, the gates are theatre.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const forbiddenSetup = ['pnpm', 'setup'].join(' ');
const forbiddenInit = ['pnpm', 'init'].join(' ');
const canonicalVerify =
  'pnpm typecheck && pnpm typecov && pnpm lint && pnpm format:check && pnpm arch && pnpm require:check && pnpm floor && pnpm gates && pnpm deadcode && pnpm spell && pnpm license:check && pnpm run audit && pnpm test && pnpm mutation';

describe('first-run and documented commands', () => {
  it('never tells anyone to run the pnpm builtin setup or init commands', () => {
    const files = [
      'AGENTS.md',
      'README.md',
      '.needs-setup',
      'scripts/bootstrap.mjs',
      'scripts/check-required-gates.mjs',
      'scripts/check-floor.mjs',
    ];
    for (const relative of files) {
      const text = readFileSync(path.join(repoRoot, relative), 'utf8');
      assert.doesNotMatch(text, new RegExp(`(?:^|[\\s\`])${forbiddenSetup}(?:$|[\\s\`])`));
      assert.doesNotMatch(text, new RegExp(`(?:^|[\\s\`])${forbiddenInit}(?:$|[\\s\`])`));
    }
  });

  it('fails when the package is still named as the template', () => {
    const result = runScript('check-required-gates.mjs', {
      'package.json': JSON.stringify({
        name: 'ts-physics-template',
        private: true,
        scripts: { verify: 'pnpm test' },
      }),
      'src/index.ts': 'export {}\n',
    });
    assert.equal(result.passed, false);
    assert.match(result.output, /pnpm bootstrap/);
    assert.match(result.output, /builtin setup and init/);
  });

  it('fails when .needs-setup is deleted but the template name remains', () => {
    const result = runScript('check-required-gates.mjs', {
      'package.json': JSON.stringify({
        name: 'ts-physics-template',
        private: true,
        scripts: { verify: 'pnpm test' },
      }),
      'src/index.ts': 'export {}\n',
    });
    assert.equal(result.passed, false);
    assert.match(result.output, /pnpm bootstrap/);
  });

  it('does not treat a mothership origin URL as identity', () => {
    const result = runScript(
      'check-required-gates.mjs',
      {
        'package.json': JSON.stringify({
          name: 'ts-physics-template',
          private: true,
          scripts: { verify: 'pnpm test' },
        }),
        'src/index.ts': 'export {}\n',
      },
      { origin: 'git@github.com:mlembke1/ts-physics-template.git' },
    );
    assert.equal(result.passed, false);
    assert.match(result.output, /pnpm bootstrap/);
  });

  it('exempts only the mothership GitHub Actions environment', () => {
    const result = runScript(
      'check-required-gates.mjs',
      {
        'package.json': JSON.stringify({
          name: 'ts-physics-template',
          private: true,
          scripts: { verify: 'pnpm test' },
        }),
        '.needs-setup': 'pending\n',
        'src/index.ts': 'export {}\n',
      },
      { GITHUB_REPOSITORY: 'mlembke1/ts-physics-template' },
    );
    assert.equal(result.passed, true, result.output);
  });
});

describe('shape detection', () => {
  it('does not treat process.env in a comment or string as reading env', () => {
    const result = runConfigured({
      'src/index.ts': ['// process.env.SECRET', 'export const hint = "process.env.PORT";', ''].join(
        '\n',
      ),
    });
    assert.equal(result.passed, true, result.output);
  });

  it('fails raw process.env even when zod is listed in package.json', () => {
    const result = runConfigured({
      'package.json': JSON.stringify({
        name: 'demo-app',
        private: true,
        scripts: { verify: 'pnpm test' },
        dependencies: { zod: '3.0.0' },
      }),
      'src/index.ts': 'export const port = process.env.PORT;\n',
    });
    assert.equal(result.passed, false);
    assert.match(result.output, /schema module/);
  });

  it('allows process.env in a module that imports a schema library', () => {
    const result = runConfigured({
      'package.json': JSON.stringify({
        name: 'demo-app',
        private: true,
        scripts: { verify: 'pnpm test' },
        dependencies: { zod: '3.0.0' },
      }),
      'src/env.ts': [
        'import { z } from "zod";',
        'export const env = z.object({}).parse(process.env);',
        '',
      ].join('\n'),
    });
    assert.equal(result.passed, true, result.output);
  });

  it('fails when React is added without accessibility linting', () => {
    const result = runConfigured({
      'package.json': JSON.stringify({
        name: 'demo-app',
        private: true,
        scripts: { verify: 'pnpm test' },
        dependencies: { react: '19.0.0' },
      }),
    });
    assert.equal(result.passed, false);
    assert.match(result.output, /eslint-plugin-jsx-a11y/);
    assert.match(result.output, /size-limit/);
  });

  it('does not require jsx-a11y for Vue', () => {
    const result = runConfigured({
      'package.json': JSON.stringify({
        name: 'demo-app',
        private: true,
        scripts: { verify: 'pnpm test' },
        dependencies: { vue: '3.0.0' },
      }),
    });
    assert.equal(result.passed, false);
    assert.doesNotMatch(result.output, /jsx-a11y/);
    assert.match(result.output, /size-limit/);
  });
});

describe('floor integrity', () => {
  it('passes on this repository', () => {
    const result = runScriptAt(repoRoot, 'check-floor.mjs');
    assert.equal(result.passed, true, result.output);
  });

  it('fails when verify is gutted', () => {
    const result = runFloorWithPackage({
      scripts: {
        verify: 'echo skipped',
        bootstrap: 'node scripts/bootstrap.mjs',
        typecov: 'type-coverage --strict --at-least 100',
      },
    });
    assert.equal(result.passed, false);
    assert.match(result.output, /scripts\.verify/);
  });

  it('fails when type coverage is lowered', () => {
    const result = runFloorWithPackage({
      scripts: {
        verify: canonicalVerify,
        bootstrap: 'node scripts/bootstrap.mjs',
        typecov: 'type-coverage --strict --at-least 0',
      },
    });
    assert.equal(result.passed, false);
    assert.match(result.output, /at-least/);
  });
});

function runConfigured(files) {
  return runScript('check-required-gates.mjs', {
    'package.json': JSON.stringify({
      name: 'demo-app',
      private: true,
      scripts: { verify: 'pnpm test' },
    }),
    'src/index.ts': 'export {}\n',
    ...files,
  });
}

function runFloorWithPackage(packageJson) {
  const workingDirectory = makeTemporary({
    'package.json': JSON.stringify({
      name: 'demo-app',
      private: true,
      license: 'MIT',
      ...packageJson,
    }),
    'vitest.config.ts': readFileSync(path.join(repoRoot, 'vitest.config.ts'), 'utf8'),
    'stryker.conf.json': readFileSync(path.join(repoRoot, 'stryker.conf.json'), 'utf8'),
    'eslint.config.js': readFileSync(path.join(repoRoot, 'eslint.config.js'), 'utf8'),
    LICENSE: 'MIT\n',
    '.github/CODEOWNERS': '* @someone\n',
    '.github/workflows/ci.yml': readFileSync(
      path.join(repoRoot, '.github/workflows/ci.yml'),
      'utf8',
    ),
    'scripts/bootstrap.mjs': '// bootstrap\n',
  });
  try {
    return runScriptAt(workingDirectory, 'check-floor.mjs');
  } finally {
    rmSync(workingDirectory, { recursive: true, force: true });
  }
}

function runScript(scriptName, files, options = {}) {
  const workingDirectory = makeTemporary(files);
  try {
    if (options.origin) {
      execFileSync('git', ['init'], { cwd: workingDirectory, stdio: 'ignore' });
      execFileSync('git', ['remote', 'add', 'origin', options.origin], {
        cwd: workingDirectory,
        stdio: 'ignore',
      });
    }
    return runScriptAt(workingDirectory, scriptName, options.GITHUB_REPOSITORY);
  } finally {
    rmSync(workingDirectory, { recursive: true, force: true });
  }
}

function runScriptAt(workingDirectory, scriptName, repository) {
  const environment = { ...process.env };
  delete environment.GITHUB_REPOSITORY;
  if (repository) environment.GITHUB_REPOSITORY = repository;
  const spawned = spawnSync(process.execPath, [path.join(repoRoot, 'scripts', scriptName)], {
    cwd: workingDirectory,
    env: environment,
    encoding: 'utf8',
  });
  return {
    passed: spawned.status === 0,
    output: `${spawned.stderr ?? ''}${spawned.stdout ?? ''}`,
  };
}

function makeTemporary(files) {
  const workingDirectory = mkdtempSync(path.join(tmpdir(), 'physics-gates-'));
  for (const [relative, content] of Object.entries(files)) {
    const full = path.join(workingDirectory, relative);
    mkdirSync(path.dirname(full), { recursive: true });
    writeFileSync(full, content);
  }
  return workingDirectory;
}
