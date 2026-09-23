package search_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"docbuilder/internal/auth"
	"docbuilder/internal/search"
)

func setupTestDB(t *testing.T) (*pgxpool.Pool, func()) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, "postgres://docbuilder:docbuilder@localhost:5432/docbuilder?sslmode=disable")
	require.NoError(t, err)

	_, _ = pool.Exec(ctx, `TRUNCATE document_versions, document_permissions, documents, folders, document_types, workspaces, memberships RESTART IDENTITY CASCADE`)

	cleanup := func() { pool.Close() }
	return pool, cleanup
}

func TestSearchFallback(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := setupTestDB(t)
	defer cleanup()

	eng := &search.Engine{Pool: pool, ESURL: ""} // No ES, fallback only
	r := chi.NewRouter()
	r.Mount("/search", eng.Routes())

	uid := uuid.New()

	// Create test documents directly
	_, _ = pool.Exec(ctx, `
		INSERT INTO documents (id, workspace_id, owner_id, title, content, content_text, visibility)
		VALUES
		(gen_random_uuid(), gen_random_uuid(), $1, 'Hello World', '{"type":"doc"}', 'hello world', 'private'),
		(gen_random_uuid(), gen_random_uuid(), $1, 'Another Doc', '{"type":"doc"}', 'foo bar', 'private'),
		(gen_random_uuid(), gen_random_uuid(), $1, 'Third Document', '{"type":"doc"}', 'hello again', 'private')
	`, uid)

	// Search "hello" - should match 2 docs
	req := httptest.NewRequest(http.MethodGet, "/search?q=hello", nil)
	req = req.WithContext(auth.WithUser(ctx, uid.String()))
	w := httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)

	var resp map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &resp))
	docs := resp["documents"].([]any)
	require.Equal(t, 2, len(docs))

	// Search "foo" - 1 doc
	req = httptest.NewRequest(http.MethodGet, "/search?q=foo", nil)
	req = req.WithContext(auth.WithUser(ctx, uid.String()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &resp)
	docs = resp["documents"].([]any)
	require.Equal(t, 1, len(docs))

	// Search empty - should return empty
	req = httptest.NewRequest(http.MethodGet, "/search?q=", nil)
	req = req.WithContext(auth.WithUser(ctx, uid.String()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, req)
	require.Equal(t, http.StatusOK, w.Code)
	json.Unmarshal(w.Body.Bytes(), &resp)
	docs = resp["documents"].([]any)
	require.Equal(t, 0, len(docs))
}