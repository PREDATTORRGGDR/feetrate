# Feetrate — frontend

Telegram Mini App frontend for Feetrate, built with React 19 + Vite 6 + TypeScript.

## Local development

```bash
npm install
npm run dev
```

The dev server runs on `http://localhost:5173` and proxies `/api` to `http://localhost:8080` (the backend dev port), so the app works once the backend is running locally. Without a backend running, screens that fetch data show a friendly retry state instead of crashing.

Open the app in a regular browser for the desktop/mobile fallback, or inside Telegram (pointed at the dev URL via a tunnel) to exercise the Telegram Mini App integration.

## Build

```bash
npm run build
```

Type-checks with `tsc -b` and outputs a production build to `dist/`.

## Environment

Copy `.env.example` to `.env` if you need to point at a different API base URL:

```
VITE_API_BASE_URL=/api
```

This is optional for local dev and prod — both already route `/api` correctly via the Vite proxy and `nginx.conf` respectively.

## Docker

```bash
docker build -t feetrate-frontend .
docker run -p 8081:80 feetrate-frontend
```

The container serves the static build via nginx and proxies `/api/` to the `backend` Docker Compose service on port 8080.
