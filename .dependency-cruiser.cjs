/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment: 'no dependency cycles anywhere',
      from: {},
      to: { circular: true },
    },
    {
      name: 'no-orphans',
      severity: 'error',
      comment: 'files nothing imports (dead code); src/index.ts is the allowed entry point',
      from: { orphan: true, pathNot: ['\\.d\\.ts$', '(^|/)src/index\\.ts$'] },
      to: {},
    },
    {
      name: 'domain-is-pure',
      severity: 'error',
      comment: 'domain may not import application or infrastructure',
      from: { path: '^src/domain' },
      to: { path: '^src/(application|infrastructure)' },
    },
    {
      name: 'application-off-infra',
      severity: 'error',
      comment: 'application depends on ports, never on concrete infrastructure adapters',
      from: { path: '^src/application' },
      to: { path: '^src/infrastructure' },
    },
  ],
  options: {
    tsConfig: { fileName: 'tsconfig.json' },
    tsPreCompilationDeps: true,
    doNotFollow: { path: 'node_modules' },
  },
};
