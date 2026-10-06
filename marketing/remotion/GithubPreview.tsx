import { AbsoluteFill, Img, staticFile } from 'remotion';
import { colors } from './design';
import './style.css';
import { Fonts } from './Fonts';

export function GithubPreview() {
  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.ink,
        color: colors.paper,
        fontFamily: 'Geist',
      }}
    >
      <Fonts />
      <div
        style={{
          position: 'absolute',
          left: 84,
          top: 84,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          fontSize: 38,
          fontWeight: 600,
        }}
      >
        <Img src={staticFile('brand/logo.png')} style={{ width: 64 }} />
        DevGauge
      </div>
      <h1
        style={{
          position: 'absolute',
          left: 84,
          top: 258,
          fontSize: 90,
          lineHeight: 1.04,
          letterSpacing: '-0.03em',
          margin: 0,
          fontWeight: 600,
        }}
      >
        Your AI limits.
        <br />
        One glance.
      </h1>
      <p
        style={{
          position: 'absolute',
          left: 84,
          top: 510,
          width: 620,
          fontSize: 30,
          lineHeight: 1.5,
          color: colors.mutedDark,
        }}
      >
        Quotas, resets, and alerts.
        <br />
        One local-first Android dashboard.
      </p>
      <div
        style={{
          position: 'absolute',
          left: 84,
          bottom: 84,
          fontSize: 25,
          color: colors.mutedDark,
        }}
      >
        github.com/ahmad9059/devgauge
      </div>
      {['dashboard', 'provider-detail'].map((capture, index) => (
        <div
          key={capture}
          style={{
            position: 'absolute',
            top: index === 0 ? 88 : 192,
            left: index === 0 ? 842 : 1202,
            width: 312,
            height: 554.6667,
            overflow: 'hidden',
            borderRadius: 16,
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
          }}
        >
          <Img
            src={staticFile(`captures/${capture}.png`)}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
      ))}
      <div
        style={{
          position: 'absolute',
          bottom: 84,
          right: 84,
          fontSize: 20,
          color: colors.mutedDark,
        }}
      >
        Actual app captures · Sample data
      </div>
    </AbsoluteFill>
  );
}
