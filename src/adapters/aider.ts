// src/adapters/aider.ts — Aider adapter
// Aider has no native skill system. skillswitch manages ~/.aider/skills/*.md
// Active skills must be manually added to ~/.aider.conf.yml under `read:`.
// Run `skillswitch aider-config` to see what to add.
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CliAdapter, AdapterSkill } from './types.js';
import { scanFlatSkills, disableFlatSkill, enableFlatSkill } from './helpers.js';

const HOME = os.homedir();
export const AIDER_SKILLS_DIR = path.join(HOME, '.aider', 'skills');
const AIDER_CONF = path.join(HOME, '.aider.conf.yml');

export class AiderAdapter implements CliAdapter {
  readonly cliName = 'aider';
  readonly displayName = 'Aider';
  readonly skillsDirs = [AIDER_SKILLS_DIR];

  isInstalled(): boolean {
    return fs.existsSync(AIDER_CONF) || fs.existsSync(path.join(HOME, '.aider'));
  }

  scanSkills(): AdapterSkill[] {
    return scanFlatSkills(AIDER_SKILLS_DIR);
  }

  disableSkill(name: string): void {
    disableFlatSkill(name, AIDER_SKILLS_DIR);
  }

  enableSkill(name: string): void {
    enableFlatSkill(name, AIDER_SKILLS_DIR);
  }

  /** Returns the `read:` block to paste into ~/.aider.conf.yml */
  generateAiderConfig(): string {
    const active = this.scanSkills().filter(s => s.status === 'active');
    if (!active.length) return '# No active aider skills\n';
    return `read:\n${active.map(s => `  - ${path.join(AIDER_SKILLS_DIR, s.name + '.md')}`).join('\n')}\n`;
  }
}
