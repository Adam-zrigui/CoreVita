# CoreVita — Medical Imaging Platform

CoreVita is a production medical imaging platform for hospitals, clinics, and radiologists. Upload, view, analyze, and share DICOM studies with your team — all from the browser.

## Features

### DICOM Study Management
Upload DICOMDIR or individual files via drag-and-drop. Files upload directly to Backblaze B2 via presigned URLs, bypassing Vercel's 4.5 MB function payload limit. Automatic extraction of patient, study, series, and equipment metadata. Organize studies by patient with full search and history.

### Medical Imaging Viewer (Cornerstone3D)
Full-featured DICOM viewer with window/level, pan, zoom, measurements, annotations, and cine loop. Supports CT, MRI, Ultrasound, X-ray, and other modalities. Keyboard shortcuts for power users.

### Patient Records
Patient list with search, per-patient study history, and direct links from study detail pages.

### Team Collaboration
Team invites with pending invite flow. Study sharing with optional password protection and download toggle. Token-based access for external viewers.

### Reporting Workflow
Status tracking (Pending → Reading → Reported) with email notifications when a report is complete. Export PDF reports with study metadata and viewport screenshots.

### Side-by-Side Comparison
Select two studies to compare them in synchronized Cornerstone3D viewers side by side.

### Dashboard & Analytics
Study volume over 30 days, average turnaround time, status distribution, and usage metrics. Quick actions for upload, team management, and sharing.

### Audit Log (Pro+)
Full activity tracking for compliance: member changes, study actions, sharing events.

### API Access (Clinic)
Programmatic access to studies with API keys. Manage keys from the settings page.

### Custom Branding (Clinic)
Upload your logo and set brand colors for your organization.

## Pricing

| | Starter | Pro | Clinic |
|---|---|---|---|
| **Price** | €0/mo | €49/mo | €149/mo |
| **Studies** | 3 | Unlimited | Unlimited |
| **Users** | 1 | 5 | Unlimited |
| **Link expiry** | 7 days | Custom | Custom |
| **Watermark** | Yes | No | No |
| **Password protection** | — | ✓ | ✓ |
| **Download toggle** | — | ✓ | ✓ |
| **Advanced viewer** | — | ✓ | ✓ |
| **Audit log** | — | ✓ | ✓ |
| **Custom branding** | — | — | ✓ |
| **API access** | — | — | ✓ |

## Tech Stack

- **Frontend**: Next.js 16, React 19, Tailwind CSS, Cornerstone3D
- **Backend**: Next.js API routes, Prisma ORM, PostgreSQL (Neon)
- **Auth**: NextAuth.js with Google OAuth
- **Payments**: Stripe (Checkout, webhooks, customer portal)
- **Storage**: Backblaze B2 (S3-compatible, presigned URLs via @aws-sdk/s3-request-presigner)
- **Email**: Resend
- **Monitoring**: Sentry
- **Testing**: Vitest, jsdom, @testing-library/react (127 tests)

## Quick Start

```bash
pnpm install
pnpm dev              # http://localhost:3000
pnpm build            # Production build
pnpm test             # 127 tests, 17 files
```

## Environment Variables

See `.env.example` for the full list. Key variables:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Neon Postgres |
| `AUTH_SECRET` | Session encryption |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth |
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |
| `STRIPE_PRO_PRICE_ID` / `STRIPE_CLINIC_PRICE_ID` | Plan detection |
| `RESEND_API_KEY` | Email notifications |
| `SENTRY_DSN` | Error monitoring |
| `B2_*` | Backblaze B2 credentials |
| `NEXT_PUBLIC_APP_URL` | Canonical app URL |

## Architecture

```
src/
├── app/
│   ├── (app)/               dashboard, studies, patients, compare, upload
│   ├── (auth)/              login, register, reset-password
│   ├── (marketing)/         pricing, terms, privacy
│   ├── (public)/share/[token]  external share viewer
│   └── api/                 REST API routes
├── components/              viewer/, dashboard/, auth/, share/
├── lib/                     plans.ts, rbac.ts, audit.ts, email.ts, rate-limit.ts
└── prisma/                  schema.prisma
```

## Key Design Decisions

- **Per-user tenant isolation** — each user gets their own workspace on registration
- **Plan-based gating** — features controlled by subscription tier, not roles
- **No Redis dependency** — in-memory rate limiting for simplicity
- **Client-side PDF generation** — jsPDF + html2canvas, no server overhead
- **Lazy email client** — Resend client initialized only on first send
- **Presigned URL upload** — browsers upload DICOM files directly to B2, avoiding Vercel's 4.5 MB function body limit; only file metadata touches the API after upload completes

## Support

- **Issues**: [github.com/Adam-zrigui/corevita/issues](https://github.com/Adam-zrigui/corevita/issues)
- **Email**: zriguiadam@gmail.com
