// src/adapters/codex.ts — OpenAI Codex CLI adapter
// Skills: ~/.agents/skills/<name>/SKILL.md  (canonical shared path)
// Also: ~/.codex/ but no skills subdir there — instructions live in AGENTS.md
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CliAdapter, AdapterSkill } from './types.js';
import { scanDirSkills, disableDirSkill, enableDirSkill, findSkillDir } from './helpers.js';

const HOME = os.homedir();

export class CodexAdapter implements CliAdapter {
  readonly cliName = 'codex';
  readonly displayName = 'Codex CLI (OpenAI)';
  readonly skillsDirs = [
    path.join(HOME, '.agents', 'skills'),
  ];

  isInstalled(): boolean {
    return fs.existsSync(path.join(HOME, '.codex'));
  }

  scanSkills(): AdapterSkill[] {
    return scanDirSkills(this.skillsDirs[0]);
  }

  disableSkill(name: string): void {
    const dir = findSkillDir(name, this.skillsDirs, true);
    if (!dir) throw new Error(`Skill "${name}" not found in Codex skills directory (${this.skillsDirs[0]})`);
    disableDirSkill(name, dir);
  }

  enableSkill(name: string): void {
    const dir = findSkillDir(name, this.skillsDirs, true);
    if (!dir) throw new Error(`Skill "${name}" not found in Codex skills directory`);
    enableDirSkill(name, dir);
  }
}
