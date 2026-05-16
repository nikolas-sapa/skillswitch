#!/usr/bin/env node
// src/cli.ts
import { Command } from 'commander';
import * as readline from 'readline';
import { scanStandaloneSkills, scanPlugins } from './scanner.js';
import { disableSkill, enableSkill } from './disable.js';
import { blockPlugin, unblockPlugin } from './blocklist.js';
import { readProfileStore, saveProfile, deleteProfile, activateProfile } from './profiles.js';
import { generateCatalog } from './catalog.js';

const program = new Command();
program.name('skillswitch').description('Manage Claude Code skills').version('0.1.0');

function confirm(prompt: string): Promise<boolean> {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(prompt, a => { rl.close(); resolve(a.toLowerCase() === 'y'); });
  });
}

// list
program
  .command('list')
  .description('Show all skills grouped by source')
  .option('--disabled', 'Show only disabled skills')
  .action((opts) => {
    const standalone = scanStandaloneSkills();
    const plugins = scanPlugins();
    const ss = opts.disabled ? standalone.filter(s => s.status === 'disabled') : standalone;
    console.log(`\nStandalone (${standalone.length} total):`);
    for (const s of ss) console.log(`  ${s.name}${s.status === 'disabled' ? ' [disabled]' : ''}`);
    const pp = opts.disabled ? plugins.filter(p => p.status === 'disabled') : plugins;
    for (const p of pp) console.log(`\n${p.id}${p.status === 'disabled' ? ' [DISABLED]' : ''} (${p.skills.length} skills)`);
  });

// search
program
  .command('search <query>')
  .description('Search skills by name or description (substring match)')
  .action((query) => {
    const q = query.toLowerCase();
    const standalone = scanStandaloneSkills();
    const plugins = scanPlugins();
    const matches = [
      ...standalone.filter(s => s.name.includes(q) || s.description.toLowerCase().includes(q)),
      ...plugins.flatMap(p => p.skills).filter(s => s.name.includes(q) || s.description.toLowerCase().includes(q)),
    ];
    if (!matches.length) { console.log(`No skills matching "${query}".`); return; }
    console.log(`\n${matches.length} match(es) for "${query}":\n`);
    for (const s of matches) {
      console.log(`  ${s.name} [${s.status}]`);
      if (s.description) console.log(`    ${s.description}`);
    }
  });

// status
program
  .command('status')
  .description('Show active profile and skill counts')
  .action(() => {
    const store = readProfileStore();
    const standalone = scanStandaloneSkills();
    const plugins = scanPlugins();
    const active = standalone.filter(s => s.status === 'active').length
      + plugins.filter(p => p.status === 'active').reduce((n, p) => n + p.skills.length, 0);
    const disabled = standalone.filter(s => s.status === 'disabled').length
      + plugins.filter(p => p.status === 'disabled').reduce((n, p) => n + p.skills.length, 0);
    console.log(`Active profile : ${store.active ?? 'none'}`);
    console.log(`Enabled skills : ${active}`);
    console.log(`Disabled skills: ${disabled}`);
    console.log(`Total          : ${active + disabled}`);
  });

// disable
program
  .command('disable <name>')
  .description('Disable a skill (substring match) or a plugin (--plugin)')
  .option('--plugin', 'Treat <name> as a full plugin ID (name@source)')
  .option('--dry-run', 'Preview without making changes')
  .action(async (name, opts) => {
    if (opts.plugin) {
      if (opts.dryRun) { console.log(`[dry-run] Would block plugin: ${name}`); return; }
      await blockPlugin(name, 'skillswitch: manually disabled');
      console.log(`Plugin blocked: ${name}`); return;
    }
    const matches = scanStandaloneSkills().filter(s => s.name.includes(name) && s.status === 'active');
    if (!matches.length) { console.log(`No active skills matching "${name}".`); return; }
    if (matches.length > 1) {
      console.log(`Matches: ${matches.map(s => s.name).join(', ')}`);
      if (!await confirm(`Disable all ${matches.length}? (y/N) `)) { console.log('Aborted.'); return; }
    }
    for (const s of matches) {
      if (opts.dryRun) console.log(`[dry-run] Would disable: ${s.name}`);
      else { disableSkill(s.name); console.log(`Disabled: ${s.name}`); }
    }
  });

