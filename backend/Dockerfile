FROM python:3.14-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

RUN useradd --create-home --uid 1000 app
USER app

EXPOSE 8000

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:${PORT:-8000}/saude')" || exit 1

# Aplica as migrations pendentes antes de subir a API. A porta vem do PORT, que o Railway define.
# Com host vazio, o asyncio abre um socket IPv4 e outro IPv6. O "::" sozinho fica só em IPv6,
# e a rede privada do Railway pode usar qualquer um dos dois.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host '' --port ${PORT:-8000} --proxy-headers --forwarded-allow-ips='*'"]
