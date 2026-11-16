FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY ml/pyproject.toml /app/ml/pyproject.toml
COPY ml/src /app/ml/src
COPY ml/artifacts /app/ml/artifacts
COPY data/processed /app/data/processed
COPY services/api /app/services/api

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e /app/ml \
    && pip install --no-cache-dir -r /app/services/api/requirements.txt

WORKDIR /app/services/api

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
