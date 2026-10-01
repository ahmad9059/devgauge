const TAB_ORDER = ['usage', 'connectors', 'settings'] as const;

export function swipeDestination(tab: string, dx: number, dy: number) {
  if (Math.abs(dx) < 64 || Math.abs(dx) < Math.abs(dy) * 2) return null;
  const index = TAB_ORDER.findIndex((name) => name === tab);
  if (index < 0) return null;
  return TAB_ORDER[index + (dx > 0 ? 1 : -1)] ?? null;
}
