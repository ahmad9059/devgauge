import { Image, type ImageStyle } from 'react-native';

import type { ProviderId } from '@/domain/providers';

import claudeLogo from '../../../assets/providers/claude.png';
import codexLogo from '../../../assets/providers/codex.png';
import githubLogo from '../../../assets/providers/github-copilot.png';
import commandCodeLogo from '../../../assets/providers/command-code.png';
import openCodeLogo from '../../../assets/providers/opencode-go.png';
import antigravityLogo from '../../../assets/providers/gemini-cli.png';

const LOGOS: Record<ProviderId, number> = {
  claude: claudeLogo,
  codex: codexLogo,
  'github-copilot': githubLogo,
  'command-code': commandCodeLogo,
  'opencode-go': openCodeLogo,
  'gemini-cli': antigravityLogo,
};

/** Official provider mark beside the provider name. */
export function ProviderLogo({
  id,
  size = 22,
}: {
  id: ProviderId;
  size?: number;
}) {
  const style: ImageStyle = { width: size, height: size, borderRadius: 5 };
  return (
    <Image
      source={LOGOS[id]}
      style={style}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}
