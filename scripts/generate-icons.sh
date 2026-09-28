#!/bin/sh
# Regenerates the production Android icon set from the source artwork.
# Requires ImageMagick 7 (`magick`). Source defaults to ./icon.png.
#
#   ./scripts/generate-icons.sh [source.png]
#
# Outputs (committed):
#   assets/icon.png             1024x1024 full-bleed app icon (opaque)
#   assets/adaptive-icon.png    1024x1024 adaptive foreground (safe-zone artwork)
#   assets/monochrome-icon.png  1024x1024 Android 13 themed icon
#   assets/splash-icon.png      1024x1024 splash logo
#   assets/play-store-icon.png  512x512 Play Store listing icon
set -eu

SRC="${1:-icon.png}"
OUT="assets"
BACKGROUND="#000000"
SAFE_ZONE=620

mkdir -p "$OUT"

# Full-bleed app icon: opaque black background, quantized for size.
magick "$SRC" -resize 1024x1024 -background "$BACKGROUND" -alpha remove -alpha off \
  -colors 256 -strip -define png:compression-level=9 "$OUT/icon.png"

# Adaptive foreground: key out the black background, then center the artwork in
# the 66/108 safe zone so launcher masks never clip it.
magick "$SRC" -fuzz 10% -transparent black -trim +repage \
  -resize "${SAFE_ZONE}x${SAFE_ZONE}" -background none -gravity center -extent 1024x1024 \
  -strip -define png:compression-level=9 "$OUT/adaptive-icon.png"

# Monochrome (themed) icon reuses the white-on-transparent artwork.
cp "$OUT/adaptive-icon.png" "$OUT/monochrome-icon.png"

# Splash logo: smaller, centered white artwork on transparent.
magick "$OUT/adaptive-icon.png" -resize 384x384 -background none -gravity center \
  -extent 1024x1024 -strip -define png:compression-level=9 "$OUT/splash-icon.png"

# Play Store listing icon (512x512, no alpha).
magick "$OUT/icon.png" -resize 512x512 -alpha off \
  -strip -define png:compression-level=9 "$OUT/play-store-icon.png"

echo "Regenerated icon assets in $OUT"
