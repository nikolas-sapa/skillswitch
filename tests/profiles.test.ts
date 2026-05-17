// tests/profiles.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
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
} from '../src/profiles.js';

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
    expect(store.previous).toBeNull();
    expect(store.profiles).toEqual({});
  });

  it('returns empty store when file contains malformed JSON', () => {
    fs.mkdirSync(path.join(tmpDir, 'skillctl'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'skillctl', 'profiles.json'), '{ broken');
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

  it('sets updatedAt on save', () => {
    saveProfile('dev', ['plan'], [], tmpDir);
    const store = readProfileStore(tmpDir);
    expect(store.profiles['dev'].updatedAt).toBeTruthy();
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

  it('throws when profile does not exist', () => {
    expect(() => deleteProfile('nonexistent', tmpDir)).toThrow('does not exist');
  });
});

describe('renameProfile', () => {
  it('renames a profile, old name is gone', () => {
    saveProfile('dev', ['plan'], [], tmpDir);
    renameProfile('dev', 'development', tmpDir);
    const store = readProfileStore(tmpDir);
    expect(store.profiles['dev']).toBeUndefined();
    expect(store.profiles['development']).toBeDefined();
    expect(store.profiles['development'].skills).toEqual(['plan']);
  });

  it('updates active pointer when renaming active profile', () => {
    saveProfile('dev', ['plan'], [], tmpDir);
    const store = readProfileStore(tmpDir);
    store.active = 'dev';
    fs.mkdirSync(path.join(tmpDir, 'skillctl'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'skillctl', 'profiles.json'), JSON.stringify(store));
    renameProfile('dev', 'development', tmpDir);
    expect(readProfileStore(tmpDir).active).toBe('development');
  });

  it('throws when source does not exist', () => {
    expect(() => renameProfile('nonexistent', 'new', tmpDir)).toThrow('does not exist');
  });

  it('throws when destination already exists', () => {
    saveProfile('dev', ['plan'], [], tmpDir);
    saveProfile('prod', ['ship'], [], tmpDir);
    expect(() => renameProfile('dev', 'prod', tmpDir)).toThrow('already exists');
  });
});

describe('copyProfile', () => {
  it('copies profile, both names exist with same skills', () => {
    saveProfile('dev', ['plan', 'ship'], ['vercel@mkt'], tmpDir);
    copyProfile('dev', 'staging', tmpDir);
    const store = readProfileStore(tmpDir);
    expect(store.profiles['dev']).toBeDefined();
    expect(store.profiles['staging']).toBeDefined();
    expect(store.profiles['staging'].skills).toEqual(['plan', 'ship']);
    expect(store.profiles['staging'].plugins).toEqual(['vercel@mkt']);
  });

  it('throws when source does not exist', () => {
    expect(() => copyProfile('nonexistent', 'copy', tmpDir)).toThrow('does not exist');
  });

  it('throws when destination already exists', () => {
    saveProfile('dev', ['plan'], [], tmpDir);
    saveProfile('prod', ['ship'], [], tmpDir);
    expect(() => copyProfile('dev', 'prod', tmpDir)).toThrow('already exists');
  });
});

describe('diffProfile', () => {
  it('shows skills to disable and enable', () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', 'plan.md'), '# Plan');
    fs.writeFileSync(path.join(tmpDir, 'skills', '.disabled', 'ship.md'), '# Ship');
    saveProfile('dev', ['ship'], [], tmpDir); // ship should be enabled, plan should be disabled

    const diff = diffProfile('dev', tmpDir);
    expect(diff.toDisable).toContain('plan');
    expect(diff.toEnable).toContain('ship');
  });

  it('throws when profile does not exist', () => {
    expect(() => diffProfile('nonexistent', tmpDir)).toThrow('does not exist');
  });
});

describe('exportProfile / importProfile', () => {
  it('round-trips a profile through export and import', () => {
    saveProfile('dev', ['plan', 'ship'], ['vercel@mkt'], tmpDir);
    const json = exportProfile('dev', tmpDir);
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('dev');
    expect(parsed.skills).toEqual(['plan', 'ship']);

    // Import into a different name by modifying the JSON
    const importJson = JSON.stringify({ ...parsed, name: 'imported-dev' });
    const importedName = importProfile(importJson, tmpDir);
    expect(importedName).toBe('imported-dev');
    const store = readProfileStore(tmpDir);
    expect(store.profiles['imported-dev'].skills).toEqual(['plan', 'ship']);
  });

  it('exportProfile throws when profile does not exist', () => {
    expect(() => exportProfile('nonexistent', tmpDir)).toThrow('does not exist');
  });

  it('importProfile throws on invalid JSON', () => {
    expect(() => importProfile('{ bad json', tmpDir)).toThrow('Invalid JSON');
  });

  it('importProfile throws when required fields are missing', () => {
    expect(() => importProfile(JSON.stringify({ name: 'foo' }), tmpDir)).toThrow('must have');
  });
});

describe('validateProfile', () => {
  it('detects ghost skills (in profile but not on disk)', () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', 'plan.md'), '# Plan');
    saveProfile('dev', ['plan', 'ghost'], [], tmpDir);
    const result = validateProfile('dev', tmpDir);
    expect(result.validSkills).toContain('plan');
    expect(result.ghostSkills).toContain('ghost');
  });

  it('finds skills in .disabled as valid', () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'), '# Ads');
    saveProfile('dev', ['ads'], [], tmpDir);
    const result = validateProfile('dev', tmpDir);
    expect(result.validSkills).toContain('ads');
    expect(result.ghostSkills).toHaveLength(0);
  });

  it('throws when profile does not exist', () => {
    expect(() => validateProfile('nonexistent', tmpDir)).toThrow('does not exist');
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

  it('sets previous to the old active profile when switching', async () => {
    saveProfile('full', [], [], tmpDir);
    saveProfile('dev', [], [], tmpDir);
    await activateProfile('full', tmpDir);
    await activateProfile('dev', tmpDir);
    const store = readProfileStore(tmpDir);
    expect(store.previous).toBe('full');
    expect(store.active).toBe('dev');
  });

  it('silently skips ghost skills that are in profile but not on disk', async () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', 'plan.md'), '# Plan');
    saveProfile('dev', ['plan', 'ghost'], [], tmpDir);
    const result = await activateProfile('dev', tmpDir);
    // Should not throw, ghost skill simply not found in either dir
    expect(result.enabled).not.toContain('ghost');
    expect(result.disabled).not.toContain('ghost');
  });
});
