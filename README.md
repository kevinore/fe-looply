# Frontend PWA

Client zone (`/c/*`) and operator zone (`/op/*`) in one installable PWA.
Plan: [`plan-frontend.md`](plan-frontend.md) · Mockups: [`docs/mockups/`](docs/mockups) · Palette: [`docs/brand-palette.png`](docs/brand-palette.png)

## Stack

Vite 8 · React 19 · TypeScript 6 (strict) · React Router 7 · TanStack Query 5 · Zustand 5 ·
openapi-typescript + openapi-fetch · Tailwind CSS 4 · zod (mini) · vite-plugin-pwa (Workbox) ·
qrcode · qr-scanner · Vitest + Testing Library · Playwright · ESLint + Prettier.

Browser baseline: iOS/Safari 16.4+, Chrome/Android 111+, Firefox 128+ (Tailwind 4 and `color-mix`).

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server; `/api` is proxied to `API_TARGET` (default `http://localhost:8000`) |
| `npm run build` | Typecheck + production build (with service worker) |
| `npm run preview` | Serve the production build |
| `npm run gen:api` | Regenerate `src/api/schema.d.ts` from `openapi.json` |
| `npm run lint` / `typecheck` / `test` | Quality gate (run after every change) |
| `npm run e2e` | Playwright flows F1–F4, F7 and error cases |
| `npm run assets` | Regenerate optimized images/icons from `assets-src/brand/` and product photos from `assets-src/products/` |

When the backend API changes: in `be-looply/backend` run `uv run python -m scripts.export_openapi`
(writes `openapi.json` and `error_codes.json` here), then `npm run gen:api`.

## Layout

```
src/
  api/        client (unwrap/ApiError), errors (from error_codes.json), generated schema, type aliases
  app/        router (one lazy chunk per screen), query client, query keys
  brand/      BrandProvider (API branding → CSS variables), Mascot, Logo
  ui/         base components (Button, BottomSheet, Keypad, ProgressSegments, …)
  lib/        money, phone, dates, device, wakeLock, wheel, events, install prompt
  features/customer/   client screens (C1–C6, S0–S3, M1–M2)
  features/operator/   operator screens (01–07, R1–R5, M3–M4), cart store
  dev/UiGallery.tsx    /dev/ui — component gallery (development only)
assets-src/brand/      original brand images (not shipped)
assets-src/products/   product photos, <name>.png → public/products/<name>.webp (photo_url in the backend seed)
public/brand, icons/   generated AVIF/WebP images and PWA icons
```

Design rules: every business color comes from the API (`branding.colors`) as CSS variables;
tints and AA-safe text shades are derived with `color-mix` in `src/index.css`. Never write the
business name in code (ESLint enforces it).

Performance: operator code is only in `op-*` chunks, which the service worker never precaches, so
customers never download it. The JS for `/c/claim/:token` is ≈123 KB gzip (budget 150 KB).

## Local end-to-end testing

Use a local backend with a throwaway database (never the shared one):

```bash
# in be-looply/backend, against the local Postgres on :5433
docker exec backend-db-1 psql -U owner -d app_test -c "CREATE DATABASE looply_fe"
export MIGRATION_DATABASE_URL=postgresql://owner:owner@localhost:5433/looply_fe \
       DATABASE_URL=postgresql://app_runtime:runtime@localhost:5433/looply_fe
uv run alembic upgrade head && uv run python -m scripts.seed   # + create an operator
PUBLIC_APP_URL=http://localhost:5174 ALLOWED_ORIGINS=http://localhost:5174 COOKIE_SECURE=false \
  uv run uvicorn app.main:app --port 8001

# here
API_TARGET=http://localhost:8001 npm run e2e -- --project="Pixel 7"
```

Options: `E2E_OPERATOR_EMAIL` / `E2E_OPERATOR_PASSWORD`, `E2E_CLOSE_WORKDAY=1` (also closes the
workday), `E2E_RESET_CMD` (shell command run before the suite, e.g. a `TRUNCATE`). The
`Mobile Safari` project needs WebKit system libraries: `sudo npx playwright install-deps webkit`. The `iPad` project checks the tablet layout (Chromium at iPad size).

Responsive sizing: everything is in `rem` and the root font size grows with the screen (16px on phones → 20px on large tablets, `src/index.css`), so the whole UI scales together. `Screen` takes `width="narrow" | "medium" | "wide"` for how much of a tablet a screen uses; avoid fixed `px` sizes in classes.
