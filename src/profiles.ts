// src/profiles.ts
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import type { Profile, ProfileStore } from './types.js';
import { disableSkill, enableSkill } from './disable.js';
import { readBlocklist, setBlockedPlugins } from './blocklist.js';
import { writeAtomicSync } from './atomic.js';
import { assertMoveAllowed, validateSkillName } from './moves.js';

const defaultClaudeDir = path.join(homedir(), '.claude');

export interface ActivateResult {
  enabled: string[];
  disabled: string[];
  pluginsBlocked: string[];
}

export interface ProfileDiff {
  toEnable: string[];
  toDisable: string[];
  toBlock: string[];
  toUnblock: string[];
}

export interface ValidationResult {
  validSkills: string[];
  ghostSkills: string[];
}

function profileStorePath(claudeDir: string): string {
  return path.join(claudeDir, 'skillctl', 'profiles.json');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function validateLists(skills: unknown, plugins: unknown): void {
  if (!Array.isArray(skills) || !Array.isArray(plugins) ||
      !skills.every(s => typeof s === 'string' && s.length > 0 &&
        !['.', '..', '.disabled'].includes(s) && !/[/\\]/.test(s)) ||
      !plugins.every(p => typeof p === 'string' && p.length > 0)) {
    throw new Error('Profile skills and plugins must be valid string arrays');
  }
  for (const skill of skills) validateSkillName(skill);
}

function validateName(name: unknown): asserts name is string {
  if (typeof name !== 'string' || !name.trim() || name.length > 64 ||
      /[/\\]/.test(name) || ['__proto__', 'constructor', 'prototype'].includes(name)) {
    throw new Error('Invalid profile name');
  }
}

export function readProfileStore(claudeDir = defaultClaudeDir): ProfileStore {
  const filePath = profileStorePath(claudeDir);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed) || !isRecord(parsed.profiles) ||
        !(parsed.active === null || typeof parsed.active === 'string') ||
        !(parsed.previous === null || typeof parsed.previous === 'string')) {
      throw new Error('Invalid profiles.json structure');
    }
    for (const [name, profile] of Object.entries(parsed.profiles)) {
      validateName(name);
      if (!isRecord(profile) || typeof profile.created !== 'string' ||
          !(profile.updatedAt === undefined || typeof profile.updatedAt === 'string')) {
        throw new Error('Invalid profile structure');
      }
      validateLists(profile.skills, profile.plugins);
    }
    return { ...parsed, profiles: Object.assign(Object.create(null), parsed.profiles) } as unknown as ProfileStore;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { active: null, previous: null, profiles: Object.create(null) };
    }
    if (err instanceof SyntaxError) {
      throw new Error('profiles.json is malformed; repair it before writing');
    }
    throw err;
  }
}

function writeProfileStore(store: ProfileStore, claudeDir: string): void {
  const filePath = profileStorePath(claudeDir);
  writeAtomicSync(filePath, JSON.stringify(store, null, 2));
}

export function saveProfile(name: string, skills: string[], plugins: string[], claudeDir = defaultClaudeDir): void {
  validateName(name);
  validateLists(skills, plugins);
  const store = readProfileStore(claudeDir);
  const profile: Profile = {
    created: store.profiles[name]?.created ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    skills,
    plugins,
  };
  store.profiles[name] = profile;
  writeProfileStore(store, claudeDir);
}

export function deleteProfile(name: string, claudeDir = defaultClaudeDir): void {
  const store = readProfileStore(claudeDir);
  if (store.active === name) throw new Error('Cannot delete active profile');
  if (!store.profiles[name]) throw new Error(`Profile "${name}" does not exist`);
  delete store.profiles[name];
  writeProfileStore(store, claudeDir);
}

