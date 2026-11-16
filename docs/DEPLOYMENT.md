# Deploying ScentIQ for $0

ScentIQ is a two-service deployment:

| Piece | Where | Free tier | Role |
| --- | --- | --- | --- |
| Web app | Vercel Hobby | 100 GB bandwidth | Next.js PWA, catalogue pages, API routes |
| Recommendation API | Vercel Hobby (Python service) | Functions + large-functions beta | FastAPI + scikit-learn hybrid ranker |
| Database / auth | Supabase Free | 500 MB | **Not required for v1** (see below) |

Both run on the same Vercel account and repo, so there is one dashboard, one
bill (none) and no card. The API is a Vercel service declared in the root
`vercel.json`; the web app is a separate project rooted at `apps/web`.

The frontend keeps working if the API is asleep: after an 18-second timeout it
falls back to an on-device ranker and labels the list "On-device estimate".

---

## 1. Prerequisites

- GitHub account with this repository pushed to `main`.
- A [Vercel](https://vercel.com) account (GitHub sign-in works) and the Vercel
  CLI: `npm i -g vercel`.
- Nothing else. No card is required on the Hobby plan at the time of writing.

---

## 2. Deploy the API on Vercel ($0, no card)

The API is a FastAPI app in `services/api`. The repo root holds the serverless
glue:

- `index.py` re-exports the app as `app` after adding `ml/src` and
  `services/api` to `sys.path`.
- `requirements.txt` installs FastAPI, pandas, NumPy, scikit-learn, pyarrow,
  joblib and Sentry.
- `vercel.json` declares the `scentiq-api` service with
  `"entrypoint": "index:app"` and routes every path to it.

Steps:

1. From the repository root, link and deploy:

   ```bash
   vercel link --project scentiq-api
   vercel --prod
   ```

   The first build installs the scientific stack (~550 MB uncompressed). If
   Vercel stops at the 500 MB Python bundle limit, enable the free large
   functions beta and redeploy:

   ```bash
   printf '1' | vercel env add VERCEL_SUPPORT_LARGE_FUNCTIONS production
   vercel --prod
   ```

2. Set the production environment:

   ```bash
   printf 'https://scent-iq.vercel.app,http://localhost:3000' | vercel env add ALLOWED_ORIGINS production
   printf 'production' | vercel env add APP_ENV production
   ```

3. Open `https://scentiq-api.vercel.app/health`:

   ```json
   {"status":"ok","perfumes":1478,"clusters":6,"treeLeaves":60,...}
   ```

Cold starts take 2–4 s while scikit-learn and the artifacts load; a warm request
is ~100–300 ms. With Fluid compute, the instance stays warm under traffic and
sleeps when idle — there is no separate keepalive cron and no 15-minute Render
sleep.

### Alternative: Render Free (needs a card)

`render.yaml` and `services/api/Dockerfile` still describe a Render Blueprint:

1. Render Dashboard → **New +** → **Blueprint**, connect the repo, apply.
2. The API builds from the Dockerfile with `MODEL_DIR=/app/ml/artifacts` and a
   `/health` check.
3. Render now asks for a payment method for identity verification, so this is
   only an option if the account holder is willing to add one. The free service
   sleeps after 15 minutes; section 4 wires a keepalive cron.

Hugging Face Docker Spaces are no longer free (Docker and Gradio Spaces require
PRO), so they are not an option for this project.


---

## 3. Deploy the web app on Vercel

1. Vercel Dashboard → **Add New…** → **Project** → import `Scent-IQ`.
2. **Root Directory:** `apps/web` (important; do not build the monorepo root).
   Git pushes build from this directory. The repo root now hosts the Python API
   service, so an unpinned root would deploy the API at `scent-iq.vercel.app`.
   The CLI uses the current directory instead — run web commands from `apps/web`
   with `--project scent-iq`.
3. Framework preset: **Next.js**. Build command and output stay default.
4. Add environment variables (Production and Preview):

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_API_BASE_URL` | `https://scentiq-api.vercel.app` |
   | `NEXT_PUBLIC_SITE_URL` | `https://<your-project>.vercel.app` |

   With the CLI, from `apps/web`: `printf 'https://scentiq-api.vercel.app' |
   vercel env add NEXT_PUBLIC_API_BASE_URL production --project scent-iq`.

   `NEXT_PUBLIC_SITE_URL` controls canonical URLs, Open Graph, `robots.txt` and
   the sitemap. Redeploy after changing either value; both are inlined at build
   time.
5. Deploy. Vercel runs `npm install` and `next build` from `apps/web`.
6. Verify:
   - `/` and `/catalogue` render.
   - Complete onboarding once; `/discover` should show **Live hybrid model**.
   - If it says **On-device estimate**, the API was cold/unreachable; wait 60 s
     and refresh.

Every push to `main` redeploys both Vercel projects (web and API) from the same
commit; Vercel's Git integration builds each project from its own root.

---

## 4. CI, and keepalive only if you use Render

CI (`.github/workflows/ci.yml`) runs automatically on pushes and pull requests:
web lint/typecheck/build, ML artefact tests, API contract tests.

The Vercel API does not need a keepalive cron — Fluid compute keeps active
instances warm and restarts them on demand. If you chose the Render alternative,
add repository **variables** (not secrets — these URLs are public):

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

- Create a project, then put credentials only in local env files or Vercel
  environment settings.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` is public by design; **enable RLS before any
  write table**.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only. It must never appear in
  `NEXT_PUBLIC_*`, the browser bundle, this repository, or chat.

### Sentry

The API reads `SENTRY_DSN` at boot. Add it in the `scentiq-api` Vercel project's
environment variables to enable error reporting. The web app does not ship a
Sentry SDK yet; do not set the placeholder `NEXT_PUBLIC_SENTRY_DSN` expecting it
to work.

---

## 6. Custom domain

Vercel → (web) Project → Settings → Domains → add `scentiq.example` and follow
the DNS instructions. Then update `NEXT_PUBLIC_SITE_URL`, redeploy, and add the
new origin to the API's `ALLOWED_ORIGINS`. The API can also get its own custom
domain in its project settings.

---

## 7. Rollback

- **Web:** Vercel → Deployments → previous deployment → **Promote to
  Production** (instant, no rebuild).
- **API:** Vercel → `scentiq-api` → Deployments → previous deployment →
  **Promote to Production** (instant, no rebuild).
- **Code:** `git revert <commit>` and push; both projects redeploy `main`.

---

## 8. Cost guardrails

| Resource | Free limit | ScentIQ usage |
| --- | --- | --- |
| Vercel Hobby (web) | 100 GB/month | Static catalogue + PWA; typically <2 GB |
| Vercel Hobby (API) | Fluid compute + 2 GB memory | Idle-sleeping Python service; demo traffic only |
| Large functions beta | 5 GB bundle (API is 550 MB) | Enabled with `VERCEL_SUPPORT_LARGE_FUNCTIONS=1` |
| GitHub Actions | Free for public repos | CI minutes |
| Supabase Free | 500 MB, pauses after 7 days idle | Unused in v1 |

The ML artefacts committed to the repo are small (≈5 MB). Most of the API bundle
is the scientific stack (scipy, pyarrow, pandas, scikit-learn); `data/raw/` is
never committed.

---

## 9. Post-deploy checklist

- [ ] API `/health` returns `status: ok`
- [ ] API CORS preflight from `https://scent-iq.vercel.app` succeeds
- [ ] Vercel web build succeeds from root directory `apps/web`
- [ ] Onboarding → Discover shows "Live hybrid model"
- [ ] Like a perfume; the shortlist re-ranks and the like persists after reload
- [ ] Catalogue deep link (`/catalogue?family=wood_root&season=winter&budget=3`)
      shows the three active filter chips
- [ ] PWA install prompt / offline page works on Android Chrome
- [ ] `robots.txt` and `sitemap.xml` use the production domain
- [ ] No service-role key or `.env` file is present in the repository
