import { AbsoluteFill, Img, staticFile } from 'remotion';
import { colors, slides } from './design';
import './style.css';
import { Fonts } from './Fonts';

/**
 * THESIS: Real DevGauge usage earns interest; no fabricated interface or device chrome.
 * OWN-WORLD: Existing monochrome palette, Geist lettering, and the supplied gauge mark.
 * STORY: One capability per image, proved by a real screen with labeled sample data.
 * FIRST VIEWPORT: Brand at top, two-line headline, readable full capture, small footer.
 * FORM: Brief-pinned restrained portrait series, code-led Remotion composition.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
export function StoreScreenshot({ slideIndex = 0 }: { slideIndex?: number }) {
  const slide = slides[slideIndex];
  const foreground = slide.light ? colors.ink : colors.paper;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: slide.light ? colors.paper : colors.ink,
        color: foreground,
        fontFamily: 'Geist',
        padding: 68,
      }}
    >
      <Fonts />
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          fontSize: 30,
          fontWeight: 600,
        }}
      >
        <Img
          src={staticFile('brand/logo.png')}
          style={{
            width: 43,
            height: 38,
            objectFit: 'contain',
            filter: slide.light ? 'invert(1)' : undefined,
          }}
        />
        DevGauge
      </div>
      <h1
        style={{
          fontSize: 76,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
          fontWeight: 600,
          whiteSpace: 'pre-line',
          margin: '44px 0 22px',
        }}
      >
        {slide.title}
      </h1>
      <p
        style={{
          fontSize: 28,
          lineHeight: 1.4,
          margin: 0,
          color: slide.light ? colors.mutedLight : colors.mutedDark,
        }}
      >
        {slide.description}
      </p>
      <div
        style={{
          position: 'absolute',
          top: 416,
          left: 150,
          width: 780,
          height: 1386.6667,
          overflow: 'hidden',
          borderRadius: 20,
          boxShadow: slide.light
            ? '0 24px 56px rgba(0,0,0,0.16)'
            : '0 24px 56px rgba(0,0,0,0.5)',
        }}
      >
        <Img
          src={staticFile(`captures/${slide.capture}.png`)}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
      <div
        style={{
          position: 'absolute',
          left: 68,
          right: 68,
          bottom: 48,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 21,
          color: slide.light ? colors.mutedLight : colors.mutedDark,
        }}
      >
        <span>Android · Local-first</span>
        <span>Actual app · Sample data</span>
      </div>
    </AbsoluteFill>
  );
}
