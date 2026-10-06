import { Composition } from 'remotion';
import { StoreScreenshot } from './StoreScreenshot';
import { GithubPreview } from './GithubPreview';
import { ReleaseVideo } from './ReleaseVideo';

export function Root() {
  return (
    <>
      <Composition
        id="StoreScreenshot"
        component={StoreScreenshot}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={1}
        defaultProps={{ slideIndex: 0 }}
      />
      <Composition
        id="GithubPreview"
        component={GithubPreview}
        width={1600}
        height={900}
        fps={30}
        durationInFrames={1}
      />
      <Composition
        id="ReleaseVideo"
        component={ReleaseVideo}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={450}
      />
    </>
  );
}
