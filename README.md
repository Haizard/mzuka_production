# Muzuka Gilbert

Luxury photography, videography, booking, and protected-gallery platform.

Core rule: only Muzuka Gilbert controls who can view, download, share, or receive final photos and videos.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- AWS S3 for private originals and previews
- Stripe for payments
- OpenAI Vision for photo-quality analysis
- Email/SMS notifications

## Project Docs

- Roadmap: `docs/roadmap.md`
- Build pilot and agent handoff: `docs/build-process.md`

Every coding agent should read `docs/build-process.md` before changing code and update it before finishing work.

## Local Setup

Install dependencies:

```bash
npm install
```

Create local environment variables:

```bash
cp .env.example .env
```

Run the development server:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Database

The initial Prisma schema lives in `prisma/schema.prisma`.

After configuring `DATABASE_URL`, generate the Prisma client:

```bash
npx prisma generate
```

Create and apply a migration when a PostgreSQL database is available:

```bash
npx prisma migrate dev --name init
```

## Current Status

Phase 0 has started.

Completed:

- Next.js scaffold
- TypeScript and Tailwind foundation
- Luxury black/gold/deep-red app shell
- PWA manifest placeholder
- Prisma schema draft
- Environment template

Next:

- Auth implementation
- Booking workflow
- Admin approval
- Gallery upload and protected previews
- Stripe unlock flow
