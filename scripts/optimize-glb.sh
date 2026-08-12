#!/usr/bin/env bash
# Compresses a GLB with gltf-transform and generates a typed R3F component.
# Usage:   ./scripts/optimize-glb.sh <path/to/model.glb> [ComponentName]
# Example: ./scripts/optimize-glb.sh public/models/my-switch.glb MySwitch
set -euo pipefail

INPUT="${1:?Usage: $0 <path/to/model.glb> [ComponentName]}"

if [[ ! -f "$INPUT" ]]; then
  echo "Error: file not found: $INPUT" >&2
  exit 1
fi

# Normalize downloaded filenames so punctuation such as Finder's "(1)"
# suffix cannot break gltfjsx's filename parser.
SOURCE_BASENAME=$(basename "$INPUT" .glb)
SAFE_BASENAME=$(echo "$SOURCE_BASENAME" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-//; s/-$//')
SAFE_FILENAME="${SAFE_BASENAME}.glb"

# Copy to public/models when the file lives elsewhere or has an unsafe name.
if [[ "$INPUT" != public/models/* || "$(basename "$INPUT")" != "$SAFE_FILENAME" ]]; then
  DEST="public/models/$SAFE_FILENAME"
  echo "→ Copying to $DEST"
  cp "$INPUT" "$DEST"
  INPUT="$DEST"
fi

BASENAME=$(basename "$INPUT" .glb)

# kebab-case / snake_case → PascalCase default component name
DEFAULT_NAME=$(echo "$BASENAME" | sed -E 's/(^|[-_])([a-zA-Z])/\U\2/g')
COMPONENT_NAME="${2:-$DEFAULT_NAME}"
OUTPUT_TSX="components/${COMPONENT_NAME}.tsx"

echo "→ Input:     $INPUT"
echo "→ Component: $OUTPUT_TSX"
echo ""

npx gltfjsx@6.5.3 "$INPUT" \
  --output "$OUTPUT_TSX" \
  --types \
  --transform \
  --root public

# gltfjsx writes the transformed GLB beside OUTPUT_TSX. Move it into the
# public model directory and repair the generated URL for Next.js.
GENERATED_TRANSFORMED="$(dirname "$OUTPUT_TSX")/${BASENAME}-transformed.glb"
TRANSFORMED="public/models/${BASENAME}-transformed.glb"
if [[ -f "$GENERATED_TRANSFORMED" ]]; then
  mv "$GENERATED_TRANSFORMED" "$TRANSFORMED"
  sed -i.bak \
    "s|/../components/${BASENAME}-transformed.glb|/models/${BASENAME}-transformed.glb|g" \
    "$OUTPUT_TSX"
  rm "$OUTPUT_TSX.bak"
fi

if [[ -f "$TRANSFORMED" ]]; then
  BEFORE=$(wc -c < "$INPUT")
  AFTER=$(wc -c < "$TRANSFORMED")
  SAVED=$(( (BEFORE - AFTER) * 100 / BEFORE ))
  echo ""
  echo "✓ Compressed: $(basename "$INPUT") → $(basename "$TRANSFORMED") (${SAVED}% smaller)"
fi

echo ""
echo "Next steps:"
echo "  1. Check the useGLTF path in $OUTPUT_TSX — it should point to the *-transformed.glb"
echo "  2. Add castShadow / receiveShadow to any mesh elements that need shadows"
echo "  3. Import and use <${COMPONENT_NAME} /> in your scene"
