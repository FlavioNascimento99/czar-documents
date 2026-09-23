package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/redis/go-redis/v9"

	"docbuilder/internal/auth"
	"docbuilder/internal/config"
	"docbuilder/internal/db"
	"docbuilder/internal/documents"
	"docbuilder/internal/doctypes"
	"docbuilder/internal/folders"
	"docbuilder/internal/httputil"
	"docbuilder/internal/profiles"
	"docbuilder/internal/ratelimit"
	"docbuilder/internal/search"
	"docbuilder/internal/sharing"
	"docbuilder/internal/storage"
	"docbuilder/internal/users"
)

func main() {
	cfg := config.Load()
	ctx := context.Background()

	pool, err := db.Connect(ctx, cfg.PostgresURL)
	if err != nil {
		log.Fatal(err)
	}
	defer pool.Close()

	// Simple migration runner (MVP): apply server/migrations/*.sql in order.
	// CWD must be server/ (local `go run`) or /app (docker).
	migrated := false
	for _, p := range []string{"migrations/001_init.sql", "server/migrations/001_init.sql"} {
		if sql, err := os.ReadFile(p); err == nil {
			if _, err := pool.Exec(ctx, string(sql)); err != nil {
				log.Printf("migration %s note: %v", p, err)
			} else {
				log.Printf("migration %s applied", p)
			}
			migrated = true
			break
		}
	}
	if !migrated {
		log.Printf("WARNING: migration file not found (cwd must be server/ or repo root container /app)")
	}

	rdb := redis.NewClient(&redis.Options{Addr: cfg.RedisAddr})
	_ = rdb.Ping(ctx).Err() // Redis optional; never gate startup on it.

	// Rate limiter: 10 req/min per IP for auth endpoints
	rl := ratelimit.New(rdb, "auth")
	authRateLimit := rl.Limit(10, time.Minute, ratelimit.IPKeyFunc)

	eng := &search.Engine{Pool: pool, ESURL: cfg.ESURL}
	s3svc := storage.New(cfg.S3Endpoint, cfg.S3Region, cfg.S3Bucket, cfg.S3Key, cfg.S3Secret, cfg.S3UseSSL)

	r := chi.NewRouter()
	// Structured JSON logging with RequestID
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(bodyLimit(2 << 20)) // 2MB body limit
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)
			next.ServeHTTP(ww, r)
			httputil.LogRequest(r, ww.Status(), time.Since(start))
		})
	})
	r.Use(middleware.Recoverer)
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins: []string{cfg.ClientOrigin, "http://localhost:5173"},
		AllowedMethods: []string{"GET", "POST", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Authorization", "Content-Type"},
	}))

	r.Get("/health", func(w http.ResponseWriter, req *http.Request) {
		httputil.JSON(w, 200, map[string]string{"status": "ok"})
	})
	r.Get("/ready", func(w http.ResponseWriter, req *http.Request) {
		// PG must be ready; ES/Redis degrade gracefully.
		c, cancel := context.WithTimeout(req.Context(), 2*time.Second)
		defer cancel()
		var one int
		if err := pool.QueryRow(c, `SELECT 1`).Scan(&one); err != nil {
			httputil.Err(w, 503, "db not ready"); return
		}
		httputil.JSON(w, 200, map[string]string{"status": "ready"})
	})

	// Single /api block: public routes first, then authed group.
	// (chi panics on duplicate Mount paths, so sharing/storage/profiles
	// register via Register* funcs instead of separate sub-routers.)
	r.Route("/api", func(api chi.Router) {
		// Auth endpoints: rate limited
		api.Group(func(r chi.Router) {
			r.Use(authRateLimit)
			r.Mount("/auth", users.Routes(pool, cfg.JWTSecret))
		})
		sharing.RegisterPublic(api, pool)
		profiles.RegisterPublic(api, pool)

		api.Group(func(priv chi.Router) {
			priv.Use(auth.Middleware(cfg.JWTSecret))
			priv.Mount("/users", users.MeRoutes(pool))
			priv.Route("/profiles", func(r chi.Router) { profiles.RegisterAuth(r, pool) })
			priv.Mount("/documents", documents.Routes(pool, eng.IndexDoc))
			priv.Mount("/folders", folders.Routes(pool))
			priv.Mount("/document-types", doctypes.Routes(pool))
			priv.Mount("/search", eng.Routes())
			sharing.RegisterAuth(priv, pool)
			s3svc.RegisterAuth(priv, pool)
		})
	})

	// Optional-auth search fallback for public docs (kept minimal)

	// Single-app mode: serve the built React SPA (same origin). When STATIC_DIR
	// is set, every non-/api request serves a static file or falls back to
	// index.html (SPA routing: /docs, /p/:token, /@:username).
	if dir := os.Getenv("STATIC_DIR"); dir != "" {
		r.NotFound(serveSPA(dir))
	}

	addr := ":" + cfg.Port
	srv := &http.Server{Addr: addr, Handler: r, ReadHeaderTimeout: 5 * time.Second}
	log.Printf("CZAR DOCUMENTS SERVER on %s", addr)
	log.Fatal(srv.ListenAndServe())
}

func serveSPA(dir string) http.HandlerFunc {
	fs := http.FileServer(http.Dir(dir))
	return func(w http.ResponseWriter, req *http.Request) {
		p := strings.TrimPrefix(req.URL.Path, "/")
		if f, err := os.Stat(filepath.Join(dir, filepath.FromSlash(p))); err == nil && !f.IsDir() {
			fs.ServeHTTP(w, req)
			return
		}
		http.ServeFile(w, req, filepath.Join(dir, "index.html"))
	}
}

func bodyLimit(maxBytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, maxBytes)
			next.ServeHTTP(w, r)
		})
	}
}
