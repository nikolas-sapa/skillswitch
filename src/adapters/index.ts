// src/adapters/index.ts
import type { CliAdapter } from './types.js';
import { ClaudeAdapter } from './claude.js';
import { GeminiAdapter } from './gemini.js';
import { CodexAdapter } from './codex.js';
import { FactoryAdapter } from './factory.js';
import { AmpAdapter } from './amp.js';
import { AiderAdapter } from './aider.js';
import * as os from 'os';
import * as path from 'path';

export type { CliAdapter, AdapterSkill } from './types.js';
export { AiderAdapter } from './aider.js';

const ADAPTERS: Record<string, (claudeDir?: string) => CliAdapter> = {
  claude: (claudeDir) => new ClaudeAdapter(claudeDir ?? path.join(os.homedir(), '.claude')),
  gemini: () => new GeminiAdapter(),
  codex: () => new CodexAdapter(),
  droid: () => new FactoryAdapter(),
  amp: () => new AmpAdapter(),
  aider: () => new AiderAdapter(),
};

export const CLI_NAMES = Object.keys(ADAPTERS);

export function getAdapter(cli: string, claudeDir?: string): CliAdapter {
  const factory = ADAPTERS[cli.toLowerCase()];
  if (!factory) throw new Error(`Unknown CLI "${cli}". Valid options: ${CLI_NAMES.join(', ')}`);
  return factory(claudeDir);
}

export function getAllAdapters(): CliAdapter[] {
  return CLI_NAMES.map(name => ADAPTERS[name]());
}
