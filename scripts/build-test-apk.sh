#!/bin/sh
set -eu

if [ -z "${JAVA_HOME:-}" ] && [ -x /opt/android-studio/jbr/bin/java ]; then
  export JAVA_HOME=/opt/android-studio/jbr
fi
if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Android/Sdk" ]; then
  export ANDROID_HOME="$HOME/Android/Sdk"
fi
# Android Studio's JBR 25 prints a native-access warning on CMake startup;
# AGP treats that stderr line as a CMake failure unless native access is enabled.
case "${JAVA_HOME:-}" in
  /opt/android-studio/jbr) export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }--enable-native-access=ALL-UNNAMED" ;;
esac

# Local, gitignored build secrets (Antigravity OAuth client). Expo inlines
# EXPO_PUBLIC_* values into the bundle at build time.
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

# Internal tester build only. It is debug-key signed by the generated Android
# template, and the diagnostic route is never enabled in production builds.
export APP_VARIANT=preview
export EXPO_PUBLIC_SPIKE_TEST=1
export NODE_ENV=production

node scripts/build-progress.mjs
