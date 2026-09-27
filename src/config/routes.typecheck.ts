import type { Href } from 'expo-router';

// CI generates Expo Router types before typecheck. If generation is missing,
// the expected error below disappears and TypeScript fails this check.
const validRoute: Href = '/(tabs)/usage';

// @ts-expect-error The route is not part of DevGauge's typed route tree.
const nonexistentRoute: Href = '/this-route-must-not-exist';

void validRoute;
void nonexistentRoute;
