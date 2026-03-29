FROM node:20-alpine AS frontend-builder
WORKDIR /app/front-end

COPY front-end/package*.json ./
RUN npm ci

COPY front-end/ ./
RUN npm run build


FROM python:3.11-slim AS runtime
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PRELOAD_MODELS_ON_STARTUP=False

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       openjdk-17-jre-headless \
       build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/
COPY pytest.ini ./pytest.ini
COPY README.md ./README.md
COPY --from=frontend-builder /app/front-end/build ./front-end/build

EXPOSE 5000

CMD ["python", "src/app.py"]