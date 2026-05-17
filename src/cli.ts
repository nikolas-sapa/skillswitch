#!/usr/bin/env node
// src/cli.ts
import { Command } from 'commander';
import * as readline from 'readline';
import * as fs from 'fs';
import { scanStandaloneSkills, scanPlugins, defaultClaudeDir } from './scanner.js';
import { disableSkill, enableSkill } from './disable.js';
import { blockPlugin, unblockPlugin } from './blocklist.js';
import {
  readProfileStore,
  saveProfile,
  deleteProfile,
  activateProfile,
  renameProfile,
  copyProfile,
  diffProfile,
  exportProfile,
  importProfile,
  validateProfile,
} from './profiles.js';
import { generateCatalog } from './catalog.js';

process.on('unhandledRejection', (err: unknown) => {
  process.stderr.write(`Error: ${(err as Error).message ?? err}\n`);
  process.exit(1);
});

function getClaudeDir(opts: Record<string, string | undefined>): string {
  return opts['claudeDir'] ?? process.env['SKILLSWITCH_CLAUDE_DIR'] ?? defaultClaudeDir;
}

function validateProfileName(name: string): void {
  if (!name || name.trim() === '') throw new Error('Profile name cannot be empty');
  if (name.length > 64) throw new Error('Profile name must be 64 characters or less');
  if (/[/\\]/.test(name)) throw new Error('Profile name cannot contain "/" or "\\"');
}

const program = new Command();
program
  .name('skillswitch')
  .description('Manage Claude Code skills')
  .version('0.1.2')
  .option('--claude-dir <path>', 'Override the Claude config directory (default: ~/.claude)');

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
  .option('--enabled', 'Show only enabled (active) skills')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const claudeDir = getClaudeDir(program.opts());
    const standalone = scanStandaloneSkills(claudeDir);
    const plugins = scanPlugins(claudeDir);

    if (opts.json) {
      const filter = opts.disabled ? 'disabled' : opts.enabled ? 'active' : null;
      const ss = filter ? standalone.filter(s => s.status === filter) : standalone;
      const pp = filter ? plugins.filter(p => p.status === (filter === 'active' ? 'active' : 'disabled')) : plugins;
      process.stdout.write(JSON.stringify({ standalone: ss, plugins: pp }, null, 2) + '\n');
      return;
    }

    const statusFilter = opts.disabled ? 'disabled' : opts.enabled ? 'active' : null;
    const ss = statusFilter ? standalone.filter(s => s.status === statusFilter) : standalone;
    console.log(`\nStandalone (${standalone.length} total):`);
    for (const s of ss) console.log(`  ${s.name}${s.status === 'disabled' ? ' [disabled]' : ''}`);
    const pp = statusFilter ? plugins.filter(p => p.status === statusFilter) : plugins;
    for (const p of pp) {
      console.log(`\n${p.id}${p.status === 'disabled' ? ' [DISABLED]' : ''} (${p.skills.length} skills)`);
      for (const s of p.skills) console.log(`  ${s.name}${s.status === 'disabled' ? ' [disabled]' : ''}`);
    }
  });

