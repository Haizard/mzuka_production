# Muzuka Gilbert Build Process Pilot

Version: 1.0
Last updated: 2026-06-26
Project status: Planning and documentation
Primary roadmap: `docs/roadmap.md`

This file is the working pilot for every coding agent who builds Muzuka Gilbert. It explains what the project is, what stack must be used, what has been completed, what is currently in progress, and what should be done next.

Every coding agent must read this file before making changes and must update the relevant sections before finishing work.

## 1. Project Identity

App name: Muzuka Gilbert
Brand mark: MG with crown, gold metal, black background, bracketed logo concept `[MG]`
Brand feeling: luxury, power, privacy, cinematic, safe, unforgettable
Main quote: "We don't just take pictures. We create masterpieces that tell your story."

Core control rule:

Only Muzuka Gilbert controls who can view, download, share, or receive final photos and videos.

## 2. Final Product Vision

Muzuka Gilbert is a luxury photography, videography, production, booking, and protected-gallery platform.

The first product is a private client booking and gallery system. The long-term product becomes a full MG AI media/business command center with production management, AI assistance, finance, legal, HR, academy, analytics, and founder controls.

## 3. Chosen Technical Direction

Use this stack for the real build:

- Frontend: Next.js App Router with TypeScript
- UI: Tailwind CSS, shadcn/ui, Lucide icons, Motion
- App model: One adaptive web app, installable as a PWA
- Backend: Node.js, Next.js API routes or a separate Node service when needed
- Database: PostgreSQL
- ORM: Prisma or Drizzle
- Storage: AWS S3
- CDN: AWS CloudFront or Cloudflare
- Payments: Stripe
- AI: OpenAI Vision first, custom image-quality model later
- Auth: Auth.js or custom JWT/session auth
- Notifications: Email and SMS, likely Resend/Twilio
- Deployment: Docker-ready, cloud deployable

Do not build separate Flutter and web apps. Build one responsive/adaptive Next.js product:

- Mobile: native-feeling PWA with bottom navigation
- Tablet: hybrid touch workspace
- Desktop: professional sidebar command center

## 4. Visual Reference Review

The docs folder contains four visual concept images. These must influence the product design.

### `docs/WhatsApp Image 2026-06-15 at 11.06.54 AM(1).jpeg`

Primary Muzuka Gilbert photography/videography concept.

Key ideas:

- `[MG]` crown logo on black and gold background
- Luxury wedding/production imagery
- Booking appointment mobile screen
- Package selection
- AI photo analyzer score screen
- Protected gallery preview
- Paid full-access gallery
- Admin dashboard
- Payment methods
- Security system with dynamic watermark, device/IP checks, expiring access

### `docs/WhatsApp Image 2026-06-15 at 11.06.54 AM.jpeg`

Broader MG AI product concept.

Key ideas:

- MG AI identity: create, automate, elevate
- Mobile app preview
- Desktop dashboard preview
- AI assistant
- Project management
- Media asset management
- Client management
- Finance management
- Analytics
- Training platform
- Responsive experience across devices

### `docs/WhatsApp Image 2026-06-15 at 11.06.55 AM.jpeg`

Customer app and admin dashboard concept.

Key ideas:

- Customer home screen
- Book appointment flow
- Packages
- My events
- AI assistant chat
- Admin dashboard for appointments, clients, gallery, packages, payments, messages, AI assistant, settings
- Protected gallery with unpaid preview and paid full access
- Email/SMS reminders
- AI-powered messages
- High-quality delivery
- Secure private access

### `docs/WhatsApp Image 2026-06-22 at 4.08.56 PM.jpeg`

Long-term MG AI command center concept.

Key ideas:

- All-in-one operating system for media and business
- Revenue analytics
- Projects in progress
- Client count
- Team members
- Production hours
- Media library
- AI assistant actions: write script, create caption, analyze content, generate report, translate content
- Modules for media center, production, client management, employee management, finance, analytics, security, legal, academy
- Multi-layer security system
- Disaster recovery and global support

## 5. Product Phases

### Phase 0: Starter Foundation

Goal: create the codebase and project skeleton.

Status: Started

Required work:

