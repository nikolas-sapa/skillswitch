import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const alt = 'Skillswitch — skill profiles for AI CLIs';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '96px',
          background: '#0a0a0a',
          color: '#ededed',
          fontFamily: 'monospace',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, color: '#8f8f8f', marginBottom: 32 }}>
          $ npm install -g skillswitch
        </div>
        <div style={{ display: 'flex', fontSize: 76, fontWeight: 700, letterSpacing: '-0.02em' }}>
          skillswitch
        </div>
        <div style={{ display: 'flex', fontSize: 34, color: '#8f8f8f', marginTop: 28, maxWidth: 900 }}>
          Skill profiles for Claude Code, Gemini CLI, Codex, Aider, Amp, and Factory Droid.
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 64,
            paddingTop: 32,
            borderTop: '1px solid #2e2e2e',
            fontSize: 26,
            color: '#8f8f8f',
          }}
        >
          Only load the skills the current task needs.
        </div>
      </div>
    ),
    { ...size }
  );
}
