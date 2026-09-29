import type { IconName } from '@/components/ui/icon';
import type { ProviderId } from '@/domain/providers';

// A single icon family (Material Design Icons), one glyph per provider so the
// card header has a recognizable mark beside the name.
const PROVIDER_ICONS: Record<ProviderId, IconName> = {
  claude: 'robot-outline',
  codex: 'code-braces',
  'command-code': 'console',
  'opencode-go': 'code-tags',
  'github-copilot': 'github',
  'gemini-cli': 'google',
};

export function providerIcon(id: ProviderId): IconName {
  return PROVIDER_ICONS[id];
}
