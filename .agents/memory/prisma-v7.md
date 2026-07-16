---
name: Prisma v7 push pattern for MG platform
description: How to correctly push schema changes and regenerate the Prisma client
---

## Commands (must run from artifacts/mzuka-gilbert/)
```bash
cd artifacts/mzuka-gilbert
pnpm prisma db push     # sync schema to DB
pnpm prisma generate    # regenerate client with new models
```

## Config
- DB URL lives in `prisma.config.ts` (not in schema.prisma datasource block)
- Falls back: `session_pooler_connection_skill ?? DATABASE_URL`
- Schema path: `prisma/schema.prisma`

**Why:** Prisma v7 moved datasource URL to `prisma.config.ts` via `defineConfig()`. Running `npx prisma db push` from root or without `pnpm` shows help text instead of running.

## File sync rule
All schema and src changes must be copied to both:
- `artifacts/mzuka-gilbert/` (the running Replit artifact)
- `/home/runner/workspace/` root (for GitHub/Vercel sync)

Use `cp` after every edit, or edit both simultaneously.
