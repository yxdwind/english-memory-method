#!/usr/bin/env bash
# english-memory-method installer (macOS / Linux)
# One-liner:
#   curl -fsSL https://raw.githubusercontent.com/yxdwind/english-memory-method/main/install.sh | bash
# With custom target:
#   ./install.sh [target-skills-dir]

set -euo pipefail

REPO="yxdwind/english-memory-method"
BRANCH="main"
SKILL="english-memory-method"
RAW="https://raw.githubusercontent.com/$REPO/$BRANCH"
FILES=("SKILL.md" "assets/plan-template.html")

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  for c in "$HOME/.openclaw-autoclaw/skills" "$HOME/.openclaw/skills" "$HOME/.claude/skills"; do
    if [ -d "$c" ]; then TARGET="$c"; break; fi
  done
  TARGET="${TARGET:-$HOME/.openclaw/skills}"
fi

DEST="$TARGET/$SKILL"
mkdir -p "$DEST/assets"
echo "Installing '$SKILL' -> $DEST"

for f in "${FILES[@]}"; do
  curl -fsSL "$RAW/$f" -o "$DEST/$f"
  echo "  [OK] $f"
done

if ! head -n 5 "$DEST/SKILL.md" | grep -q "$SKILL"; then
  echo "[WARN] SKILL.md content check failed - please verify manually" >&2
fi

echo ""
echo "[DONE] $SKILL installed to: $DEST"
echo "Restart your agent (AutoClaw / OpenClaw / Claude Code) to load it."
echo "Trigger: paste an English article and ask for a memorization plan."
