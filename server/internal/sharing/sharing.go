package sharing

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"docbuilder/internal/auth"
	"docbuilder/internal/httputil"
)

func newToken() string {
	b := make([]byte, 16)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func RegisterAuth(r chi.Router, pool *pgxpool.Pool) {
	// List collaborators (owner only)
	r.Get("/documents/{id}/shares", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		var owner string
		if err := pool.QueryRow(req.Context(), `SELECT owner_id::text FROM documents WHERE id=$1`, id).Scan(&owner); err != nil || owner != uid {
			httputil.Err(w, 403, "only owner"); return
		}
		rows, err := pool.Query(req.Context(), `
			SELECT u.id::text, u.username, p.role FROM document_permissions p
			JOIN users u ON u.id=p.user_id WHERE p.document_id=$1 AND p.role != 'owner'
			ORDER BY u.username`, id)
		if err != nil {
			httputil.Err(w, 500, "query failed"); return
		}
		defer rows.Close()
		out := []map[string]string{}
		for rows.Next() {
			var uid, un, role string
			rows.Scan(&uid, &un, &role)
			out = append(out, map[string]string{"user_id": uid, "username": un, "role": role})
		}
		httputil.JSON(w, 200, out)
	})
	r.Post("/documents/{id}/shares", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		var in struct {
			Username string `json:"username"`
			Role     string `json:"role"`
		}
		if err := httputil.Decode(req, &in); err != nil {
			httputil.Err(w, 400, "invalid body"); return
		}
		if in.Role != "editor" && in.Role != "viewer" {
			httputil.Err(w, 400, "role must be editor|viewer"); return
		}
		var owner string
		if err := pool.QueryRow(req.Context(), `SELECT owner_id::text FROM documents WHERE id=$1`, id).Scan(&owner); err != nil || owner != uid {
			httputil.Err(w, 403, "only owner can share"); return
		}
		var target string
		lookup := strings.TrimSpace(in.Username)
		lookup = strings.TrimPrefix(lookup, "@")
		if err := pool.QueryRow(req.Context(), `SELECT id::text FROM users WHERE lower(username)=lower($1) OR lower(email)=lower($1)`, lookup).Scan(&target); err != nil {
			httputil.Err(w, 404, "user not found"); return
		}
		_, _ = pool.Exec(req.Context(), `INSERT INTO document_permissions (document_id, user_id, role) VALUES ($1,$2,$3)
			ON CONFLICT (document_id, user_id) DO UPDATE SET role=$3`, id, target, in.Role)
		_, _ = pool.Exec(req.Context(), `UPDATE documents SET visibility='shared' WHERE id=$1 AND visibility='private'`, id)
		w.WriteHeader(204)
	})
	r.Delete("/documents/{id}/shares/{userId}", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		target := chi.URLParam(req, "userId")
		var owner string
		if err := pool.QueryRow(req.Context(), `SELECT owner_id::text FROM documents WHERE id=$1`, id).Scan(&owner); err != nil || owner != uid {
			httputil.Err(w, 403, "only owner"); return
		}
		_, _ = pool.Exec(req.Context(), `DELETE FROM document_permissions WHERE document_id=$1 AND user_id=$2`, id, target)
		w.WriteHeader(204)
	})
	// Public link: non-sequential token, e.g. /p/7f82a91c...
	r.Post("/documents/{id}/public-link", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		var in struct {
			ShowOnProfile *bool `json:"show_on_profile"`
		}
		_ = httputil.Decode(req, &in)
		var owner string
		if err := pool.QueryRow(req.Context(), `SELECT owner_id::text FROM documents WHERE id=$1`, id).Scan(&owner); err != nil || owner != uid {
			httputil.Err(w, 403, "only owner"); return
		}
		tok := newToken()
		show := false
		if in.ShowOnProfile != nil {
			show = *in.ShowOnProfile
		}
		_, err := pool.Exec(req.Context(), `INSERT INTO public_links (document_id, token, show_on_profile) VALUES ($1,$2,$3)
			ON CONFLICT (document_id) DO UPDATE SET token=$2, show_on_profile=$3`, id, tok, show)
		if err != nil {
			httputil.Err(w, 500, "failed"); return
		}
		_, _ = pool.Exec(req.Context(), `UPDATE documents SET visibility='public' WHERE id=$1`, id)
		httputil.JSON(w, 201, map[string]any{"token": tok, "url": "/p/" + tok})
	})
	r.Delete("/documents/{id}/public-link", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		var owner string
		if err := pool.QueryRow(req.Context(), `SELECT owner_id::text FROM documents WHERE id=$1`, id).Scan(&owner); err != nil || owner != uid {
			httputil.Err(w, 403, "only owner"); return
		}
		_, _ = pool.Exec(req.Context(), `DELETE FROM public_links WHERE document_id=$1`, id)
		_, _ = pool.Exec(req.Context(), `UPDATE documents SET visibility='private' WHERE id=$1`, id)
		w.WriteHeader(204)
	})
}

func RegisterPublic(r chi.Router, pool *pgxpool.Pool) {
	// Lightweight cache-friendly public render path (no auth required)
	r.Get("/p/{token}", func(w http.ResponseWriter, req *http.Request) {
		tok := chi.URLParam(req, "token")
		var title, text, username string
		var content []byte
		err := pool.QueryRow(req.Context(), `
			SELECT d.title, d.content, d.content_text, u.username
			FROM public_links pl JOIN documents d ON d.id=pl.document_id
			JOIN users u ON u.id=d.owner_id
			WHERE pl.token=$1 AND d.visibility='public'`, tok).Scan(&title, &content, &text, &username)
		if err != nil {
			httputil.Err(w, 404, "not found"); return
		}
		w.Header().Set("Cache-Control", "public, max-age=60")
		httputil.JSON(w, 200, map[string]any{"title": title, "content": content, "content_text": text, "author": username})
	})
}