export function renameProfile(oldName: string, newName: string, claudeDir = defaultClaudeDir): void {
  validateName(oldName);
  validateName(newName);
  const store = readProfileStore(claudeDir);
  if (!store.profiles[oldName]) throw new Error(`Profile "${oldName}" does not exist`);
  if (store.profiles[newName]) throw new Error(`Profile "${newName}" already exists`);
  store.profiles[newName] = store.profiles[oldName];
  delete store.profiles[oldName];
  if (store.active === oldName) store.active = newName;
  if (store.previous === oldName) store.previous = newName;
  writeProfileStore(store, claudeDir);
}

export function copyProfile(srcName: string, dstName: string, claudeDir = defaultClaudeDir): void {
  validateName(srcName);
  validateName(dstName);
  const store = readProfileStore(claudeDir);
  if (!store.profiles[srcName]) throw new Error(`Profile "${srcName}" does not exist`);
  if (store.profiles[dstName]) throw new Error(`Profile "${dstName}" already exists`);
  store.profiles[dstName] = {
    ...store.profiles[srcName],
    created: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  writeProfileStore(store, claudeDir);
}

export function diffProfile(name: string, claudeDir = defaultClaudeDir): ProfileDiff {
  const store = readProfileStore(claudeDir);
  const profile = store.profiles[name];
  if (!profile) throw new Error(`Profile "${name}" does not exist`);

  const profileSkills = new Set(profile.skills);
  const skillsDir = path.join(claudeDir, 'skills');
  const disabledDir = path.join(claudeDir, 'skills', '.disabled');

  const toDisable: string[] = [];
  const toEnable: string[] = [];

  if (fs.existsSync(skillsDir)) {
    for (const file of fs.readdirSync(skillsDir)) {
      if (!file.endsWith('.md') || !fs.statSync(path.join(skillsDir, file)).isFile()) continue;
      const n = file.slice(0, -3);
      if (!profileSkills.has(n)) toDisable.push(n);
    }
  }
  if (fs.existsSync(disabledDir)) {
    for (const file of fs.readdirSync(disabledDir)) {
      if (!file.endsWith('.md')) continue;
      const n = file.slice(0, -3);
      if (profileSkills.has(n)) toEnable.push(n);
    }
  }

  const profilePlugins = new Set(profile.plugins);
  const toBlock: string[] = [];
  const toUnblock: string[] = [];

  try {
    const raw = JSON.parse(fs.readFileSync(path.join(claudeDir, 'plugins', 'installed_plugins.json'), 'utf-8'));
    const installed = Object.keys(raw?.plugins ?? {});
    let currentlyBlocked = new Set<string>();
    try {
      const blRaw = JSON.parse(fs.readFileSync(path.join(claudeDir, 'plugins', 'blocklist.json'), 'utf-8'));
      currentlyBlocked = new Set((blRaw.plugins as Array<{ plugin: string }>).map((e) => e.plugin));
    } catch { /* treat as empty */ }
    for (const id of installed) {
      if (!profilePlugins.has(id) && !currentlyBlocked.has(id)) toBlock.push(id);
      if (profilePlugins.has(id) && currentlyBlocked.has(id)) toUnblock.push(id);
    }
  } catch { /* no installed_plugins.json — skip */ }

  return { toEnable, toDisable, toBlock, toUnblock };
}

export function exportProfile(name: string, claudeDir = defaultClaudeDir): string {
  const store = readProfileStore(claudeDir);
  const profile = store.profiles[name];
  if (!profile) throw new Error(`Profile "${name}" does not exist`);
  return JSON.stringify({ name, ...profile }, null, 2);
}

export function importProfile(jsonStr: string, claudeDir = defaultClaudeDir): string {
  let parsed: { name: string; skills: string[]; plugins: string[] };
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON in import file');
  }
  if (!isRecord(parsed) || !parsed.name || !Array.isArray(parsed.skills) || !Array.isArray(parsed.plugins)) {
    throw new Error('Import file must have "name", "skills", and "plugins" fields');
  }
  saveProfile(parsed.name, parsed.skills, parsed.plugins, claudeDir);
  return parsed.name;
}

