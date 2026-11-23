import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import * as os from 'os';
import * as path from 'path';

// Adapters resolve paths from os.homedir() at import time, so each test points
// HOME at a fresh temp dir and re-imports the registry.
let home: string;
let adapters: typeof import('../src/adapters/index.js');

beforeEach(async () => {
  home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'skillswitch-home-')));
  vi.stubEnv('HOME', home);
  if (os.homedir() !== home) throw new Error('HOME override not honored; refusing to touch the real home directory');
  vi.resetModules();
  adapters = await import('../src/adapters/index.js');
});
afterEach(() => {
  vi.unstubAllEnvs();
  fs.rmSync(home, { recursive: true, force: true });
});

function dirSkill(rel: string, description: string): void {
  const dir = path.join(home, rel);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${path.basename(rel)}\ndescription: ${description}\n---\nbody\n`);
}
function flatSkill(rel: string, content: string): void {
  fs.mkdirSync(path.dirname(path.join(home, rel)), { recursive: true });
  fs.writeFileSync(path.join(home, rel), content);
}
function exists(rel: string): boolean {
  return fs.existsSync(path.join(home, rel));
}

const dirAdapters = [
  { cli: 'gemini', primary: '.gemini/skills', marker: '.gemini' },
  { cli: 'amp', primary: '.config/amp/skills', marker: '.config/amp' },
  { cli: 'codex', primary: '.agents/skills', marker: '.codex' },
];

for (const { cli, primary, marker } of dirAdapters) {
  describe(`${cli} adapter`, () => {
    it('detects installation from its config dir', () => {
      const adapter = adapters.getAdapter(cli);
      expect(adapter.isInstalled()).toBe(false);
      fs.mkdirSync(path.join(home, marker), { recursive: true });
      expect(adapter.isInstalled()).toBe(true);
    });

    it('scans, disables and re-enables a directory skill', () => {
      dirSkill(`${primary}/research`, 'Research things');
      const adapter = adapters.getAdapter(cli);
      expect(adapter.scanSkills()).toEqual([{ name: 'research', status: 'active', description: 'Research things' }]);

      adapter.disableSkill('research');
      expect(exists(`${primary}/research`)).toBe(false);
      expect(exists(`${primary}/.disabled/research/SKILL.md`)).toBe(true);
      expect(adapter.scanSkills()).toEqual([{ name: 'research', status: 'disabled', description: 'Research things' }]);

      adapter.enableSkill('research');
      expect(exists(`${primary}/research/SKILL.md`)).toBe(true);
      expect(adapter.scanSkills().map(s => s.status)).toEqual(['active']);
    });

    it('ignores directories without SKILL.md', () => {
      fs.mkdirSync(path.join(home, primary, 'not-a-skill'), { recursive: true });
      expect(adapters.getAdapter(cli).scanSkills()).toEqual([]);
    });

    it('throws for unknown skills without creating directories', () => {
      const adapter = adapters.getAdapter(cli);
      expect(() => adapter.disableSkill('missing')).toThrow(/not found/);
      expect(() => adapter.enableSkill('missing')).toThrow(/not found/);
      expect(fs.readdirSync(home)).toEqual([]);
    });
  });
}

describe('shared ~/.agents/skills', () => {
  for (const cli of ['gemini', 'amp']) {
    it(`${cli} lists shared skills, prefers its own copy, and disables in the shared dir`, () => {
      const own = cli === 'gemini' ? '.gemini/skills' : '.config/amp/skills';
      dirSkill(`${own}/tdd`, 'Own copy');
      dirSkill('.agents/skills/tdd', 'Shared copy');
      dirSkill('.agents/skills/review', 'Shared review');
      const adapter = adapters.getAdapter(cli);
      expect(adapter.scanSkills()).toEqual([
        { name: 'tdd', status: 'active', description: 'Own copy' },
        { name: 'review', status: 'active', description: 'Shared review', group: 'shared' },
      ]);

      adapter.disableSkill('review');
      expect(exists('.agents/skills/.disabled/review/SKILL.md')).toBe(true);
      expect(adapters.getAdapter('codex').scanSkills().find(s => s.name === 'review')?.status).toBe('disabled');

      adapter.disableSkill('tdd');
      expect(exists(`${own}/.disabled/tdd/SKILL.md`)).toBe(true);
      expect(exists('.agents/skills/tdd/SKILL.md')).toBe(true);
    });
  }
});

describe('droid adapter', () => {
  it('scans droids and commands with groups and toggles each in its own dir', () => {
    flatSkill('.factory/droids/rev.md', '---\ndescription: A reviewer droid\n---\n');
    flatSkill('.factory/commands/deploy.md', '# Deploy\nShip it\n');
    flatSkill('.factory/commands/notes.txt', 'ignored');
    const adapter = adapters.getAdapter('droid');
    expect(adapter.isInstalled()).toBe(true);
    expect(adapter.scanSkills()).toEqual([
      { name: 'rev', status: 'active', description: 'A reviewer droid', group: 'droid' },
      { name: 'deploy', status: 'active', description: 'Ship it', group: 'command' },
    ]);

    adapter.disableSkill('deploy');
    expect(exists('.factory/commands/.disabled/deploy.md')).toBe(true);
    expect(exists('.factory/droids/.disabled')).toBe(false);
    expect(adapter.scanSkills().find(s => s.name === 'deploy')?.status).toBe('disabled');

    adapter.enableSkill('deploy');
    expect(exists('.factory/commands/deploy.md')).toBe(true);
    expect(() => adapter.disableSkill('missing')).toThrow(/not found in Factory Droid/);
  });
});

describe('aider adapter', () => {
  it('toggles flat skills and only lists active ones in the read: block', () => {
    flatSkill('.aider/skills/style.md', 'Style guide\n');
    flatSkill('.aider/skills/tests.md', 'Testing rules\n');
    const adapter = new adapters.AiderAdapter();
    expect(adapter.isInstalled()).toBe(true);
    const dir = path.join(home, '.aider', 'skills');
    expect(adapter.generateAiderConfig()).toBe(`read:\n  - ${path.join(dir, 'style.md')}\n  - ${path.join(dir, 'tests.md')}\n`);

    adapter.disableSkill('style');
    expect(exists('.aider/skills/.disabled/style.md')).toBe(true);
    expect(adapter.generateAiderConfig()).toBe(`read:\n  - ${path.join(dir, 'tests.md')}\n`);

    adapter.disableSkill('tests');
    expect(adapter.generateAiderConfig()).toBe('# No active aider skills\n');

    adapter.enableSkill('style');
    expect(adapter.scanSkills().filter(s => s.status === 'active').map(s => s.name)).toEqual(['style']);
  });

  it('is not installed without ~/.aider or ~/.aider.conf.yml', () => {
    const adapter = new adapters.AiderAdapter();
    expect(adapter.isInstalled()).toBe(false);
    fs.writeFileSync(path.join(home, '.aider.conf.yml'), '');
    expect(adapter.isInstalled()).toBe(true);
  });
});

describe('adapter registry', () => {
  it('rejects unknown CLIs and resolves names case-insensitively', () => {
    expect(() => adapters.getAdapter('cursor')).toThrow(/Unknown CLI "cursor"/);
    expect(adapters.getAdapter('GEMINI').cliName).toBe('gemini');
    expect(adapters.getAllAdapters().map(a => a.cliName)).toEqual(adapters.CLI_NAMES);
  });
});
