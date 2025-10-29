# Auto-Commit and Push Setup

This project now has automatic git commit and push functionality. Here are three ways to use it:

## Option 1: Manual Auto-Commit (Recommended for most cases)

Run this whenever you want to commit and push your current changes:

```bash
./auto-commit.sh "Your commit message"
```

Or just run it without a message to use an automatic timestamp:

```bash
./auto-commit.sh
```

This will:
- Stage all changes
- Commit with your message (or auto-generated message)
- Automatically push to GitHub

## Option 2: Continuous Watch Mode (For active development)

Run this in a separate terminal to automatically commit changes every 10 seconds:

```bash
./watch-and-commit.sh
```

This will:
- Watch for file changes continuously
- Auto-commit and push whenever changes are detected
- Keep running until you press Ctrl+C

## Option 3: Git Hook (Automatic push after any commit)

A post-commit hook has been installed that automatically pushes to GitHub after any git commit.

So if you use regular git commands:
```bash
git add .
git commit -m "Your message"
# Automatically pushes to GitHub!
```

## How It Works

1. **post-commit hook** - Located in `.git/hooks/post-commit`, this hook runs after every commit and automatically pushes to the remote
2. **auto-commit.sh** - A convenience script to quickly commit and push all changes
3. **watch-and-commit.sh** - A background watcher that auto-commits periodically

## Notes

- All scripts require executable permissions (already set)
- The watch script runs continuously - stop it with Ctrl+C
- Changes are pushed to the `main` branch
- Make sure you're authenticated with GitHub (credentials are cached)

## Disabling Auto-Push

If you want to disable automatic pushing, simply remove the post-commit hook:

```bash
rm .git/hooks/post-commit
```
