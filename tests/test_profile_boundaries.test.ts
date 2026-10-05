import { beforeEach, afterEach, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { importProfile, saveProfile, activateProfile, readProfileStore, renameProfile, copyProfile } from '../src/profiles.js';
import { blockPlugin } from '../src/blocklist.js';
let dir: string;
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillswitch-boundary-'));
  fs.mkdirSync(path.join(dir, 'skills'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'plugins'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'skills', 'keep.md'), 'keep original');
});
afterEach(() => fs.rmSync(dir, { recursive: true, force: true }));
it('rejects imported non-string skill entries before writing', () => {
  expect(() => importProfile(JSON.stringify({ name: 'bad', skills: [1], plugins: [] }), dir)).toThrow();
  expect(fs.existsSync(path.join(dir, 'skillctl', 'profiles.json'))).toBe(false);
});
it('preflights malformed installed inventory before moving skills', async () => {
  saveProfile('empty', [], [], dir);
  const before = fs.readFileSync(path.join(dir, 'skillctl', 'profiles.json'), 'utf8');
  fs.writeFileSync(path.join(dir, 'plugins', 'installed_plugins.json'), '{ broken');
  await expect(activateProfile('empty', dir)).rejects.toThrow();
  expect(fs.readFileSync(path.join(dir, 'skills', 'keep.md'), 'utf8')).toBe('keep original');
  expect(fs.readFileSync(path.join(dir, 'skillctl', 'profiles.json'), 'utf8')).toBe(before);
  expect(fs.existsSync(path.join(dir, 'plugins', 'blocklist.json'))).toBe(false);
});
it('rejects corrupt profile stores without resetting or overwriting', () => {
  fs.mkdirSync(path.join(dir, 'skillctl'));
  const file = path.join(dir, 'skillctl', 'profiles.json');
  fs.writeFileSync(file, '{ broken');
  expect(() => readProfileStore(dir)).toThrow();
  expect(() => saveProfile('new', [], [], dir)).toThrow();
  expect(fs.readFileSync(file, 'utf8')).toBe('{ broken');
});
it('does not follow predictable profile or blocklist temporary symlinks', async () => {
  fs.mkdirSync(path.join(dir, 'skillctl'));
  const marker = path.join(dir, 'marker');
  fs.writeFileSync(marker, 'original');
  const profileTemp = path.join(dir, 'skillctl', 'profiles.json.tmp');
  const blockTemp = path.join(dir, 'plugins', 'blocklist.json.tmp');
  fs.symlinkSync(marker, profileTemp);
  fs.symlinkSync(marker, blockTemp);
  saveProfile('safe', [], [], dir);
  await blockPlugin('test@fixture', 'fixture', dir);
  expect(fs.readFileSync(marker, 'utf8')).toBe('original');
  expect(fs.lstatSync(profileTemp).isSymbolicLink()).toBe(true);
  expect(fs.lstatSync(blockTemp).isSymbolicLink()).toBe(true);
});
it('rejects valid JSON with an invalid profile store shape', () => {
  fs.mkdirSync(path.join(dir, 'skillctl'));
  fs.writeFileSync(path.join(dir, 'skillctl', 'profiles.json'), '{"active":null,"previous":null,"profiles":[]}');
  expect(() => readProfileStore(dir)).toThrow();
});
it('preflights every collision before moving the first skill', async () => {
  saveProfile('empty', [], [], dir);
  fs.mkdirSync(path.join(dir, 'skills', '.disabled'));
  fs.writeFileSync(path.join(dir, 'skills', 'a.md'), 'active a');
  fs.writeFileSync(path.join(dir, 'skills', 'b.md'), 'active b');
  fs.writeFileSync(path.join(dir, 'skills', '.disabled', 'b.md'), 'disabled b');
  await expect(activateProfile('empty', dir)).rejects.toThrow('already disabled');
  expect(fs.readFileSync(path.join(dir, 'skills', 'keep.md'), 'utf8')).toBe('keep original');
  expect(fs.readFileSync(path.join(dir, 'skills', 'a.md'), 'utf8')).toBe('active a');
  expect(fs.readFileSync(path.join(dir, 'skills', 'b.md'), 'utf8')).toBe('active b');
  expect(fs.readFileSync(path.join(dir, 'skills', '.disabled', 'b.md'), 'utf8')).toBe('disabled b');
  expect(fs.existsSync(path.join(dir, 'plugins', 'blocklist.json'))).toBe(false);
});

it.each(['../bad', '__proto__', 'constructor', ''])('rejects invalid rename/copy destination %s without changing store', (name) => {
  saveProfile('dev', [], [], dir);
  const file = path.join(dir, 'skillctl', 'profiles.json');
  const before = fs.readFileSync(file, 'utf8');
  expect(() => renameProfile('dev', name, dir)).toThrow();
  expect(fs.readFileSync(file, 'utf8')).toBe(before);
  expect(() => copyProfile('dev', name, dir)).toThrow();
  expect(fs.readFileSync(file, 'utf8')).toBe(before);
});
