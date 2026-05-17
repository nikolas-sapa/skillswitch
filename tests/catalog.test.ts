// tests/catalog.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { generateCatalog } from '../src/catalog.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillctl-'));
  fs.mkdirSync(path.join(tmpDir, 'skills'));
  fs.mkdirSync(path.join(tmpDir, 'plugins'));
  fs.writeFileSync(path.join(tmpDir, 'plugins', 'installed_plugins.json'), JSON.stringify({ version: 1, plugins: {} }));
  fs.writeFileSync(path.join(tmpDir, 'plugins', 'blocklist.json'), JSON.stringify({ fetchedAt: new Date().toISOString(), plugins: [] }));
});

afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

describe('generateCatalog', () => {
  it('writes SKILLS.md to claude dir root', () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', 'plan.md'), '# Plan\n\nDesign implementation plans.');
    generateCatalog(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'SKILLS.md'))).toBe(true);
  });

  it('includes active skill name and description', () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', 'plan.md'), '# Plan\n\nDesign implementation plans.');
    generateCatalog(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'SKILLS.md'), 'utf-8');
    expect(content).toContain('plan');
    expect(content).toContain('Design implementation plans.');
  });

  it('includes disabled skills in disabled section', () => {
    fs.mkdirSync(path.join(tmpDir, 'skills', '.disabled'));
    fs.writeFileSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'), '# Ads\n\nPaid advertising.');
    generateCatalog(tmpDir);
    const content = fs.readFileSync(path.join(tmpDir, 'SKILLS.md'), 'utf-8');
    expect(content).toContain('ads');
    expect(content).toMatch(/disabled[\s\S]*ads/i);
  });

  it('returns the generated content as a string', () => {
    const result = generateCatalog(tmpDir);
    expect(typeof result).toBe('string');
    expect(result).toContain('Skills Catalog');
  });

  it('produces valid header with zero skills', () => {
    const result = generateCatalog(tmpDir);
    expect(result).toContain('Active: 0 | Disabled: 0');
    expect(result).not.toContain('##');
  });

  it('includes active plugin section in SKILLS.md', () => {
    fs.mkdirSync(path.join(tmpDir, 'plugins', 'cache', 'mkt', 'myplugin', '1.0.0', 'skills'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 1, plugins: { 'myplugin@mkt': {} } })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'cache', 'mkt', 'myplugin', '1.0.0', 'skills', 'deploy.md'),
      '# Deploy\n\nDeploys the app.'
    );

    const result = generateCatalog(tmpDir);
    expect(result).toContain('Plugin: myplugin — active');
    expect(result).toContain('myplugin:deploy');
    expect(result).toContain('Deploys the app.');
  });

  it('includes disabled plugin section when plugin is blocked', () => {
    fs.mkdirSync(path.join(tmpDir, 'plugins', 'cache', 'mkt', 'myplugin', '1.0.0', 'skills'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'installed_plugins.json'),
      JSON.stringify({ version: 1, plugins: { 'myplugin@mkt': {} } })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'blocklist.json'),
      JSON.stringify({
        fetchedAt: new Date().toISOString(),
        plugins: [{ plugin: 'myplugin@mkt', added_at: new Date().toISOString(), reason: 'test' }],
      })
    );
    fs.writeFileSync(
      path.join(tmpDir, 'plugins', 'cache', 'mkt', 'myplugin', '1.0.0', 'skills', 'deploy.md'),
      '# Deploy\n\nDeploys the app.'
    );

    const result = generateCatalog(tmpDir);
    expect(result).toContain('Plugin: myplugin — DISABLED');
  });

  it('escapes pipe characters in skill descriptions', () => {
    fs.writeFileSync(path.join(tmpDir, 'skills', 'plan.md'), '# Plan\n\nDo A | B and C.');
    const result = generateCatalog(tmpDir);
    const tableRow = result.split('\n').find(line => line.includes('plan'));
    expect(tableRow).toBeDefined();
    expect(tableRow).toContain('\\|');
  });
});
