// src/adapters/amp.ts — Amp (Sourcegraph) adapter
// Skills: ~/.config/amp/skills/<name>/SKILL.md
// Compat:  ~/.agents/skills/<name>/SKILL.md  (Amp reads both)
// Note:    Amp also reads ~/.claude/skills/ natively — Claude skills work in Amp without management
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CliAdapter, AdapterSkill } from './types.js';
import { scanDirSkills, disableDirSkill, enableDirSkill, findSkillDir } from './helpers.js';

const HOME = os.homedir();

export class AmpAdapter implements CliAdapter {
  readonly cliName = 'amp';
  readonly displayName = 'Amp (Sourcegraph)';
  readonly skillsDirs = [
    path.join(HOME, '.config', 'amp', 'skills'),
    path.join(HOME, '.agents', 'skills'),
  ];

  isInstalled(): boolean {
    return fs.existsSync(path.join(HOME, '.config', 'amp'));
  }

  scanSkills(): AdapterSkill[] {
    const seen = new Set<string>();
    const skills: AdapterSkill[] = [];
    for (const [i, dir] of this.skillsDirs.entries()) {
      const group = i === 0 ? undefined : 'shared';
      for (const s of scanDirSkills(dir, group)) {
        if (!seen.has(s.name)) { seen.add(s.name); skills.push(s); }
      }
    }
    return skills;
  }

  disableSkill(name: string): void {
    const dir = findSkillDir(name, this.skillsDirs, true);
    if (!dir) throw new Error(`Skill "${name}" not found in Amp skills directories`);
    disableDirSkill(name, dir);
  }

  enableSkill(name: string): void {
    const dir = findSkillDir(name, this.skillsDirs, true);
    if (!dir) throw new Error(`Skill "${name}" not found in Amp skills directories`);
    enableDirSkill(name, dir);
  }
}
