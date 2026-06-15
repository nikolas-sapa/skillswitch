'use client';

import { useState, useCallback, useEffect, useRef } from 'react';

const MONO = 'var(--font-geist-mono), monospace';
const DISPLAY = 'var(--font-sora), sans-serif';

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

/* Reveal on scroll — IntersectionObserver, no animation lib needed. */
function Reveal({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '-50px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(20px)',
        transition: `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

function Backdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at center, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
          maskImage: 'radial-gradient(ellipse 70% 45% at 50% 0%, #000 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 45% at 50% 0%, #000 20%, transparent 70%)',
        }}
      />
      <div
        className="absolute -top-32 left-1/2 -translate-x-1/2 h-[440px] w-[640px] rounded-full blur-[140px]"
        style={{ background: 'radial-gradient(ellipse, rgba(229,90,28,0.11), transparent 70%)' }}
      />
    </div>
  );
}

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
      style={{ fontFamily: MONO, background: 'none', border: 'none' }}
      className={`text-[11px] px-1.5 py-0.5 rounded cursor-pointer transition-all tracking-[0.04em] ${
        copied ? 'text-[#4CAF7D]' : 'text-[#5A5A6A] hover:bg-[#2A2A2E] hover:text-[#9A9AA8]'
      }`}
    >
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
      style={{ background: '#E55A1C', fontFamily: MONO, border: 'none' }}
      className={`text-[11px] font-semibold text-white px-3.5 py-1.5 rounded-[6px] cursor-pointer tracking-[0.04em] transition-all ${
        copied ? 'opacity-70' : 'hover:shadow-[0_0_20px_rgba(229,90,28,0.45)]'
      }`}
    >
      {copied ? 'copied' : 'copy'}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mb-7">
      <span style={{ fontFamily: MONO }} className="text-[10px] text-[#5A5A6A] tracking-[0.14em] uppercase">
        {children}
      </span>
      <div className="flex-1 h-px bg-[#2A2A2E]" />
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
    <div className="relative min-h-screen bg-[#0B0B0D] text-[#E8E8EC] antialiased selection:bg-[#E55A1C]/30 selection:text-[#E55A1C]">
      <Backdrop />
      <div className="max-w-[720px] mx-auto px-6">

        {/* Nav */}
        <nav className="flex justify-between items-center py-5 border-b border-[#2A2A2E] mb-20 sticky top-0 z-50 bg-[#0B0B0D]/70 backdrop-blur-xl">
          <a href="#" style={{ fontFamily: MONO }} className="text-[13px] font-semibold tracking-[0.04em] text-[#E8E8EA]">
            skillswitch
          </a>
          <ul className="flex gap-6 list-none">
            {([['#how-it-works', 'how it works'], ['#commands', 'commands'], ['#install', 'install']] as const).map(
              ([href, label]) => (
                <li key={href}>
                  <a
                    href={href}
                    style={{ fontFamily: MONO }}
                    className="text-[12px] text-[#5A5A6A] hover:text-[#9A9AA8] transition-colors tracking-[0.03em]"
                  >
                    {label}
                  </a>
                </li>
              )
            )}
          </ul>
        </nav>

        {/* Hero */}
        <section className="mb-[88px]">
          <p style={{ fontFamily: MONO }} className="text-[11px] text-[#E55A1C] tracking-[0.12em] uppercase mb-5">
            cli · context management
          </p>
          <h1
            style={{ fontFamily: DISPLAY, fontSize: 'clamp(30px, 4.5vw, 44px)' }}
            className="font-bold leading-[1.1] tracking-[-0.03em] text-[#F3F2EE] mb-5 max-w-[600px]"
          >
            100 skills installed. <span className="text-[#E55A1C]">95 of them</span> in your context window right now.
          </h1>
          <p className="text-[#9A9AA8] text-[15px] leading-[1.7] max-w-[560px] mb-8">
            Every Claude Code skill you install gets injected into every session. With 100 skills,
            that&apos;s thousands of tokens burned before your first message. Skillswitch lets you
            create profiles — enable only what the current task needs.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 bg-[#1A1A1E] border border-[#3A3A3F] rounded-[6px] px-4 py-2.5 hover:border-[#E55A1C]/40 transition-colors">
              <code style={{ fontFamily: MONO }} className="text-[13px] text-[#E55A1C] font-medium">
                npm install -g skillswitch
              </code>
              <CopyInline text="npm install -g skillswitch" />
            </div>
          </div>
        </section>

        {/* The problem — calc table */}
        <Reveal className="mb-[72px]">
          <SectionLabel>the problem</SectionLabel>
          <div
            style={{ fontFamily: MONO }}
            className="relative bg-[#1A1A1E] border border-[#2A2A2E] rounded-[12px] px-8 py-7 mb-6 overflow-hidden"
          >
            <div
              aria-hidden
              className="absolute top-0 left-0 right-0 h-px"
              style={{ background: 'linear-gradient(90deg, #E55A1C 0%, transparent 55%)' }}
            />
            {CALC_ROWS.map(([label, value]) => (
              <div
                key={label}
                className="flex justify-between items-baseline py-[7px] border-b border-[#2A2A2E] text-[13px] text-[#9A9AA8] gap-6 last:border-b-0"
              >
                <span className="flex-1">{label}</span>
                <span className="font-semibold text-[#E8E8EA] whitespace-nowrap">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-baseline mt-2 pt-4 border-t border-[#3A3A3F] text-[13px] gap-6">
              <span className="flex-1 text-[#E8E8EA] font-medium">wasted tokens / day</span>
              <span className="font-bold text-[#E55A1C] text-[22px] whitespace-nowrap tracking-[-0.02em]">80,000</span>
            </div>
            <p className="text-[12px] text-[#5A5A6A] mt-4 tracking-[0.05em]">
              Just. From. Skill. Names.
            </p>
          </div>
          <p className="text-[#9A9AA8] leading-[1.7]">
            Claude Code reads your entire skill list on every invocation. More skills = worse
            signal-to-noise, closer to context limits before you&apos;ve typed anything.
          </p>
        </Reveal>

        {/* How it works */}
        <Reveal className="mb-[72px]">
          <section id="how-it-works">
            <SectionLabel>how it works</SectionLabel>
            <p className="text-[#9A9AA8] leading-[1.7] mb-7">
              Create profiles. Switch between them. Only the skills in the active profile are visible to Claude.
            </p>
            <div
              style={{ fontFamily: MONO }}
              className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-[12px] px-6 py-5 mb-4 text-[13px] overflow-x-auto"
            >
              {TERMINAL_LINES.map(([prompt, cmd], i) => (
                <div key={i} className="flex gap-3 py-0.5 leading-[1.6]">
                  <span className="text-[#E55A1C] select-none shrink-0">{prompt}</span>
                  <span className="text-[#E8E8EA]">{cmd}</span>
                </div>
              ))}
              <div className="h-2" />
              <div className="text-[#4CAF7D] pl-5">Now Claude only sees 2 skills. Not 100.</div>
            </div>
            <div className="flex flex-col">
              {STEPS.map(([num, cmd, desc]) => (
                <div key={num} className="flex gap-5 py-5 border-b border-[#2A2A2E] last:border-b-0">
                  <span
                    style={{ fontFamily: MONO }}
                    className="text-[11px] text-[#E55A1C] tracking-[0.06em] pt-0.5 shrink-0 w-7"
                  >
                    {num}
                  </span>
                  <div className="flex-1">
                    <p style={{ fontFamily: MONO }} className="text-[13px] text-[#E8E8EA] font-medium mb-1">
                      {cmd}
                    </p>
                    <p className="text-[13px] text-[#5A5A6A] leading-[1.5]">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Commands */}
        <Reveal className="mb-[72px]">
          <section id="commands">
            <SectionLabel>commands</SectionLabel>
            <div className="bg-[#1A1A1E] border border-[#2A2A2E] rounded-[12px] overflow-hidden">
              {COMMANDS.map(([cmd, desc], i) => (
                <div
                  key={cmd}
                  className={`flex justify-between items-baseline gap-6 px-5 py-3 hover:bg-[#202024] transition-colors ${
                    i < COMMANDS.length - 1 ? 'border-b border-[#2A2A2E]' : ''
                  }`}
                >
                  <span style={{ fontFamily: MONO }} className="text-[12px] text-[#E8E8EA] font-medium">
                    {cmd}
                  </span>
                  <span style={{ fontFamily: MONO }} className="text-[11px] text-[#5A5A6A] text-right whitespace-nowrap">
                    {desc}
                  </span>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        {/* Works with */}
        <Reveal className="mb-[72px]">
          <SectionLabel>works with</SectionLabel>
          <div style={{ fontFamily: MONO }} className="flex flex-wrap text-[13px] text-[#9A9AA8]">
            {COMPAT.map((name, i) => (
              <span key={name} className="flex items-center">
                {name}
                {i < COMPAT.length - 1 && <span className="text-[#3A3A3F] px-2.5">·</span>}
              </span>
            ))}
          </div>
        </Reveal>

        {/* Install */}
        <Reveal className="mb-[72px]">
          <section id="install">
            <SectionLabel>install</SectionLabel>
            <div className="bg-[#1A1A1E] border border-[#2A2A2E] border-l-2 border-l-[#E55A1C] rounded-[12px] px-6 py-5 flex justify-between items-center gap-4 flex-wrap">
              <span style={{ fontFamily: MONO }} className="text-[14px] text-[#E55A1C] font-medium">
                npm install -g skillswitch
              </span>
              <CopyPrimary text="npm install -g skillswitch" />
            </div>
          </section>
        </Reveal>

        {/* Footer */}
        <footer className="border-t border-[#2A2A2E] py-8 pb-12 flex justify-between items-center flex-wrap gap-3">
          <span style={{ fontFamily: MONO }} className="text-[12px] text-[#5A5A6A] tracking-[0.03em]">
            Open source. MIT license.
          </span>
          <a
            href="https://github.com/nikolas-sapa/skillswitch"
            style={{ fontFamily: MONO }}
            className="text-[12px] text-[#5A5A6A] hover:text-[#9A9AA8] transition-colors"
          >
            GitHub
          </a>
        </footer>
      </div>
    </div>
  );
}
