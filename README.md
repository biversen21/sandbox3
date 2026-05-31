# Plaintiff Filing Readiness Analyzer

An AI-assisted plaintiff litigation intake and filing-readiness platform.

## Setup

### Prerequisites

- Node.js 18.18+
- npm

### Install

```bash
npm install
```

### Database

Copy the example environment file:

```bash
cp .env.example .env
```

The default uses SQLite for local development (`file:./dev.db`).

To switch to PostgreSQL: update `DATABASE_URL` in `.env` and change
`provider = "sqlite"` to `provider = "postgresql"` in `prisma/schema.prisma`.

Run migrations:

```bash
npx prisma migrate dev --name init
```

Seed the Personal Injury rule pack:

```bash
npx prisma db seed
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Validation

```bash
npm run lint
npm run build
```

### Database Studio

```bash
npx prisma studio
```

## Stack

- [Next.js 15](https://nextjs.org/) — App Router, TypeScript
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Prisma 5](https://www.prisma.io/) — ORM
- SQLite (local dev) / PostgreSQL (production)

## Architecture

See [CLAUDE.md](./CLAUDE.md) for the full product spec, data model, and engineering principles.
