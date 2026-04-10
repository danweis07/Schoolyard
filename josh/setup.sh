#!/usr/bin/env bash
# setup.sh — Deploy FSK (Francis Scott Key) content to the Schoolyard platform
# Usage: cd josh && bash setup.sh
#
# This script copies FSK-specific configuration and content into the Schoolyard
# project, replacing the default Longfellow Elementary demo content.
# Run from the josh/ directory.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "=== FSK Schoolyard Setup ==="
echo ""
echo "This will deploy Francis Scott Key Elementary content to your Schoolyard instance."
echo "The default Longfellow demo content will be replaced."
echo ""

# Confirm before proceeding
read -r -p "Continue? (y/N) " confirm
if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
  echo "Aborted."
  exit 0
fi

echo ""
echo "1/4  Copying school config..."
cp "$SCRIPT_DIR/school.config.fsk.json" "$ROOT_DIR/school.config.json"
echo "     ✓ school.config.json updated"

echo ""
echo "2/4  Replacing board member content..."
rm -f "$ROOT_DIR/apps/web/src/content/board/"*.md
cp "$SCRIPT_DIR/content/board/"*.md "$ROOT_DIR/apps/web/src/content/board/"
echo "     ✓ $(ls "$SCRIPT_DIR/content/board/"*.md | wc -l) board members copied"

echo ""
echo "3/4  Replacing events, news, volunteers, and resources..."
rm -f "$ROOT_DIR/apps/web/src/content/events/"*.md
cp "$SCRIPT_DIR/content/events/"*.md "$ROOT_DIR/apps/web/src/content/events/"
echo "     ✓ $(ls "$SCRIPT_DIR/content/events/"*.md | wc -l) events copied"

rm -f "$ROOT_DIR/apps/web/src/content/news/"*.md
cp "$SCRIPT_DIR/content/news/"*.md "$ROOT_DIR/apps/web/src/content/news/"
echo "     ✓ $(ls "$SCRIPT_DIR/content/news/"*.md | wc -l) news posts copied"

rm -f "$ROOT_DIR/apps/web/src/content/volunteers/"*.md
cp "$SCRIPT_DIR/content/volunteers/"*.md "$ROOT_DIR/apps/web/src/content/volunteers/"
echo "     ✓ $(ls "$SCRIPT_DIR/content/volunteers/"*.md | wc -l) volunteer roles copied"

rm -f "$ROOT_DIR/apps/web/src/content/resources/"*.md
cp "$SCRIPT_DIR/content/resources/"*.md "$ROOT_DIR/apps/web/src/content/resources/"
echo "     ✓ $(ls "$SCRIPT_DIR/content/resources/"*.md | wc -l) resources copied"

echo ""
echo "4/4  Validating config..."
if command -v node &> /dev/null; then
  if [ -f "$ROOT_DIR/scripts/validate-config.js" ]; then
    node "$ROOT_DIR/scripts/validate-config.js" && echo "     ✓ Config is valid" || echo "     ⚠ Validation had warnings (check output above)"
  else
    echo "     ⚠ validate-config.js not found, skipping validation"
  fi
else
  echo "     ⚠ Node.js not found, skipping validation"
fi

echo ""
echo "=== Setup complete! ==="
echo ""
echo "Next steps:"
echo "  1. Review school.config.json and update the EIN, logo, and hero image"
echo "  2. Run 'pnpm install && pnpm dev' to start the dev server"
echo "  3. Visit http://localhost:4321 to see your FSK site"
echo "  4. Edit content in apps/web/src/content/ to customize further"
echo "  5. Deploy with 'pnpm build' and push to Vercel/Netlify"
echo ""
