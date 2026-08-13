# Crayon Cookout API
#
# Multi-arch: builds on both amd64 and arm64 (Oracle Cloud's free tier is
# Ampere/arm64). No architecture-specific base image or wheel is pinned.

FROM python:3.12-slim AS base

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Dependencies first so a source-only change reuses this layer.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# Run as a non-root user. A container that never needs to write to its own
# filesystem should not be able to.
RUN useradd --create-home --uid 10001 appuser \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Hits the one endpoint with no dependencies, so an unconfigured box still
# reports healthy rather than crash-looping.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0) if urllib.request.urlopen('http://127.0.0.1:8000/api/health', timeout=4).status==200 else sys.exit(1)"

# No --reload: that is a development flag and would watch the filesystem in
# production. Two workers is a sane default for a small VM; raise it if the
# box has more cores to spare.
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", "--port", "8000", \
     "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]
