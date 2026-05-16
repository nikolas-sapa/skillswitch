# skillctl — Design Spec

**Date:** 2026-05-16  
**Status:** Approved  
**Distribution:** npm (`skillctl`) + GitHub (MIT)

---

## Problem

Claude Code injects all installed skill names into the system-reminder on every session. With 450+ skills (239 standalone + ~210 from 28 plugins), this burns significant context before a single word of user work is processed. Users also have no way to discover what skills they have, find duplicates, or remember what each skill does.

**Root cause:** All skills are always active. There is no built-in way to selectively disable skills or switch between curated sets.

---

## Solution

A CLI tool (`skillctl`) that manages Claude Code skills via the filesystem and Claude Code's native `blocklist.json` mechanism. Three capabilities:

1. **Profiles** — named curated sets of active skills. Switching profiles disables everything outside the set, cutting context burn from 450 names to ~40.
2. **Disable/Enable** — individual skill or whole-plugin control, non-destructively.
3. **Catalog** — generates a compressed `~/.claude/SKILLS.md` reference, `@`-importable into any Claude session for in-session discovery.

---

## Architecture

### Directory Layout

```
~/.claude/
├── skills/
│   ├── *.md               ← active standalone skills (239 files)
│   └── .disabled/         ← quarantined by skillctl (created on first use)
├── plugins/
│   ├── blocklist.json     ← native Claude Code plugin-level disable list
│   └── installed_plugins.json
├── skillctl/
│   └── profiles.json      ← skillctl state (active profile + saved profiles)
└── SKILLS.md              ← generated catalog, @ importable
```

### Source Code Layout

```
skillctl/
├── src/
│   ├── cli.ts             ← commander entry point, command registration
│   ├── scanner.ts         ← discovers all skills from both sources
│   ├── catalog.ts         ← generates ~/.claude/SKILLS.md
│   ├── profiles.ts        ← profile CRUD and apply logic
│   ├── blocklist.ts       ← read/write ~/.claude/plugins/blocklist.json
│   ├── disable.ts         ← standalone skill enable/disable (file moves)
│   └── types.ts           ← shared TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

### Tech Stack

- **Language:** TypeScript
- **CLI framework:** commander.js
- **Runtime deps:** none (pure Node.js `fs` + `path`)
- **Dev deps:** typescript, @types/node, tsx (for dev), tsup (for build)
- **Node requirement:** 18+
- **Distribution:** compiled to `dist/cli.js`, published to npm with `bin: { skillctl: "./dist/cli.js" }`

---

## Disable Mechanisms

### Standalone Skills (`~/.claude/skills/*.md`)

Move file to `~/.claude/skills/.disabled/<name>.md` to disable.  
Move back to `~/.claude/skills/<name>.md` to re-enable.  
Non-destructive — no content is modified or deleted.

### Plugin Skills (`~/.claude/plugins/`)

Write to `blocklist.json` using the native Claude Code format:

```json
{
  "fetchedAt": "<timestamp>",
  "plugins": [
    {
      "plugin": "aso-skills@aso-skills",
      "added_at": "<iso-timestamp>",
      "reason": "skillctl: disabled by profile 'dev'"
    }
  ]
}
```

**Constraint:** `blocklist.json` disables at plugin level only (all skills in the plugin). Individual plugin skills cannot be selectively disabled — this is a Claude Code limitation. Profiles account for this by treating a plugin as an atomic unit.

---

## CLI Interface

```
skillctl list                        # all skills grouped by source, with status
skillctl list --disabled             # show only disabled skills

skillctl search <query>              # fuzzy search name + description

skillctl disable <name>              # disable standalone skill (partial name OK)
skillctl disable --plugin <name>     # disable entire plugin
skillctl enable <name>               # re-enable standalone skill
skillctl enable --plugin <name>      # re-enable entire plugin

skillctl profile create <name>       # snapshot current enabled set
skillctl profile use <name>          # activate profile
skillctl profile list                # show all profiles with skill counts
skillctl profile show <name>         # list skills in a profile
skillctl profile delete <name>       # remove a saved profile

skillctl catalog                     # generate ~/.claude/SKILLS.md
skillctl audit                       # report duplicates, orphaned files, conflicts

skillctl status                      # active profile, enabled/disabled counts
```

### UX Rules

- Partial name matching (`disable ads`) uses substring match (predictable, no fuzzy false-positives) against all skills with "ads" in the name; requires a confirmation prompt before bulk-acting
- `--dry-run` flag available on all mutating commands
- `profile use` prints a summary line: `"Activated 'dev': 48 enabled, 402 disabled"`
- All output uses no color by default; `--color` flag enables it (CI-safe)

---

## Profile Data Format

Stored at `~/.claude/skillctl/profiles.json`:

```json
{
  "active": "dev",
  "profiles": {
    "dev": {
      "created": "2026-05-16T00:00:00.000Z",
      "skills": ["plan", "ship", "code-review", "tdd", "..."],
      "plugins": ["superpowers@claude-plugins-official", "vercel@claude-plugins-official"]
    },
    "marketing": {
      "created": "2026-05-16T00:00:00.000Z",
      "skills": ["ads", "ads-meta", "copywriting", "..."],
      "plugins": ["claude-ads@agricidaniel-claude-ads", "..."]
    }
  }
}
```

`profile use <name>` applies a three-step diff:
1. Move all standalone skills not in profile to `.disabled/`
2. Move all profile-listed standalone skills back from `.disabled/`
3. Rewrite `blocklist.json` to block plugins not in profile

---

## Catalog Format

`~/.claude/SKILLS.md` — generated by `skillctl catalog`:

```markdown
# Skills Catalog
Generated: 2026-05-16 | Active: 48 | Disabled: 402 | Profiles: dev, marketing

## Standalone — active (48)
| Skill | Description |
|-------|-------------|
| plan | Design implementation plans before touching code |
| ship | Pre-ship checklist: tests, types, lint, deploy |

## Standalone — disabled (191)
| Skill | Description |
|-------|-------------|
| ads | Paid advertising strategy and copy |

## Plugins — active
### vercel (18 skills)
| Skill | Description |
|-------|-------------|
| vercel:deploy | Deploy to Vercel, manage builds and domains |

## Plugins — disabled
### aso-skills (30 skills) — plugin blocked
### claude-ads (20 skills) — plugin blocked
```

Description is extracted from the first non-empty, non-heading line of each skill's `.md` file, skipping any YAML frontmatter blocks (`---`).  
Import in any Claude session with `@~/.claude/SKILLS.md`.

---

## Audit Command

`skillctl audit` reports:

- **Duplicates:** skills with near-identical names across standalone + plugins (e.g., `ads` vs `claude-ads:ads`)
- **Orphaned plugin cache:** plugin directories in `cache/` with no matching entry in `installed_plugins.json`
- **Stale disabled:** standalone skills that have been in `.disabled/` for 30+ days with no profile referencing them

---

## Open Source

- **GitHub:** `nikolassapalidis/skillctl` — MIT license
- **npm:** `skillctl` — zero-install via `npx skillctl`
- **README headline:** "Running 100+ Claude Code skills? Your context window is leaking."
- **Target user:** Any Claude Code power user with plugin bloat
- **No telemetry, no auth, no network** — pure local filesystem tool
