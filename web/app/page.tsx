'use client';

import { useState, useCallback } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Copy, Check } from 'lucide-react';

const MONO = 'var(--font-geist-mono), monospace';

/* ── Geist tokens ── */
const ACCENT = '#006bff'; // interaction only: links, primary CTA, focus
const SURFACE = '#171717';
const BORDER = '#2e2e2e';
const MUTED = '#8f8f8f';

const GITHUB_URL = 'https://github.com/nikolas-sapa/skillswitch';
const NPM_URL = 'https://www.npmjs.com/package/skillswitch';

function fallbackCopy(text: string) {
  const el = document.createElement('textarea');
  el.value = text;
  el.style.position = 'fixed';
  el.style.opacity = '0';
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
}

function useCopy(text: string) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    try {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } catch {
      fallbackCopy(text);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [text]);
  return { copied, copy };
}

function CopyInline({ text }: { text: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <button
      onClick={copy}
      style={{ fontFamily: MONO }}
      className={`text-[11px] px-1.5 py-0.5 rounded-[6px] cursor-pointer transition-colors tracking-[0.04em] flex items-center gap-1 ${copied ? 'text-[#47a447]' : 'text-white/40 hover:bg-white/10 hover:text-white'}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'copied' : 'copy'}
    </button>
  );
}

function CopyPrimary({ text }: { text: string }) {
  const { copied, copy } = useCopy(text);
  return (
    <button
      onClick={copy}
      style={{ background: copied ? '#0059d1' : ACCENT, fontFamily: MONO }}
      className="text-[11px] font-semibold text-white px-3.5 py-1.5 rounded-[6px] cursor-pointer tracking-[0.04em] transition-colors flex items-center gap-1.5 hover:bg-[#0059d1]"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'copied' : 'copy'}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      <span style={{ fontFamily: MONO, color: MUTED }} className="text-[10px] tracking-[0.14em] uppercase">{children}</span>
      <div className="flex-1 h-px" style={{ background: BORDER }} />
    </div>
  );
}

const CALC_ROWS: [string, string][] = [
  ['skills installed', '100'],
  ['tokens per skill entry (name + description)', '~40'],
];

/* Sourced from the CLI implementation (src/disable.ts, src/blocklist.ts, src/profiles.ts) */
const MECHANISM: [string, string][] = [
  ['standalone skills', 'moved to a .disabled/ subdirectory — nothing deleted, enable moves them back'],
  ['plugin skills', "written to Claude Code's own plugins/blocklist.json"],
  ['profiles', 'plain JSON in ~/.claude/skillctl/profiles.json — no telemetry, no network, no auth'],
];

const STEPS: [string, string, string][] = [
  ['01', 'skillswitch disable <name>', 'Turn off what the task doesn’t need. Substring match; --plugin disables whole plugins.'],
  ['02', 'skillswitch profile create dev', 'Snapshot the current enabled set as a named profile.'],
  ['03', 'skillswitch profile use dev', 'Switch sets with one command. --dry-run previews the change first.'],
];

const COMMANDS: [string, string][] = [
  ['skillswitch detect', '# which AI CLIs are installed'],
  ['skillswitch status', '# active vs disabled counts'],
  ['skillswitch list', '# all skills by source'],
  ['skillswitch disable <name>', '# disable a skill (or --plugin <id>)'],
  ['skillswitch enable <name>', '# re-enable it'],
  ['skillswitch profile create <name>', '# snapshot current enabled set'],
  ['skillswitch profile use <name>', '# activate a profile'],
  ['skillswitch catalog', '# generate ~/.claude/SKILLS.md'],
];

const COMPAT = ['Claude Code', 'Gemini CLI', 'Codex CLI', 'Aider', 'Amp', 'Factory Droid'];

const TERMINAL_LINES: [string, string][] = [
  ['$', 'skillswitch disable --plugin aso-skills@aso-skills'],
  ['$', 'skillswitch disable ads'],
  ['$', 'skillswitch profile create dev'],
  ['$', 'skillswitch profile use dev'],
];

const BADGES: [string, string, string][] = [
  ['https://img.shields.io/npm/v/skillswitch?style=flat-square&labelColor=171717&color=2e2e2e', 'npm version', NPM_URL],
  ['https://img.shields.io/npm/dm/skillswitch?style=flat-square&labelColor=171717&color=2e2e2e', 'npm downloads per month', NPM_URL],
  ['https://img.shields.io/github/stars/nikolas-sapa/skillswitch?style=flat-square&labelColor=171717&color=2e2e2e', 'GitHub stars', GITHUB_URL],
];

export default function SkillswitchLanding() {
  const reduceMotion = useReducedMotion();

  const fadeIn = (delay = 0) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 14 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const },
        };

  const reveal = reduceMotion
    ? {}
    : {
        initial: { opacity: 0, y: 22 },
        whileInView: { opacity: 1, y: 0 },
        viewport: { once: true, margin: '-60px' },
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
      };

  return (
    <div className="relative min-h-screen bg-[#0a0a0a] text-[#ededed] antialiased selection:bg-[#006bff]/30 selection:text-white">
      <div className="max-w-[720px] mx-auto px-6">

        {/* Nav */}
        <nav className="relative flex justify-between items-center py-5 mb-20 sticky top-0 z-50 bg-[#0a0a0a]/70 backdrop-blur-xl after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-[#2e2e2e]/80 after:to-transparent">
          <a href={GITHUB_URL} style={{ fontFamily: MONO }} className="text-[13px] font-semibold tracking-[0.04em] hover:text-white transition-colors">
            skillswitch
          </a>
          <ul className="flex gap-6 list-none">
            {([['#how-it-works', 'how it works'], ['#commands', 'commands'], ['#install', 'install'], [GITHUB_URL, 'github']] as const).map(
              ([href, label]) => (
                <li key={href}>
                  <a href={href} style={{ fontFamily: MONO, color: MUTED }} className="text-[12px] hover:text-white transition-colors tracking-[0.03em]">{label}</a>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* Hero */}
        <section className="mb-24">
          <motion.div {...fadeIn(0)}>
            <div className="inline-flex items-center gap-2 rounded-full border pl-3 pr-3 py-1 text-[11px] uppercase tracking-[0.12em] mb-6" style={{ fontFamily: MONO, borderColor: BORDER, color: MUTED, background: SURFACE }}>
              cli · context management
            </div>
          </motion.div>
          <motion.h1
            {...fadeIn(0.08)}
            style={{ fontSize: 'clamp(30px, 4.5vw, 46px)' }}
            className="font-semibold leading-[1.08] tracking-[-0.03em] text-[#ededed] mb-5 max-w-[600px]"
          >
            Every skill you install loads into every session.
          </motion.h1>
          <motion.p
            {...fadeIn(0.16)}
            style={{ color: MUTED }}
            className="text-[15px] leading-[1.7] max-w-[560px] mb-8"
          >
            Claude Code injects the name and description of every installed skill into every
            session — before you type a word. Skillswitch disables the ones the current task
            doesn&apos;t need, and saves the sets as profiles you switch with one command.
          </motion.p>
          <motion.div {...fadeIn(0.24)} className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2.5 rounded-[6px] px-4 py-2.5 border transition-colors" style={{ background: SURFACE, borderColor: BORDER }}>
              <code style={{ fontFamily: MONO }} className="text-[13px] font-medium text-[#ededed]">npm install -g skillswitch</code>
              <CopyInline text="npm install -g skillswitch" />
            </div>
            <a
              href={GITHUB_URL}
              style={{ fontFamily: MONO, color: ACCENT }}
              className="text-[13px] hover:text-[#0059d1] transition-colors"
            >
              View source on GitHub →
            </a>
          </motion.div>
          {/* Proof: real shields.io badges — npm package + public repo, both verified */}
          <motion.div {...fadeIn(0.32)} className="flex items-center gap-2 flex-wrap mt-6">
            {BADGES.map(([src, alt, href]) => (
              <a key={src} href={href} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt={alt} height={20} style={{ display: 'block' }} />
              </a>
            ))}
          </motion.div>
        </section>

        {/* The problem — one defensible number */}
        <motion.div {...reveal} className="mb-[72px]">
          <SectionLabel>the problem</SectionLabel>
          <div style={{ fontFamily: MONO, background: SURFACE, borderColor: BORDER }} className="border rounded-[12px] px-8 py-7 mb-6 overflow-x-auto">
            {CALC_ROWS.map(([label, value]) => (
              <div key={label} className="flex justify-between items-baseline py-[7px] border-b text-[13px] gap-6" style={{ borderColor: BORDER, color: MUTED }}>
                <span className="flex-1">{label}</span>
                <span className="font-semibold text-[#ededed] whitespace-nowrap">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-baseline mt-2 pt-4 text-[13px] gap-6">
              <span className="flex-1 text-[#ededed] font-medium">tokens injected per session, before your first message</span>
              <span className="font-bold text-[22px] whitespace-nowrap tracking-[-0.02em] text-[#ededed]">~4,000</span>
            </div>
          </div>
          <p style={{ color: MUTED }} className="leading-[1.7]">
            ~40 tokens per entry is an estimate — the exact cost depends on your descriptions.{' '}
            <code style={{ fontFamily: MONO }} className="text-[13px] text-[#ededed]">skillswitch status</code> shows how many skills
            you actually have active. More skills means worse signal-to-noise and less room for your actual work.
          </p>
        </motion.div>

        {/* How it works */}
        <motion.div {...reveal} className="mb-[72px]">
          <section id="how-it-works">
            <SectionLabel>how it works</SectionLabel>
            <p style={{ color: MUTED }} className="leading-[1.7] mb-7">
              Disable what you don&apos;t need, snapshot the result as a profile, switch profiles as the task changes.
            </p>
            {/* Signature element: the terminal */}
            <div style={{ fontFamily: MONO, background: SURFACE, borderColor: BORDER }} className="border rounded-[12px] px-6 py-5 mb-4 text-[13px] overflow-x-auto">
              {TERMINAL_LINES.map(([prompt, cmd], i) => (
                <div key={i} className="flex gap-3 py-0.5 leading-[1.6]">
                  <span className="select-none shrink-0" style={{ color: MUTED }}>{prompt}</span>
                  <span className="text-[#ededed]">{cmd}</span>
                </div>
              ))}
              <div className="h-2" />
              <div className="pl-5 text-[#47a447]">Profile &quot;dev&quot; active. Only its skills load in the next session.</div>
            </div>
            <div className="flex flex-col mb-8">
              {STEPS.map(([num, cmd, desc]) => (
                <div key={num} className="flex gap-5 py-5 border-b last:border-b-0" style={{ borderColor: BORDER }}>
                  <span style={{ fontFamily: MONO, color: MUTED }} className="text-[11px] tracking-[0.06em] pt-0.5 shrink-0 w-7">{num}</span>
                  <div className="flex-1">
                    <p style={{ fontFamily: MONO }} className="text-[13px] text-[#ededed] font-medium mb-1">{cmd}</p>
                    <p style={{ color: MUTED }} className="text-[13px] leading-[1.5]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
            {/* What actually happens on disk — sourced from src/disable.ts, src/blocklist.ts, src/profiles.ts */}
            <div className="border rounded-[12px] px-6 py-5" style={{ borderColor: BORDER }}>
              <p style={{ fontFamily: MONO, color: MUTED }} className="text-[10px] tracking-[0.14em] uppercase mb-3">what actually happens on disk</p>
              {MECHANISM.map(([what, how]) => (
                <p key={what} style={{ color: MUTED }} className="text-[13px] leading-[1.7]">
                  <span style={{ fontFamily: MONO }} className="text-[#ededed]">{what}</span> — {how}
                </p>
              ))}
            </div>
          </section>
        </motion.div>

        {/* Commands */}
        <motion.div {...reveal} className="mb-[72px]">
          <section id="commands">
            <SectionLabel>commands</SectionLabel>
            <div className="border rounded-[12px] overflow-hidden" style={{ background: SURFACE, borderColor: BORDER }}>
              {COMMANDS.map(([cmd, desc], i) => (
                <div key={cmd} className="flex justify-between items-baseline gap-6 px-5 py-3 hover:bg-white/[0.03] transition-colors border-b last:border-b-0" style={{ borderColor: BORDER }}>
                  <span style={{ fontFamily: MONO }} className="text-[12px] text-[#ededed] font-medium">{cmd}</span>
                  <span style={{ fontFamily: MONO, color: MUTED }} className="text-[11px] text-right whitespace-nowrap">{desc}</span>
                </div>
              ))}
            </div>
            <p style={{ color: MUTED }} className="text-[13px] leading-[1.7] mt-4">
              Full command list — profiles, export/import, audit, per-CLI flags — in the{' '}
              <a href={`${GITHUB_URL}#commands`} style={{ color: ACCENT }} className="hover:text-[#0059d1] transition-colors">README</a>.
            </p>
          </section>
        </motion.div>

        {/* Works with */}
        <motion.div {...reveal} className="mb-[72px]">
          <SectionLabel>works with</SectionLabel>
          <div style={{ fontFamily: MONO, color: MUTED }} className="flex flex-wrap text-[13px]">
            {COMPAT.map((name, i) => (
              <span key={name} className="flex items-center">
                {name}
                {i < COMPAT.length - 1 && <span className="text-white/20 px-2.5">·</span>}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Install */}
        <motion.div {...reveal} className="mb-[72px]">
          <section id="install">
            <SectionLabel>install</SectionLabel>
            <div className="border rounded-[12px] px-6 py-5 flex justify-between items-center gap-4 flex-wrap" style={{ background: SURFACE, borderColor: BORDER }}>
              <span style={{ fontFamily: MONO }} className="text-[14px] font-medium text-[#ededed]">npm install -g skillswitch</span>
              <CopyPrimary text="npm install -g skillswitch" />
            </div>
          </section>
        </motion.div>

        {/* Footer */}
        <footer className="border-t py-8 pb-12 flex justify-between items-center flex-wrap gap-3" style={{ borderColor: BORDER }}>
          <span style={{ fontFamily: MONO, color: MUTED }} className="text-[12px] tracking-[0.03em]">Open source. MIT license.</span>
          <div className="flex gap-5">
            <a href={NPM_URL} style={{ fontFamily: MONO, color: MUTED }} className="text-[12px] hover:text-white transition-colors">npm</a>
            <a href={GITHUB_URL} style={{ fontFamily: MONO, color: MUTED }} className="text-[12px] hover:text-white transition-colors">GitHub</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
