import { beforeAll, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

beforeAll(() => execFileSync('npm', ['run', 'build'], { stdio: 'pipe' }));

it('writes catalog only to --out and leaves default catalog intact', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillswitch-cli-'));
  try {
    fs.mkdirSync(path.join(dir, 'skills'));
    fs.writeFileSync(path.join(dir, 'SKILLS.md'), 'keep default');
    const out = path.join(dir, 'chosen.md');
    const result = spawnSync(process.execPath, ['dist/cli.js', '--claude-dir', dir, 'catalog', '--out', out], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(fs.readFileSync(out, 'utf8')).toContain('Skills Catalog');
    expect(fs.readFileSync(path.join(dir, 'SKILLS.md'), 'utf8')).toBe('keep default');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

it.each([['profile', 'list'], ['catalog'], ['audit']])('rejects unsupported non-Claude target for %s', (...command) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillswitch-cli-'));
  try {
    const result = spawnSync(process.execPath, ['dist/cli.js', '--claude-dir', dir, '--for', 'codex', ...command], { encoding: 'utf8' });
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Claude');
    expect(fs.readdirSync(dir)).toEqual([]);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

it('reports the manifest version from the actual built CLI', () => {
  const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const result = spawnSync(process.execPath, ['dist/cli.js', '--version'], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  expect(result.stdout.trim()).toBe(manifest.version);
});
it('forced profile deletion ignores predictable temporary symlinks', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillswitch-cli-'));
  try {
    fs.mkdirSync(path.join(dir, 'skillctl'));
    const file = path.join(dir, 'skillctl', 'profiles.json');
    fs.writeFileSync(file, JSON.stringify({ active: 'dev', previous: null, profiles: { dev: { created: 'fixture', skills: [], plugins: [] } } }));
    const marker = path.join(dir, 'marker');
    fs.writeFileSync(marker, 'keep marker');
    fs.symlinkSync(marker, file + '.tmp');
    const result = spawnSync(process.execPath, ['dist/cli.js', '--claude-dir', dir, 'profile', 'delete', 'dev', '--force'], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(fs.readFileSync(marker, 'utf8')).toBe('keep marker');
    expect(fs.lstatSync(file + '.tmp').isSymbolicLink()).toBe(true);
    expect(JSON.parse(fs.readFileSync(file, 'utf8')).active).toBe(null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
