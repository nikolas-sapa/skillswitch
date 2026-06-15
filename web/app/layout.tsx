import type { Metadata } from 'next';
import { Sora, Plus_Jakarta_Sans, Geist_Mono } from 'next/font/google';
import './globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora' });
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-jakarta' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Skillswitch — context profiles for Claude Code',
  description: '100 skills installed. 3 active. Stop burning tokens on skills you don\'t need.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${jakarta.variable} ${mono.variable}`}>
      <body className="bg-[#0C0A0F] text-[#EDE9F2] font-[family-name:var(--font-jakarta)] antialiased">
        {children}
      </body>
    </html>
  );
}
