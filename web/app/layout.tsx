import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

const title = 'Skillswitch — skill profiles for AI CLIs';
const description =
  'Every installed skill loads into every Claude Code session. Skillswitch disables the ones your task doesn’t need — profiles for Claude Code, Gemini CLI, Codex, Aider, Amp, and Factory Droid.';

export const metadata: Metadata = {
  metadataBase: new URL('https://skillswitch-landing.vercel.app'),
  title,
  description,
  openGraph: {
    title,
    description,
    url: '/',
    siteName: 'Skillswitch',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body className="bg-[#0a0a0a] text-[#ededed] font-[family-name:var(--font-geist-sans)] antialiased">
        {children}
      </body>
    </html>
  );
}
