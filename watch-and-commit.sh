#!/bin/bash
# Watch for file changes and auto-commit
# This script continuously monitors for changes and commits them automatically

echo "👀 Watching for file changes... (Press Ctrl+C to stop)"
echo "📁 Monitoring directory: $(pwd)"
echo ""

# Store the last commit hash
LAST_COMMIT=$(git rev-parse HEAD)

while true; do
    # Wait 10 seconds between checks
    sleep 10

    # Check if there are any changes
    if [[ -n $(git status -s) ]]; then
        echo ""
        echo "🔔 Changes detected at $(date '+%Y-%m-%d %H:%M:%S')"

        # Stage all changes
        git add .

        # Create commit with timestamp
        COMMIT_MSG="Auto-update: $(date '+%Y-%m-%d %H:%M:%S')"
        git commit -m "$COMMIT_MSG"

        # Check if commit was successful
        NEW_COMMIT=$(git rev-parse HEAD)
        if [ "$LAST_COMMIT" != "$NEW_COMMIT" ]; then
            echo "✅ Changes committed and pushed to GitHub"
            LAST_COMMIT=$NEW_COMMIT
        fi

        echo "👀 Continuing to watch for changes..."
    fi
done
