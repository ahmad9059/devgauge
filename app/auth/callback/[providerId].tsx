import { EmptyState, Screen, ScreenScroll } from '@/components/ui';

// Callback entrypoint only. It deliberately never reads, logs, or displays an
// authorization code; real handling is added in the provider phases.
export default function AuthCallbackScreen() {
  return (
    <Screen edges={['left', 'right', 'bottom']}>
      <ScreenScroll>
        <EmptyState
          icon="link-variant-off"
          title="Authorization is not configured"
          description="No provider authorization flow is enabled in this build. Callback handling arrives with the provider connectors."
        />
      </ScreenScroll>
    </Screen>
  );
}
