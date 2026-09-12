# ts-physics-template

**A TypeScript starter kit where code quality is enforced by the build itself — not by hoping everyone (human or AI) remembers to be careful.**

## TL;DR

Clone this, and every project you start already has strict, automatic quality checks baked in. Bad code doesn't get a polite warning — it **fails the build and can't be merged**. Think of the safety interlock on a machine: you can't run the spindle with the guard up. The rules are physics, not suggestions.

Especially handy when you're driving an AI coding agent: it builds _inside_ the floor and literally can't ship sloppy or unsafe code past the gates.

## Why it exists

Most projects run on discipline: remember to write tests, remember not to leave an `any` in, remember to check for security holes, hope the reviewer catches the rest. Discipline fails — especially at speed, and especially with an AI writing code quickly.

This template flips it around. The rules are **deterministic gates**: if the code breaks one, the build goes red and the change can't merge. Nobody has to remember anything. Pour the floor once, then build on top of it forever.

## What it enforces

Every check here has been battle-tested — watched both passing clean code _and_ rejecting a real bad example:

- **Types** — strict TypeScript, no `any`, everything typed
- **Clean code** — modern patterns, no over-complexity or copy-paste, no dead code, spell-checked
- **Architecture** — the layers stay separate (your core logic can't reach into the plumbing)
- **Tests** — must pass, must cover the code, and **must actually catch bugs** (mutation testing checks the tests themselves)
- **Security** — scans for leaked secrets, known-vulnerable dependencies, and risky licenses
- **The merge gate** — nothing reaches the main branch without passing every check. Not with `--no-verify`, not with an admin override. No exceptions.

### The checks turn themselves on

The moment your project _becomes_ something, the checks it needs arm automatically:

- Add React / Next / Vue → accessibility and page-weight checks become required
- Read environment variables → a validated-config check becomes required
- Make it a publishable package → release-management becomes required

You don't have to remember to add them. The build tells you — in red, with the one-line fix — the instant they're missing.

## How to use it

**1. Start a project from it:**

```bash
gh repo create my-app --template mlembke1/ts-physics-template --private --clone
cd my-app
pnpm install
```

**2. Build, and run the one command that checks everything:**

```bash
pnpm verify
```

Keep that green and you're good.

**3. Commit and open a pull request.** The checks run automatically — before each commit, before each push, and again in CI. A pull request can't merge until they all pass.

## The one rule

**Never weaken a check to make it pass.** No `any`, no disabling the linter, no lowering a threshold, no deleting a test. If a gate is in your way, fix the code — that is the entire point. (This is written into `AGENTS.md` as well, so any AI agent you drive knows it too.)

## Handy commands

| Command         | What it does                                     |
| --------------- | ------------------------------------------------ |
| `pnpm verify`   | Run every gate — the one command that matters    |
| `pnpm test`     | Tests + coverage                                 |
| `pnpm format`   | Auto-fix formatting                              |
| `pnpm mutation` | Check that your tests actually catch bugs        |
| `pnpm audit`    | Scan dependencies for known vulnerabilities      |
| `pnpm sbom`     | Generate a bill-of-materials of every dependency |

## Good to know

- **Two versions are pinned on purpose.** TypeScript and the test runner are held one major version back because the linter and mutation tools haven't caught up to the newest releases yet. The pins lift on their own once those tools are ready — don't force-upgrade them.
- **The merge gate needs a public repo or GitHub Pro** (about $4/month) on private repos. Everything else is free on any plan. On a free private repo you still get the local and CI checks — they're just skippable, so the truly unbypassable part is the paid piece.
