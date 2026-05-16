// src/catalog.ts
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { scanStandaloneSkills, scanPlugins } from './scanner.js';

export const defaultClaudeDir = path.join(os.homedir(), '.claude');

export function generateCatalog(claudeDir = defaultClaudeDir): string {
  const standalone = scanStandaloneSkills(claudeDir);
  const plugins = scanPlugins(claudeDir);

  const activeStandalone = standalone.filter(s => s.status === 'active');
  const disabledStandalone = standalone.filter(s => s.status === 'disabled');
  const activePlugins = plugins.filter(p => p.status === 'active');
  const disabledPlugins = plugins.filter(p => p.status === 'disabled');

  const totalActive = activeStandalone.length + activePlugins.reduce((n, p) => n + p.skills.length, 0);
  const totalDisabled = disabledStandalone.length + disabledPlugins.reduce((n, p) => n + p.skills.length, 0);

  const rows = (skills: Array<{ name: string; description: string }>) =>
    skills.map(s => `| ${s.name} | ${s.description || '—'} |`).join('\n');

  const sections: string[] = [
    `# Skills Catalog`,
    `Generated: ${new Date().toISOString().slice(0, 10)} | Active: ${totalActive} | Disabled: ${totalDisabled}`,
    '',
  ];

  if (activeStandalone.length > 0) {
    sections.push(`## Standalone — active (${activeStandalone.length})`, '| Skill | Description |', '|-------|-------------|', rows(activeStandalone), '');
  }
  if (disabledStandalone.length > 0) {
    sections.push(`## Standalone — disabled (${disabledStandalone.length})`, '| Skill | Description |', '|-------|-------------|', rows(disabledStandalone), '');
  }
  for (const p of activePlugins) {
    sections.push(`## Plugin: ${p.name} — active (${p.skills.length})`, '| Skill | Description |', '|-------|-------------|', rows(p.skills), '');
  }
  for (const p of disabledPlugins) {
    sections.push(`## Plugin: ${p.name} — DISABLED (${p.skills.length})`, '| Skill | Description |', '|-------|-------------|', rows(p.skills), '');
  }

  const content = sections.join('\n');
  fs.writeFileSync(path.join(claudeDir, 'SKILLS.md'), content);
  return content;
}
