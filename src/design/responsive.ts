// Responsive layout helpers. Framework-free so `resolveLayout` can be
// unit-tested without a renderer, matching the other design token modules.
// The React Native window binding lives in `use-responsive-layout.ts`.
import { breakpoints } from './tokens';

export type WindowSize = 'small' | 'phone' | 'tablet';

export type LayoutInfo = {
  width: number;
  height: number;
  /** Device class from the shortest side, so rotation never changes it. */
  size: WindowSize;
  isTablet: boolean;
  isLandscape: boolean;
  /**
   * Centered cap for scrollable content so text lines stay readable and cards
   * do not stretch edge-to-edge on tablets and landscape phones. `0` means the
   * window is already narrower than the cap, so content fills the width.
   */
  contentMaxWidth: number;
};

/** ~840dp keeps body text near an optimal 60-75 character line length. */
export const wideContentMaxWidth = 840;

export function resolveLayout(width: number, height: number): LayoutInfo {
  const shortestSide = Math.min(width, height);
  const size: WindowSize =
    shortestSide >= breakpoints.tablet
      ? 'tablet'
      : shortestSide >= breakpoints.smallPhone
        ? 'phone'
        : 'small';

  return {
    width,
    height,
    size,
    isTablet: size === 'tablet',
    isLandscape: width > height,
    contentMaxWidth: width > wideContentMaxWidth ? wideContentMaxWidth : 0,
  };
}
