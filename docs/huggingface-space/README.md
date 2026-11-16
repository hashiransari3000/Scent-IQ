---
title: ScentIQ API
emoji: 🌸
colorFrom: pink
colorTo: gray
sdk: docker
app_port: 7860
pinned: false
---

# ScentIQ recommendation API

FastAPI + scikit-learn service for the ScentIQ web app.

- Health: `/health`
- Recommendations: `POST /v1/recommend`
- Explanation: `POST /v1/explain/{id}`
- Catalogue: `GET /v1/catalogue`

```bash
curl https://<owner>-scentiq-api.hf.space/health
```

The image clones the public
[hashiransari3000/Scent-IQ](https://github.com/hashiransari3000/Scent-IQ)
repository at build time, installs the reproducible ML package and starts
uvicorn on port 7860. No secrets or database are required. CORS is limited to
the production site and localhost via `ALLOWED_ORIGINS`.

Free Spaces sleep after ~48 h without traffic; the first request afterwards
takes ~30-60 s to wake. The web app falls back to its on-device ranker while
the API is cold, then switches back automatically.
