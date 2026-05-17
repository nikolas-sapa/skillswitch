// tests/scanner.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractDescription, scanStandaloneSkills, scanPlugins } from '../src/scanner.js';

describe('extractDescription', () => {
  it('returns first non-empty, non-heading line', () => {
    expect(extractDescription('# Title\n\nDoes something useful.')).toBe('Does something useful.');
  });

  it('skips YAML frontmatter delimited by ---', () => {
    expect(extractDescription('---\nname: foo\n---\n# Title\n\nActual description.')).toBe('Actual description.');
  });

  it('returns empty string when only headings exist', () => {
    expect(extractDescription('# Title Only\n## Subtitle')).toBe('');
  });
});

describe('scanStandaloneSkills', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillctl-'));
    fs.mkdirSync(path.join(tmpDir, 'skills'));
  });

  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it('returns active skills from skills/', () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', 'plan.md'), '# Plan\n\nDesign implementation plans.');
    const result = scanStandaloneSkills(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'plan', status: 'active', description: 'Design implementation plans.' });
  });

  it('returns disabled skills from skills/.disabled/', () => {
    fs.mkdirSync(path.join(tmpDir, 'skills', '.disabled'));
    fs.writeFileSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'), '# Ads\n\nPaid advertising.');
    const result = scanStandaloneSkills(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ name: 'ads', status: 'disabled' });
  });

  it('ignores non-.md files', () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', 'notes.txt'), 'ignore');
    expect(scanStandaloneSkills(tmpDir)).toHaveLength(0);
  });

  it('returns both active and disabled skills when mixed', () => {
    fs.mkdirSync(path.join(tmpDir, 'skills', '.disabled'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'skills', 'plan.md'), '# Plan\n\nActive skill.');
    fs.writeFileSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'), '# Ads\n\nDisabled skill.');
    const result = scanStandaloneSkills(tmpDir);
    expect(result).toHaveLength(2);
    const plan = result.find(s => s.name === 'plan');
    const ads = result.find(s => s.name === 'ads');
    expect(plan?.status).toBe('active');
    expect(ads?.status).toBe('disabled');
  });
});

describe('scanPlugins', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillctl-'));
    fs.mkdirSync(path.join(tmpDir, 'plugins', 'cache', 'mkt', 'myplugin', '1.0.0', 'skills'), { recursive: true });
  });

  afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

  it('returns empty array when installed_plugins.json is absent', () => {
    expect(scanPlugins(tmpDir)).toHaveLength(0);
  });

  it('returns a PluginEntry with skills from cache', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 1, plugins: { 'myplugin@mkt': {} } })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'blocklist.json'),
      JSON.stringify({ fetchedAt: new Date().toISOString(), plugins: [] })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'cache', 'mkt', 'myplugin', '1.0.0', 'skills', 'deploy.md'),
      '# Deploy\n\nDeploys things.'
    );

    const result = scanPlugins(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'myplugin@mkt', status: 'active' });
    expect(result[0].skills[0]).toMatchObject({ name: 'myplugin:deploy', status: 'active', description: 'Deploys things.' });
  });

  it('marks plugin as disabled when in blocklist', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 1, plugins: { 'myplugin@mkt': {} } })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'blocklist.json'),
      JSON.stringify({ fetchedAt: new Date().toISOString(), plugins: [{ plugin: 'myplugin@mkt', added_at: new Date().toISOString(), reason: 'test' }] })
    );

    const result = scanPlugins(tmpDir);
    expect(result[0].status).toBe('disabled');
  });

  it('returns empty plugins array for orphan plugin with no cache dir', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 1, plugins: { 'orphan@mkt': {} } })
    );
    const result = scanPlugins(tmpDir);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('orphan@mkt');
    expect(result[0].skills).toHaveLength(0);
  });

  it('picks highest semver version when multiple versions exist', () => {
    // Create version dirs: 1.0.0, 1.0.9, 1.0.10 — only 1.0.10 has a skill
    const cacheBase = path.join(tmpDir, 'plugins', 'cache', 'mkt', 'myplugin');
    fs.mkdirSync(path.join(cacheBase, '1.0.9', 'skills'), { recursive: true });
    fs.mkdirSync(path.join(cacheBase, '1.0.10', 'skills'), { recursive: true });
    // Skill only in 1.0.10
    fs.writeFileSync(path.join(cacheBase, '1.0.10', 'skills', 'deploy.md'), '# Deploy\n\nLatest deploy.');

    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 1, plugins: { 'myplugin@mkt': {} } })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'blocklist.json'),
      JSON.stringify({ fetchedAt: new Date().toISOString(), plugins: [] })
    );

    const result = scanPlugins(tmpDir);
    expect(result[0].skills).toHaveLength(1);
    expect(result[0].skills[0].description).toBe('Latest deploy.');
  });

  it('returns empty plugins when installed_plugins.json is malformed JSON', () => {
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'installed_plugins.json'),
      '{ broken json'
    );
    const result = scanPlugins(tmpDir);
    expect(result).toHaveLength(0);
  });
});
