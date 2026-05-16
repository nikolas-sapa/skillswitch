// src/scanner.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import type { StandaloneSkill, PluginSkill, PluginEntry, SkillStatus, BlocklistFile } from './types.js';

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

export function scanPlugins(claudeDir = defaultClaudeDir): PluginEntry[] {
  const pluginsDir = path.join(claudeDir, 'plugins');
  const installedFile = path.join(pluginsDir, 'installed_plugins.json');
  if (!fs.existsSync(installedFile)) return [];

  const raw = JSON.parse(fs.readFileSync(installedFile, 'utf-8'));
  const pluginMap: Record<string, unknown> = raw.plugins ?? {};

  const blockedSet = new Set<string>();
  const blocklistFile = path.join(pluginsDir, 'blocklist.json');
  if (fs.existsSync(blocklistFile)) {
    const bl: BlocklistFile = JSON.parse(fs.readFileSync(blocklistFile, 'utf-8'));
    for (const entry of bl.plugins ?? []) blockedSet.add(entry.plugin);
  }

  return Object.keys(pluginMap).map(pluginId => {
    const atIdx = pluginId.indexOf('@');
    const name = atIdx >= 0 ? pluginId.slice(0, atIdx) : pluginId;
    const sourceMarket = atIdx >= 0 ? pluginId.slice(atIdx + 1) : '';
    const status: SkillStatus = blockedSet.has(pluginId) ? 'disabled' : 'active';

    const cacheBase = path.join(pluginsDir, 'cache', sourceMarket, name);
    const pluginSkills: PluginSkill[] = [];

    if (fs.existsSync(cacheBase)) {
      const versions = fs.readdirSync(cacheBase)
        .filter(d => fs.statSync(path.join(cacheBase, d)).isDirectory())
        .sort();
      if (versions.length > 0) {
        const skillsDir = path.join(cacheBase, versions[versions.length - 1], 'skills');
        if (fs.existsSync(skillsDir)) collectPluginSkills(skillsDir, name, pluginId, status, pluginSkills);
      }
    }

    return { id: pluginId, name, sourceMarket, skills: pluginSkills, status };
  });
}

function collectPluginSkills(dir: string, pluginName: string, pluginId: string, status: SkillStatus, out: PluginSkill[]) {
  for (const entry of fs.readdirSync(dir)) {
    const entryPath = path.join(dir, entry);
    if (fs.statSync(entryPath).isDirectory()) {
      for (const sub of fs.readdirSync(entryPath)) {
        if (!sub.endsWith('.md')) continue;
        const content = fs.readFileSync(path.join(entryPath, sub), 'utf-8');
        out.push({ source: 'plugin', name: `${entry}:${sub.slice(0, -3)}`, plugin: pluginId, status, description: extractDescription(content) });
      }
    } else if (entry.endsWith('.md')) {
      const content = fs.readFileSync(entryPath, 'utf-8');
      out.push({ source: 'plugin', name: `${pluginName}:${entry.slice(0, -3)}`, plugin: pluginId, status, description: extractDescription(content) });
    }
  }
}
