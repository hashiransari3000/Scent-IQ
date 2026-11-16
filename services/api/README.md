# ScentIQ API

Stateless FastAPI service around the ScentIQ offline model.

```bash
cd services/api
uv sync
uv run uvicorn app.main:app --reload --port 8000
```

Endpoints:

- `GET /health`
- `POST /v1/recommend`
- `POST /v1/explain/{perfume_id}`
- `GET /v1/perfumes/{perfume_id}`
- `GET /v1/perfumes/{perfume_id}/similar`
- `GET /v1/catalogue`
- `GET /v1/model/info`
- `GET /v1/taxonomy`

The catalogue pages read Supabase directly; this service is only needed for
ranking and explanations.
