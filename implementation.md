# SynapseMCP — Full Implementation Details

> Consolidated from `architecture.md`, `design.md`, `instruction.md`, `plan.md`, `s3-setup.md`
> (all on Desktop) and `frontend deployment.md` (this repo). Where the original spec and the
> as-built system differ, **this document describes what was actually built** — the spec's
> original intent is noted only where it clarifies *why* a deviation happened.

---

## 1. System Overview

SynapseMCP is a multi-tenant Retrieval-Augmented Generation (RAG) platform: a Spring Boot
backend + PostgreSQL/pgvector datastore + React frontend, with a bolt-on Model Context Protocol
(MCP) server so external LLM clients (Claude Desktop, Cursor, custom agents) can query the same
per-user knowledge base as a tool.

Core invariants (all enforced in the as-built system):

1. **One knowledge base per user.** Signup auto-provisions exactly one `knowledge_bases` row
   (`is_default = true`, `UNIQUE (tenant_id)` constraint). No KB create/switch/delete UI exists.
2. **Fixed, non-selectable AI models.** Chat: Google **`gemini-3.5-flash-lite`** (as built —
   originally spec'd as `gemini-3.8-flash`, switched after the free-tier `generateContent` quota,
   20 requests/day, was exhausted twice in testing on both `gemini-3.8-flash` and
   `gemini-3.5-flash`). Embeddings: Google **`gemini-embedding-2`**, 768 dimensions
   (`vector(768)`). Neither is user-configurable.
3. **Zero permanent object storage.** Uploaded files are staged in S3/MinIO only long enough to
   parse, chunk, and embed; the raw binary is deleted the moment chunks + vectors are committed
   to PostgreSQL. No raw-file re-download ever exists — only extracted-text citation cards.
4. **Transient chat history.** Conversation turns live only in React state for the tab's
   lifetime; nothing is persisted server-side.
5. **Dual-phase progress UI.** Phase 1: Axios `onUploadProgress` byte percentage. Phase 2:
   Server-Sent Events (`QUEUED → PARSING → CHUNKING → EMBEDDING → PURGING_S3 → INDEXED`).
6. **Two access paths into the same tenant data:** the React SPA (JWT) and the MCP server
   (per-user API key), both resolving to the same `tenant_id`-scoped rows.

---

## 2. Technology Stack (as built)

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite, Axios, Tailwind/modern CSS tokens, Lucide icons |
| Backend | Java 21 (Virtual Threads) + Spring Boot 3.3+/4.x, Spring Data JPA, Spring Security, Spring AI |
| Datastore | PostgreSQL 17 + `pgvector` (HNSW cosine index, `vector(768)`), Row-Level Security |
| Transient storage | AWS S3 / MinIO — staging only, 24h lifecycle expiry as orphan safety net |
| Chat model (fixed) | Google `gemini-3.5-flash-lite` |
| Embedding model (fixed) | Google `gemini-embedding-2` (768d) |
| Web search fallback | DuckDuckGo Instant Answer API (as built — spec originally called for Tavily; no API key needed, but not a ranked multi-result search — typically 0 or 1 abstract-style result) |
| External LLM protocol | Model Context Protocol (MCP) over HTTP/SSE, via Spring AI's MCP Server starter |
| Document parsers | Apache PDFBox, Apache POI, Jsoup, Tess4J (Tesseract) — not Apache Tika |

---

## 3. Key As-Built Deviations From Original Spec (ADR summary)

These are the decisions that matter if you're reading backend code and wondering why it doesn't
match the original diagrams:

- **Ingestion tier order is reversed.** Java parsers (Tier 2) run **first** for every file,
  every size. The Gemini multimodal extractor (Tier 1) only runs as a **fallback**, and only for
  files `≤ 2 MiB`, when Tier 2 fails or extracts nothing. Both failing → one combined error
  message. Rationale: Java parsing is free and usually sufficient; Gemini is reserved for content
  Java genuinely can't read (e.g. a scanned page with no text layer).
  - **Exception: images `≤ 2 MiB` reverse this again** — Gemini (Tier 1) runs first, Tesseract
    OCR (Tier 2) is the fallback. Tesseract reads clean text scans well but does poorly on
    stylized/low-contrast/mostly-visual images; Gemini's multimodal model handles both in one
    pass. Images `≥ 2 MiB` are OCR-only (Tier 1 hard-rejects anything that large). See
    `IngestionOrchestrator.extractSmallImage` / `IngestionOrchestratorImageRoutingTest`.
  - `> 10 MiB` instant-rejection (HTTP 413 `FILE_LIMIT_EXCEEDED`) is unchanged.
  - `PdfBoxDocumentParser` gained a per-page OCR fallback (same Tesseract engine) for pages with
    no embedded text layer, so a mixed PDF only pays OCR cost where needed.
  - `PoiPptDocumentParser` skips a slide entirely if it has no title and only empty/decorative
    shapes, instead of emitting a content-free `## Slide N` heading.
