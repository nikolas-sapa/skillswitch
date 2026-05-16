# skillctl

Manage Claude Code skills — profiles, disable/enable, and catalog generation.

Running 100+ Claude Code skills? Your context window is leaking. Claude Code injects every installed skill name into every session. With 450 skills, that's thousands of tokens burned before your first message.

`skillctl` fixes this.

## Install

```bash
npm install -g skillctl
# or run without installing:
npx skillctl <command>
```

## Commands

```
skillctl status                        # how many skills are active vs disabled
skillctl list                          # all skills by source
skillctl list --disabled               # only disabled skills
skillctl search <query>                # find skills by name or description

skillctl disable <name>                # disable standalone skill (substring match)
skillctl disable --plugin <id>         # disable entire plugin (e.g. aso-skills@aso-skills)
skillctl enable <name>                 # re-enable standalone skill
skillctl enable --plugin <id>          # re-enable entire plugin

skillctl profile create <name>         # snapshot current enabled set
skillctl profile use <name>            # activate a profile
skillctl profile use <name> --dry-run  # preview what would change
skillctl profile list                  # list saved profiles
skillctl profile show <name>           # see what's in a profile
skillctl profile delete <name>         # remove a profile

skillctl catalog                       # generate ~/.claude/SKILLS.md
skillctl audit                         # find duplicates and stale disabled skills
```

## Typical workflow

```bash
# Start with everything enabled (your current state)
skillctl profile create full           # save the 450-skill state

# Trim down for dev work
skillctl disable --plugin aso-skills@aso-skills
skillctl disable --plugin claude-ads@agricidaniel-claude-ads
skillctl disable ads                   # disables all skills with "ads" in the name
skillctl profile create dev            # save the lean set

# Switch contexts
skillctl profile use dev               # 48 skills active
skillctl profile use full              # back to 450

# Discover what you have
skillctl catalog                       # generates ~/.claude/SKILLS.md
# Then in Claude: @~/.claude/SKILLS.md
```

## How it works

- **Standalone skills** (`~/.claude/skills/*.md`): disabled by moving to `.disabled/` subdirectory — always reversible, nothing deleted
- **Plugin skills** (`~/.claude/plugins/`): disabled by writing to Claude Code's native `blocklist.json` — works at plugin level
- **Profiles** stored in `~/.claude/skillctl/profiles.json`

No telemetry, no auth, no network — pure local filesystem tool.

## License

MIT
