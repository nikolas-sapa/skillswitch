// src/adapters/gemini.ts — Gemini CLI adapter
// Skills: ~/.gemini/skills/<name>/SKILL.md  AND  ~/.agents/skills/<name>/SKILL.md
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CliAdapter, AdapterSkill } from './types.js';
import { scanDirSkills, disableDirSkill, enableDirSkill, findSkillDir } from './helpers.js';

const HOME = os.homedir();

export class GeminiAdapter implements CliAdapter {
  readonly cliName = 'gemini';
  readonly displayName = 'Gemini CLI';
  readonly skillsDirs = [
    path.join(HOME, '.gemini', 'skills'),
    path.join(HOME, '.agents', 'skills'),
  ];

  isInstalled(): boolean {
    return fs.existsSync(path.join(HOME, '.gemini'));
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
    if (!dir) throw new Error(`Skill "${name}" not found in Gemini skills directories`);
    disableDirSkill(name, dir);
  }

  enableSkill(name: string): void {
    const dir = findSkillDir(name, this.skillsDirs, true);
    if (!dir) throw new Error(`Skill "${name}" not found in Gemini skills directories`);
    enableDirSkill(name, dir);
  }
}
