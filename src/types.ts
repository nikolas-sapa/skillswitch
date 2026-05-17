// src/types.ts
export type SkillSource = 'standalone' | 'plugin';
export type SkillStatus = 'active' | 'disabled';

export interface StandaloneSkill {
  source: 'standalone';
  name: string;         // e.g. "plan"
  path: string;         // absolute path to .md file
  status: SkillStatus;
  description: string;
}

export interface PluginSkill {
  source: 'plugin';
  name: string;         // e.g. "vercel:deploy"
  plugin: string;       // e.g. "vercel@claude-plugins-official"
  status: SkillStatus;
  description: string;
}

export type Skill = StandaloneSkill | PluginSkill;

export interface PluginEntry {
  id: string;           // e.g. "vercel@claude-plugins-official"
  name: string;         // e.g. "vercel"
  sourceMarket: string; // e.g. "claude-plugins-official"
  skills: PluginSkill[];
  status: SkillStatus;
}

export interface Profile {
  created: string;
  updatedAt?: string;
  skills: string[];
  plugins: string[];
}

export interface ProfileStore {
  active: string | null;
  previous: string | null;
  profiles: Record<string, Profile>;
}

export interface BlocklistEntry {
  plugin: string;       // "name@source"
  added_at: string;
  reason: string;
}

export interface BlocklistFile {
  fetchedAt: string;
  plugins: BlocklistEntry[];
}
