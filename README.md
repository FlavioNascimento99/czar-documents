# CZAR DOCUMENTS — MVP

> Write. Organize. Collaborate. Publish. Search.

Lightweight, high-performance document writing and publishing platform.
Content first. Minimal UI. Fast interaction. Low cognitive overhead.

Project: **CZAR DOCUMENTS** (formerly "Document Writer" / "Document Builder" / "CZAR_DOCUMENT WRITER").

## Architecture (CLIENT / SERVER / INFRA)

```text
CLIENT  → React + TS + Tiptap + TanStack Query + Zustand + Tailwind
SERVER  → Go modular monolith (REST + WebSocket-ready)
INFRA   → PostgreSQL + Redis + Elasticsearch + S3-compatible + Docker
```

- PostgreSQL = source of truth
- Elasticsearch = derived search index (rebuildable, optional at runtime)
- Redis = cache / rate-limit / presence (never authoritative)
- S3-compatible (MinIO locally) = binary assets

See `server/`, `client/`, `docker-compose.yml`.

## Quickstart (Docker)

```bash
cp .env.example .env
docker compose up --build
```

- CLIENT: http://localhost:5173
- SERVER: http://localhost:8080 (`/health`, `/ready`)
- S3 (MinIO console): http://localhost:9001
- Elasticsearch: http://localhost:9200

## Local dev without Docker

```bash
# infra only
docker compose up -d postgres redis elasticsearch minio

# server
cd server && go run ./cmd/api

# client
cd client && npm install && npm run dev
```

## Definition of Done flow

```text
Register → username → profile → folder → document → type →
write → autosave → view → share → publish (/p/:token) →
search → public profile (/@username)
```

All authorization enforced server-side.

## Docs

- `docs/architecture.md` — CLIENT/SERVER/INFRA, decisions
- `docs/api.md` — REST reference