export function validateProfile(name: string, claudeDir = defaultClaudeDir): ValidationResult {
  const store = readProfileStore(claudeDir);
  const profile = store.profiles[name];
  if (!profile) throw new Error(`Profile "${name}" does not exist`);

  const skillsDir = path.join(claudeDir, 'skills');
  const disabledDir = path.join(claudeDir, 'skills', '.disabled');
  const onDisk = new Set<string>();

  for (const dir of [skillsDir, disabledDir]) {
    if (!fs.existsSync(dir)) continue;
    for (const file of fs.readdirSync(dir)) {
      if (file.endsWith('.md')) onDisk.add(file.slice(0, -3));
    }
  }

  const validSkills: string[] = [];
  const ghostSkills: string[] = [];
  for (const skill of profile.skills) {
    (onDisk.has(skill) ? validSkills : ghostSkills).push(skill);
  }
  return { validSkills, ghostSkills };
}

export async function activateProfile(name: string, claudeDir = defaultClaudeDir): Promise<ActivateResult> {
  const store = readProfileStore(claudeDir);
  const profile = store.profiles[name];
  if (!profile) throw new Error(`Profile "${name}" does not exist`);

  const profilePlugins = new Set(profile.plugins);
  const installedPath = path.join(claudeDir, 'plugins', 'installed_plugins.json');
  let pluginsBlocked: string[] = [];

  try {
    const raw = JSON.parse(fs.readFileSync(installedPath, 'utf-8'));
    if (!isRecord(raw) || (raw.plugins !== undefined && !isRecord(raw.plugins))) {
      throw new Error('Invalid installed_plugins.json structure');
    }
    const allInstalled = Object.keys(raw.plugins ?? {});
    pluginsBlocked = allInstalled.filter(id => !profilePlugins.has(id));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  await readBlocklist(claudeDir);

  const profileSkills = new Set(profile.skills);
  const skillsDir = path.join(claudeDir, 'skills');
  const disabledDir = path.join(claudeDir, 'skills', '.disabled');

  const plannedMoves: Array<{ name: string; enable: boolean }> = [];
  if (fs.existsSync(skillsDir)) {
    for (const file of fs.readdirSync(skillsDir)) {
      if (!file.endsWith('.md') || !fs.statSync(path.join(skillsDir, file)).isFile()) continue;
      const skillName = file.slice(0, -3);
      if (!profileSkills.has(skillName)) plannedMoves.push({ name: skillName, enable: false });
    }
  }
  if (fs.existsSync(disabledDir)) {
    for (const file of fs.readdirSync(disabledDir)) {
      if (!file.endsWith('.md')) continue;
      const skillName = file.slice(0, -3);
      if (profileSkills.has(skillName)) plannedMoves.push({ name: skillName, enable: true });
    }
  }
  for (const move of plannedMoves) assertMoveAllowed(move.name, skillsDir, move.enable, false);

  const enabled: string[] = [];
  const disabled: string[] = [];

  if (fs.existsSync(skillsDir)) {
    for (const file of fs.readdirSync(skillsDir)) {
      if (!file.endsWith('.md')) continue;
      const stat = fs.statSync(path.join(skillsDir, file));
      if (!stat.isFile()) continue;
      const skillName = file.slice(0, -3);
      if (!profileSkills.has(skillName)) {
        disableSkill(skillName, claudeDir);
        disabled.push(skillName);
      }
    }
  }

  if (fs.existsSync(disabledDir)) {
    for (const file of fs.readdirSync(disabledDir)) {
      if (!file.endsWith('.md')) continue;
      const skillName = file.slice(0, -3);
      if (profileSkills.has(skillName)) {
        enableSkill(skillName, claudeDir);
        enabled.push(skillName);
      }
    }
  }

  await setBlockedPlugins(pluginsBlocked, `blocked by profile: ${name}`, claudeDir);

  store.previous = store.active;
  store.active = name;
  writeProfileStore(store, claudeDir);

  return { enabled, disabled, pluginsBlocked };
}
