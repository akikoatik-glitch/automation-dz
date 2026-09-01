# Automation Attik

Multi-tenant business automation platform for Algerian SMBs — WhatsApp/Facebook lead capture, appointment reminders, CRM-like workflows, automations, inbox, invoicing, and a white-label marketing site.

Built with **Next.js 14**, **Prisma**, **NextAuth**, **Tailwind CSS**, and i18n (fr / en / ar with RTL).

## Features

- Multi-workspace SaaS with role‑based access (admin, owner, member)
- Lead capture via public forms + WhatsApp/Facebook integrations
- Appointment & reminder scheduling
- Visual automation builder with triggers & scheduled jobs
- Shared inbox with AI-assisted replies (OpenAI-compatible, with offline rule-based fallback)
- Invoices, payments, and usage-limit tracking per plan
- Admin panel for businesses, users, plans, activity, and settings
- Public marketing site with multi-language pricing

## Tech Stack

- **Framework:** Next.js 14 (App Router, Server Components)
- **ORM:** Prisma (SQLite for local dev; PostgreSQL-ready for production)
- **Auth:** NextAuth (credentials)
- **Styling:** Tailwind CSS
- **State/UI:** zustand, lucide-react, tailwind-merge
- **Internationalization:** custom light-weight i18n (fr / en / ar, RTL support)

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env   # then edit values as needed

# 3. Set up the database
npm run db:push
npm run db:seed

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See `.env.example` for all variables. The AI assistant and SMTP email are optional — leave `AI_API_KEY` / `SMTP_*` empty to use offline fallbacks.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start dev server |
| `npm run build` | Generate Prisma client + production build |
| `npm run start` | Start production server |
| `npm run db:push` | Sync Prisma schema to DB |
| `npm run db:seed` | Load seed data |
| `npm run db:studio` | Open Prisma Studio |

## Production note

Local dev uses SQLite (`file:./dev.db`). For a hosted deployment (e.g. Vercel), switch the Prisma provider to `postgresql` and set `DATABASE_URL` to a managed PostgreSQL instance.

## License

Proprietary — all rights reserved.