- **Web search fallback is DuckDuckGo, not Tavily** (no API key required; trade-off is a much
  thinner result set — usually zero or one abstract vs. a ranked 3–5 results — so more queries
  land on the deterministic "no results" message than a true search API would produce).
- **Retrieval returns top 8 chunks (`TOP_K=8`)**, not top 5 — raised after real multi-document
  testing showed a correct chunk could rank outside top-5 purely due to competing documents.
- **Answer synthesis runs at `temperature(0.0)`** and **groups retrieved chunks by source
  document** in the prompt (not flat rank order) — both found necessary in real testing for the
  model to reliably connect a title chunk and a detail chunk from the same document.
- **Query spell-correction** (`QuerySpellCorrector`, not in original scope): the raw query is
  sent through the fixed chat model with a correction-only prompt before embedding, best-effort
  (silently falls back to the original query on timeout/error, bounded by `PT5S`). Applies to
  both `POST /api/v1/chat` and the `search_user_knowledge_base` MCP tool. `ChatResponse` exposes
  a nullable `correctedQuery` field.
- **A 4th MCP tool, `upload_document`** (filename + Base64 content), beyond the original 3-tool
  scope — lets an MCP client populate the KB, not just query it. Reuses
  `DocumentService.upload` directly via a `ByteArrayMultipartFile` adapter, so behavior is
  identical to the REST upload path.
- **Conversation memory**: client sends its own recent history (max 20 turns, `{role, text}`),
  never persisted server-side. Last 2 user turns fold into the retrieval query; a trimmed window
  (≤6 turns) is passed to synthesis as context only, never as a fact source.
- **Chunking uses word count as a token proxy** (no tokenizer dependency). Images chunk **one
  line per OCR'd line**, not spatial/bounding-box grouping (Tess4J doesn't carry bounding-box
  data through). A "fact-sheet" PDF heuristic (many short ALL-CAPS standalone headings, small
  average section size) splits one chunk per section instead of packing to a word target.

---

## 4. Database Schema (PostgreSQL 17 + pgvector)

### 4.1 Entities
`tenants`, `users`, `api_keys`, `knowledge_bases` (1:1 with tenant via `UNIQUE(tenant_id)`),
`documents`, `chunks`, `ingestion_jobs`, `audit_logs` — every tenant-scoped table carries a
`tenant_id UUID NOT NULL` discriminator column.

### 4.2 Isolation strategy (defense in depth)
1. **Application layer:** Spring Data JPA repositories bind `tenant_id` on every query.
2. **Database layer:** PostgreSQL Row-Level Security policies enforce
   `tenant_id = current_setting('app.current_tenant_id')::uuid` on `documents`, `chunks`,
   `ingestion_jobs`, `api_keys`, `knowledge_bases`.
3. **As built:** the tenant context is bound per-transaction via a custom
   `PlatformTransactionManager` (`TenantRlsTransactionManager` + `RlsSupport`), not an HTTP
   interceptor — and a `TenantAwareTaskDecorator` propagates it onto the async ingestion
   worker's virtual thread.

### 4.3 DDL (core tables)

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tenants_status CHECK (status IN ('ACTIVE', 'SUSPENDED', 'DELETED'))
);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'USER',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_users_role CHECK (role IN ('ADMIN', 'USER', 'READ_ONLY'))
);
CREATE UNIQUE INDEX uq_users_email_ci ON users (LOWER(email));

CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL DEFAULT 'Default MCP Key',
    key_prefix VARCHAR(16) NOT NULL,
    key_hash VARCHAR(64) NOT NULL, -- SHA-256 of the plaintext key
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_api_keys_hash ON api_keys (key_hash);

