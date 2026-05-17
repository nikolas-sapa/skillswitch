// src/adapters/claude.ts — Claude Code adapter
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { CliAdapter, AdapterSkill } from './types.js';
import { scanStandaloneSkills } from '../scanner.js';
import { disableSkill, enableSkill } from '../disable.js';

export class ClaudeAdapter implements CliAdapter {
  readonly cliName = 'claude';
  readonly displayName = 'Claude Code';
  readonly skillsDirs: string[];

  constructor(private readonly claudeDir = path.join(os.homedir(), '.claude')) {
    this.skillsDirs = [path.join(claudeDir, 'skills')];
  }

  isInstalled(): boolean {
    return fs.existsSync(this.claudeDir);
  }

  scanSkills(): AdapterSkill[] {
    return scanStandaloneSkills(this.claudeDir).map(s => ({
      name: s.name,
      status: s.status,
      description: s.description,
    }));
  }

  disableSkill(name: string): void {
    disableSkill(name, this.claudeDir);
  }

  enableSkill(name: string): void {
    enableSkill(name, this.claudeDir);
  }
}
