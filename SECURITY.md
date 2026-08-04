# Security Policy

## Reporting a Vulnerability

Report security issues privately to **niksapa150@gmail.com**. Do not open a
public GitHub issue for a suspected vulnerability.

Include:

- A description of the issue and its impact
- Steps to reproduce (CLI target, command, and skill directory layout if relevant)
- Affected version (`skillswitch --version` or the `package.json` version)

Expect an initial response within a few days. Once a fix is confirmed, a
patch release will be published and the reporter credited unless anonymity is
requested.

## Supported Versions

skillswitch is pre-1.0. Only the latest published version on npm receives
security fixes.

| Version | Supported |
|---|---|
| latest (0.x) | yes |
| older 0.x releases | no |

## Scope and posture

skillswitch is a local-only command-line tool: it reads and moves files in
your AI CLI skill directories (e.g. `~/.claude/skills/`) and writes profile
data to `~/.claude/skillctl/profiles.json`. It makes no network requests,
collects no telemetry, and requires no authentication or credentials.

Given that posture, the most relevant risks are local ones: path handling
around skill names/directories, and any code that reads or writes files
outside the intended skill/profile directories. Reports in that area are
especially welcome.
