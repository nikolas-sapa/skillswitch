// src/profiles.ts
import * as fs from 'fs';
import * as path from 'path';
import { homedir } from 'os';
import type { Profile, ProfileStore } from './types.js';
import { disableSkill, enableSkill } from './disable.js';
import { setBlockedPlugins } from './blocklist.js';

const defaultClaudeDir = path.join(homedir(), '.claude');

export interface ActivateResult {
  enabled: string[];
  disabled: string[];
  pluginsBlocked: string[];
}

function profileStorePath(claudeDir: string): string {
  return path.join(claudeDir, 'skillctl', 'profiles.json');
}

export function readProfileStore(claudeDir = defaultClaudeDir): ProfileStore {
  const filePath = profileStorePath(claudeDir);
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ProfileStore;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { active: null, profiles: {} };
    }
    throw err;
  }
}

function writeProfileStore(store: ProfileStore, claudeDir: string): void {
  const filePath = profileStorePath(claudeDir);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = filePath + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(store, null, 2));
  fs.renameSync(tmp, filePath);
}

export function saveProfile(name: string, skills: string[], plugins: string[], claudeDir = defaultClaudeDir): void {
  const store = readProfileStore(claudeDir);
  const profile: Profile = {
    created: store.profiles[name]?.created ?? new Date().toISOString(),
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

export async function activateProfile(name: string, claudeDir = defaultClaudeDir): Promise<ActivateResult> {
  const store = readProfileStore(claudeDir);
  const profile = store.profiles[name];
  if (!profile) {
    throw new Error(`Profile "${name}" does not exist`);
  }

  const profileSkills = new Set(profile.skills);
  const skillsDir = path.join(claudeDir, 'skills');
  const disabledDir = path.join(claudeDir, 'skills', '.disabled');

  const enabled: string[] = [];
  const disabled: string[] = [];

  // Disable active standalone skills NOT in profile.skills
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

  // Enable disabled standalone skills that ARE in profile.skills
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

  // Block plugins NOT in profile.plugins
  const profilePlugins = new Set(profile.plugins);
  const installedPath = path.join(claudeDir, 'plugins', 'installed_plugins.json');
  let pluginsBlocked: string[] = [];

  try {
    const raw = JSON.parse(fs.readFileSync(installedPath, 'utf-8'));
    const allInstalled = Object.keys(raw?.plugins ?? {});
    pluginsBlocked = allInstalled.filter(id => !profilePlugins.has(id));
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  await setBlockedPlugins(pluginsBlocked, `blocked by profile: ${name}`, claudeDir);

  // Update active profile and persist
  store.active = name;
  writeProfileStore(store, claudeDir);

  return { enabled, disabled, pluginsBlocked };
}
