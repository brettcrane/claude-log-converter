#!/bin/bash
# Load sample sessions into Claude's projects directory
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_DIR="$SCRIPT_DIR/demo-project"
DEST="${CLAUDE_LOG_CLAUDE_PROJECTS_DIR:-$HOME/.claude/projects}/sample-demo-project"

# Validate source directory exists
if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: Source directory not found: $SOURCE_DIR"
    exit 1
fi

# Check if destination exists and has files - warn user
if [ -d "$DEST" ] && [ "$(ls -A "$DEST" 2>/dev/null)" ]; then
    echo "Warning: Destination already exists: $DEST"
    read -p "Overwrite existing files? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Cancelled."
        exit 0
    fi
fi

echo "Loading sample data..."
mkdir -p "$DEST"
cp -r "$SOURCE_DIR/"* "$DEST/" || {
    echo "Error: Failed to copy sample data"
    exit 1
}

echo "Sample data loaded to: $DEST"
echo ""
echo "Restart the app and refresh to see sample sessions."