// search
program
  .command('search <query>')
  .description('Search skills by name or description (substring match)')
  .option('--status <status>', 'Filter by status: active or disabled')
  .option('--json', 'Output as JSON')
  .action((query, opts) => {
    const claudeDir = getClaudeDir(program.opts());
    const q = query.toLowerCase();
    const standalone = scanStandaloneSkills(claudeDir);
    const plugins = scanPlugins(claudeDir);
    let matches = [
      ...standalone.filter(s => s.name.includes(q) || s.description.toLowerCase().includes(q)),
      ...plugins.flatMap(p => p.skills).filter(s => s.name.includes(q) || s.description.toLowerCase().includes(q)),
    ];
    if (opts.status) {
      matches = matches.filter(s => s.status === opts.status);
    }
    if (opts.json) {
      process.stdout.write(JSON.stringify(matches, null, 2) + '\n');
      return;
    }
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
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const claudeDir = getClaudeDir(program.opts());
    const store = readProfileStore(claudeDir);
    const standalone = scanStandaloneSkills(claudeDir);
    const plugins = scanPlugins(claudeDir);
    const active = standalone.filter(s => s.status === 'active').length
      + plugins.filter(p => p.status === 'active').reduce((n, p) => n + p.skills.length, 0);
    const disabled = standalone.filter(s => s.status === 'disabled').length
      + plugins.filter(p => p.status === 'disabled').reduce((n, p) => n + p.skills.length, 0);

    if (opts.json) {
      process.stdout.write(JSON.stringify({ activeProfile: store.active, active, disabled, total: active + disabled }, null, 2) + '\n');
      return;
    }
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
  .option('--exact', 'Require exact name match instead of substring match')
  .option('--dry-run', 'Preview without making changes')
  .option('--quiet', 'Suppress output except errors')
  .action(async (name, opts) => {
    const claudeDir = getClaudeDir(program.opts());
    const log = (msg: string) => { if (!opts.quiet) console.log(msg); };
    try {
      if (opts.plugin) {
        const plugins = scanPlugins(claudeDir);
        const matched = plugins.filter(p =>
          opts.exact ? p.id === name : p.id.includes(name)
        );
        if (!matched.length) { console.log(`No plugins matching "${name}".`); return; }
        if (matched.length > 1 && !opts.exact) {
          console.log(`Matches: ${matched.map(p => p.id).join(', ')}`);
          if (!await confirm(`Disable all ${matched.length} plugins? (y/N) `)) { console.log('Aborted.'); return; }
        }
        for (const p of matched) {
          if (opts.dryRun) log(`[dry-run] Would block plugin: ${p.id}`);
          else { await blockPlugin(p.id, 'skillswitch: manually disabled', claudeDir); log(`Plugin blocked: ${p.id}`); }
        }
        return;
      }
      const matches = scanStandaloneSkills(claudeDir).filter(s => {
        const hit = opts.exact ? s.name === name : s.name.includes(name);
        return hit && s.status === 'active';
      });
      if (!matches.length) { console.log(`No active skills matching "${name}".`); return; }
      if (matches.length > 1) {
        console.log(`Matches: ${matches.map(s => s.name).join(', ')}`);
        if (!await confirm(`Disable all ${matches.length}? (y/N) `)) { console.log('Aborted.'); return; }
      }
      for (const s of matches) {
        if (opts.dryRun) log(`[dry-run] Would disable: ${s.name}`);
        else { disableSkill(s.name, claudeDir); log(`Disabled: ${s.name}`); }
      }
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// enable
program
  .command('enable <name>')
  .description('Enable a skill (substring match) or a plugin (--plugin)')
  .option('--plugin', 'Treat <name> as a full plugin ID (name@source)')
  .option('--exact', 'Require exact name match instead of substring match')
  .option('--dry-run', 'Preview without making changes')
  .option('--quiet', 'Suppress output except errors')
  .action(async (name, opts) => {
    const claudeDir = getClaudeDir(program.opts());
    const log = (msg: string) => { if (!opts.quiet) console.log(msg); };
    try {
      if (opts.plugin) {
        const plugins = scanPlugins(claudeDir);
        const matched = plugins.filter(p =>
          opts.exact ? p.id === name : p.id.includes(name)
        );
        if (!matched.length) { console.log(`No plugins matching "${name}".`); return; }
        for (const p of matched) {
          if (opts.dryRun) { log(`[dry-run] Would unblock plugin: ${p.id}`); continue; }
          const wasBlocked = await unblockPlugin(p.id, claudeDir);
          log(wasBlocked ? `Plugin unblocked: ${p.id}` : `Plugin was not blocked: ${p.id}`);
        }
        return;
      }
      const matches = scanStandaloneSkills(claudeDir).filter(s => {
        const hit = opts.exact ? s.name === name : s.name.includes(name);
        return hit && s.status === 'disabled';
      });
      if (!matches.length) { console.log(`No disabled skills matching "${name}".`); return; }
      if (matches.length > 1) {
        console.log(`Matches: ${matches.map(s => s.name).join(', ')}`);
        if (!await confirm(`Enable all ${matches.length}? (y/N) `)) { console.log('Aborted.'); return; }
      }
      for (const s of matches) {
        if (opts.dryRun) log(`[dry-run] Would enable: ${s.name}`);
        else { enableSkill(s.name, claudeDir); log(`Enabled: ${s.name}`); }
      }
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// profile
const profileCmd = program.command('profile').description('Manage skill profiles');

profileCmd
  .command('create <name>')
  .description('Snapshot current enabled skills as a named profile')
  .action((name) => {
    try {
      const claudeDir = getClaudeDir(program.opts());
      validateProfileName(name);
      const skills = scanStandaloneSkills(claudeDir).filter(s => s.status === 'active').map(s => s.name);
      const plugins = scanPlugins(claudeDir).filter(p => p.status === 'active').map(p => p.id);
      const store = readProfileStore(claudeDir);
      if (store.profiles[name]) console.log(`Overwriting existing profile "${name}".`);
      if (!skills.length && !plugins.length) console.warn(`Warning: no active skills or plugins found — profile may be empty by mistake.`);
      saveProfile(name, skills, plugins, claudeDir);
      console.log(`Profile "${name}" saved: ${skills.length} skills, ${plugins.length} plugins.`);
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

profileCmd
  .command('use <name>')
  .description('Activate a profile')
  .option('--dry-run', 'Preview without making changes')
  .option('--quiet', 'Suppress output except errors')
  .action(async (name, opts) => {
    const claudeDir = getClaudeDir(program.opts());
    try {
      if (opts.dryRun) {
        const store = readProfileStore(claudeDir);
        const p = store.profiles[name];
        if (!p) { console.log(`Profile "${name}" not found.`); return; }
        const diff = diffProfile(name, claudeDir);
        console.log(`[dry-run] Activating "${name}":`);
        if (diff.toEnable.length) console.log(`  Enable  : ${diff.toEnable.join(', ')}`);
        if (diff.toDisable.length) console.log(`  Disable : ${diff.toDisable.join(', ')}`);
        if (diff.toBlock.length) console.log(`  Block   : ${diff.toBlock.join(', ')}`);
        if (diff.toUnblock.length) console.log(`  Unblock : ${diff.toUnblock.join(', ')}`);
        if (!diff.toEnable.length && !diff.toDisable.length && !diff.toBlock.length && !diff.toUnblock.length) {
          console.log('  (no changes)');
        }
        return;
      }
      const result = await activateProfile(name, claudeDir);
      if (!opts.quiet) {
        console.log(`Activated "${name}".`);
        if (result.enabled.length) console.log(`  Enabled : ${result.enabled.join(', ')}`);
        if (result.disabled.length) console.log(`  Disabled: ${result.disabled.join(', ')}`);
        if (result.pluginsBlocked.length) console.log(`  Blocked : ${result.pluginsBlocked.join(', ')}`);
      }
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

profileCmd
  .command('list')
  .description('List saved profiles')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const claudeDir = getClaudeDir(program.opts());
    const store = readProfileStore(claudeDir);
    const names = Object.keys(store.profiles);
    if (opts.json) {
      process.stdout.write(JSON.stringify({ active: store.active, previous: store.previous, profiles: store.profiles }, null, 2) + '\n');
      return;
    }
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
    const claudeDir = getClaudeDir(program.opts());
    const store = readProfileStore(claudeDir);
    const p = store.profiles[name];
    if (!p) { console.log(`Profile "${name}" not found.`); return; }
    console.log(`Profile "${name}" (created ${p.created.slice(0, 10)}):`);
    console.log(`  Skills  (${p.skills.length}): ${p.skills.join(', ') || 'none'}`);
    console.log(`  Plugins (${p.plugins.length}): ${p.plugins.join(', ') || 'none'}`);
  });

profileCmd
  .command('delete <name>')
  .description('Delete a saved profile')
  .option('--force', 'Delete even if this is the active profile')
  .action((name, opts) => {
    try {
      const claudeDir = getClaudeDir(program.opts());
      if (opts.force) {
        // Deactivate the profile first so deleteProfile won't throw
        const store = readProfileStore(claudeDir);
        if (store.active === name) {
          store.active = null;
          if (!store.profiles[name]) { console.log(`Profile "${name}" not found.`); return; }
          delete store.profiles[name];
          const storeFile = claudeDir + '/skillctl/profiles.json';
          const { mkdirSync, writeFileSync, renameSync } = fs;
          const dir = storeFile.replace(/\/[^/]+$/, '');
          mkdirSync(dir, { recursive: true });
          writeFileSync(storeFile + '.tmp', JSON.stringify(store, null, 2));
          renameSync(storeFile + '.tmp', storeFile);
          console.log(`Profile "${name}" deleted.`);
          return;
        }
      }
      deleteProfile(name, claudeDir);
      console.log(`Profile "${name}" deleted.`);
    } catch (err: unknown) {
      console.error((err as Error).message);
      process.exit(1);
    }
  });

profileCmd
  .command('rename <old> <new>')
  .description('Rename a profile')
  .action((oldName, newName) => {
    try {
      const claudeDir = getClaudeDir(program.opts());
      validateProfileName(newName);
      renameProfile(oldName, newName, claudeDir);
      console.log(`Profile "${oldName}" renamed to "${newName}".`);
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

profileCmd
  .command('copy <src> <dst>')
  .description('Copy a profile to a new name')
  .action((srcName, dstName) => {
    try {
      const claudeDir = getClaudeDir(program.opts());
      validateProfileName(dstName);
      copyProfile(srcName, dstName, claudeDir);
      console.log(`Profile "${srcName}" copied to "${dstName}".`);
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

profileCmd
  .command('diff <name>')
  .description('Show what would change when activating a profile')
  .action((name) => {
    try {
      const claudeDir = getClaudeDir(program.opts());
      const diff = diffProfile(name, claudeDir);
      if (!diff.toEnable.length && !diff.toDisable.length && !diff.toBlock.length && !diff.toUnblock.length) {
        console.log(`Profile "${name}" matches current state — no changes needed.`);
        return;
      }
      console.log(`Diff for profile "${name}":`);
      if (diff.toEnable.length) console.log(`  Enable  (+): ${diff.toEnable.join(', ')}`);
      if (diff.toDisable.length) console.log(`  Disable (-): ${diff.toDisable.join(', ')}`);
      if (diff.toBlock.length) console.log(`  Block   (-): ${diff.toBlock.join(', ')}`);
      if (diff.toUnblock.length) console.log(`  Unblock (+): ${diff.toUnblock.join(', ')}`);
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

profileCmd
  .command('export <name>')
  .description('Export a profile to stdout or a file')
  .option('--out <file>', 'Write to file instead of stdout')
  .action((name, opts) => {
    try {
      const claudeDir = getClaudeDir(program.opts());
      const json = exportProfile(name, claudeDir);
      if (opts.out) {
        fs.writeFileSync(opts.out, json);
        console.log(`Profile "${name}" exported to ${opts.out}`);
      } else {
        process.stdout.write(json + '\n');
      }
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

profileCmd
  .command('import <file>')
  .description('Import a profile from a JSON file')
  .action((file) => {
    try {
      const claudeDir = getClaudeDir(program.opts());
      const json = fs.readFileSync(file, 'utf-8');
      const name = importProfile(json, claudeDir);
      console.log(`Profile "${name}" imported.`);
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

profileCmd
  .command('validate <name>')
  .description('Check a profile for ghost skills (no longer on disk)')
  .action((name) => {
    try {
      const claudeDir = getClaudeDir(program.opts());
      const result = validateProfile(name, claudeDir);
      if (!result.ghostSkills.length) {
        console.log(`Profile "${name}" is valid — all ${result.validSkills.length} skills found on disk.`);
        return;
      }
      console.log(`Profile "${name}" has ${result.ghostSkills.length} ghost skill(s):`);
      result.ghostSkills.forEach(s => console.log(`  ${s} (not found on disk)`));
      if (result.validSkills.length) console.log(`${result.validSkills.length} skill(s) OK: ${result.validSkills.join(', ')}`);
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// catalog
program
  .command('catalog')
  .description('Generate ~/.claude/SKILLS.md catalog')
  .option('--out <path>', 'Write to custom path instead of ~/.claude/SKILLS.md')
  .action((opts) => {
    try {
      const claudeDir = getClaudeDir(program.opts());
      const content = generateCatalog(claudeDir);
      if (opts.out) {
        fs.writeFileSync(opts.out, content);
        console.log(`Catalog written to ${opts.out}`);
      } else {
        console.log('Catalog written to ~/.claude/SKILLS.md');
        console.log('Tip: use @~/.claude/SKILLS.md in any Claude session to reference it.');
      }
    } catch (err: unknown) {
      console.error(`Error: ${(err as Error).message}`);
      process.exit(1);
    }
  });

// audit
program
  .command('audit')
  .description('Report duplicates, disabled skill counts, and plugin orphans')
  .option('--json', 'Output as JSON')
  .action((opts) => {
    const claudeDir = getClaudeDir(program.opts());
    const standalone = scanStandaloneSkills(claudeDir);
    const plugins = scanPlugins(claudeDir);

    const standaloneNames = new Set(standalone.map(s => s.name));
    const pluginBaseNames = plugins.flatMap(p => p.skills.map(s => {
      const parts = s.name.split(':');
      return parts[parts.length - 1];
    }));
    const duplicates = [...standaloneNames].filter(n => pluginBaseNames.includes(n));
    const disabledStandalone = standalone.filter(s => s.status === 'disabled');
    const disabledPlugins = plugins.filter(p => p.status === 'disabled');

    if (opts.json) {
      process.stdout.write(JSON.stringify({ duplicates, disabledStandalone: disabledStandalone.map(s => s.name), disabledPlugins: disabledPlugins.map(p => p.id) }, null, 2) + '\n');
      return;
    }

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
