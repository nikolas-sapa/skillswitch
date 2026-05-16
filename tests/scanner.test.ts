// tests/scanner.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { extractDescription, scanStandaloneSkills } from '../src/scanner.js';

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
});
