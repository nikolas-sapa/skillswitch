// tests/blocklist.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { readBlocklist, blockPlugin, unblockPlugin, setBlockedPlugins } from '../src/blocklist.js';
import type { BlocklistFile } from '../src/types.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skillctl-bl-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('readBlocklist', () => {
  it('returns empty blocklist when file is absent', async () => {
    const result = await readBlocklist(tmpDir);
    expect(result.plugins).toEqual([]);
    expect(result.fetchedAt).toBeTruthy();
  });

  it('returns parsed blocklist when file exists', async () => {
    const pluginsDir = path.join(tmpDir, 'plugins');
    await fs.mkdir(pluginsDir, { recursive: true });
    const data: BlocklistFile = {
      fetchedAt: '2024-01-01T00:00:00.000Z',
      plugins: [{ plugin: 'myplugin@mkt', added_at: '2024-01-01T00:00:00.000Z', reason: 'security' }],
    };
    await fs.writeFile(path.join(pluginsDir, 'blocklist.json'), JSON.stringify(data));

    const result = await readBlocklist(tmpDir);
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0].plugin).toBe('myplugin@mkt');
    expect(result.plugins[0].reason).toBe('security');
    expect(result.fetchedAt).toBe('2024-01-01T00:00:00.000Z');
  });

  it('returns empty blocklist when file contains malformed JSON', async () => {
    const pluginsDir = path.join(tmpDir, 'plugins');
    await fs.mkdir(pluginsDir, { recursive: true });
    await fs.writeFile(path.join(pluginsDir, 'blocklist.json'), '{ broken json');
    const result = await readBlocklist(tmpDir);
    expect(result.plugins).toEqual([]);
    expect(result.fetchedAt).toBeTruthy();
  });
});

describe('blockPlugin', () => {
  it('adds plugin to empty list', async () => {
    await blockPlugin('myplugin@mkt', 'security', tmpDir);
    const result = await readBlocklist(tmpDir);
    expect(result.plugins).toHaveLength(1);
    expect(result.plugins[0].plugin).toBe('myplugin@mkt');
    expect(result.plugins[0].reason).toBe('security');
    expect(result.plugins[0].added_at).toBeTruthy();
  });

  it('is idempotent (calling twice does not duplicate)', async () => {
    await blockPlugin('myplugin@mkt', 'security', tmpDir);
    await blockPlugin('myplugin@mkt', 'security', tmpDir);
    const result = await readBlocklist(tmpDir);
    expect(result.plugins).toHaveLength(1);
  });
});

describe('unblockPlugin', () => {
  it('removes existing plugin', async () => {
    await blockPlugin('myplugin@mkt', 'security', tmpDir);
    await unblockPlugin('myplugin@mkt', tmpDir);
    const result = await readBlocklist(tmpDir);
    expect(result.plugins).toHaveLength(0);
  });

  it('is a no-op when plugin is not in list', async () => {
    await unblockPlugin('nonexistent@mkt', tmpDir);
    const result = await readBlocklist(tmpDir);
    expect(result.plugins).toHaveLength(0);
  });

  it('returns true when plugin was blocked and is now removed', async () => {
    await blockPlugin('myplugin@mkt', 'test', tmpDir);
    const removed = await unblockPlugin('myplugin@mkt', tmpDir);
    expect(removed).toBe(true);
  });

  it('returns false when plugin was not blocked', async () => {
    const removed = await unblockPlugin('notblocked@mkt', tmpDir);
    expect(removed).toBe(false);
  });
});

describe('setBlockedPlugins', () => {
  it('replaces entire blocked list', async () => {
    await blockPlugin('old@mkt', 'old reason', tmpDir);
    await setBlockedPlugins(['new1@mkt', 'new2@mkt'], 'bulk', tmpDir);
    const result = await readBlocklist(tmpDir);
    expect(result.plugins).toHaveLength(2);
    expect(result.plugins.map(p => p.plugin)).toContain('new1@mkt');
    expect(result.plugins.map(p => p.plugin)).toContain('new2@mkt');
    expect(result.plugins.map(p => p.plugin)).not.toContain('old@mkt');
  });
});
