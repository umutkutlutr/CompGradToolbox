#!/bin/bash
# Railway startup script for FastAPI with proxy headers support
# This ensures X-Forwarded-Proto from Railway is respected, preserving HTTPS

uvicorn app.main:app \
  --host 0.0.0.0 \
  --port ${PORT:-8000} \
  --proxy-headers \
  --forwarded-allow-ips="*"

