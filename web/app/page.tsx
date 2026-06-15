'use client';

import { useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { Copy, Check, ChevronRight } from 'lucide-react';

const MONO = 'var(--font-geist-mono), monospace';
const DISPLAY = 'var(--font-sora), sans-serif';

/* ── Palette ── Violet → Fuchsia on violet-tinted near-black. Unique to Skillswitch. */
const A = '#A855F7'; // violet
const A2 = '#D946EF'; // fuchsia

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

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(255,255,255,0.028) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 70% 45% at 50% 0%, #000 22%, transparent 72%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 45% at 50% 0%, #000 22%, transparent 72%)',
        }}
      />
      <div
        className="absolute -top-40 left-1/2 -translate-x-1/2 h-[480px] w-[720px] rounded-full blur-[150px] opacity-55"
        style={{ background: `radial-gradient(ellipse, ${A}33, ${A2}1a 45%, transparent 70%)` }}
      />
    </div>
  );
}

function BlurIn({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, filter: 'blur(8px)', y: 14 }}
      animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

const reveal = {
  initial: { opacity: 0, y: 22 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const },
};

function CopyInline({ text }: { text: string }) {
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
  return (
    <button
      onClick={copy}
      style={{ fontFamily: MONO, color: copied ? A : undefined }}
      className="text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-all tracking-[0.04em] text-white/40 hover:bg-white/10 hover:text-white flex items-center gap-1"
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'copied' : 'copy'}
    </button>
  );
}

function CopyPrimary({ text }: { text: string }) {
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
  return (
    <button
      onClick={copy}
      style={{ background: `linear-gradient(135deg, ${A}, ${A2})`, fontFamily: MONO }}
      className={`text-[11px] font-semibold text-white px-3.5 py-1.5 rounded-[6px] cursor-pointer tracking-[0.04em] transition-all flex items-center gap-1.5 ${copied ? 'opacity-70' : 'hover:shadow-[0_0_22px_rgba(168,85,247,0.5)]'}`}
    >
      {copied ? <Check size={12} /> : <Copy size={12} />}
      {copied ? 'copied' : 'copy'}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      <span style={{ fontFamily: MONO }} className="text-[10px] text-white/35 tracking-[0.14em] uppercase">{children}</span>
      <div className="flex-1 h-px bg-white/[0.08]" />
    </div>
  );
}

const CALC_ROWS = [
  ['skills installed', '100'],
  ['avg tokens per skill name', '~40'],
  ['tokens burned per session', '4,000'],
  ['sessions per day', '20'],
];

const STEPS = [
  ['01', 'create a profile', 'Name it for the task: backend, frontend, writing, data. One profile per context.'],
  ['02', 'enable only what you need', 'Add specific skills to the profile. Three for frontend. Four for a backend service. Zero overhead from the rest.'],
  ['03', 'switch when the task changes', "One command. Claude's next session sees a clean, focused skill list."],
];

const COMMANDS = [
  ['skillswitch list', '# see all installed skills'],
  ['skillswitch profile create NAME', '# new profile'],
  ['skillswitch enable SKILL', '# add to active profile'],
  ['skillswitch disable SKILL', '# remove from active profile'],
  ['skillswitch switch PROFILE', '# switch active profile'],
  ['skillswitch status', '# current profile + active skills'],
];

const COMPAT = ['Claude Code', 'Superpowers', 'Any skill-based system'];

const TERMINAL_LINES = [
  ['$', 'skillswitch profile create backend'],
  ['$', 'skillswitch enable database'],
  ['$', 'skillswitch enable backend'],
  ['$', 'skillswitch switch backend'],
];

