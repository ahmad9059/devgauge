export const slides = [
  {
    id: '01-dashboard',
    capture: 'dashboard',
    title: 'Your AI limits.\nOne glance.',
    description: 'See quota usage across your coding agents.',
    light: false,
  },
  {
    id: '02-providers',
    capture: 'providers',
    title: 'Every provider.\nOne place.',
    description: 'Six connections. One familiar dashboard.',
    light: true,
  },
  {
    id: '03-limits',
    capture: 'provider-detail',
    title: 'Know when\nyou reset.',
    description: 'Usage windows and reset times, together.',
    light: false,
  },
  {
    id: '04-alerts',
    capture: 'alerts',
    title: 'Set your\nown alerts.',
    description: 'Usage thresholds, reset reminders, quiet hours.',
    light: true,
  },
  {
    id: '05-privacy',
    capture: 'privacy',
    title: 'Your usage\nstays yours.',
    description: 'Local history. Encrypted storage. No cloud sync.',
    light: false,
  },
  {
    id: '06-settings',
    capture: 'settings',
    title: 'Make it\nyour own.',
    description: 'Appearance, text size, and local data controls.',
    light: true,
  },
] as const;

export const colors = {
  ink: '#080909',
  paper: '#f1f1ed',
  mutedDark: '#b4b5bc',
  mutedLight: '#54565b',
};
