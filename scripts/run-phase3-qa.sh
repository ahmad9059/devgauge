#!/bin/sh
# Phase 3 emulator QA helper. Installs the internal preview APK and captures the
# screenshots and accessibility tree used by the on-device checklist. It is a
# developer tool, not part of the shipped app.
#
# Usage: ./scripts/run-phase3-qa.sh
# Env:   ADB (default ~/Android/Sdk/platform-tools/adb)
#        APK (default artifacts/devgauge-phase1-preview.apk)
#        OUT (default /tmp/opencode/qa)
set -eu

ADB="${ADB:-$HOME/Android/Sdk/platform-tools/adb}"
APK="${APK:-artifacts/devgauge-phase1-preview.apk}"
OUT="${OUT:-/tmp/opencode/qa}"
PKG="app.devgauge.preview"
ACTIVITY="$PKG/.MainActivity"

mkdir -p "$OUT"

shot() { "$ADB" exec-out screencap -p >"$OUT/$1"; }
tree() {
  "$ADB" shell uiautomator dump /sdcard/devgauge-ui.xml >/dev/null
  "$ADB" pull /sdcard/devgauge-ui.xml "$OUT/$1" >/dev/null
}
restart() {
  "$ADB" shell am force-stop "$PKG"
  "$ADB" shell am start -n "$ACTIVITY" >/dev/null
  sleep 5
}

"$ADB" install -r "$APK"
"$ADB" shell settings put system accelerometer_rotation 0

# Phone/tablet portrait and landscape.
"$ADB" shell settings put system user_rotation 0
restart
shot usage-portrait.png
tree ui-portrait.xml
"$ADB" shell settings put system user_rotation 1
sleep 3
shot usage-landscape.png
"$ADB" shell settings put system user_rotation 0

# Largest supported system text scale.
"$ADB" shell settings put system font_scale 1.5
restart
shot usage-largest-text.png
tree ui-largest-text.xml
"$ADB" shell settings put system font_scale 1.0

echo "Phase 3 QA artifacts written to $OUT"
ls -la "$OUT"
