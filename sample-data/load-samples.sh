#!/bin/bash
# Load sample sessions into Claude's projects directory

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST="${CLAUDE_LOG_CLAUDE_PROJECTS_DIR:-$HOME/.claude/projects}/sample-demo-project"

echo "Loading sample data..."
mkdir -p "$DEST"
cp -r "$SCRIPT_DIR/demo-project/"* "$DEST/"
echo "Sample data loaded to: $DEST"
echo ""
echo "Restart the app and refresh to see sample sessions."
