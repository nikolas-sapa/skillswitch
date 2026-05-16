// src/blocklist.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import type { BlocklistEntry, BlocklistFile } from './types.js';

const defaultClaudeDir = path.join(homedir(), '.claude');

function blocklistPath(claudeDir: string): string {
  return path.join(claudeDir, 'plugins', 'blocklist.json');
}

export async function readBlocklist(claudeDir = defaultClaudeDir): Promise<BlocklistFile> {
  const filePath = blocklistPath(claudeDir);
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = JSON.parse(raw) as BlocklistFile;
    return { fetchedAt: new Date().toISOString(), plugins: parsed.plugins ?? [] };
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return { fetchedAt: new Date().toISOString(), plugins: [] };
    }
    throw err;
  }
}

async function writeBlocklist(data: BlocklistFile, claudeDir: string): Promise<void> {
  const filePath = blocklistPath(claudeDir);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
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

export async function unblockPlugin(pluginId: string, claudeDir = defaultClaudeDir): Promise<void> {
  const blocklist = await readBlocklist(claudeDir);
  const filtered = blocklist.plugins.filter(e => e.plugin !== pluginId);
  if (filtered.length === blocklist.plugins.length) return;
  blocklist.plugins = filtered;
  blocklist.fetchedAt = new Date().toISOString();
  await writeBlocklist(blocklist, claudeDir);
}

export async function setBlockedPlugins(pluginIds: string[], reason: string, claudeDir = defaultClaudeDir): Promise<void> {
  const now = new Date().toISOString();
  const plugins: BlocklistEntry[] = pluginIds.map(id => ({ plugin: id, added_at: now, reason }));
  const data: BlocklistFile = { fetchedAt: now, plugins };
  await writeBlocklist(data, claudeDir);
}
