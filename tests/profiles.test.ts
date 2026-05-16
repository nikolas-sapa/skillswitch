// tests/profiles.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { readProfileStore, saveProfile, deleteProfile, activateProfile } from '../src/profiles.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillctl-'));
  fs.mkdirSync(path.join(tmpDir, 'skills'));
  fs.mkdirSync(path.join(tmpDir, 'skills', '.disabled'), { recursive: true });
  fs.mkdirSync(path.join(tmpDir, 'plugins'));
  fs.writeFileSync(path.join(tmpDir, 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 1, plugins: {} }));
  fs.writeFileSync(path.join(tmpDir, 'plugins', 'blocklist.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), plugins: [] }));
});

afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

describe('readProfileStore', () => {
  it('returns empty store when file absent', () => {
    const store = readProfileStore(tmpDir);
    expect(store.active).toBeNull();
    expect(store.profiles).toEqual({});
  });
});

describe('saveProfile', () => {
  it('persists profile to profiles.json', () => {
    saveProfile('dev', ['plan', 'ship'], ['vercel@mkt'], tmpDir);
    const store = readProfileStore(tmpDir);
    expect(store.profiles['dev'].skills).toEqual(['plan', 'ship']);
    expect(store.profiles['dev'].plugins).toEqual(['vercel@mkt']);
  });
});

describe('deleteProfile', () => {
  it('removes the profile', () => {
    saveProfile('dev', ['plan'], [], tmpDir);
    deleteProfile('dev', tmpDir);
    expect(readProfileStore(tmpDir).profiles['dev']).toBeUndefined();
  });

  it('throws when deleting the active profile', () => {
    saveProfile('dev', ['plan'], [], tmpDir);
    const store = readProfileStore(tmpDir);
    store.active = 'dev';
    fs.mkdirSync(path.join(tmpDir, 'skillctl'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'skillctl', 'profiles.json'), JSON.stringify(store));
    expect(() => deleteProfile('dev', tmpDir)).toThrow('Cannot delete active profile');
  });
});

describe('activateProfile', () => {
  it('disables standalone skills not in profile', async () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', 'plan.md'), '# Plan');
    fs.writeFileSync(path.join(tmpDir, 'skills', 'ads.md'), '# Ads');
    saveProfile('dev', ['plan'], [], tmpDir);

    const result = await activateProfile('dev', tmpDir);

    expect(fs.existsSync(path.join(tmpDir, 'skills', 'plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'skills', 'ads.md'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'))).toBe(true);
    expect(result.disabled).toContain('ads');
  });

  it('enables disabled skills that are in the profile', async () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', '.disabled', 'ship.md'), '# Ship');
    saveProfile('dev', ['ship'], [], tmpDir);

    const result = await activateProfile('dev', tmpDir);

    expect(fs.existsSync(path.join(tmpDir, 'skills', 'ship.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'skills', '.disabled', 'ship.md'))).toBe(false);
    expect(result.enabled).toContain('ship');
  });

  it('throws when profile does not exist', async () => {
    await expect(activateProfile('nonexistent', tmpDir)).rejects.toThrow('does not exist');
  });

  it('blocks plugins not in profile and returns pluginsBlocked', async () => {
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 1, plugins: { 'vercel@mkt': {}, 'ads@mkt': {} } })
    );
    saveProfile('dev', [], ['vercel@mkt'], tmpDir);

    const result = await activateProfile('dev', tmpDir);

    expect(result.pluginsBlocked).toContain('ads@mkt');
    expect(result.pluginsBlocked).not.toContain('vercel@mkt');
  });
});
