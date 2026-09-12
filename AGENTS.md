# Agent instructions

## Definition of done

A change is done ONLY when `pnpm verify` passes with zero errors.
For any module with tests, `pnpm mutation` must stay above its break threshold (once enabled).

## Hard rules — never do these to make a check pass

- No `any`, `@ts-ignore`, `@ts-expect-error`, or `eslint-disable`.
- Never lower a threshold, delete a test, or weaken a config.
- `src/domain` must not import from `src/application` or `src/infrastructure`.
- `src/application` must not import from `src/infrastructure` — depend on ports, not concrete adapters.
- Write tests from the spec / acceptance criteria, NOT from the implementation.

## Commands

- Install: `pnpm install`
- Check everything: `pnpm verify`
