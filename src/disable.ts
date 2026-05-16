// src/disable.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export const defaultClaudeDir = path.join(os.homedir(), '.claude');

const skillsDir = (d: string) => path.join(d, 'skills');
const disabledDir = (d: string) => path.join(d, 'skills', '.disabled');

export function disableSkill(name: string, claudeDir = defaultClaudeDir): void {
  const disDir = disabledDir(claudeDir);
  if (fs.existsSync(path.join(disDir, `${name}.md`))) throw new Error(`Skill "${name}" is already disabled`);
  const src = path.join(skillsDir(claudeDir), `${name}.md`);
  if (!fs.existsSync(src)) throw new Error(`Skill "${name}" not found in skills directory`);
  fs.mkdirSync(disDir, { recursive: true });
  fs.renameSync(src, path.join(disDir, `${name}.md`));
}

export function enableSkill(name: string, claudeDir = defaultClaudeDir): void {
  const src = path.join(disabledDir(claudeDir), `${name}.md`);
  if (!fs.existsSync(src)) throw new Error(`Skill "${name}" is not in disabled directory`);
  fs.renameSync(src, path.join(skillsDir(claudeDir), `${name}.md`));
}

export function disableAllExcept(keepNames: string[], claudeDir = defaultClaudeDir): void {
  const dir = skillsDir(claudeDir);
  if (!fs.existsSync(dir)) return;
  const keep = new Set(keepNames);
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md') || !fs.statSync(path.join(dir, file)).isFile()) continue;
    const name = file.slice(0, -3);
    if (!keep.has(name)) disableSkill(name, claudeDir);
  }
}

export function enableAll(claudeDir = defaultClaudeDir): void {
  const dir = disabledDir(claudeDir);
  if (!fs.existsSync(dir)) return;
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue;
    enableSkill(file.slice(0, -3), claudeDir);
  }
}
