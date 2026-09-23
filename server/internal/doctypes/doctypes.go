package doctypes

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"docbuilder/internal/auth"
	"docbuilder/internal/httputil"
)

// Types are dynamic entities, never hard-coded enums. NULL workspace = system default.
func Routes(pool *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		var ws *string
		_ = pool.QueryRow(req.Context(), `SELECT workspace_id::text FROM memberships WHERE user_id=$1 LIMIT 1`, uid).Scan(&ws)
		rows, err := pool.Query(req.Context(), `
			SELECT id::text, name, slug, description, icon, color, is_system FROM document_types
			WHERE workspace_id IS NULL OR (workspace_id IS NOT DISTINCT FROM $1::uuid) ORDER BY is_system DESC, name`, str(ws))
		if err != nil {
			httputil.Err(w, 500, "query failed"); return
		}
		defer rows.Close()
		out := []map[string]any{}
		for rows.Next() {
			var id, name, slug, desc, icon, color string
			var sys bool
			rows.Scan(&id, &name, &slug, &desc, &icon, &color, &sys)
			out = append(out, map[string]any{"id": id, "name": name, "slug": slug,
				"description": desc, "icon": icon, "color": color, "is_system": sys})
		}
		httputil.JSON(w, 200, out)
	})
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		var in struct {
			Name        string `json:"name"`
			Slug        string `json:"slug"`
			Description string `json:"description"`
			Icon        string `json:"icon"`
			Color       string `json:"color"`
		}
		if err := httputil.Decode(req, &in); err != nil || in.Name == "" {
			httputil.Err(w, 400, "name required"); return
		}
		if in.Slug == "" {
			in.Slug = strings.ToLower(strings.ReplaceAll(in.Name, " ", "-"))
		}
		var ws string
		_ = pool.QueryRow(req.Context(), `SELECT workspace_id::text FROM memberships WHERE user_id=$1 LIMIT 1`, uid).Scan(&ws)
		var id string
		err := pool.QueryRow(req.Context(), `INSERT INTO document_types (workspace_id, name, slug, description, icon, color)
			VALUES ($1,$2,$3,$4,$5,$6) RETURNING id::text`, ws, in.Name, in.Slug, in.Description, in.Icon, in.Color).Scan(&id)
		if err != nil {
			httputil.Err(w, 409, "slug taken"); return
		}
		httputil.JSON(w, 201, map[string]string{"id": id, "slug": in.Slug})
	})
	return r
}

func str(s *string) any {
	if s == nil {
		return nil
	}
	return *s
}
