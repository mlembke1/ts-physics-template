# Agent instructions

## First-time setup

If a `.needs-setup` file exists, or `package.json` name is still `ts-physics-template`,
this project has not been configured yet — run `pnpm bootstrap`.
It needs decisions only the user can make: solo or team, what is being built, the project name,
the license. **Never guess these.** Run non-interactively, `pnpm bootstrap` stops and lists them —
ask the user, then re-run with the answers as flags (e.g. `pnpm bootstrap --name=my-app --team=solo
--app=web --license=proprietary`). `pnpm verify` will not pass until setup has run.

pnpm's builtin setup and init commands will not configure this project.

## Definition of done

A change is done ONLY when `pnpm verify` passes with zero errors.
That includes mutation testing (tests must actually catch bugs).

## Hard rules — never do these to make a check pass

- No `any`, `@ts-ignore`, `@ts-expect-error`, or `eslint-disable`.
- Never lower a threshold, delete a test, or weaken a config.
- `src/domain` must not import from anywhere else under `src`.
- `src/application` must not import from `src/infrastructure` — depend on ports, not concrete adapters.
- Write tests from the spec / acceptance criteria, NOT from the implementation.

## Commands

- Install: `pnpm install`
- First-run: `pnpm bootstrap`
- Check everything: `pnpm verify`