- [x] Create Next.js app with TypeScript
- [x] Add Tailwind CSS
- [x] Add shadcn/ui setup
- [x] Add Lucide icons
- [x] Add Motion
- [x] Add PostgreSQL connection plan
- [x] Add ORM setup
- [x] Add environment variable template
- [x] Add base app layout
- [x] Add brand color tokens
- [x] Add mobile-first navigation shell
- [x] Add desktop sidebar shell
- [x] Add README with setup instructions

### Phase 1: MVP

Goal: launch the core private booking and protected-gallery workflow.

Status: Not started

Required work:

- [ ] Secure client login
- [ ] Admin login
- [ ] User roles: founder, admin, staff, client
- [ ] Admin approval before client access
- [ ] Appointment booking flow
- [ ] Service/package selection
- [ ] Booking status management
- [ ] Email reminder foundation
- [ ] SMS reminder foundation
- [ ] Admin dashboard overview
- [ ] Client management
- [ ] Gallery creation
- [ ] Admin media upload
- [ ] Watermarked preview generation
- [ ] Preview-only gallery before payment
- [ ] No download before payment
- [ ] No share before payment
- [ ] Stripe checkout
- [ ] Payment webhook
- [ ] Full-quality download unlock after payment
- [ ] Gallery expiration
- [ ] Access logs
- [ ] AI photo scoring prototype
- [ ] Automatic booking/payment/gallery messages

### Phase 2: Security And Media Hardening

Goal: make the media protection model stronger and operationally reliable.

Status: Not started

Required work:

- [ ] Signed S3 URLs
- [ ] Separate preview and original media storage
- [ ] Dynamic watermark with client name/email/order
- [ ] Lower-quality preview generation
- [ ] Device verification
- [ ] IP verification
- [ ] Expiring gallery sessions
- [ ] Audit log dashboard
- [ ] Rate limiting
- [ ] Download permission controls
- [ ] Share permission controls
- [ ] Screenshot deterrence where browser-supported
- [ ] Screen-recording detection where browser-supported
- [ ] Clear legal disclaimer that external camera capture cannot be fully blocked

### Phase 3: Production Management

Goal: manage the studio work after booking.

Status: Not started

Required work:

- [ ] Project dashboard
- [ ] Production pipeline statuses
- [ ] Editing queue
- [ ] Staff assignment
- [ ] Calendar management
- [ ] Task management
- [ ] Internal notes
- [ ] Client communication history
- [ ] Delivery status

### Phase 4: Finance And Business Operations

Goal: support real studio operations.

Status: Not started

Required work:

- [ ] Invoices
- [ ] Deposits
- [ ] Balance payments
- [ ] Refund tracking
- [ ] Revenue dashboard
- [ ] Expenses
- [ ] Profit/loss summaries
- [ ] Client contracts
- [ ] Digital agreement records

### Phase 5: MG AI Command Center

Goal: expand from photography platform to full media/business OS.

Status: Not started

Required work:

- [ ] AI assistant
- [ ] Caption generation
- [ ] Script writing
- [ ] Translation
- [ ] Content summarization
- [ ] Business reports
- [ ] Media library
- [ ] Academy/training module
- [ ] Employee management
- [ ] Legal center
- [ ] Advanced analytics
- [ ] Founder command controls

## 6. Recommended Database Areas

Design the database around these domains:

- Users
- Roles and permissions
- Client approval requests
- Profiles
- Services/packages
- Bookings
- Booking reminders
- Projects
- Galleries
- Media assets
- Media previews
- AI analysis results
- Payments
- Downloads
- Access logs
- Audit logs
- Messages
- Notifications
- Settings

No schema has been implemented yet.

## 7. Critical Security Rules

Agents must preserve these rules:

- Never expose original 6K/8K files before payment and approval.
- Never store original media in a public bucket.
- Always use signed, expiring URLs for private media.
- Keep preview assets separate from original assets.
- Apply visible dynamic watermarks to previews.
- Record access logs for sensitive gallery views.
- Treat screenshot blocking as a deterrent, not a guarantee.
- Do not claim the platform can fully stop someone photographing the screen with another device.
- Founder/admin permissions must control client access, gallery expiration, downloads, sharing, and release status.

