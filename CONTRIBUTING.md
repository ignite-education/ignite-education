# Contributing & Git Workflow

This document outlines the branching strategy and workflows for the Ignite Education project.

## Branch Structure

| Branch | Purpose | Deploys To |
|--------|---------|------------|
| `main` | Production code | ignite.education (Vercel) |
| `develop` | Staging/testing new features | Preview deployments |
| `feature/*` | New features in development | Preview deployments |
| `hotfix/*` | Urgent production bug fixes | Preview → Production |

## Workflows

### Feature Development

Use this workflow for new features and non-urgent improvements.

```bash
# 1. Start from develop
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes, commit
git add .
git commit -m "Add feature description"

# 4. Push and create PR to develop
git push -u origin feature/your-feature-name
# Create PR to develop on GitHub
```

**What happens:**
- CI runs linting and build checks
- Vercel creates a preview deployment URL
- Review the preview, get PR approval
- Merge to `develop` for staging testing
- When ready, merge `develop` to `main` for production release

---

### Hotfix (Production Bug Fix)

Use this workflow for urgent bugs discovered in production.

```bash
# 1. Start from main (production)
git checkout main
git pull origin main

# 2. Create hotfix branch
git checkout -b hotfix/describe-the-bug

# 3. Fix the bug, commit
git add .
git commit -m "Fix: description of the bug fix"

# 4. Push and create PR to main
git push -u origin hotfix/describe-the-bug
# Create PR to main on GitHub
```

**What happens:**
- CI runs linting and build checks
- Vercel creates a preview deployment URL
- **Test the fix on the preview URL before merging**
- Merge to `main` → automatically deploys to production

```bash
# 5. Keep develop in sync (important!)
git checkout develop
git pull origin develop
git merge main
git push origin develop
```

---

## CI/CD Pipeline

Every PR triggers:
1. **Linting** - ESLint checks
2. **Build** - Ensures production build succeeds
3. **Preview Deployment** - Vercel creates a unique URL for testing

PRs cannot be merged if CI checks fail.

## Quick Reference

| Scenario | Branch From | PR Target |
|----------|-------------|-----------|
| New feature | `develop` | `develop` |
| Production bug fix | `main` | `main` |
| Monthly release | `develop` | `main` |
