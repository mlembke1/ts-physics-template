# ts-physics-template

**A TypeScript starter kit where code quality is enforced by the build itself — not by hoping everyone (human or AI) remembers to be careful.**

## TL;DR

Clone this, run `pnpm bootstrap`, and every project you start already has strict, automatic quality checks baked in. Bad code doesn't get a polite warning — it **fails `pnpm verify`**. On GitHub, a ruleset with no bypass actors blocks merging a red PR and blocks pushing straight to `main`. Think of the safety interlock on a machine: you can't run the spindle with the guard up.

Especially handy when you're driving an AI coding agent: it builds _inside_ the floor. Local git hooks are skippable with `--no-verify`; CI and the merge ruleset are not.

## Why it exists

Most projects run on discipline: remember to write tests, remember not to leave an `any` in, remember to check for security holes, hope the reviewer catches the rest. Discipline fails — especially at speed, and especially with an AI writing code quickly.

This template flips it around. The rules are **deterministic gates**: if the code breaks one, the build goes red. Pour the floor once, then build on top of it.

## What it enforces

`pnpm verify` is the one command. It runs typecheck, 100% type coverage, lint, format, architecture, shape detection, a floor-integrity check, dead code, spelling, production licenses, `pnpm audit`, tests with coverage, and mutation testing.

- **Types** — strict TypeScript, no `any` (type coverage + lint; `tsc` alone does not forbid `any`)
- **Clean code** — modern patterns, no over-complexity or copy-paste, no dead code, spell-checked
- **Architecture** — domain code cannot import the rest of `src` (not via `utils` either)
- **Tests** — must pass, must cover the code, and must catch bugs (mutation testing is in `verify`)
- **Security** — CI scans git history for leaked secrets; `verify` runs `pnpm audit` and a production-license allowlist
- **The merge gate** — copies of this template do **not** inherit GitHub protection. `pnpm bootstrap` tries to apply `.github/rulesets/main.json`; `pnpm verify` fails if `gh` can see that `verify` + `secrets` are not required. An admin can still delete the ruleset; that is outside the floor.

### The checks turn themselves on

The moment your project _becomes_ something, the checks it needs arm automatically:

- Add React / Next / Preact → accessibility linting becomes required (and runs)
- Add a bundled UI framework → a non-empty page-weight budget becomes required (and `size-limit` runs)
- Read environment variables in code → those reads must live in a schema module (`zod` / `valibot` / `arktype` / `@t3-oss/env-core`). Comments and strings do not trip this. Listing `zod` in `package.json` while still reading `process.env` raw still fails.
- Make it a publishable package → release-management becomes required (and `changeset status` runs)

You don't have to remember to add them. The build tells you — in red, with the one-line fix — the instant they're missing.

## How to use it

**1. Start a project from it:**

```bash
gh repo create my-app --template mlembke1/ts-physics-template --private --clone
cd my-app
pnpm install
pnpm bootstrap --name=my-app --team=solo --app=web --license=proprietary
```

pnpm's builtin setup and init commands will not configure this project.

**2. Build, and run the one command that checks everything:**

```bash
pnpm verify
```

Keep that green and you're good.

**3. Commit and open a pull request.** Hooks run locally (bypassable). CI runs `floor`, `verify`, and `secrets`. A pull request can't merge until they pass — once the ruleset is applied.

## The one rule

**Never weaken a check to make it pass.** No `any`, no disabling the linter, no lowering a threshold, no deleting a test, no turning `verify` into `echo skipped`. If a gate is in your way, fix the code — that is the entire point. `pnpm floor` and `.github/CODEOWNERS` back that rule in the repo; `AGENTS.md` tells the agent.

## Handy commands

| Command          | What it does                                        |
| ---------------- | --------------------------------------------------- |
| `pnpm bootstrap` | First-run identity (name, team, app, license)       |
| `pnpm verify`    | Run every local gate — the one command that matters |
| `pnpm floor`     | Check that the floor itself was not gutted          |
| `pnpm gates`     | Negative fixtures: the floor must still reject junk |
| `pnpm test`      | Tests + coverage                                    |
| `pnpm format`    | Auto-fix formatting                                 |
| `pnpm run audit` | Scan dependencies for known vulnerabilities         |
| `pnpm sbom`      | Generate a bill-of-materials of every dependency    |

## Good to know

- **Two versions are pinned on purpose.** TypeScript and the test runner are held one major version back because the linter and mutation tools haven't caught up to the newest releases yet. Dependabot opens weekly PRs when pins can move — including majors, which you merge when the rest of the toolchain is ready.
- **The merge gate needs a public repo or GitHub Pro** (about $4/month) on private repos. Everything else is free on any plan. On a free private repo you still get the local and CI checks — they're just skippable, so the truly unbypassable part is the paid piece.
- **This template repo** is exempt from first-run in GitHub Actions via `GITHUB_REPOSITORY`. Clones are not.
