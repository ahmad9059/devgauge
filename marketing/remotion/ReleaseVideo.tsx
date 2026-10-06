import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from 'remotion';
import { StoreScreenshot } from './StoreScreenshot';
import { slides } from './design';

export function ReleaseVideo() {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      {slides.map((slide, index) => {
        const local = frame - index * 90;
        const opacity = interpolate(local, [0, 8, 80, 89], [0, 1, 1, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        return (
          <Sequence key={slide.id} from={index * 90} durationInFrames={90}>
            <AbsoluteFill style={{ opacity }}>
              <StoreScreenshot slideIndex={index} />
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