## 8. Adaptive UI Rules

The app must use one codebase with adaptive layouts.

Mobile:

- Bottom navigation
- Full-screen app-like pages
- Touch-first controls
- Bottom sheets for actions
- Swipe-friendly galleries
- Large tap targets

Tablet:

- Hybrid layout
- Navigation rail or compact sidebar
- Touch-friendly spacing

Desktop:

- Sidebar navigation
- Header with search/notifications/profile
- Dense admin dashboard
- Tables, filters, upload manager, analytics
- Multi-panel media viewer

## 9. Current Implementation Status

As of 2026-06-26:

- [x] Roadmap document exists
- [x] Visual reference images exist
- [x] Build process pilot document created
- [x] Next.js app scaffold exists
- [ ] Backend exists
- [x] Database schema exists
- [ ] Auth exists
- [ ] Booking flow exists
- [ ] Admin dashboard exists
- [ ] Gallery system exists
- [ ] Payment system exists
- [ ] AI scoring exists
- [ ] AWS storage integration exists
- [ ] Notification system exists
- [ ] Tests exist
- [ ] Deployment config exists

## 10. Next Agent Instructions

Before coding:

1. Read `docs/roadmap.md`.
2. Read this file completely.
3. Inspect the repository structure.
4. Check whether previous agents updated the build log.
5. Choose the next unchecked task from the current phase unless the user gives a different instruction.

During coding:

1. Keep changes scoped to the current task.
2. Prefer existing project patterns once the app exists.
3. Use TypeScript and typed validation.
4. Protect security-sensitive workflows by default.
5. Add tests for risky or shared behavior.

After coding:

1. Update `Current Implementation Status`.
2. Update the relevant phase checklist.
3. Add an entry to `Agent Work Log`.
4. Note any commands/tests run.
5. Note blockers clearly.

## 11. Agent Work Log

### 2026-06-26 - Documentation setup

Agent: Codex

Work completed:

- Read `docs/roadmap.md`.
- Confirmed four visual reference images in `docs`.
- Created `docs/build-process.md` as the coding-agent pilot and build tracker.
- Established Next.js, Node.js, PostgreSQL, and AWS as the build direction.
- Marked current implementation as documentation-only.

Commands/checks:

- Listed files in `docs`.
- Read `docs/roadmap.md`.
- Inspected all four image references.

Blockers:

- No app scaffold exists yet.
- No package manager, framework, database, or deployment configuration exists yet.

### 2026-06-26 - Phase 0 app foundation

Agent: Codex

Work completed:

- Scaffolded a Next.js App Router project with TypeScript, Tailwind CSS, and ESLint.
- Added app dependencies for Lucide icons, Motion, Zustand, React Hook Form, Zod, Prisma, and shadcn-compatible utilities.
- Copied all four docs visual references into `public/brand` with stable filenames for app usage.
- Replaced the starter page with a responsive Muzuka Gilbert luxury app shell.
- Added mobile bottom navigation and desktop sidebar command-center layout.
- Added black, gold, and deep-red brand tokens in `src/app/globals.css`.
- Added PWA manifest placeholder at `public/manifest.webmanifest`.
- Added `.env.example` for PostgreSQL, AWS S3, Stripe, OpenAI, email, and SMS settings.
- Added initial Prisma schema in `prisma/schema.prisma`.
- Added Prisma 7 config in `prisma.config.ts`.
- Added shadcn config in `components.json` and shared `cn` utility in `src/lib/utils.ts`.
- Replaced the starter README with project setup instructions.

Commands/checks:

- `npm run lint` passed.
- `DATABASE_URL='postgresql://postgres:postgres@localhost:5432/muzuka_gilbert' npx prisma validate` passed.
- `npm run build` passed.

Blockers/notes:

- Local `.env` exists but its `DATABASE_URL` must be replaced with a real PostgreSQL URL before migrations can run.
- No real auth, API routes, database migrations, booking logic, upload flow, Stripe flow, or AI scoring implementation exists yet.

## 12. Immediate Next Step

Start Phase 1 by implementing authentication foundations: user roles, client login, admin login, admin approval status, and protected route structure.
