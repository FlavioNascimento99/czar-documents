# CZAR DOCUMENTS — Architecture (CLIENT / SERVER / INFRA)

## Decisions
- Modular monolith in Go; no microservices for MVP.
- PostgreSQL source of truth; UUIDs; public tokens non-sequential.
- Elasticsearch derived index; PG fallback; `POST /api/search/reindex`.
- Redis optional (cache/rate-limit/presence); startup never gated on it.
- S3 for bytes, PG for metadata; presigned PUT URLs.
- Handlers contain no business logic; domain packages own rules.
- Auth: bcrypt + JWT Bearer. All authorization server-side.
- Content: Tiptap JSON in JSONB + `content_text` for search; Markdown via `toMarkdown` (client) — HTML never canonical.
- Edit mode lazy-loads Tiptap; View/public use lightweight renderer.
- Autosave debounced 1200ms; PATCH partial; versions per content save.
