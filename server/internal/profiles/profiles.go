package profiles

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"docbuilder/internal/auth"
	"docbuilder/internal/httputil"
)

func RegisterAuth(r chi.Router, pool *pgxpool.Pool) {
	// Update own profile
	r.Patch("/me", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		var in struct {
			DisplayName *string `json:"display_name"`
			AvatarURL   *string `json:"avatar_url"`
			Bio         *string `json:"bio"`
			IsPublic    *bool   `json:"is_public"`
		}
		if err := httputil.Decode(req, &in); err != nil {
			httputil.Err(w, 400, "invalid body"); return
		}
		_, err := pool.Exec(req.Context(), `
			UPDATE profiles SET display_name=COALESCE($2,display_name),
			 avatar_url=COALESCE($3,avatar_url), bio=COALESCE($4,bio),
			 is_public=COALESCE($5,is_public), updated_at=now() WHERE user_id=$1`,
			uid, in.DisplayName, in.AvatarURL, in.Bio, in.IsPublic)
		if err != nil {
			httputil.Err(w, 500, "update failed"); return
		}
		w.WriteHeader(204)
	})
}

func RegisterPublic(r chi.Router, pool *pgxpool.Pool) {
	// Public profile: /@username — profile public ≠ document public.
	// Only documents with public_links.show_on_profile=true are listed.
	r.Get("/@{username}", func(w http.ResponseWriter, req *http.Request) {
		un := chi.URLParam(req, "username")
		var uid, display, avatar, bio string
		var pub bool
		err := pool.QueryRow(req.Context(), `
			SELECT u.id, p.display_name, p.avatar_url, p.bio, p.is_public
			FROM users u JOIN profiles p ON p.user_id=u.id WHERE lower(u.username)=lower($1)`, un).
			Scan(&uid, &display, &avatar, &bio, &pub)
		if err != nil || !pub {
			httputil.Err(w, 404, "profile not found"); return
		}
		rows, _ := pool.Query(req.Context(), `
			SELECT d.id, d.title, pl.token FROM documents d
			JOIN public_links pl ON pl.document_id=d.id AND pl.show_on_profile=true
			WHERE d.owner_id=$1 AND d.visibility='public' ORDER BY d.updated_at DESC LIMIT 50`, uid)
		docs := []map[string]string{}
		if rows != nil {
			defer rows.Close()
			for rows.Next() {
				var id, title, token string
				rows.Scan(&id, &title, &token)
				docs = append(docs, map[string]string{"id": id, "title": title, "token": token})
			}
		}
		httputil.JSON(w, 200, map[string]any{"username": strings.ToLower(un),
			"display_name": display, "avatar_url": avatar, "bio": bio, "documents": docs})
	})
}
