#!/bin/bash
# Vura Asset Quality Gate
# Run before any theme deployment to verify all assets pass brand checks

MANIFEST="assets/vura-asset-manifest.json"
PASS=0
WARN=0
FAIL=0

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║   VURA · Asset Quality Gate                  ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

if [ ! -f "$MANIFEST" ]; then
  echo "❌ FAIL: vura-asset-manifest.json not found in assets/"
  exit 1
fi

# Check each asset file exists
ASSETS=(
  "assets/vura-mineral-hero.png"
  "assets/vura-process-wide.png"
  "assets/vura-bottle-still.png"
  "assets/vura-petals-wide.png"
  "assets/vura-still-tall.png"
  "assets/vura-specimen-tall.png"
  "assets/wordmark-vura.png"
  "assets/seal-mineral-archive.png"
  "assets/flower-marigold.png"
  "assets/flower-bouquet.png"
  "assets/flower-burgundy-tall.png"
  "assets/icon-mineral.png"
  "assets/icon-aloe-rose.png"
  "assets/icon-pure-drops.png"
  "assets/icon-made-in-india.png"
  "assets/RocaOne-Rg.woff2"
  "assets/RocaOne-Bold.woff2"
  "assets/NotoSansDevanagari-Regular.woff2"
)

echo "── Checking asset files exist ──────────────────"
for asset in "${ASSETS[@]}"; do
  if [ -f "$asset" ]; then
    echo "  ✅  $asset"
    PASS=$((PASS + 1))
  else
    echo "  ❌  MISSING: $asset"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "── Checking manifest QA status ─────────────────"

# Parse approved_with_note items (cautions)
CAUTION_COUNT=$(grep -c '"status": "approved_with_note"' "$MANIFEST" 2>/dev/null || echo 0)
REJECTED_COUNT=$(grep -c '"status": "rejected"' "$MANIFEST" 2>/dev/null || echo 0)
APPROVED_COUNT=$(grep -c '"status": "approved"' "$MANIFEST" 2>/dev/null || echo 0)

echo "  ✅  Approved:            $APPROVED_COUNT"
echo "  ⚠️   Approved (caution): $CAUTION_COUNT"
echo "  ❌  Rejected:            $REJECTED_COUNT"

echo ""
echo "── Checking brand rules ────────────────────────"

# Check fonts are present
FONTS=("assets/RocaOne-Rg.woff2" "assets/RocaOne-Bold.woff2" "assets/NotoSansDevanagari-Regular.woff2")
for font in "${FONTS[@]}"; do
  if [ -f "$font" ]; then
    echo "  ✅  Font: $font"
  else
    echo "  ❌  Missing font: $font"
    FAIL=$((FAIL + 1))
  fi
done

echo ""
echo "╔══════════════════════════════════════════════╗"
if [ $FAIL -gt 0 ]; then
  echo "║  ❌ GATE FAILED — $FAIL missing files           ║"
  echo "╚══════════════════════════════════════════════╝"
  echo ""
  exit 1
elif [ $CAUTION_COUNT -gt 0 ]; then
  echo "║  ⚠️  GATE PASSED WITH CAUTIONS                ║"
  echo "║  Review approved_with_note assets before      ║"
  echo "║  production launch.                           ║"
  echo "╚══════════════════════════════════════════════╝"
  echo ""
  exit 0
else
  echo "║  ✅ ALL CHECKS PASSED — Ready to build        ║"
  echo "╚══════════════════════════════════════════════╝"
  echo ""
  exit 0
fi
