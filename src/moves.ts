import * as fs from 'fs';
import * as path from 'path';

export function validateSkillName(name: string): void {
  if (!name || name === '.' || name === '..' || name === '.disabled' || /[/\\\x00-\x1f\x7f]/.test(name)) {
    throw new Error(`Invalid skill name: "${name}"`);
  }
}

function entryStat(file: string): fs.Stats | undefined {
  try { return fs.lstatSync(file); }
  catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return undefined;
    throw err;
  }
}

export function boundedDisabledDir(dir: string): string {
  const disabled = path.join(dir, '.disabled');
  const stat = entryStat(disabled);
  if (stat && (!stat.isDirectory() || stat.isSymbolicLink())) {
    throw new Error(`Disabled directory must be a real directory: ${disabled}`);
  }
  return disabled;
}

export function assertMoveAllowed(name: string, dir: string, enable: boolean, directory: boolean, missingMessage = `Skill "${name}" not found`): { src: string; dst: string; disabled: string } {
  validateSkillName(name);
  const disabled = boundedDisabledDir(dir);
  const entry = directory ? name : `${name}.md`;
  const src = path.join(enable ? disabled : dir, entry);
  const dst = path.join(enable ? dir : disabled, entry);
  const source = entryStat(src);
  if (enable && !source) throw new Error(missingMessage);
  if (entryStat(dst)) throw new Error(`Skill "${name}" is already ${enable ? 'active' : 'disabled'}`);
  if (!source || (directory && !fs.statSync(src).isDirectory())) throw new Error(missingMessage);
  return { src, dst, disabled };
}

export function moveSkill(name: string, dir: string, directory: boolean, enable: boolean, missingMessage: string): void {
  const { src, dst, disabled } = assertMoveAllowed(name, dir, enable, directory, missingMessage);
  fs.mkdirSync(enable ? dir : disabled, { recursive: true });
  // Preserve existing entries, including dangling links. These checks do not
  // make rename atomic against concurrent changes to the filesystem.
  fs.renameSync(src, dst);
}