// enable
program
  .command('enable <name>')
  .description('Enable a skill (substring match) or a plugin (--plugin)')
  .option('--plugin', 'Treat <name> as a full plugin ID (name@source)')
  .option('--dry-run', 'Preview without making changes')
  .action(async (name, opts) => {
    if (opts.plugin) {
      if (opts.dryRun) { console.log(`[dry-run] Would unblock plugin: ${name}`); return; }
      await unblockPlugin(name);
      console.log(`Plugin unblocked: ${name}`); return;
    }
    const matches = scanStandaloneSkills().filter(s => s.name.includes(name) && s.status === 'disabled');
    if (!matches.length) { console.log(`No disabled skills matching "${name}".`); return; }
    if (matches.length > 1) {
      console.log(`Matches: ${matches.map(s => s.name).join(', ')}`);
      if (!await confirm(`Enable all ${matches.length}? (y/N) `)) { console.log('Aborted.'); return; }
    }
    for (const s of matches) {
      if (opts.dryRun) console.log(`[dry-run] Would enable: ${s.name}`);
      else { enableSkill(s.name); console.log(`Enabled: ${s.name}`); }
    }
  });

// profile
const profileCmd = program.command('profile').description('Manage skill profiles');

profileCmd
  .command('create <name>')
  .description('Snapshot current enabled skills as a named profile')
  .action((name) => {
    const skills = scanStandaloneSkills().filter(s => s.status === 'active').map(s => s.name);
    const plugins = scanPlugins().filter(p => p.status === 'active').map(p => p.id);
    saveProfile(name, skills, plugins);
    console.log(`Profile "${name}" saved: ${skills.length} skills, ${plugins.length} plugins.`);
  });

profileCmd
  .command('use <name>')
  .description('Activate a profile')
  .option('--dry-run', 'Preview without making changes')
  .action(async (name, opts) => {
    if (opts.dryRun) {
      const store = readProfileStore();
      const p = store.profiles[name];
      if (!p) { console.log(`Profile "${name}" not found.`); return; }
      console.log(`[dry-run] Would activate "${name}": ${p.skills.length} skills, ${p.plugins.length} plugins.`);
      return;
    }
    const result = await activateProfile(name);
    console.log(`Activated "${name}": ${result.disabled.length} disabled, ${result.enabled.length} enabled, ${result.pluginsBlocked.length} plugins blocked.`);
  });

profileCmd
  .command('list')
  .description('List saved profiles')
  .action(() => {
    const store = readProfileStore();
    const names = Object.keys(store.profiles);
    if (!names.length) { console.log('No profiles saved.'); return; }
    for (const name of names) {
      const p = store.profiles[name];
      const tag = store.active === name ? ' [active]' : '';
      console.log(`  ${name}${tag}: ${p.skills.length} skills, ${p.plugins.length} plugins`);
    }
  });

profileCmd
  .command('show <name>')
  .description('Show skills in a profile')
  .action((name) => {
    const store = readProfileStore();
    const p = store.profiles[name];
    if (!p) { console.log(`Profile "${name}" not found.`); return; }
    console.log(`Profile "${name}" (${p.created.slice(0, 10)}):`);
    console.log(`  Skills  (${p.skills.length}): ${p.skills.join(', ') || 'none'}`);
    console.log(`  Plugins (${p.plugins.length}): ${p.plugins.join(', ') || 'none'}`);
  });

profileCmd
  .command('delete <name>')
  .description('Delete a saved profile')
  .action((name) => {
    try {
      deleteProfile(name);
      console.log(`Profile "${name}" deleted.`);
    } catch (e) {
      console.error((e as Error).message);
      process.exit(1);
    }
  });

// catalog
program
  .command('catalog')
  .description('Generate ~/.claude/SKILLS.md catalog')
  .action(() => {
    generateCatalog();
    console.log('Catalog written to ~/.claude/SKILLS.md');
    console.log('Tip: use @~/.claude/SKILLS.md in any Claude session to reference it.');
  });

// audit
program
  .command('audit')
  .description('Report duplicates, disabled skill counts, and plugin orphans')
  .action(() => {
    const standalone = scanStandaloneSkills();
    const plugins = scanPlugins();

    const standaloneNames = new Set(standalone.map(s => s.name));
    const pluginBaseNames = plugins.flatMap(p => p.skills.map(s => {
      const parts = s.name.split(':');
      return parts[parts.length - 1];
    }));
    const duplicates = [...standaloneNames].filter(n => pluginBaseNames.includes(n));

    const disabledStandalone = standalone.filter(s => s.status === 'disabled');
    const disabledPlugins = plugins.filter(p => p.status === 'disabled');

    let found = false;
    if (duplicates.length) {
      found = true;
      console.log(`\nPotential duplicates (standalone name matches plugin skill name):`);
      duplicates.forEach(d => console.log(`  ${d}`));
    }
    if (disabledStandalone.length) {
      found = true;
      console.log(`\nDisabled standalone skills (${disabledStandalone.length}) — review for removal:`);
      disabledStandalone.forEach(s => console.log(`  ${s.name}`));
    }
    if (disabledPlugins.length) {
      found = true;
      console.log(`\nBlocked plugins (${disabledPlugins.length}):`);
      disabledPlugins.forEach(p => console.log(`  ${p.id}`));
    }
    if (!found) console.log('No issues found.');
  });

program.parse();
