// src/blocklist.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import type { BlocklistEntry, BlocklistFile } from './types.js';
import { writeAtomic } from './atomic.js';

const defaultClaudeDir = path.join(homedir(), '.claude');

function blocklistPath(claudeDir: string): string {
  return path.join(claudeDir, 'plugins', 'blocklist.json');
}

export async function readBlocklist(claudeDir = defaultClaudeDir): Promise<BlocklistFile> {
  const filePath = blocklistPath(claudeDir);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as BlocklistFile;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.plugins) ||
        !parsed.plugins.every(e => e && typeof e.plugin === 'string' &&
          typeof e.added_at === 'string' && typeof e.reason === 'string')) {
      throw new Error('Invalid blocklist.json structure');
    }
    const plugins = parsed.plugins;
    return { fetchedAt: parsed.fetchedAt ?? new Date().toISOString(), plugins };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { fetchedAt: new Date().toISOString(), plugins: [] };
    }
    if (err instanceof SyntaxError) {
      throw new Error('blocklist.json is malformed; repair it before writing');
    }
    throw err;
  }
}

async function writeBlocklist(data: BlocklistFile, claudeDir: string): Promise<void> {
  const filePath = blocklistPath(claudeDir);
  await writeAtomic(filePath, JSON.stringify(data, null, 2));
}

export async function blockPlugin(pluginId: string, reason: string, claudeDir = defaultClaudeDir): Promise<void> {
  const blocklist = await readBlocklist(claudeDir);
  const alreadyBlocked = blocklist.plugins.some(e => e.plugin === pluginId);
  if (alreadyBlocked) return;
  const entry: BlocklistEntry = { plugin: pluginId, added_at: new Date().toISOString(), reason };
  blocklist.plugins.push(entry);
  blocklist.fetchedAt = new Date().toISOString();
  await writeBlocklist(blocklist, claudeDir);
}

export async function unblockPlugin(pluginId: string, claudeDir = defaultClaudeDir): Promise<boolean> {
  const blocklist = await readBlocklist(claudeDir);
  const filtered = blocklist.plugins.filter(e => e.plugin !== pluginId);
  if (filtered.length === blocklist.plugins.length) return false;
  blocklist.plugins = filtered;
  blocklist.fetchedAt = new Date().toISOString();
  await writeBlocklist(blocklist, claudeDir);
  return true;
}

export async function setBlockedPlugins(pluginIds: string[], reason: string, claudeDir = defaultClaudeDir): Promise<void> {
  const now = new Date().toISOString();
  const plugins: BlocklistEntry[] = pluginIds.map(id => ({ plugin: id, added_at: now, reason }));
  const data: BlocklistFile = { fetchedAt: now, plugins };
  await writeBlocklist(data, claudeDir);
}
