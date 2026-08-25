# Feetrate backend

Fastify + TypeScript + Prisma (PostgreSQL) API for the Feetrate Telegram Mini App.

## Local setup

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL / GEMINI_API_KEY for real use
npx prisma generate    # also runs automatically via npm install's postinstall-free flow if you prefer `npm run db:generate`
npm run db:migrate:dev  # creates the local Postgres schema (requires a running Postgres matching DATABASE_URL)
npm run seed             # seeds ~6 placeholder public-rating photos with a few votes
npm run dev               # starts the API with hot reload on PORT (default 8080)
```

`GET /health` responds `{"status":"ok"}` without needing a database connection — only the
DB-backed routes (`/api/analyze`, `/api/rating/*`, `/api/profile`) require Postgres and a
valid `GEMINI_API_KEY` (for `/api/analyze`) to actually succeed.

## Scripts

- `npm run dev` — tsx watch mode.
- `npm run build` — compiles TypeScript to `dist/`.
- `npm run start` — runs the compiled build (`node dist/index.js`).
- `npm run db:generate` — `prisma generate`.
- `npm run db:migrate:dev` — `prisma migrate dev`, for local schema creation/iteration.
- `npm run db:migrate` — `prisma migrate deploy`, for applying existing migrations in
  staging/production. This is a separate, explicit step — the Docker image's default
  `CMD` does **not** run migrations on container start.
- `npm run seed` — populates the public rating feed with generated placeholder images.

## Docker

```bash
docker build -t feetrate-backend .
docker run --rm -e DATABASE_URL=... feetrate-backend npm run db:migrate   # run migrations once
docker run -p 8080:8080 --env-file .env feetrate-backend                   # run the app
```

## Known simplifications (MVP)

- Telegram `initData` is parsed for the numeric user id but its HMAC signature is **not**
  verified against the bot token (see the comment in `src/services/user.ts`). A production
  deployment must add that verification before trusting the identity it carries.
- Outside Telegram (local/dev testing), send `X-Dev-User-Id: <any-string>` to simulate a
  stable user, or omit it entirely to fall back to a single shared `dev-user` identity.
