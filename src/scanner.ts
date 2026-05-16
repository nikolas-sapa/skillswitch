// src/scanner.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { StandaloneSkill, SkillStatus } from './types.js';

export const defaultClaudeDir = path.join(os.homedir(), '.claude');

export function extractDescription(content: string): string {
  const lines = content.split('\n');
  let inFrontmatter = false;
  let frontmatterClosed = false;

  for (const line of lines) {
    if (!frontmatterClosed && line.trim() === '---') {
      inFrontmatter = !inFrontmatter;
      if (!inFrontmatter) frontmatterClosed = true;
      continue;
    }
    if (inFrontmatter) continue;
    if (!line.trim() || line.startsWith('#')) continue;
    return line.trim();
  }
  return '';
}

export function scanStandaloneSkills(claudeDir = defaultClaudeDir): StandaloneSkill[] {
  const skillsDir = path.join(claudeDir, 'skills');
  const disabledDir = path.join(skillsDir, '.disabled');
  const skills: StandaloneSkill[] = [];

  function readDir(dir: string, status: SkillStatus) {
    if (!fs.existsSync(dir)) return;
    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.md')) continue;
      const filePath = path.join(dir, file);
      if (!fs.statSync(filePath).isFile()) continue;
      const name = file.slice(0, -3);
      const content = fs.readFileSync(filePath, 'utf-8');
      skills.push({ source: 'standalone', name, path: filePath, status, description: extractDescription(content) });
    }
  }

  readDir(skillsDir, 'active');
  readDir(disabledDir, 'disabled');
  return skills;
}
