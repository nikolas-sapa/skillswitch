// src/adapters/helpers.ts — shared file operations for all adapters
import * as fs from 'fs';
import * as path from 'path';
import type { AdapterSkill } from './types.js';

function parseFrontmatterField(frontmatter: string, field: string): string {
  return frontmatter.match(new RegExp(`^${field}:\\s*(.+)$`, 'm'))?.[1]?.trim() ?? '';
}

export function parseSkillMd(content: string): { name: string; description: string } {
  const m = content.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return { name: '', description: '' };
  return { name: parseFrontmatterField(m[1], 'name'), description: parseFrontmatterField(m[1], 'description') };
}

export function extractFirstLine(content: string): string {
  let inFm = false, fmClosed = false;
  for (const line of content.split('\n')) {
    if (!fmClosed && line.trim() === '---') { inFm = !inFm; if (!inFm) fmClosed = true; continue; }
    if (inFm || !line.trim() || line.startsWith('#')) continue;
    return line.trim();
  }
  return '';
}

function readDesc(filePath: string): string {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return parseSkillMd(content).description || extractFirstLine(content);
  } catch { return ''; }
}

// ── Flat-file skills (e.g. Claude, Factory): one .md file per skill ──────────

export function scanFlatSkills(dir: string, group?: string): AdapterSkill[] {
  const skills: AdapterSkill[] = [];
  const disabledDir = path.join(dir, '.disabled');
  for (const [d, status] of [[dir, 'active' as const], [disabledDir, 'disabled' as const]]) {
    if (!fs.existsSync(d)) continue;
    for (const file of fs.readdirSync(d)) {
      if (!file.endsWith('.md')) continue;
      const fp = path.join(d, file);
      if (!fs.statSync(fp).isFile()) continue;
      skills.push({ name: file.slice(0, -3), status, description: readDesc(fp), ...(group ? { group } : {}) });
    }
  }
  return skills;
}

export function disableFlatSkill(name: string, dir: string): void {
  const src = path.join(dir, `${name}.md`);
  if (!fs.existsSync(src)) throw new Error(`Skill "${name}" not found in ${dir}`);
  const disDir = path.join(dir, '.disabled');
  fs.mkdirSync(disDir, { recursive: true });
  fs.renameSync(src, path.join(disDir, `${name}.md`));
}

export function enableFlatSkill(name: string, dir: string): void {
  const src = path.join(dir, '.disabled', `${name}.md`);
  if (!fs.existsSync(src)) throw new Error(`Skill "${name}" is not disabled`);
  fs.mkdirSync(dir, { recursive: true });
  fs.renameSync(src, path.join(dir, `${name}.md`));
}

// ── Directory-based skills (e.g. Gemini, Codex, Amp): <name>/SKILL.md ────────

export function scanDirSkills(dir: string, group?: string): AdapterSkill[] {
  const skills: AdapterSkill[] = [];
  const disabledDir = path.join(dir, '.disabled');
  for (const [d, status] of [[dir, 'active' as const], [disabledDir, 'disabled' as const]]) {
    if (!fs.existsSync(d)) continue;
    for (const entry of fs.readdirSync(d)) {
      if (entry === '.disabled') continue;
      const ep = path.join(d, entry);
      if (!fs.statSync(ep).isDirectory()) continue;
      const skillMd = path.join(ep, 'SKILL.md');
      let description = '';
      if (fs.existsSync(skillMd)) {
        const content = fs.readFileSync(skillMd, 'utf-8');
        description = parseSkillMd(content).description || extractFirstLine(content);
      }
      skills.push({ name: entry, status, description, ...(group ? { group } : {}) });
    }
  }
  return skills;
}

export function disableDirSkill(name: string, dir: string): void {
  const src = path.join(dir, name);
  if (!fs.existsSync(src) || !fs.statSync(src).isDirectory()) throw new Error(`Skill "${name}" not found in ${dir}`);
  const disDir = path.join(dir, '.disabled');
  fs.mkdirSync(disDir, { recursive: true });
  fs.renameSync(src, path.join(disDir, name));
}

export function enableDirSkill(name: string, dir: string): void {
  const src = path.join(dir, '.disabled', name);
  if (!fs.existsSync(src)) throw new Error(`Skill "${name}" is not disabled`);
  fs.mkdirSync(dir, { recursive: true });
  fs.renameSync(src, path.join(dir, name));
}

// ── Find which dir a skill lives in (for multi-dir adapters) ──────────────────

export function findSkillDir(name: string, dirs: string[], dirBased: boolean): string | null {
  for (const dir of dirs) {
    const target = dirBased ? path.join(dir, name) : path.join(dir, `${name}.md`);
    const disTarget = dirBased ? path.join(dir, '.disabled', name) : path.join(dir, '.disabled', `${name}.md`);
    if (fs.existsSync(target) || fs.existsSync(disTarget)) return dir;
  }
  return null;
}