CREATE TABLE knowledge_bases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Default Knowledge Base',
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tenant_single_kb UNIQUE (tenant_id)
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    name VARCHAR(500) NOT NULL,
    content_type VARCHAR(150) NOT NULL,
    file_size BIGINT NOT NULL,
    storage_path VARCHAR(1000),       -- NULL once purged
    raw_file_purged BOOLEAN NOT NULL DEFAULT FALSE,
    ingestion_tier VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_documents_size CHECK (file_size > 0 AND file_size <= 10485760),
    CONSTRAINT chk_documents_tier CHECK (ingestion_tier IN ('TIER_1_MULTIMODAL', 'TIER_2_JAVA_PARSER')),
    CONSTRAINT chk_documents_status CHECK (status IN ('PENDING', 'PROCESSING', 'INDEXED', 'FAILED', 'REJECTED'))
);

CREATE TABLE ingestion_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    stage VARCHAR(50) NOT NULL DEFAULT 'QUEUED',
    progress_percent INTEGER NOT NULL DEFAULT 0,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_jobs_status CHECK (status IN ('QUEUED','PARSING','CHUNKING','EMBEDDING','PURGING_S3','COMPLETED','FAILED')),
    CONSTRAINT chk_jobs_stage CHECK (stage IN ('QUEUED','EXTRACTION','SPLITTING','VECTORIZING','PURGING_S3','COMPLETED','FAILED')),
    CONSTRAINT chk_jobs_progress CHECK (progress_percent BETWEEN 0 AND 100)
);

