// src/disable.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { boundedDisabledDir, moveSkill } from './moves.js';

export const defaultClaudeDir = path.join(os.homedir(), '.claude');

const skillsDir = (d: string) => path.join(d, 'skills');

export function disableSkill(name: string, claudeDir = defaultClaudeDir): void {
  moveSkill(name, skillsDir(claudeDir), false, false, `Skill "${name}" not found in skills directory`);
}

export function enableSkill(name: string, claudeDir = defaultClaudeDir): void {
  moveSkill(name, skillsDir(claudeDir), false, true, `Skill "${name}" is not in disabled directory`);
}

export function disableAllExcept(keepNames: string[], claudeDir = defaultClaudeDir): void {
  const dir = skillsDir(claudeDir);
  if (!fs.existsSync(dir)) return;
  const keep = new Set(keepNames);
  const errors: string[] = [];
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md') || !fs.statSync(path.join(dir, file)).isFile()) continue;
    const name = file.slice(0, -3);
    if (!keep.has(name)) {
      try {
        disableSkill(name, claudeDir);
      } catch (err: unknown) {
        errors.push(`  ${name}: ${(err as Error).message}`);
      }
    }
  }
  if (errors.length > 0) {
    process.stderr.write(`Warning: could not disable some skills:\n${errors.join('\n')}\n`);
  }
}

export function enableAll(claudeDir = defaultClaudeDir): void {
  const dir = boundedDisabledDir(skillsDir(claudeDir));
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    enableSkill(file.slice(0, -3), claudeDir);
  }
}