export default function SkillswitchLanding() {
  return (
    <div className="relative min-h-screen bg-[#0C0A0F] text-[#EDE9F2] antialiased selection:bg-[#A855F7]/30 selection:text-white">
      <Backdrop />
      <div className="max-w-[720px] mx-auto px-6">

        {/* Nav */}
        <nav className="flex justify-between items-center py-5 border-b border-white/[0.07] mb-20 sticky top-0 z-50 bg-[#0C0A0F]/70 backdrop-blur-xl">
          <a href="#" style={{ fontFamily: MONO }} className="text-[13px] font-semibold tracking-[0.04em]">
            <span style={{ background: `linear-gradient(135deg, ${A}, ${A2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>skill</span>switch
          </a>
          <ul className="flex gap-6 list-none">
            {([['#how-it-works', 'how it works'], ['#commands', 'commands'], ['#install', 'install']] as const).map(
              ([href, label]) => (
                <li key={href}>
                  <a href={href} style={{ fontFamily: MONO }} className="text-[12px] text-white/40 hover:text-white transition-colors tracking-[0.03em]">{label}</a>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* Hero */}
        <section className="mb-[88px]">
          <BlurIn>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.10] bg-white/[0.04] pl-3 pr-2 py-1 text-[11px] uppercase tracking-[0.12em] font-mono text-white/55 mb-6" style={{ fontFamily: MONO }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: A }} />
              cli · context management
              <ChevronRight size={13} className="text-white/30" />
            </div>
          </BlurIn>
          <motion.h1
            initial={{ opacity: 0, filter: 'blur(8px)', y: 14 }}
            animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px, 4.5vw, 46px)' }}
            className="font-bold leading-[1.08] tracking-[-0.03em] text-[#F6F2FB] mb-5 max-w-[600px]"
          >
            100 skills installed.{' '}
            <span style={{ background: `linear-gradient(135deg, ${A}, ${A2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>95 of them</span>{' '}
            in your context window right now.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-white/50 text-[15px] leading-[1.7] max-w-[560px] mb-8"
          >
            Every Claude Code skill you install gets injected into every session. With 100 skills,
            that&apos;s thousands of tokens burned before your first message. Skillswitch lets you
            create profiles — enable only what the current task needs.
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 bg-white/[0.03] border border-white/10 rounded-[8px] px-4 py-2.5 hover:border-[#A855F7]/40 transition-colors">
              <code style={{ fontFamily: MONO, color: A }} className="text-[13px] font-medium">npm install -g skillswitch</code>
              <CopyInline text="npm install -g skillswitch" />
            </div>
          </motion.div>
        </section>

        {/* The problem — calc table */}
        <motion.div {...reveal} className="mb-[72px]">
          <SectionLabel>the problem</SectionLabel>
          <div style={{ fontFamily: MONO }} className="relative bg-white/[0.02] border border-white/[0.08] rounded-[14px] px-8 py-7 mb-6 overflow-hidden">
            <div aria-hidden className="absolute top-0 left-0 right-0 h-px" style={{ background: `linear-gradient(90deg, ${A} 0%, transparent 55%)` }} />
            {CALC_ROWS.map(([label, value]) => (
              <div key={label} className="flex justify-between items-baseline py-[7px] border-b border-white/[0.06] text-[13px] text-white/55 gap-6 last:border-b-0">
                <span className="flex-1">{label}</span>
                <span className="font-semibold text-[#F6F2FB] whitespace-nowrap">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-baseline mt-2 pt-4 border-t border-white/[0.10] text-[13px] gap-6">
              <span className="flex-1 text-[#F6F2FB] font-medium">wasted tokens / day</span>
              <span className="font-bold text-[22px] whitespace-nowrap tracking-[-0.02em]" style={{ background: `linear-gradient(135deg, ${A}, ${A2})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>80,000</span>
            </div>
            <p className="text-[12px] text-white/35 mt-4 tracking-[0.05em]">Just. From. Skill. Names.</p>
          </div>
          <p className="text-white/50 leading-[1.7]">
            Claude Code reads your entire skill list on every invocation. More skills = worse
            signal-to-noise, closer to context limits before you&apos;ve typed anything.
          </p>
        </motion.div>

        {/* How it works */}
        <motion.div {...reveal} className="mb-[72px]">
          <section id="how-it-works">
            <SectionLabel>how it works</SectionLabel>
            <p className="text-white/50 leading-[1.7] mb-7">Create profiles. Switch between them. Only the skills in the active profile are visible to Claude.</p>
            <div style={{ fontFamily: MONO }} className="bg-white/[0.02] border border-white/[0.08] rounded-[14px] px-6 py-5 mb-4 text-[13px] overflow-x-auto">
              {TERMINAL_LINES.map(([prompt, cmd], i) => (
                <div key={i} className="flex gap-3 py-0.5 leading-[1.6]">
                  <span className="select-none shrink-0" style={{ color: A }}>{prompt}</span>
                  <span className="text-[#EDE9F2]">{cmd}</span>
                </div>
              ))}
              <div className="h-2" />
              <div className="pl-5" style={{ color: A2 }}>Now Claude only sees 2 skills. Not 100.</div>
            </div>
            <div className="flex flex-col">
              {STEPS.map(([num, cmd, desc]) => (
                <div key={num} className="flex gap-5 py-5 border-b border-white/[0.06] last:border-b-0">
                  <span style={{ fontFamily: MONO, color: A }} className="text-[11px] tracking-[0.06em] pt-0.5 shrink-0 w-7">{num}</span>
                  <div className="flex-1">
                    <p style={{ fontFamily: MONO }} className="text-[13px] text-[#EDE9F2] font-medium mb-1">{cmd}</p>
                    <p className="text-[13px] text-white/40 leading-[1.5]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </motion.div>

        {/* Commands */}
        <motion.div {...reveal} className="mb-[72px]">
          <section id="commands">
            <SectionLabel>commands</SectionLabel>
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-[14px] overflow-hidden">
              {COMMANDS.map(([cmd, desc], i) => (
                <div key={cmd} className={`flex justify-between items-baseline gap-6 px-5 py-3 hover:bg-white/[0.03] transition-colors ${i < COMMANDS.length - 1 ? 'border-b border-white/[0.06]' : ''}`}>
                  <span style={{ fontFamily: MONO }} className="text-[12px] text-[#EDE9F2] font-medium">{cmd}</span>
                  <span style={{ fontFamily: MONO }} className="text-[11px] text-white/35 text-right whitespace-nowrap">{desc}</span>
                </div>
              ))}
            </div>
          </section>
        </motion.div>

        {/* Works with */}
        <motion.div {...reveal} className="mb-[72px]">
          <SectionLabel>works with</SectionLabel>
          <div style={{ fontFamily: MONO }} className="flex flex-wrap text-[13px] text-white/55">
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
            <div className="bg-white/[0.02] border border-white/[0.08] rounded-[14px] px-6 py-5 flex justify-between items-center gap-4 flex-wrap relative overflow-hidden">
              <div aria-hidden className="absolute left-0 top-0 bottom-0 w-[2px]" style={{ background: `linear-gradient(180deg, ${A}, ${A2})` }} />
              <span style={{ fontFamily: MONO, color: A }} className="text-[14px] font-medium">npm install -g skillswitch</span>
              <CopyPrimary text="npm install -g skillswitch" />
            </div>
          </section>
        </motion.div>

        {/* Footer */}
        <footer className="border-t border-white/[0.07] py-8 pb-12 flex justify-between items-center flex-wrap gap-3">
          <span style={{ fontFamily: MONO }} className="text-[12px] text-white/35 tracking-[0.03em]">Open source. MIT license.</span>
          <a href="https://github.com/nikolas-sapa/skillswitch" style={{ fontFamily: MONO }} className="text-[12px] text-white/35 hover:text-white transition-colors">GitHub</a>
        </footer>
      </div>
    </div>
  );
}
