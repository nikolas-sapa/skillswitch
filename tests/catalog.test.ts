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
    expect(content.toLowerCase()).toContain('disabled');
  });

  it('returns the generated content as a string', () => {
    const result = generateCatalog(tmpDir);
    expect(typeof result).toBe('string');
    expect(result).toContain('Skills Catalog');
  });
});
