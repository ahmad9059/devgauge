#!/bin/sh
set -eu

if [ -z "${JAVA_HOME:-}" ] && [ -x /opt/android-studio/jbr/bin/java ]; then
  export JAVA_HOME=/opt/android-studio/jbr
fi
if [ -z "${ANDROID_HOME:-}" ] && [ -d "$HOME/Android/Sdk" ]; then
  export ANDROID_HOME="$HOME/Android/Sdk"
fi
case "${JAVA_HOME:-}" in
  /opt/android-studio/jbr) export JAVA_TOOL_OPTIONS="${JAVA_TOOL_OPTIONS:+$JAVA_TOOL_OPTIONS }--enable-native-access=ALL-UNNAMED" ;;
esac
if [ -f .env ]; then
  set -a
  . ./.env
  set +a
fi

export APP_VARIANT=production
export ANDROID_PACKAGE="${ANDROID_PACKAGE:-app.devgauge}"
export ANDROID_ARTIFACT=phone
export EXPO_PUBLIC_SPIKE_TEST=0
export NODE_ENV=production

node scripts/release-signing.mjs
node scripts/build-progress.mjs
