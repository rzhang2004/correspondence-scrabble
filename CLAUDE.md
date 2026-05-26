# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev          # start dev server (Turbopack by default)
npm run build        # download dictionary + prisma generate + next build
npm run lint         # ESLint (next build no longer runs linter automatically)
npm run setup        # download TWL06 dictionary to data/twl06.txt
npm run db:push      # sync prisma schema to database (dev)
npm run db:migrate   # run prisma migrations (production)
npm run db:studio    # open Prisma Studio
npx prisma generate  # regenerate client after schema changes
```

## Environment variables

Required in `.env`:

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — NextAuth secret (generate with `openssl rand -base64 32`)
- `NEXTAUTH_URL` — app base URL
- `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — Google OAuth credentials
- `RESEND_API_KEY` / `RESEND_FROM` — transactional email (Resend)
- `NEXT_PUBLIC_APP_URL` — public URL used in email links

## Next.js 16 breaking changes

This project uses **Next.js 16**, which has breaking changes from earlier versions. Always read `node_modules/next/dist/docs/` before writing Next.js-specific code.

Key differences:
- **Middleware is now called Proxy** — the file is `src/proxy.ts`, not `middleware.ts`
- **Route params are a Promise** — always `await params`: `const { gameId } = await params`
- **`next build` does not run the linter** — run `npm run lint` separately
- **Turbopack is the default bundler** — use `next dev --webpack` to opt out

## Architecture

### Data layer

- **Database**: PostgreSQL, accessed via `@prisma/adapter-pg` (driver adapter, not default Prisma connection)
- **Prisma client** generated to `src/generated/prisma/` (custom output). Import from `@/generated/prisma/client`, not `@prisma/client`
- **Singleton client** in `src/lib/db.ts` — always import `prisma` from there

### Authentication

- **NextAuth v5 beta** (`next-auth@^5`) configured in `src/auth.ts`
- JWT session strategy; Google OAuth + email/password credentials providers
- `session.user.id` and `session.user.username` are available after the JWT callback extends the token
- The `src/proxy.ts` Proxy file handles auth redirects (unauthenticated → `/login`, logged-in on auth pages → `/dashboard`)

### App structure

- `src/app/(app)/` — route group for authenticated pages (`dashboard`, `friends`, `games/[gameId]`)
- `src/app/api/` — REST API routes (`/games`, `/games/[gameId]`, `/games/[gameId]/move`, `/friends`, `/auth`)
- `src/components/` — shared client components (`ScrabbleBoard`, `TileRack`, `Nav`)
- `src/lib/scrabble/` — pure game logic: `engine.ts` (validate + score moves), `board.ts` (board model + bonuses), `tiles.ts` (tile bag + rack filling), `dictionary.ts` (TWL06 word lookup)
- `src/lib/email.ts` — Resend email helpers (turn notifications, game invites)

### Game flow

Page components (Server Components) fetch game state from Prisma and pass it as props to `GameClient` (Client Component). All move submissions go through `POST /api/games/[gameId]/move`, which calls `validateAndScoreMove` from the engine, then updates the DB in a Prisma transaction. Email notifications fire after each move (fire-and-forget via `.catch(() => {})`).

The dictionary (`data/twl06.txt`) is loaded lazily and cached in memory on the server. Run `npm run setup` if it's missing.

### Schema overview

Key models: `User`, `Game` (stores `boardState` as JSON, `tileBag`/`player1Rack`/`player2Rack` as string arrays), `Move`, `Friendship`, `GameInvite`. Games use `consecutivePasses` to detect a 6-pass game-over condition.
