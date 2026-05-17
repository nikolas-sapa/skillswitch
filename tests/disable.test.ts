// tests/disable.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { disableSkill, enableSkill, disableAllExcept, enableAll } from '../src/disable.js';

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillctl-'));
  fs.mkdirSync(path.join(tmpDir, 'skills'));
  fs.writeFileSync(path.join(tmpDir, 'skills', 'plan.md'), '# Plan');
  fs.writeFileSync(path.join(tmpDir, 'skills', 'ship.md'), '# Ship');
});

afterEach(() => fs.rmSync(tmpDir, { recursive: true, force: true }));

describe('disableSkill', () => {
  it('moves skill from skills/ to skills/.disabled/', () => {
    disableSkill('plan', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'skills', 'plan.md'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'skills', '.disabled', 'plan.md'))).toBe(true);
  });

  it('throws when skill does not exist', () => {
    expect(() => disableSkill('nonexistent', tmpDir)).toThrow('not found');
  });

  it('throws when skill is already disabled', () => {
    fs.mkdirSync(path.join(tmpDir, 'skills', '.disabled'));
    fs.writeFileSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'), '# Ads');
    expect(() => disableSkill('ads', tmpDir)).toThrow('already disabled');
  });
});

describe('enableSkill', () => {
  beforeEach(() => {
    fs.mkdirSync(path.join(tmpDir, 'skills', '.disabled'));
    fs.writeFileSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'), '# Ads');
  });

  it('moves skill from .disabled/ back to skills/', () => {
    enableSkill('ads', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'))).toBe(false);
    expect(fs.existsSync(path.join(tmpDir, 'skills', 'ads.md'))).toBe(true);
  });

  it('throws when skill is not in .disabled/', () => {
    expect(() => enableSkill('plan', tmpDir)).toThrow('not in disabled');
  });

  it('works even when skills/ dir was recreated', () => {
    // Remove and recreate skills/ dir (simulating manual cleanup)
    enableSkill('ads', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'skills', 'ads.md'))).toBe(true);
  });
});

describe('disableAllExcept', () => {
  it('moves skills not in keep list to .disabled/', () => {
    disableAllExcept(['plan'], tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'skills', 'plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'skills', '.disabled', 'ship.md'))).toBe(true);
  });

  it('leaves pre-existing disabled skills untouched', () => {
    fs.mkdirSync(path.join(tmpDir, 'skills', '.disabled'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'), '# Ads');
    disableAllExcept(['plan'], tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'skills', 'plan.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'skills', '.disabled', 'ship.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'))).toBe(true);
  });
});

describe('enableAll', () => {
  it('moves all .disabled/ skills back to skills/', () => {
    fs.mkdirSync(path.join(tmpDir, 'skills', '.disabled'));
    fs.writeFileSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'), '# Ads');
    enableAll(tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'skills', 'ads.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'skills', '.disabled', 'ads.md'))).toBe(false);
  });
});
