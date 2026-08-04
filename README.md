# skillswitch

[![npm version](https://img.shields.io/npm/v/skillswitch?style=flat-square&color=F3F2EE&labelColor=0B0B0D)](https://www.npmjs.com/package/skillswitch)
[![license](https://img.shields.io/badge/license-MIT-F3F2EE?style=flat-square&labelColor=0B0B0D)](LICENSE)
[![node](https://img.shields.io/node/v/skillswitch?style=flat-square&color=F3F2EE&labelColor=0B0B0D)](package.json)
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-F3F2EE?style=flat-square&labelColor=0B0B0D)](CONTRIBUTING.md)

Manage AI CLI skills across Claude Code, Gemini CLI, Codex CLI, Aider, Amp, and Factory Droid — profiles, disable/enable, catalog generation.

## Quick start

```bash
npm install -g skillswitch
skillswitch detect                 # see which CLIs are installed
skillswitch status                 # skills active vs disabled (Claude Code by default)
skillswitch disable ads            # disable all skills matching "ads"
skillswitch profile create dev     # snapshot the current enabled set
skillswitch profile use dev        # activate it later
```

Running 100+ Claude Code skills? Your context window is leaking. Claude Code injects every installed skill name into every session. With 450 skills, that's thousands of tokens burned before your first message.

`skillswitch` fixes this — and works across every major AI CLI.

## What is Skillswitch?

**Skillswitch is a command-line skill manager for AI coding CLIs** — Claude Code, Gemini CLI, Codex CLI, Aider, Amp, and Factory Droid. It disables the skills you're not using so they stop consuming your context window, and lets you snapshot enable/disable sets as named profiles you switch between per project.

### Why Skillswitch

Claude Code injects the name and description of every installed skill into every session. Install 100+ skills and you burn thousands of tokens before you type a word. Skillswitch turns skills off without deleting them (they move to a `.disabled/` folder — fully reversible), so a lean profile can run 40 skills instead of 400.

### Skillswitch vs the alternatives

- **vs. deleting skills manually** — deleting is destructive and you lose the skill. Skillswitch moves skills to `.disabled/` and restores them on `enable`. Nothing is lost.
- **vs. editing config by hand** — hand-editing `blocklist.json` or moving files works until you want a *different* set per project. Skillswitch stores profiles and switches the whole set in one command with a `--dry-run` preview.
- **vs. one-CLI tools** — most helpers target Claude Code only. Skillswitch uses the same commands across six CLIs via `--for <cli>`.

### When to use Skillswitch

- You have 50+ skills or plugins installed and your context feels bloated.
- You want different active skill sets for different projects (a "dev" profile vs a "writing" profile).
- You use more than one AI CLI and want one tool to manage them.
- You want to see, in one command, exactly how many skills are active vs disabled.

### FAQ

**Does Skillswitch delete my skills?** No. Standalone skills move to a `.disabled/` subfolder; plugin skills are turned off via Claude Code's own `blocklist.json`. Everything is reversible with `enable`.

**Does it send my data anywhere?** No telemetry, no auth, no network. It only reads and moves local files.

**Which CLIs does it support?** Claude Code, Gemini CLI, Codex CLI, Aider, Amp (Sourcegraph), and Factory Droid. Default target is Claude Code; use `--for <cli>` for the rest.

**How do profiles work?** `skillswitch profile create dev` snapshots your current enabled set. `skillswitch profile use dev` activates it. `profile diff` and `--dry-run` show what changes before it happens.

**Will it help my context window?** It removes disabled skills' names and descriptions from what the CLI injects each session. Fewer active skills = fewer tokens spent on skill listings before your first message.

## Install

```bash
npm install -g skillswitch
# or run without installing:
npx skillswitch <command>
```

## Supported CLIs

| CLI | Flag | Skill location |
|---|---|---|
| Claude Code | `--for claude` (default) | `~/.claude/skills/` + plugins |
| Gemini CLI | `--for gemini` | `~/.gemini/skills/` + `~/.agents/skills/` |
| Codex CLI | `--for codex` | `~/.agents/skills/` |
| Aider | `--for aider` | `~/.aider/skills/` (managed externally) |
| Amp (Sourcegraph) | `--for amp` | `~/.config/amp/skills/` + `~/.agents/skills/` |
| Factory Droid | `--for droid` | `~/.factory/droids/` + `~/.factory/commands/` |

## Commands

```
skillswitch detect                        # show which CLIs are installed

# Claude Code (default)
skillswitch status                        # how many skills are active vs disabled
skillswitch list                          # all skills by source
skillswitch list --disabled               # only disabled skills
skillswitch search <query>                # find skills by name or description

skillswitch disable <name>                # disable standalone skill (substring match)
skillswitch disable --plugin <id>         # disable entire plugin
skillswitch enable <name>                 # re-enable standalone skill
skillswitch enable --plugin <id>          # re-enable entire plugin

skillswitch profile create <name>         # snapshot current enabled set
skillswitch profile use <name>            # activate a profile
skillswitch profile use <name> --dry-run  # preview what would change
skillswitch profile list                  # list saved profiles
skillswitch profile show <name>           # see what's in a profile
skillswitch profile delete <name>         # remove a profile
skillswitch profile rename <old> <new>    # rename a profile
skillswitch profile copy <src> <dst>      # duplicate a profile
skillswitch profile diff <name>           # what changes on activate
skillswitch profile export <name>         # export profile to JSON
skillswitch profile import <file>         # import profile from JSON
skillswitch profile validate <name>       # detect ghost skills

skillswitch catalog                       # generate ~/.claude/SKILLS.md
skillswitch audit                         # find duplicates and stale disabled skills

# Other CLIs — use --for <cli>
skillswitch --for gemini list
skillswitch --for codex disable tdd
skillswitch --for amp search coding
skillswitch --for droid status
skillswitch --for aider list
skillswitch aider-config                  # print the read: block for ~/.aider.conf.yml
```

## Typical workflow

```bash
# See what's installed
skillswitch detect

# Start with everything enabled (your current state)
skillswitch profile create full           # save the 450-skill state

# Trim down for dev work
skillswitch disable --plugin aso-skills@aso-skills
skillswitch disable ads                   # disables all skills with "ads" in the name
skillswitch profile create dev            # save the lean set

# Switch contexts
skillswitch profile use dev               # 48 skills active
skillswitch profile use full              # back to 450

# Manage skills for other CLIs
skillswitch --for gemini list
skillswitch --for gemini disable research
skillswitch --for codex disable tdd

# Discover what you have
skillswitch catalog                       # generates ~/.claude/SKILLS.md
# Then in Claude: @~/.claude/SKILLS.md
```

## How it works

- **Standalone skills** (`~/.claude/skills/*.md`): disabled by moving to `.disabled/` subdirectory — always reversible, nothing deleted
- **Plugin skills** (`~/.claude/plugins/`): disabled by writing to Claude Code's native `blocklist.json`
- **Other CLIs**: skill files moved to `.disabled/` subdirectory inside their skills directory
- **Profiles** stored in `~/.claude/skillctl/profiles.json`

No telemetry, no auth, no network — pure local filesystem tool.

## Contributing

Contributions welcome, especially adapters for new AI CLIs. See
[CONTRIBUTING.md](CONTRIBUTING.md) for dev setup, repo layout, and how to add
a new CLI adapter. Please also read the
[Code of Conduct](CODE_OF_CONDUCT.md).

## License

MIT — see [LICENSE](LICENSE).

---

[npm](https://www.npmjs.com/package/skillswitch) · [GitHub](https://github.com/nikolas-sapa/skillswitch)
