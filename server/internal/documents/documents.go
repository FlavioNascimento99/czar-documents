package documents

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"docbuilder/internal/auth"
	"docbuilder/internal/httputil"
)

// canRead / canWrite enforced server-side. Never trust client checks.
func canRead(pool *pgxpool.Pool, r *http.Request, docID, uid string) (role string, ok bool) {
	var owner, vis string
	if err := pool.QueryRow(r.Context(), `SELECT owner_id::text, visibility FROM documents WHERE id=$1`, docID).Scan(&owner, &vis); err != nil {
		return "", false
	}
	if owner == uid {
		return "owner", true
	}
	if vis == "public" {
		return "viewer", true // public readable; writes still denied below
	}
	var perm string
	if err := pool.QueryRow(r.Context(), `SELECT role FROM document_permissions WHERE document_id=$1 AND user_id=$2`, docID, uid).Scan(&perm); err == nil {
		return perm, true
	}
	return "", false
}

func canWrite(role string) bool { return role == "owner" || role == "editor" }

func Routes(pool *pgxpool.Pool, indexDoc func(id string)) chi.Router {
	r := chi.NewRouter()

	// List own + shared docs (paginated, never whole workspace dump)
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		rows, err := pool.Query(req.Context(), `
			SELECT d.id::text, d.title, d.visibility, d.updated_at,
			       d.folder_id::text, d.document_type_id::text, COALESCE(t.slug,'')
			FROM documents d LEFT JOIN document_permissions p
			  ON p.document_id=d.id AND p.user_id=$1
			LEFT JOIN document_types t ON t.id=d.document_type_id
			WHERE d.owner_id=$1 OR p.user_id=$1
			ORDER BY d.updated_at DESC LIMIT 100`, uid)
		if err != nil {
			httputil.Err(w, 500, "query failed"); return
		}
		defer rows.Close()
		out := []map[string]any{}
		for rows.Next() {
			var id, title, vis string
			var ts time.Time
			var fid, dtid, slug *string
			rows.Scan(&id, &title, &vis, &ts, &fid, &dtid, &slug)
			out = append(out, map[string]any{"id": id, "title": title, "visibility": vis, "updated_at": ts,
				"folder_id": fid, "document_type_id": dtid, "type_slug": slug})
		}
		httputil.JSON(w, 200, out)
	})

	// Create: needs workspace (default personal)
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		var in struct {
			Title          string         `json:"title"`
			FolderID       *string        `json:"folder_id"`
			DocumentTypeID *string        `json:"document_type_id"`
			Content        any            `json:"content"`
			ContentText    string         `json:"content_text"`
			ContentMD      string         `json:"content_markdown"`
			Visibility     string         `json:"visibility"`
		}
		_ = httputil.Decode(req, &in)
		if in.Title == "" {
			in.Title = "Untitled"
		}
		if in.Visibility != "public" && in.Visibility != "shared" {
			in.Visibility = "private"
		}
		text := in.ContentText
		if text == "" {
			text = in.ContentMD
		}
		var ws string
		if err := pool.QueryRow(req.Context(), `SELECT workspace_id::text FROM memberships WHERE user_id=$1 LIMIT 1`, uid).Scan(&ws); err != nil {
			httputil.Err(w, 400, "no workspace"); return
		}
		contentJSON, _ := json.Marshal(in.Content)
		if string(contentJSON) == "null" || string(contentJSON) == "" {
			contentJSON = []byte(`{"type":"doc","content":[]}`)
		}
		var id string
		err := pool.QueryRow(req.Context(), `
			INSERT INTO documents (workspace_id, owner_id, folder_id, document_type_id, title, content, content_text, visibility)
			VALUES ($1,$2, NULLIF($3,'')::uuid, NULLIF($4,'')::uuid, $5, $6, $7, $8) RETURNING id::text`,
			ws, uid, str(in.FolderID), str(in.DocumentTypeID), in.Title, contentJSON, text, in.Visibility).Scan(&id)
		if err != nil {
			httputil.Err(w, 500, "create failed: "+err.Error()); return
		}
		_, _ = pool.Exec(req.Context(), `INSERT INTO document_permissions (document_id, user_id, role) VALUES ($1,$2,'owner') ON CONFLICT DO NOTHING`, id, uid)
		_, _ = pool.Exec(req.Context(), `INSERT INTO document_versions (document_id, version, content, author_id) VALUES ($1,1,$2,$3)`, id, contentJSON, uid)
		if indexDoc != nil {
			go indexDoc(id)
		}
		httputil.JSON(w, 201, map[string]string{"id": id})
	})

	// Read (owner/collaborator/public handled: public via /p/ token preferred)
	r.Get("/{id}", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		role, ok := canRead(pool, req, id, uid)
		if !ok {
			httputil.Err(w, 404, "not found"); return
		}
		var title, vis, contentText string
		var content json.RawMessage
		var updated time.Time
		var fid, dtid *string
		err := pool.QueryRow(req.Context(), `SELECT title, content, content_text, visibility, updated_at, folder_id::text, document_type_id::text FROM documents WHERE id=$1`, id).
			Scan(&title, &content, &contentText, &vis, &updated, &fid, &dtid)
		if err != nil {
			httputil.Err(w, 404, "not found"); return
		}
		httputil.JSON(w, 200, map[string]any{"id": id, "title": title, "content": content,
			"content_text": contentText, "visibility": vis, "role": role, "updated_at": updated,
			"folder_id": fid, "document_type_id": dtid})
	})

	// Autosave-safe PATCH: only provided fields update; creates version when content changes.
	r.Patch("/{id}", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		role, ok := canRead(pool, req, id, uid)
		if !ok || !canWrite(role) {
			httputil.Err(w, 403, "forbidden"); return
		}
		var in struct {
			Title          *string `json:"title"`
			FolderID       *string `json:"folder_id"`
			DocumentTypeID *string `json:"document_type_id"`
			Content        *any    `json:"content"`
			ContentText    *string `json:"content_text"`
			Visibility     *string `json:"visibility"`
		}
		if err := httputil.Decode(req, &in); err != nil {
			httputil.Err(w, 400, "invalid body"); return
		}
		var contentJSON []byte
		if in.Content != nil {
			contentJSON, _ = json.Marshal(*in.Content)
		}
		// Build dynamic SET clause: only provided fields, with correct
		// Postgres types. The old COALESCE($n, col) version failed because
		// pgx sends content as bytea which doesn't coalesce with JSONB,
		// and *string nils have ambiguous OIDs.
		sets := []string{"updated_at=now()"}
		args := []any{id}
		add := func(expr string, v any) {
			args = append(args, v)
			sets = append(sets, expr)
		}
		n := func() int { return len(args) + 1 } // next $n placeholder
		if in.Title != nil {
			add(formatPlaceholder(n(), "title=", ""), *in.Title)
		}
		if in.FolderID != nil {
			if *in.FolderID == "" {
				sets = append(sets, "folder_id=NULL")
			} else {
				add(formatPlaceholder(n(), "folder_id=", "::uuid"), *in.FolderID)
			}
		}
		if in.DocumentTypeID != nil {
			if *in.DocumentTypeID == "" {
				sets = append(sets, "document_type_id=NULL")
			} else {
				add(formatPlaceholder(n(), "document_type_id=", "::uuid"), *in.DocumentTypeID)
			}
		}
		if contentJSON != nil {
			add(formatPlaceholder(n(), "content=", "::jsonb"), string(contentJSON))
		}
		if in.ContentText != nil {
			add(formatPlaceholder(n(), "content_text=", ""), *in.ContentText)
		}
		if in.Visibility != nil {
			if *in.Visibility != "public" && *in.Visibility != "shared" && *in.Visibility != "private" {
				httputil.Err(w, 400, "invalid visibility"); return
			}
			add(formatPlaceholder(n(), "visibility=", ""), *in.Visibility)
		}
		if len(sets) == 1 {
			httputil.JSON(w, 200, map[string]string{"status": "saved"}); return
		}
		q := "UPDATE documents SET " + joinSets(sets) + " WHERE id=$1"
		// Rewrite placeholders: args[0]=id is $1, the rest were numbered from 2.
		if _, err := pool.Exec(req.Context(), q, args...); err != nil {
			httputil.Err(w, 500, "save failed: "+err.Error()); return
		}
		if contentJSON != nil {
			var v int
			_ = pool.QueryRow(req.Context(), `SELECT COALESCE(MAX(version),0)+1 FROM document_versions WHERE document_id=$1`, id).Scan(&v)
			_, _ = pool.Exec(req.Context(), `INSERT INTO document_versions (document_id, version, content, author_id) VALUES ($1,$2,$3,$4)`, id, v, contentJSON, uid)
			if indexDoc != nil {
				go indexDoc(id)
			}
		}
		httputil.JSON(w, 200, map[string]string{"status": "saved"})
	})

	r.Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		role, ok := canRead(pool, req, id, uid)
		if !ok || role != "owner" {
			httputil.Err(w, 403, "forbidden"); return
		}
		_, _ = pool.Exec(req.Context(), `DELETE FROM documents WHERE id=$1`, id)
		w.WriteHeader(204)
	})

	r.Get("/{id}/versions", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		if _, ok := canRead(pool, req, id, uid); !ok {
			httputil.Err(w, 404, "not found"); return
		}
		rows, _ := pool.Query(req.Context(), `SELECT version, author_id::text, created_at FROM document_versions WHERE document_id=$1 ORDER BY version DESC LIMIT 50`, id)
		defer func() { if rows != nil { rows.Close() } }()
		out := []map[string]any{}
		for rows != nil && rows.Next() {
			var v int
			var a *string
			var ts time.Time
			rows.Scan(&v, &a, &ts)
			out = append(out, map[string]any{"version": v, "author_id": a, "created_at": ts})
		}
		httputil.JSON(w, 200, out)
	})

	return r
}

func str(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func formatPlaceholder(n int, col, cast string) string {
	return fmt.Sprintf("%s$%d%s", col, n, cast)
}

func joinSets(sets []string) string {
	return strings.Join(sets, ", ")
}
