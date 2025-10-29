#!/bin/bash
# Auto-commit script
# Usage: ./auto-commit.sh "commit message" or just ./auto-commit.sh

# Get commit message from argument or use default
COMMIT_MSG="${1:-Auto-update: $(date '+%Y-%m-%d %H:%M:%S')}"

echo "📝 Checking for changes..."

# Check if there are any changes
if [[ -z $(git status -s) ]]; then
    echo "✅ No changes to commit"
    exit 0
fi

echo "📋 Changes detected:"
git status -s

echo ""
echo "➕ Adding all changes..."
git add .

echo "💾 Committing with message: $COMMIT_MSG"
git commit -m "$COMMIT_MSG"

# The post-commit hook will automatically push
echo ""
echo "✨ Done! Changes committed and pushed to GitHub"