CREATE TABLE chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    knowledge_base_id UUID NOT NULL REFERENCES knowledge_bases(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    embedding vector(768) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_chunks_tsv ON chunks USING gin (tsv);
CREATE INDEX idx_chunks_embedding_hnsw ON chunks
    USING hnsw (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row-Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingestion_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_bases ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_documents ON documents FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_chunks ON chunks FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_jobs ON ingestion_jobs FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_api_keys ON api_keys FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
CREATE POLICY tenant_isolation_kb ON knowledge_bases FOR ALL
    USING (tenant_id = NULLIF(current_setting('app.current_tenant_id', true), '')::uuid);
```

---

## 5. Ingestion Pipeline (as built)

**7 supported categories:** PDF (`.pdf`), Word (`.doc/.docx`), Excel (`.xls/.xlsx`), PowerPoint
(`.ppt/.pptx`), HTML (`.html/.htm`), Text (`.txt/.csv/.md/.json`), Images
(`.png/.jpg/.jpeg/.webp`).

**Routing (as built, not as originally spec'd):**

```
file ≤ 10 MiB?
 ├─ no  → HTTP 413 FILE_LIMIT_EXCEEDED (checked before reading into memory)
 └─ yes → stage to S3 (tenants/{tenantId}/staging/{docId}/{filename})
          └─ is it an image AND ≤ 2 MiB?
              ├─ yes → try Gemini multimodal FIRST, Tesseract OCR as fallback
              └─ no  → try Java parser FIRST (PDFBox/POI/Jsoup/text/Tesseract);
                       if it fails/empty AND file ≤ 2 MiB → fall back to Gemini multimodal;
                       both failing → combined error message
```

Async pipeline stages (broadcast over SSE, persisted to `ingestion_jobs`):

| Stage | % | Notes |
|---|---|---|
| `QUEUED` | 0–5 | Job inserted, awaiting virtual-thread worker |
| `PARSING`/`EXTRACTION` | 25 | Tier 2 Java parser, or Tier 1 Gemini fallback per rules above |
| `CHUNKING`/`SPLITTING` | 50 | Category-adaptive `DynamicChunker` |
| `EMBEDDING`/`VECTORIZING` | 75 | `gemini-embedding-2`, batch insert to `chunks` |
| `PURGING_S3` | 90 | `s3Client.deleteObject`; `documents.storage_path = NULL`, `raw_file_purged = TRUE` |
| `COMPLETED` | 100 | `documents.status = INDEXED`; SSE emitter closes |

On any failure: staged file is purged in the `catch` block too (never left orphaned by a
succeeded-then-failed job), `documents.status = FAILED` with `error_message` set, and the SSE
stream broadcasts the error event before closing.

**Chunking targets (word count, not tokenizer-based):**
- Excel: 128–384 words/chunk, sheet name + column headers injected into every chunk
- PowerPoint: 100–400 words, 1 chunk per slide (title + bullets + notes); empty/decorative-only
  slides are skipped
- Word/Markdown: 400–768 words, heading-aware
- PDF: 512–1024 words, layout/heading-aware; a "fact-sheet" heuristic (many short ALL-CAPS
  headings, small average section size) splits one chunk per section instead
- HTML: 400–768 words, DOM tag-boundary aware
- Text/Code: 256–512 words, JSON/CSV header-preserving
- Images (OCR): one chunk per OCR'd line (not spatial/bounding-box grouping — no bbox data
  survives through Tess4J's output)

---

## 6. Query Routing & RAG (as built)

```
query → QuerySpellCorrector (best-effort, ≤5s, silent fallback to original on any failure)
      → embed corrected query (gemini-embedding-2, 768d)
      → pgvector cosine search WHERE tenant_id = :tenantId, ORDER BY embedding <=> query LIMIT 8
      → sufficiency check: count > 0 AND max cosine similarity >= 0.70 ?
          ├─ yes (SUFFICIENT)   → synthesize with gemini-3.5-flash-lite, temperature 0.0,
          │                       chunks grouped by source document → source: "LOCAL_KB"
          └─ no (INSUFFICIENT)  → DuckDuckGo Instant Answer API
                                     ├─ result found → synthesize → source: "WEB_SEARCH"
                                     └─ nothing found/error → source: "NONE",
                                        "No relevant data found in your knowledge base,
                                         and fallback web search returned no matching results."
```

- Client-sent conversation history (max 20 turns, never persisted) folds the last 2 user turns
  into the retrieval query text; up to 6 trimmed turns are passed to synthesis as context only
  (explicitly never a fact source).
- `ChatResponse.correctedQuery` is non-null only when spell-correction actually changed the text.
- The `search_user_knowledge_base` MCP tool runs the same spell-correction step but has **no**
  sufficiency/web-fallback safety net — it's pure semantic search.

---

## 7. MCP Server Layer

- Transport: HTTP/SSE via the **Spring AI MCP Server starter**
  (`spring-ai-starter-mcp-server-webmvc`), not a hand-written protocol handler.
  - `GET /mcp/sse` — SSE transport ingress, `Authorization: Bearer <mcp_api_key>` or
    `?token=<mcp_api_key>`; emits an `endpoint` event with the session's message-ingress URL.
  - `POST /mcp/messages?sessionId=...` — JSON-RPC 2.0 ingress (`initialize`, `tools/list`,
    `tools/call`).
- Auth: `McpApiKeyAuthenticationFilter` validates a SHA-256 hash against `api_keys`, binds
  `tenant_id` to `TenantContext`.
- **4 registered tools** (one beyond the original 3-tool scope):
  1. `search_user_knowledge_base` — semantic search, chunks + similarity scores, spell-corrected.
  2. `query_user_rag` — full RAG (vector search → DuckDuckGo fallback → synthesis).
  3. `get_ingestion_status` — poll a document's ingestion job by id.
  4. `upload_document` (as built, not in original scope) — filename + Base64 content; reuses
     `DocumentService.upload` via a `ByteArrayMultipartFile` adapter, so an MCP upload is
     identical to the REST upload in validation/staging/parsing/chunking/embedding/audit.
- Verified end-to-end purely over MCP: upload → poll status → query, no REST access needed
  beyond initial authentication.

Example external client config:
```json
{
  "mcpServers": {
    "synapse-my-kb": {
      "url": "https://<backend-host>/mcp/sse",
      "headers": { "Authorization": "Bearer syn_mcp_a1b2c3d4e5f6789012345678" }
    }
  }
}
```

---

## 8. REST API Surface

| Endpoint | Purpose |
|---|---|
| `POST /api/v1/auth/signup` | Create user + tenant + default KB; returns JWT |
| `POST /api/v1/auth/signin` | Returns JWT |
| `POST /api/v1/documents/upload` | Multipart upload → 202 Accepted `{documentId, jobId, ingestionTier, status}` |
| `GET /api/v1/documents/{id}/progress-stream` | SSE ingestion progress |
| `GET /api/v1/documents` | List documents (status, chunk count, purge flag) |
| `DELETE /api/v1/documents/{id}` | Cascades chunk deletion (no S3 call needed — already purged) |
| `POST /api/v1/chat` | RAG query, JSON or SSE; optional `history` array (≤20 turns) |
| `POST /api/v1/keys/mcp` | Issue a new MCP API key (plaintext shown once) |
| `GET /api/v1/keys/mcp` | List keys (prefix, created, last used) |
| `DELETE /api/v1/keys/mcp/{id}` | Revoke a key |

Security filter chain: `/api/v1/auth/**` is `permitAll`; everything else under `/api/v1/**` goes
through `JwtAuthenticationFilter`; `/mcp/**` goes through `McpApiKeyAuthenticationFilter`. Both
resolve to `TenantContext.setTenantId(...)`, cleared in a `finally` block after the request.

---

## 9. S3 Transient Staging Setup

Bucket is staging-only — every object is deleted right after indexing; the lifecycle rule below
is strictly the safety net for orphaned objects from crashed workers or failed commits.

```bash
# 1. Create bucket, block all public access
aws s3api create-bucket --bucket YOUR_BUCKET --region us-east-1
aws s3api put-public-access-block --bucket YOUR_BUCKET --public-access-block-configuration \
  BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

# 2. 24h expiry for anything under tenants/ (replaces the whole lifecycle config — no other
#    rules should exist on this bucket)
aws s3api put-bucket-lifecycle-configuration --bucket YOUR_BUCKET --lifecycle-configuration '{
  "Rules": [{
    "ID": "expire-orphaned-staging-24h",
    "Status": "Enabled",
    "Filter": { "Prefix": "tenants/" },
    "Expiration": { "Days": 1 },
    "AbortIncompleteMultipartUpload": { "DaysAfterInitiation": 1 }
  }]
}'
```

Minimal IAM policy for the app identity:
```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
    "Resource": "arn:aws:s3:::YOUR_BUCKET/tenants/*"
  }]
}
```

The app reads credentials explicitly from `AWS_ACCESS_KEY` / `AWS_SECRET_KEY` env vars — **not**
the AWS default provider chain — so machine-level `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY` are
ignored.

---

## 10. Frontend Architecture (this repo, `SynapseMCP-Frontend`)

Lives as its own standalone project (not nested in the backend repo), talking to the backend
purely over `/api/v1/**` REST + SSE.

```text
src/
├── components/
│   ├── auth/            LoginForm, SignupForm
│   ├── documents/       DocumentUploadDropzone, FileUploadProgressCard, IngestionStepper,
│   │                    DocumentTable, DocumentFilter
│   ├── chat/            ChatWindow, MessageBubble, CitationCard, WebSourceBadge,
│   │                    QueryRoutingIndicator
│   ├── settings/        McpKeyModal (generate/copy/revoke MCP key, config snippet)
│   └── layout/          AppHeader, MainLayout
├── context/              AuthContext, ToastContext
├── hooks/                useDocuments, useFileUploadWithProgress, useRagChat, useMcpKeys
├── services/
│   ├── api.ts            Axios client, JWT interceptor, 401 → logout event
│   ├── authService.ts
│   ├── documentService.ts
│   ├── chatService.ts
│   └── mcpKeyService.ts
└── types/
```

Key implementation notes:
- `useFileUploadWithProgress` drives Phase 1 (Axios `onUploadProgress`) then opens an
  `EventSource` for Phase 2 SSE stages; `EventSource` can't send an `Authorization` header, so
  the JWT travels as a `?token=` query param (server-side opt-in on that one route).
- `McpKeyModal`'s generated MCP connection URL uses `VITE_BACKEND_ORIGIN` (not
  `window.location.origin`) — MCP clients connect directly to the backend and never go through
  the frontend's dev proxy, which only covers `/api/**`.
- **Production env resolution (added for the Vercel + Render split deployment — see §11):**
  `api.ts`'s `baseURL` and `documentService.ts`'s SSE URL both resolve from
  `VITE_API_BASE_URL` (falls back to `''`, i.e. the relative `/api/v1` the local Vite dev proxy
  expects). `.env.example` documents both `VITE_API_BASE_URL` and `VITE_BACKEND_ORIGIN`.

---

## 11. Deployment: Vercel (frontend) + Render (backend)

Frontend and backend are separate deployments on different origins — no shared reverse proxy —
so the chosen approach is **direct cross-origin calls + backend CORS whitelist** (not a same-
origin rewrite proxy).

### 11.1 Frontend → Vercel
1. Push to GitHub (`gokulakrishna3101999/SynapseMCP-Frontend`).
2. Vercel → **Add New → Project** → import the repo.
   - Project Name: `synapse-mcp-frontend` → default domain `https://synapse-mcp-frontend.vercel.app`
     (confirm the exact assigned domain in the dashboard — Vercel appends a random suffix if the
     name was taken).
   - Root Directory `./`, Preset `Vite` (auto-detected: build `npm run build`, output `dist`).
   - Environment Variables (Production + Preview):
     - `VITE_API_BASE_URL` = `<Render backend URL>` (e.g. `https://synapsemcp.onrender.com`, no
       trailing slash, no `/api/v1` suffix)
     - `VITE_BACKEND_ORIGIN` = same value
3. Deploy.
4. No `vercel.json` SPA rewrite needed — this app has no client-side router (single route).

### 11.2 Backend CORS → Render
On the Render service → Environment, set:
```
CORS_ALLOWED_ORIGINS=https://synapse-mcp-frontend.vercel.app
```
Rules:
- Comma-separated **exact origins** (scheme + host), no path, no trailing slash, no wildcards
  (required since requests carry `Authorization: Bearer`, which disallows `*` under credentialed
  CORS).
- List every domain that will load the app, including any later custom domain:
  `CORS_ALLOWED_ORIGINS=https://synapse-mcp-frontend.vercel.app,https://app.yourdomain.com`
- Vercel per-branch/PR preview URLs are each a distinct origin, not covered by the production
  entry — add them individually only if previews need to hit the live backend.
- Redeploy/restart the Render service after changing the env var — Spring Boot reads it at
  startup.

### 11.3 Verification checklist
- [ ] Sign in on the Vercel URL.
- [ ] Upload a document — confirm both upload-progress and SSE ingestion stages render.
- [ ] Browser Network tab shows no CORS errors on `/api/v1/*` or the `progress-stream`
      `EventSource` request (a block names the exact rejected origin).
- [ ] `http`/`https` and trailing-slash consistency between `VITE_API_BASE_URL` /
      `VITE_BACKEND_ORIGIN` (frontend) and `CORS_ALLOWED_ORIGINS` (backend).

---

## 12. Non-Functional Targets (SLAs)

| Pillar | Target | How |
|---|---|---|
| Local RAG retrieval latency | < 600ms P95 | HNSW cosine index, `(tenant_id, knowledge_base_id)` pre-filter |
| End-to-end chat latency (local) | < 1800ms P95 | Fast chat model, virtual threads, SSE |
| Upload/ingestion UI latency | < 100ms UI update | Axios byte tracking + SSE push |
| Web fallback latency | < 2500ms P95 | Short-timeout DuckDuckGo call (as built — originally spec'd against Tavily) |
| Ingestion throughput | 60 docs/min/node | Non-blocking `@Async` virtual-thread workers, batch vector insert |
| Permanent S3 footprint | 0 GB steady state | Immediate purge post-embedding |
| Tenant isolation | 100% | JPA param binding + PostgreSQL RLS, double-guarded |
| Availability | 99.9% | Stateless containers, managed Postgres HA |

---

## 13. Definition of Done

1. Signup provisions exactly one default KB.
2. Fixed models only — zero model config exposed to users.
3. Dual-phase progress renders fully (upload % → SSE stages) on every upload.
4. Raw files never persist in S3 past indexing (`raw_file_purged = true`).
5. No raw-file re-download; citation cards only.
6. Chat history never persisted server-side.
7. All 7 file categories ingest per the as-built tier rules (§5).
8. Files > 10 MiB rejected with HTTP 413 before any read into memory.
9. Upload returns 202 immediately; background worker drives state transitions.
10. Query routing: local KB → DuckDuckGo fallback → deterministic failure message, in that order.
11. MCP server exposes all 4 tools and resolves tenant context from the API key.
12. Frontend builds cleanly, handles auth, dual-phase progress, RAG chat with citations.
13. Full test suite passes (`./mvnw clean verify`): parsers, tenant-isolation, S3-purge,
    progress-stream, and query-routing tests all green.
