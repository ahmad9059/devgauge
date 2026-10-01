import type { ProviderId } from '@/domain/providers';

export type ConnectorMetadata = {
  authMethod: string;
  dataSummary: string;
  retention: string;
};

/**
 * Plain-language connection facts shown before any CTA. These describe the
 * intended Phase 6/8 flows and make no claim that a connector is enabled.
 */
export const connectorMetadata: Record<ProviderId, ConnectorMetadata> = {
  claude: {
    authMethod: 'In-app session',
    dataSummary: 'Five-hour and weekly usage',
    retention: 'On this device',
  },
  codex: {
    authMethod: 'In-app session',
    dataSummary: 'Five-hour and weekly usage',
    retention: 'On this device',
  },
  'github-copilot': {
    authMethod: 'In-app session',
    dataSummary: 'Monthly request allowance',
    retention: 'On this device',
  },
  'command-code': {
    authMethod: 'In-app session',
    dataSummary: 'Five-hour and weekly usage',
    retention: 'On this device',
  },
  'opencode-go': {
    authMethod: 'In-app session',
    dataSummary: 'Five-hour and weekly usage',
    retention: 'On this device',
  },
  'gemini-cli': {
    authMethod: 'In-app session',
    dataSummary: 'Hourly and weekly usage',
    retention: 'On this device',
  },
};
