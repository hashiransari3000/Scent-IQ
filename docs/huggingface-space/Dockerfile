FROM python:3.12-slim

# Hugging Face Docker Spaces expect the app on port 7860 and a non-root
# runtime user (UID 1000). The API is stateless and only reads the model
# artifacts baked in at build time.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    MODEL_DIR=/app/ml/artifacts \
    ALLOWED_ORIGINS=https://scent-iq.vercel.app,http://localhost:3000

RUN apt-get update \
    && apt-get install -y --no-install-recommends git \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Build from the same public repo that serves the website.
ARG REPO_URL=https://github.com/hashiransari3000/Scent-IQ.git
ARG REPO_REF=main
RUN git clone --depth 1 --branch "${REPO_REF}" "${REPO_URL}" .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -e ./ml \
    && pip install --no-cache-dir -r ./services/api/requirements.txt

# Free Spaces run containers as UID 1000. Files stay root-owned and read-only
# for the app, which needs no write access.
RUN useradd --create-home --uid 1000 user
USER user
ENV HOME=/home/user

WORKDIR /app/services/api

EXPOSE 7860

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:7860/health', timeout=4).status == 200 else 1)"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--proxy-headers"]
