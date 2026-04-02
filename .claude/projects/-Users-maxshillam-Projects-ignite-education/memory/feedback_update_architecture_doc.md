---
name: Keep architecture doc updated
description: Update docs/ARCHITECTURE.md whenever architectural changes are made (new apps, services, routes, integrations, deployment changes)
type: feedback
---

When making architectural changes (new routes, services, integrations, apps, deployment config, or database tables), update `docs/ARCHITECTURE.md` to reflect the change.

**Why:** The user wants a living architecture doc that stays current as the project evolves. It was created 2026-03-24 and covers all three apps, the Express backend, routing, auth, integrations, caching, and local dev setup.

**How to apply:** After completing work that changes the system architecture, add/update the relevant section in `docs/ARCHITECTURE.md`. This includes new API endpoints, new third-party integrations, new routes in any app, deployment changes, or database schema changes. Keep the "Last updated" date current.
