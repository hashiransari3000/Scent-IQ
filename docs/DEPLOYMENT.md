# Deploying ScentIQ for $0

ScentIQ is a two-service deployment:

| Piece | Where | Free tier | Role |
| --- | --- | --- | --- |
| Web app | Vercel Hobby | 100 GB bandwidth | Next.js PWA, catalogue pages, API routes |
| Recommendation API | Render Free (Docker) | 750 h/month, 512 MB | FastAPI + scikit-learn hybrid ranker |
| Database / auth | Supabase Free | 500 MB | **Not required for v1** (see below) |

The frontend keeps working if the API is asleep: after an 18-second timeout it
falls back to an on-device ranker and labels the list "On-device estimate".

---

## 1. Prerequisites

- GitHub account with this repository pushed to `main`.
- [Render](https://render.com) and [Vercel](https://vercel.com) accounts (both
  support GitHub sign-in).
- Nothing else. No card is required for either free tier at the time of writing.

---

## 2. Deploy the API on Render

1. Render Dashboard → **New +** → **Blueprint**.
2. Connect the `Scent-IQ` repository. Render reads `render.yaml` from the root.
3. Apply the blueprint. It creates `scentiq-api` from
   `services/api/Dockerfile` with:
   - `MODEL_DIR=/app/ml/artifacts`
   - `ALLOWED_ORIGINS=*` (tighten later)
   - health check `/health`
4. Wait for the first Docker build (5–10 min cold; later deploys are cached).
5. Copy the service URL, for example `https://scentiq-api.onrender.com`, and
   open `/health`. You should see:

   ```json
   {"status":"ok","perfumes":1478,"clusters":6,"treeLeaves":60,...}
   ```

The free service sleeps after 15 minutes of inactivity. Step 5 below keeps it
warm.

### Tightening CORS (optional)

`ALLOWED_ORIGINS=*` is safe here: the API is public, has no cookies, no accounts
and no write endpoints. After the Vercel domain is final, set it in Render →
Environment to the exact origin, e.g. `https://scentiq.vercel.app`. Vercel
preview URLs will then be blocked from live scoring, so only do this once you no
longer need previews.

---

## 3. Deploy the web app on Vercel

1. Vercel Dashboard → **Add New…** → **Project** → import `Scent-IQ`.
2. **Root Directory:** `apps/web` (important; do not build the monorepo root).
3. Framework preset: **Next.js**. Build command and output stay default.
4. Add environment variables (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://scentiq-api.onrender.com` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-project>.vercel.app` |

   `NEXT_PUBLIC_SITE_URL` controls canonical URLs, Open Graph, `robots.txt` and
   the sitemap. Redeploy after changing it.
5. Deploy. Vercel runs `npm install` and `next build` from `apps/web`.
6. Verify:
   - `/` and `/catalogue` render.
   - Complete onboarding once; `/discover` should show **Live hybrid model**.
   - If it says **On-device estimate**, the API was cold/unreachable; wait 60 s
     and refresh.

Every push to `main` redeploys the frontend. Render redeploys the API from the
same commit.

---

## 4. Turn on keepalive and CI

CI (`.github/workflows/ci.yml`) runs automatically on pushes and pull requests:
web lint/typecheck/build, ML artefact tests, API contract tests.

For keepalive, add repository **variables** (not secrets — these URLs are
public):

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions** →
   **Variables** → **New repository variable**.
2. `API_HEALTH_URL` = `https://scentiq-api.onrender.com/health`
3. `WEB_URL` = `https://<your-project>.vercel.app`
4. Run `.github/workflows/keepalive.yml` once manually to confirm it passes.

GitHub cron can be delayed; if cold starts still appear, add a free
[UptimeRobot](https://uptimerobot.com) HTTP monitor for the health URL every
5 minutes as a second pinger.

---

## 5. Optional services

### Supabase

The v1 app does **not** need Supabase. Perfume data is baked into the build and
taste profiles live in `localStorage`; the API is stateless. Supabase is reserved
for the next phase: accounts, cross-device profiles, community ratings and
feedback-to-retraining. When that phase starts:

- Create a project, then put credentials only in local env files or Vercel/
  Render environment settings.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by design; **enable RLS before any
  write table**.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never appear in
  `NEXT_PUBLIC_*`, the browser bundle, this repository, or chat.

### Sentry

The API reads `SENTRY_DSN` at boot. Add it in Render → Environment to enable
error reporting. The web app does not ship a Sentry SDK yet; do not set the
placeholder `NEXT_PUBLIC_SENTRY_DSN` expecting it to work.

---

## 6. Custom domain

Vercel → Project → Settings → Domains → add `scentiq.example` and follow the
DNS instructions. Then update `NEXT_PUBLIC_SITE_URL`, redeploy, and optionally
tighten Render's `ALLOWED_ORIGINS`.

---

## 7. Rollback

- **Web:** Vercel → Deployments → previous deployment → **Promote to
  Production** (instant, no rebuild).
- **API:** Render → service → **Deploys** → previous deploy → **Redeploy**. The
  Docker image is cached.
- **Code:** `git revert <commit>` and push; both platforms redeploy `main`.

---

## 8. Cost guardrails

| Resource | Free limit | ScentIQ usage |
| --- | --- | --- |
| Vercel Hobby | 100 GB/month | Static catalogue + API route; typically <2 GB |
| Render Free | 750 h/month, sleeps at 15 min | One always-warm service ≈ 730 h |
| GitHub Actions | Free for public repos | CI minutes + scheduled pings |
| Supabase Free | 500 MB, pauses after 7 days idle | Unused in v1 |

The ML artefacts committed to the repo are small (≈5 MB), so Docker builds stay
fast. `data/raw/` is never committed or copied into the image.

---

## 9. Post-deploy checklist

- [ ] API `/health` returns `status: ok`
- [ ] Vercel build succeeds from root directory `apps/web`
- [ ] Onboarding → Discover shows "Live hybrid model"
- [ ] Like a perfume; the shortlist re-ranks and the like persists after reload
- [ ] Catalogue deep link (`/catalogue?family=wood_root&season=winter&budget=3`)
      shows the three active filter chips
- [ ] PWA install prompt / offline page works on Android Chrome
- [ ] `robots.txt` and `sitemap.xml` use the production domain
- [ ] Keepalive workflow has run successfully
- [ ] No service-role key or `.env` file is present in the repository
