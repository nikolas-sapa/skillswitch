# Contributing to skillswitch

## Dev setup

```bash
git clone https://github.com/nikolas-sapa/skillswitch.git
cd skillswitch
npm install
npm run dev -- status        # run the CLI from source (tsx, no build)
npm run build                # bundle to dist/ via tsup
npm test                     # run the vitest suite
npm run test:watch           # watch mode
```

Requires Node >= 18.

## Repo layout

```
src/
  cli.ts            # commander entrypoint, command wiring
  adapters/          # one file per supported CLI
    types.ts         # CliAdapter interface all adapters implement
    helpers.ts        # shared dir-scanning / enable-disable helpers
    claude.ts, gemini.ts, codex.ts, aider.ts, amp.ts, factory.ts
    index.ts          # adapter registry (getAdapter, getAllAdapters)
  scanner.ts          # skill discovery
  disable.ts           # enable/disable logic
  profiles.ts          # profile snapshot/switch/diff
  catalog.ts            # SKILLS.md generation
  blocklist.ts           # Claude Code plugin blocklist.json handling
tests/                    # vitest, one file per src module
```

## Adding support for a new AI CLI

This is the most common contribution. Steps:

1. Create `src/adapters/<cli>.ts` implementing the `CliAdapter` interface from `src/adapters/types.ts`:
   - `cliName`, `displayName`, `skillsDirs`
   - `isInstalled()` — detect the CLI (e.g. check for its config dir)
   - `scanSkills()` — return `AdapterSkill[]`
   - `disableSkill(name)` / `enableSkill(name)`
2. Reuse `scanDirSkills`, `disableDirSkill`, `enableDirSkill`, `findSkillDir` from `src/adapters/helpers.ts` if the CLI stores skills as one directory per skill (most do) — see `src/adapters/codex.ts` for the minimal example.
3. Register the adapter in `src/adapters/index.ts` (`ADAPTERS` map).
4. Add `tests/<cli>.test.ts` covering scan, disable, enable, and `isInstalled` against a temp directory.
5. Add the CLI to the "Supported CLIs" table in `README.md`.

Look at `src/adapters/claude.ts` if the target CLI has a plugin/blocklist system in addition to standalone skill files; otherwise `codex.ts` or `gemini.ts` are simpler templates.

## PR expectations

- `npm test` and `npm run build` pass.
- One logical change per PR; keep unrelated formatting out of the diff.
- New adapters or commands include tests.
- No new dependencies without discussion first — this is a local-only, no-telemetry tool by design.
- Update `README.md` when behavior or commands change.

## Reporting bugs / requesting features

Use the GitHub issue templates. Security issues go to niksapa150@gmail.com instead (see `SECURITY.md`), not a public issue.
