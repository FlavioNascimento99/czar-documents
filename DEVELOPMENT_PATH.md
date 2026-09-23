# CZAR DOCUMENTS — Development Path (Guia Oficial)

> Documento-guia do desenvolvimento. Seguimos este arquivo fase por fase.
> Filosofia: **conteúdo primeiro, UI mínima, interação rápida, baixo overhead cognitivo.**
> Arquitetura em 3 camadas: **CLIENT / SERVER / INFRA** (nunca "frontend/backend" nos docs).

**Estado atual do repo:** scaffold do MVP já existe (CLIENT React+Tiptap, SERVER Go monolito modular,
INFRA docker-compose com Postgres/Redis/Elasticsearch/MinIO). A partir daqui, evoluímos por fases
com critérios de aceite verificáveis.

---

## 1. Mapa das fases

| # | Fase | Objetivo | Duração indicativa |
|---|------|----------|--------------------|
| 0 | Fundação | Ambiente sobe com 1 comando, saúde verificável | ✅ feito (revisar) |
| 1 | Identidade | Register → login → perfil → `•@username` | próxima |
| 2 | Documentos + Editor | Criar → escrever → autosave → ver (Edit/View) | após 1 |
| 3 | Organização | Pastas aninhadas + tipos dinâmicos | após 2 |
| 4 | Colaboração + Publicação | Shares (owner/editor/viewer) + `/p/:token` | após 2 |
| 5 | Busca | Postgres FTS + ES com fallback + reindex | após 2–4 |
| 6 | Arquivos | Upload S3 via signed URL, anexos | após 2 |
| 7 | Endurecimento | Segurança, performance, observabilidade, testes | contínuo |
| 8 | Deploy | Produção Cloudflare-compatível | após 7 |

Regra: **não pular fase sem cumprir os critérios de aceite.**

---

## 2. Fase 0 — Fundação (revisão) — ✅ CONCLUÍDA (2026-09-21)

**Objetivo:** `cp .env.example .env && docker compose up --build` sobe tudo.

- [x] Revisar `docker-compose.yml` (portas 5173/8080/5432/6379/9200/9000/9001)
- [x] Revisar `.env.example` (sem segredos commitados)
- [x] `GET /health` → `{"status":"ok"}`, `GET /ready` → verifica Postgres
- [x] `server/migrations/001_init.sql` aplica sem erro (UUIDs, FKs, índices, seed de tipos)
- [x] README com overview + como rodar + testes

Correções aplicadas na fase:
- Imagem MinIO `minio/minio:latest` → `quay.io/minio/minio:latest` (pull negado no Docker Hub)
- Migration: adicionado `CREATE EXTENSION citext` (tabelas usam CITEXT)
- Router chi: dois `Mount` no mesmo path `/api` causam panic → refatorado para
  `RegisterPublic/RegisterAuth` num único bloco `r.Route("/api", ...)` + `api.Group` com auth
- `main.go` agora avisa quando o arquivo de migration não é encontrado (CWD precisa ser `server/`)

**Verificação:**
```bash
cp -n .env.example .env || true
docker compose up --build -d
curl localhost:8080/health && curl localhost:8080/ready
cd server && go vet ./... && go test ./...
cd ../client && npx tsc --noEmit
```

---

## 3. Fase 1 — Identidade (Auth + Perfis) — ✅ CONCLUÍDA (2026-09-21)

**Objetivo:** fluxo `Register → username → profile → @username`.

### SERVER
- [x] `POST /api/auth/register` — valida username≥3, email válido, senha≥8; hash bcrypt; cria
      `users + profiles + workspaces + memberships(owner)` em transação
- [x] `POST /api/auth/login` — aceita username **ou** email; compara bcrypt; retorna JWT (30d)
- [x] Middleware `Authorization: Bearer` + helper `Optional` para rotas públicas
- [x] `GET /api/users/me`, `GET /api/users/search?q=` (username/display_name, limite 20)
- [x] `PATCH /api/profiles/me` (display_name, avatar_url, bio, is_public)
- [x] `GET /api/@:username` **pública** — só lista docs com `public_links.show_on_profile=true`
      **e** `visibility='public'`. Perfil público ≠ documento público.

