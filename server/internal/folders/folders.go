package folders

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"docbuilder/internal/auth"
	"docbuilder/internal/httputil"
)

func Routes(pool *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	r.Get("/", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		parent := req.URL.Query().Get("parent_id") // incremental tree loading
		var rows interface {
			Close()
			Next() bool
			Scan(...any) error
		}
		_ = rows
		var q string
		var args []any
		if parent == "" {
			q = `SELECT f.id::text, f.name FROM folders f JOIN memberships m ON m.workspace_id=f.workspace_id
			     WHERE m.user_id=$1 AND f.parent_id IS NULL ORDER BY f.name`
			args = []any{uid}
		} else {
			q = `SELECT f.id::text, f.name FROM folders f JOIN memberships m ON m.workspace_id=f.workspace_id
			     WHERE m.user_id=$1 AND f.parent_id=$2 ORDER BY f.name`
			args = []any{uid, parent}
		}
		rs, err := pool.Query(req.Context(), q, args...)
		if err != nil {
			httputil.Err(w, 500, "query failed"); return
		}
		defer rs.Close()
		out := []map[string]string{}
		for rs.Next() {
			var id, name string
			rs.Scan(&id, &name)
			out = append(out, map[string]string{"id": id, "name": name})
		}
		httputil.JSON(w, 200, out)
	})
	r.Post("/", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		var in struct {
			Name     string  `json:"name"`
			ParentID *string `json:"parent_id"`
		}
		if err := httputil.Decode(req, &in); err != nil || in.Name == "" {
			httputil.Err(w, 400, "name required"); return
		}
		var ws string
		if err := pool.QueryRow(req.Context(), `SELECT workspace_id::text FROM memberships WHERE user_id=$1 LIMIT 1`, uid).Scan(&ws); err != nil {
			httputil.Err(w, 400, "no workspace"); return
		}
		var pid any
		if in.ParentID != nil && *in.ParentID != "" {
			pid = *in.ParentID
		}
		var id string
		if err := pool.QueryRow(req.Context(), `INSERT INTO folders (workspace_id, parent_id, name) VALUES ($1,$2,$3) RETURNING id::text`, ws, pid, in.Name).Scan(&id); err != nil {
			httputil.Err(w, 500, "create failed"); return
		}
		httputil.JSON(w, 201, map[string]string{"id": id, "name": in.Name})
	})
	r.Patch("/{id}", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		var in struct {
			Name     *string `json:"name"`
			ParentID *string `json:"parent_id"`
		}
		_ = httputil.Decode(req, &in)
		// Ownership check via workspace membership
		var n int
		_ = pool.QueryRow(req.Context(), `SELECT COUNT(*) FROM folders f JOIN memberships m ON m.workspace_id=f.workspace_id WHERE f.id=$1 AND m.user_id=$2`, id, uid).Scan(&n)
		if n == 0 {
			httputil.Err(w, 403, "forbidden"); return
		}
		// Dynamic SET: pgx can't COALESCE *string nils / uuid casts reliably.
		sets := []string{}
		args := []any{id}
		if in.Name != nil {
			args = append(args, *in.Name)
			sets = append(sets, fmt.Sprintf("name=$%d", len(args)))
		}
		if in.ParentID != nil {
			if *in.ParentID == "" {
				sets = append(sets, "parent_id=NULL")
			} else {
				args = append(args, *in.ParentID)
				sets = append(sets, fmt.Sprintf("parent_id=$%d::uuid", len(args)))
			}
		}
		if len(sets) == 0 {
			w.WriteHeader(204); return
		}
		if _, err := pool.Exec(req.Context(), "UPDATE folders SET "+strings.Join(sets, ", ")+" WHERE id=$1", args...); err != nil {
			httputil.Err(w, 500, "save failed: "+err.Error()); return
		}
		w.WriteHeader(204)
	})
	r.Delete("/{id}", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		id := chi.URLParam(req, "id")
		var n int
		_ = pool.QueryRow(req.Context(), `SELECT COUNT(*) FROM folders f JOIN memberships m ON m.workspace_id=f.workspace_id WHERE f.id=$1 AND m.user_id=$2`, id, uid).Scan(&n)
		if n == 0 {
			httputil.Err(w, 403, "forbidden"); return
		}
		_, _ = pool.Exec(req.Context(), `DELETE FROM folders WHERE id=$1`, id)
		w.WriteHeader(204)
	})
	return r
}
