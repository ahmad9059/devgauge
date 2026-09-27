import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

import { resolveLayout, type LayoutInfo } from './responsive';

/** Live layout info; recomputes on rotation and multi-window resize. */
export function useResponsiveLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();
  return useMemo(() => resolveLayout(width, height), [width, height]);
}