### CLIENT
- [ ] `auth/store.ts` (Zustand + localStorage token)
- [ ] Telas `/register`, `/login`, `/@:username`
- [ ] Nav mostra `@username` quando logado

> CLIENT da Fase 1 existe no scaffold mas ainda não foi validado no browser —
> validar na Fase 2 junto com documentos.

**Aceite:**
```text
registrar → login → PATCH /api/profiles/me → GET /api/@user retorna perfil
usuário inexistente ou perfil privado → 404
```

---

## 4. Fase 2 — Documentos + Editor (núcleo)

**Objetivo:** `Criar → escrever → autosave → versionar → ver`.

### SERVER (`internal/documents`)
- [ ] `GET /api/documents` — só próprios + compartilhados, `ORDER BY updated_at DESC LIMIT 100`
- [ ] `POST /api/documents` — workspace do usuário; `content` JSONB Tiptap + `content_text`;
      cria `document_permissions(owner)` + `document_versions v1`
- [ ] `GET /api/documents/:id` — checagem `canRead` (owner > permissão > public)
- [ ] `PATCH /api/documents/:id` — **parcial e idempotente** (só campos enviados);
      nova versão **só quando content muda**; `canWrite = owner|editor`
- [ ] `DELETE` só owner; `GET /:id/versions` (50 últimas)
- [ ] Hook `indexDoc(id)` assíncrono (nunca bloqueia CRUD se ES cair)

### CLIENT
- [ ] `/docs` lista + criar
- [ ] `/docs/:id` **View** — renderer leve (`documents/render.ts`, sem carregar Tiptap)
- [ ] `/docs/:id/edit` **Edit** — `React.lazy(() => import Editor)` + Tiptap
      (paragraph, headings, bold/italic/strike, link, bullets, ordered, checklist,
      quote, code/inline, hr, imagem)
- [ ] Autosave com debounce ~1200ms + indicador `Saving... / Saved / Save failed`
- [ ] Export Markdown (`toMarkdown`) — HTML nunca é canônico

**Aceite:**
```text
criar doc → editar (digitar 5s) → 1–3 PATCH, nunca 1 por tecla
recarregar → conteúdo persistido; /versions tem ≥2 entradas
view não carrega chunk do editor (ver network)
```

---

## 5. Fase 3 — Organização (Pastas + Tipos)

**Objetivo:** pastas aninhadas incrementais + tipos dinâmicos (nunca enum rígido).

### SERVER
- [ ] `GET /api/folders?parent_id=` — carrega **1 nível por vez**
- [ ] `POST /PATCH /DELETE /api/folders/:id` com checagem de membership no workspace
- [ ] `document_type_id` nulável em documents; `GET /api/document-types`
      (sistêmicos `workspace_id IS NULL` + custom do workspace)
- [ ] `POST /api/document-types` `{name, slug, description, icon, color}`; slug único por workspace
- [ ] Seed: Article, Documentation, Notes, Tutorial (`is_system=true`)

### CLIENT
- [ ] Árvore de pastas com lazy-load por nível; mover doc entre pastas (PATCH folder_id)
- [ ] Seletor/criador de tipo no editor; doc pode existir **sem tipo**

**Aceite:** criar pasta filha, mover doc, filtrar busca por tipo.

---

## 6. Fase 4 — Colaboração + Publicação

**Objetivo:** shares + links públicos cacheáveis.

### SERVER (`internal/sharing`)
- [ ] `POST /api/documents/:id/shares {username|email, role: editor|viewer}` — só owner;
      `@john` aceito (strip `@`); visibilidade `private→shared`
- [ ] `DELETE /:id/shares/:userId` — só owner
- [ ] `POST /:id/public-link {show_on_profile}` — token aleatório 32-hex;
      `visibility='public'`; `DELETE` revoga e volta a `private`
