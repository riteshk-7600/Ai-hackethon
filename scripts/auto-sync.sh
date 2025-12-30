#!/bin/bash

# Configuration
INTERVAL=30 # Seconds between checks
BRANCH="main"
REMOTE="origin"

echo "🚀 Starting Git Auto-Sync Engine..."
echo "📍 Watching directory: $(pwd)"
echo "⏱️  Sync interval: $INTERVAL seconds"
echo "🌿 Target branch: $BRANCH"

while true; do
    # Check for changes (staged, unstaged, and untracked)
    if [[ -n $(git status --porcelain) ]]; then
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "📂 Changes detected at $(date '+%Y-%m-%d %H:%M:%S')"
        
        # Add all changes
        git add .
        
        # Commit with timestamp
        COMMIT_MSG="Auto-sync: $(date '+%Y-%m-%d %H:%M:%S')"
        git commit -m "$COMMIT_MSG"
        
        echo "📝 Committed: $COMMIT_MSG"
        
        # Push to remote
        echo "📤 Pushing to $REMOTE/$BRANCH..."
        if git push $REMOTE $BRANCH; then
            echo "✅ Successfully synced to GitHub."
        else
            echo "❌ Push failed. Will retry in $INTERVAL seconds."
        fi
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    fi
    
    sleep $INTERVAL
done
