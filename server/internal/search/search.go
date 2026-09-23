package search

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"docbuilder/internal/auth"
	"docbuilder/internal/httputil"
)

// Orchestrator: try Elasticsearch, fall back to PostgreSQL.
// ES is derived only; failures must never break CRUD.
type Engine struct {
	Pool  *pgxpool.Pool
	ESURL string
}

func (e *Engine) indexDoc(id string) {
	if e.ESURL == "" {
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	var title, text, typeSlug, author string
	_ = e.Pool.QueryRow(ctx, `
		SELECT d.title, d.content_text, COALESCE(t.slug,''), u.username
		FROM documents d JOIN users u ON u.id=d.owner_id
		LEFT JOIN document_types t ON t.id=d.document_type_id WHERE d.id=$1`,
		id).Scan(&title, &text, &typeSlug, &author)
	body, _ := json.Marshal(map[string]any{"title": title, "text": text, "type": typeSlug, "author": author})
	req, _ := http.NewRequestWithContext(ctx, "PUT", fmt.Sprintf("%s/documents/_doc/%s", e.ESURL, id), bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	_, _ = http.DefaultClient.Do(req)
}

func (e *Engine) IndexDoc(id string) { e.indexDoc(id) }

func (e *Engine) Routes() chi.Router {
	r := chi.NewRouter()
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		q := req.URL.Query().Get("q")
		dtype := req.URL.Query().Get("type")
		if q == "" {
			httputil.JSON(w, 200, map[string]any{"documents": []any{}, "users": []any{}})
			return
		}
		// Best-effort ES, but ES results are never trusted for auth:
		// intersect with PG readability + type filter (ES is derived only).
		if esDocs := e.esSearch(q); esDocs != nil {
			ids := make([]string, 0, len(esDocs))
			titles := map[string]string{}
			for _, d := range esDocs {
				if id, ok := d["id"].(string); ok {
					ids = append(ids, id)
					if t, ok := d["title"].(string); ok {
						titles[id] = t
					}
				}
			}
			if docs := e.pgDocsByIDs(req, uid, ids, dtype, titles); docs != nil {
				httputil.JSON(w, 200, map[string]any{"documents": docs, "users": e.pgUsers(req, q)})
				return
			}
		}
		httputil.JSON(w, 200, map[string]any{"documents": e.pgDocs(req, uid, q, dtype), "users": e.pgUsers(req, q)})
	})
	r.Post("/reindex", func(w http.ResponseWriter, req *http.Request) {
		rows, err := e.Pool.Query(req.Context(), `SELECT id::text FROM documents LIMIT 5000`)
		if err != nil {
			httputil.Err(w, 500, "failed"); return
		}
		defer rows.Close()
		n := 0
		for rows.Next() {
			var id string
			rows.Scan(&id)
			e.indexDoc(id)
			n++
		}
		httputil.JSON(w, 200, map[string]int{"indexed": n})
	})
	return r
}

func (e *Engine) pgDocs(req *http.Request, uid, q, dtype string) []map[string]any {
	like := "%" + q + "%"
	rows, err := e.Pool.Query(req.Context(), `
		SELECT d.id::text, d.title FROM documents d
		LEFT JOIN document_permissions p ON p.document_id=d.id AND p.user_id=$1
		LEFT JOIN document_types t ON t.id=d.document_type_id
		WHERE (d.owner_id=$1 OR p.user_id=$1 OR d.visibility='public')
		  AND (d.title ILIKE $2 OR d.content_text ILIKE $2)
		  AND ($3='' OR t.slug=$3)
		ORDER BY d.updated_at DESC LIMIT 20`, uid, like, dtype)
	if err != nil {
		return []map[string]any{}
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var id, title string
		rows.Scan(&id, &title)
		out = append(out, map[string]any{"id": id, "title": title})
	}
	return out
}

func (e *Engine) pgDocsByIDs(req *http.Request, uid string, ids []string, dtype string, titles map[string]string) []map[string]any {
	if len(ids) == 0 {
		return []map[string]any{}
	}
	rows, err := e.Pool.Query(req.Context(), `
		SELECT d.id::text FROM documents d
		LEFT JOIN document_permissions p ON p.document_id=d.id AND p.user_id=$1
		LEFT JOIN document_types t ON t.id=d.document_type_id
		WHERE (d.owner_id=$1 OR p.user_id=$1 OR d.visibility='public')
		  AND d.id = ANY($2::uuid[])
		  AND ($3='' OR t.slug=$3)`, uid, ids, dtype)
	if err != nil {
		return nil // signal fallback to pgDocs
	}
	defer rows.Close()
	allowed := map[string]bool{}
	for rows.Next() {
		var id string
		rows.Scan(&id)
		allowed[id] = true
	}
	out := []map[string]any{}
	for _, id := range ids { // preserve ES ranking
		if allowed[id] {
			out = append(out, map[string]any{"id": id, "title": titles[id]})
		}
	}
	return out
}

func (e *Engine) pgUsers(req *http.Request, q string) []map[string]any {
	rows, err := e.Pool.Query(req.Context(), `
		SELECT u.username, COALESCE(p.display_name,'') FROM users u
		LEFT JOIN profiles p ON p.user_id=u.id
		WHERE u.username ILIKE $1 OR COALESCE(p.display_name,'') ILIKE $1 LIMIT 10`, "%"+q+"%")
	if err != nil {
		return []map[string]any{}
	}
	defer rows.Close()
	out := []map[string]any{}
	for rows.Next() {
		var u, d string
		rows.Scan(&u, &d)
		out = append(out, map[string]any{"username": u, "display_name": d})
	}
	return out
}

func (e *Engine) esSearch(q string) []map[string]any {
	if e.ESURL == "" {
		return nil
	}
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	body, _ := json.Marshal(map[string]any{"query": map[string]any{"multi_match": map[string]any{
		"query": q, "fields": []string{"title^3", "text"}, "fuzziness": "AUTO"}}})
	req, _ := http.NewRequestWithContext(ctx, "POST", e.ESURL+"/documents/_search", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	resp, err := http.DefaultClient.Do(req)
	if err != nil || resp.StatusCode >= 400 {
		return nil
	}
	defer resp.Body.Close()
	var parsed struct {
		Hits struct {
			Hits []struct {
				ID     string `json:"_id"`
				Source struct {
					Title string `json:"title"`
				} `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&parsed); err != nil {
		return nil
	}
	out := []map[string]any{}
	for _, h := range parsed.Hits.Hits {
		out = append(out, map[string]any{"id": h.ID, "title": h.Source.Title})
	}
	return out
}
