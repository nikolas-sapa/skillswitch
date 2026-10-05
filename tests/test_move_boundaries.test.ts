import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { disableSkill, enableSkill, enableAll } from '../src/disable.js';
import { disableFlatSkill, enableFlatSkill, disableDirSkill, enableDirSkill, scanDirSkills } from '../src/adapters/helpers.js';

let tmpDir: string;
let skillsDir: string;
const movers = [
  { label: 'Claude', directory: false, disable: (name: string) => disableSkill(name, tmpDir), enable: (name: string) => enableSkill(name, tmpDir) },
  { label: 'flat adapter', directory: false, disable: (name: string) => disableFlatSkill(name, skillsDir), enable: (name: string) => enableFlatSkill(name, skillsDir) },
  { label: 'directory adapter', directory: true, disable: (name: string) => disableDirSkill(name, skillsDir), enable: (name: string) => enableDirSkill(name, skillsDir) },
];

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'skillswitch-moves-'));
  skillsDir = path.join(tmpDir, 'skills');
  fs.mkdirSync(path.join(skillsDir, '.disabled'), { recursive: true });
});
afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function skillPath(base: string, directory: boolean): string {
  return path.join(base, directory ? 'plan' : 'plan.md');
}
function writeSkill(file: string, directory: boolean, content: string): void {
  if (directory) fs.mkdirSync(file);
  fs.writeFileSync(directory ? path.join(file, 'SKILL.md') : file, content);
}
function readSkill(file: string, directory: boolean): string {
  return fs.readFileSync(directory ? path.join(file, 'SKILL.md') : file, 'utf-8');
}

for (const mover of movers) {
  describe(mover.label, () => {
    for (const direction of ['disable', 'enable'] as const) {
      it(`${direction} preserves both entries on collision`, () => {
        const active = skillPath(skillsDir, mover.directory);
        const disabled = skillPath(path.join(skillsDir, '.disabled'), mover.directory);
        writeSkill(active, mover.directory, 'active bytes');
        writeSkill(disabled, mover.directory, 'disabled bytes');
        expect(() => mover[direction]('plan')).toThrow();
        expect(readSkill(active, mover.directory)).toBe('active bytes');
        expect(readSkill(disabled, mover.directory)).toBe('disabled bytes');
      });

      it(`${direction} treats a dangling destination symlink as a collision`, () => {
        const active = skillPath(skillsDir, mover.directory);
        const disabled = skillPath(path.join(skillsDir, '.disabled'), mover.directory);
        const src = direction === 'disable' ? active : disabled;
        const dst = direction === 'disable' ? disabled : active;
        writeSkill(src, mover.directory, 'source bytes');
        const missing = path.join(tmpDir, 'missing');
        fs.symlinkSync(missing, dst);
        expect(() => mover[direction]('plan')).toThrow();
        expect(readSkill(src, mover.directory)).toBe('source bytes');
        expect(fs.readlinkSync(dst)).toBe(missing);
      });

      it(`${direction} rejects invalid names before any rename`, () => {
        const rename = vi.spyOn(fs, 'renameSync');
        for (const name of ['', '.', '..', '../outside', 'folder/plan', 'folder\\plan', '.disabled']) {
          expect(() => mover[direction](name)).toThrow(/name/i);
        }
        expect(rename).toHaveBeenCalledTimes(0);
      });

      it(`${direction} rejects a symlinked disabled directory with no outside writes`, () => {
        const disabledDir = path.join(skillsDir, '.disabled');
        fs.rmdirSync(disabledDir);
        const outside = path.join(tmpDir, 'outside');
        fs.mkdirSync(outside);
        fs.symlinkSync(outside, disabledDir);
        const src = skillPath(direction === 'disable' ? skillsDir : outside, mover.directory);
        writeSkill(src, mover.directory, 'source bytes');
        const rename = vi.spyOn(fs, 'renameSync');
        expect(() => mover[direction]('plan')).toThrow(/disabled/i);
        expect(rename).toHaveBeenCalledTimes(0);
        expect(readSkill(src, mover.directory)).toBe('source bytes');
        expect(fs.readdirSync(outside)).toEqual(direction === 'enable' ? [mover.directory ? 'plan' : 'plan.md'] : []);
      });
    }

    it('round trips a valid skill with exact bytes', () => {
      const active = skillPath(skillsDir, mover.directory);
      const disabled = skillPath(path.join(skillsDir, '.disabled'), mover.directory);
      writeSkill(active, mover.directory, '# Plan\nExact bytes.\n');
      mover.disable('plan');
      expect(fs.existsSync(active)).toBe(false);
      expect(readSkill(disabled, mover.directory)).toBe('# Plan\nExact bytes.\n');
      mover.enable('plan');
      expect(fs.existsSync(disabled)).toBe(false);
      expect(readSkill(active, mover.directory)).toBe('# Plan\nExact bytes.\n');
    });

    it('round trips a source symlink without moving its target', () => {
      const target = path.join(tmpDir, mover.directory ? 'shared-skill' : 'shared.md');
      writeSkill(target, mover.directory, 'shared bytes');
      const active = skillPath(skillsDir, mover.directory);
      const disabled = skillPath(path.join(skillsDir, '.disabled'), mover.directory);
      fs.symlinkSync(target, active);
      mover.disable('plan');
      expect(fs.readlinkSync(disabled)).toBe(target);
      expect(readSkill(target, mover.directory)).toBe('shared bytes');
      mover.enable('plan');
      expect(fs.readlinkSync(active)).toBe(target);
      expect(readSkill(target, mover.directory)).toBe('shared bytes');
    });
  });
}

it('enableAll rejects a symlinked disabled directory without moving outside skills', () => {
  fs.rmdirSync(path.join(skillsDir, '.disabled'));
  const outside = path.join(tmpDir, 'outside');
  fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'plan.md'), 'outside bytes');
  fs.symlinkSync(outside, path.join(skillsDir, '.disabled'));
  const rename = vi.spyOn(fs, 'renameSync');
  expect(() => enableAll(tmpDir)).toThrow(/disabled/i);
  expect(rename).toHaveBeenCalledTimes(0);
  expect(fs.readFileSync(path.join(outside, 'plan.md'), 'utf-8')).toBe('outside bytes');
});

it('directory scanning includes only directories with SKILL.md', () => {
  fs.mkdirSync(path.join(skillsDir, 'notes'));
  fs.writeFileSync(path.join(skillsDir, 'notes', 'notes.md'), 'not a skill');
  writeSkill(path.join(skillsDir, 'plan'), true, '# Plan\nPlanning.');
  writeSkill(path.join(skillsDir, '.disabled', 'ship'), true, '# Ship\nShipping.');
  expect(scanDirSkills(skillsDir).map(({ name, status }) => ({ name, status }))).toEqual([
    { name: 'plan', status: 'active' }, { name: 'ship', status: 'disabled' },
  ]);
});
