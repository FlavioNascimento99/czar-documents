package users

import (
	"net/http"
	"strings"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"docbuilder/internal/auth"
	"docbuilder/internal/httputil"
)

// Register creates user + profile + personal workspace. Business logic lives here, not in main.
func Routes(pool *pgxpool.Pool, secret string) chi.Router {
	r := chi.NewRouter()
	r.Post("/register", func(w http.ResponseWriter, req *http.Request) {
		var in struct {
			Username string `json:"username"`
			Email    string `json:"email"`
			Password string `json:"password"`
		}
		if err := httputil.Decode(req, &in); err != nil {
			httputil.Err(w, 400, "invalid body"); return
		}
		in.Username = strings.TrimSpace(in.Username)
		in.Email = strings.TrimSpace(strings.ToLower(in.Email))
		if len(in.Username) < 3 || !strings.Contains(in.Email, "@") || len(in.Password) < 8 {
			httputil.Err(w, 400, "username>=3, valid email, password>=8 required"); return
		}
		hash, _ := auth.HashPassword(in.Password)
		var id string
		err := pool.QueryRow(req.Context(), `
			WITH u AS (
			  INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING id
			),
			p AS (INSERT INTO profiles (user_id, display_name) SELECT id, $1 FROM u),
			ws AS (INSERT INTO workspaces (owner_id, name) SELECT id, 'Personal' FROM u RETURNING id, owner_id)
			INSERT INTO memberships (workspace_id, user_id, role)
			SELECT id, owner_id, 'owner' FROM ws RETURNING (SELECT id FROM u)`,
			in.Username, in.Email, hash).Scan(&id)
		if err != nil {
			httputil.Err(w, 409, "username or email taken"); return
		}
		tok, _ := auth.SignToken(secret, id)
		httputil.JSON(w, 201, map[string]any{"id": id, "username": in.Username, "token": tok})
	})
	r.Post("/login", func(w http.ResponseWriter, req *http.Request) {
		var in struct {
			Login    string `json:"login"`
			Password string `json:"password"`
		}
		if err := httputil.Decode(req, &in); err != nil {
			httputil.Err(w, 400, "invalid body"); return
		}
		var id, username, hash string
		err := pool.QueryRow(req.Context(),
			`SELECT id, username, password_hash FROM users WHERE lower(email)=lower($1) OR lower(username)=lower($1)`,
			strings.TrimSpace(in.Login)).Scan(&id, &username, &hash)
		if err != nil || auth.CheckPassword(hash, in.Password) != nil {
			httputil.Err(w, 401, "invalid credentials"); return
		}
		tok, _ := auth.SignToken(secret, id)
		httputil.JSON(w, 200, map[string]any{"id": id, "username": username, "token": tok})
	})
	return r
}

func MeRoutes(pool *pgxpool.Pool) chi.Router {
	r := chi.NewRouter()
	r.Get("/me", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		var id, username, email, display, avatar, bio string
		var pub bool
		err := pool.QueryRow(req.Context(), `
			SELECT u.id, u.username, u.email, p.display_name, p.avatar_url, p.bio, p.is_public
			FROM users u JOIN profiles p ON p.user_id=u.id WHERE u.id=$1`, uid).
			Scan(&id, &username, &email, &display, &avatar, &bio, &pub)
		if err != nil {
			httputil.Err(w, 404, "not found"); return
		}
		httputil.JSON(w, 200, map[string]any{"id": id, "username": username, "email": email,
			"display_name": display, "avatar_url": avatar, "bio": bio, "is_public": pub})
	})
	r.Get("/search", func(w http.ResponseWriter, req *http.Request) {
		q := "%" + strings.ToLower(req.URL.Query().Get("q")) + "%"
		rows, _ := pool.Query(req.Context(),
			`SELECT u.username, COALESCE(p.display_name,'') FROM users u
			 LEFT JOIN profiles p ON p.user_id=u.id
			 WHERE lower(u.username) LIKE $1 OR lower(COALESCE(p.display_name,'')) LIKE $1 LIMIT 20`, q)
		defer func() { if rows != nil { rows.Close() } }()
		out := []map[string]string{}
		for rows != nil && rows.Next() {
			var u, d string
			rows.Scan(&u, &d)
			out = append(out, map[string]string{"username": u, "display_name": d})
		}
		httputil.JSON(w, 200, out)
	})
	return r
}
