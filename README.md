# skillswitch

Manage Claude Code skills — profiles, disable/enable, and catalog generation.

Running 100+ Claude Code skills? Your context window is leaking. Claude Code injects every installed skill name into every session. With 450 skills, that's thousands of tokens burned before your first message.

`skillswitch` fixes this.

## Install

```bash
npm install -g skillswitch
# or run without installing:
npx skillswitch <command>
```

## Commands

```
skillswitch status                        # how many skills are active vs disabled
skillswitch list                          # all skills by source
skillswitch list --disabled               # only disabled skills
skillswitch search <query>                # find skills by name or description

skillswitch disable <name>                # disable standalone skill (substring match)
skillswitch disable --plugin <id>         # disable entire plugin (e.g. aso-skills@aso-skills)
skillswitch enable <name>                 # re-enable standalone skill
skillswitch enable --plugin <id>          # re-enable entire plugin

skillswitch profile create <name>         # snapshot current enabled set
skillswitch profile use <name>            # activate a profile
skillswitch profile use <name> --dry-run  # preview what would change
skillswitch profile list                  # list saved profiles
skillswitch profile show <name>           # see what's in a profile
skillswitch profile delete <name>         # remove a profile

skillswitch catalog                       # generate ~/.claude/SKILLS.md
skillswitch audit                         # find duplicates and stale disabled skills
```

## Typical workflow

```bash
# Start with everything enabled (your current state)
skillswitch profile create full           # save the 450-skill state

# Trim down for dev work
skillswitch disable --plugin aso-skills@aso-skills
skillswitch disable --plugin claude-ads@agricidaniel-claude-ads
skillswitch disable ads                   # disables all skills with "ads" in the name
skillswitch profile create dev            # save the lean set

# Switch contexts
skillswitch profile use dev               # 48 skills active
skillswitch profile use full              # back to 450

# Discover what you have
skillswitch catalog                       # generates ~/.claude/SKILLS.md
# Then in Claude: @~/.claude/SKILLS.md
```

## How it works

- **Standalone skills** (`~/.claude/skills/*.md`): disabled by moving to `.disabled/` subdirectory — always reversible, nothing deleted
- **Plugin skills** (`~/.claude/plugins/`): disabled by writing to Claude Code's native `blocklist.json` — works at plugin level
- **Profiles** stored in `~/.claude/skillctl/profiles.json`

No telemetry, no auth, no network — pure local filesystem tool.

## License

MIT
