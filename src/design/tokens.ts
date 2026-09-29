// Framework-free design tokens so they can be unit-tested without a renderer.
// Components import these through the theme provider, never as raw hex values.

export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export type SpacingToken = keyof typeof spacing;

// 4/8-point rhythm with 16/24/32 section tiers.
export const sectionSpacing = {
  tight: spacing.lg,
  regular: spacing.xl,
  loose: spacing.xxl,
} as const;

// Restrained radii: Vercel surfaces are near-square, not pill-shaped.
export const radii = {
  xs: 3,
  sm: 5,
  control: 6,
  card: 8,
  sheet: 12,
  pill: 999,
} as const;

export const borderWidths = {
  none: 0,
  thin: 1,
  thick: 2,
} as const;

// Android accessibility contract: interactive targets are at least 48dp.
export const touchTargets = {
  minimum: 48,
  comfortable: 56,
  large: 64,
  iconButton: 48,
  tabBar: 60,
} as const;

export const fontSizes = {
  caption: 12,
  label: 13,
  body: 15,
  subheading: 16,
  heading: 20,
  title: 24,
  display: 32,
} as const;

export const lineHeights = {
  caption: 16,
  label: 18,
  body: 22,
  heading: 26,
  title: 30,
  display: 38,
} as const;

export const fontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const letterSpacing = {
  tighter: -0.4,
  tight: -0.2,
  normal: 0,
  wide: 0.2,
} as const;

export const opacities = {
  disabled: 0.4,
  muted: 0.6,
  pressed: 0.85,
} as const;

export const iconSizes = {
  sm: 16,
  md: 18,
  lg: 20,
  xl: 28,
} as const;

// Android elevation (dp) for raised surfaces, paired with the surface ramp.
export const elevations = {
  none: 0,
  low: 2,
  high: 6,
} as const;

// Layout breakpoints for phone / large phone / tablet.
export const breakpoints = {
  smallPhone: 360,
  phone: 420,
  tablet: 720,
} as const;