- [ ] `GET /api/p/:token` — **pública, sem auth**, `Cache-Control: public, max-age=60`,
      valida `visibility='public'`

### CLIENT
- [ ] Diálogo Share (adicionar/trocar/remover) na DocView
- [ ] Botão Publish → mostra `/p/:token`; página pública leve

**Aceite:**
```text
owner compartilha com editor → editor PATCH ok, viewer PATCH → 403
publicar → GET /api/p/:token sem token funciona; revogar → 404
IDs sequenciais nunca aparecem em URL pública (só UUID/token)
```

---

## 7. Fase 5 — Busca

**Objetivo:** `Search...` agrupado em Documents + Users, com filtros.

- [ ] `GET /api/search?q=&type=` — tenta ES (`multi_match title^3 + fuzziness AUTO`, timeout 2s);
      **fallback Postgres** (`ILIKE` title/content_text + filtro `type slug`); só docs legíveis
- [ ] `POST /api/search/reindex` — reconstrói ES a partir do Postgres (ES nunca autoritativo)
- [ ] CLIENT `/search` com grupos + filtro tipo/autor/pasta (pasta onde couber)

**Aceite:** com ES desligado, busca ainda funciona (fallback); reindex restaura resultados.

---

## 8. Fase 6 — Arquivos

- [ ] `POST /api/documents/:id/attachments/upload-url {filename, mime, size≤25MB}`
      → presigned PUT 15min + linha em `attachments`; checagem owner/editor
- [ ] CLIENT: upload direto ao S3 via URL assinada, insere imagem no editor
- [ ] Nunca armazenar bytes no Postgres; validar MIME no SERVER

---

## 9. Fase 7 — Endurecimento (contínuo, Definition of Done parcial)

- [ ] Segurança: rate-limit em auth, body limit 2MB, validação de inputs, URLs assinadas,
      sem enumeração de IDs, `Authorization` sempre checada no SERVER
- [ ] Performance: índices (`idx_docs_*`, trigram), sem N+1, paginação, CDN em `/p/:token`
- [ ] Observabilidade: logs estruturados + RequestID, `GET /health`, `GET /ready`
- [ ] Testes SERVER: auth, CRUD doc, permissão pasta, share, acesso público, tipos,
      busca, versões. CLIENT: criar, editar, autosave, share, acesso público, busca.
      (Sem meta de % — cobrir caminhos críticos.)

---

## 10. Fase 8 — Deploy

- [ ] `server/Dockerfile` + `client/Dockerfile` multi-stage
- [ ] Env vars por ambiente; JWT_SECRET ≥32 chars; MinIO→R2/S3 real via endpoint
- [ ] Arquitetura Cloudflare-compatível (estáticos no CDN, API + WS no origin)

---

## 11. Ordem de execução imediata (o que fazer AGORA)

1. **Fase 0:** subir stack e rodar verificações acima; corrigir o que quebrar.
2. **Fase 1:** testar register/login/me/profile na mão (curl ou UI) até o aceite passar.
3. **Fase 2:** criar 1 doc, digitar, confirmar autosave + versão + view leve.
4. Só então 3 → 4 → 5 → 6.

**Comando-guia por iteração:**
```bash
# SERVER
cd server && go vet ./... && go test ./...
# CLIENT
cd ../client && npx tsc --noEmit
# E2E manual (Definition of Done §38)
# Register → username → profile → folder → document → tipo → write →
# autosave → view → share → publish (/p/) → search → perfil público
```

---

## 12. Convenções

- Camadas: **CLIENT / SERVER / INFRA** nos docs e mensagens.
- Lógica de negócio fora dos handlers HTTP (pacotes de domínio testáveis).
- Sem microserviços, sem MongoDB, sem realtime CRDT, sem features fora do MVP (§32 da spec).
- Quando houver 2 soluções válidas: menos peças, dono claro, fácil de testar e operar.
