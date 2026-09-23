package documents_test

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
	"docbuilder/internal/documents"
	"docbuilder/internal/httputil"
	"docbuilder/internal/search"
)

func setupTestDB(t *testing.T) (*pgxpool.Pool, func()) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, "postgres://docbuilder:docbuilder@localhost:5432/docbuilder?sslmode=disable")
	require.NoError(t, err)

	_, _ = pool.Exec(ctx, `TRUNCATE document_versions, document_permissions, attachments, public_links, documents, folders, document_types, workspaces, profiles, users, memberships RESTART IDENTITY CASCADE`)

	cleanup := func() {
		pool.Close()
	}
	return pool, cleanup
}

func TestDocumentsCRUD(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := setupTestDB(t)
	defer cleanup()

	eng := &search.Engine{Pool: pool, ESURL: ""}
	r := chi.NewRouter()
	r.Mount("/documents", documents.Routes(pool, eng.IndexDoc))

	uid := uuid.New()

// Create document
	createReq := httptest.NewRequest(http.MethodPost, "/documents", httputil.EncodeBody(t, map[string]any{"title": "Test Doc", "content": map[string]any{"type": "doc", "content": []any{}}}))
	createReq = createReq.WithContext(auth.WithUser(ctx, uid.String()))
	createReq.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, createReq)
	require.Equal(t, http.StatusCreated, w.Code)

	var created map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &created))
	docID := created["id"].(string)

	// Get document
	getReq := httptest.NewRequest(http.MethodGet, "/documents/"+docID, nil)
	getReq = getReq.WithContext(auth.WithUser(ctx, uid.String()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, getReq)
	require.Equal(t, http.StatusOK, w.Code)

	// Update document
	updateReq := httptest.NewRequest(http.MethodPatch, "/documents/"+docID, httputil.EncodeBody(t, map[string]any{"title": "Updated"}))
	updateReq = updateReq.WithContext(auth.WithUser(ctx, uid.String()))
	updateReq.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, updateReq)
	require.Equal(t, http.StatusOK, w.Code)

	// List documents
	listReq := httptest.NewRequest(http.MethodGet, "/documents", nil)
	listReq = listReq.WithContext(auth.WithUser(ctx, uid.String()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, listReq)
	require.Equal(t, http.StatusOK, w.Code)

	// Delete document
	delReq := httptest.NewRequest(http.MethodDelete, "/documents/"+docID, nil)
	delReq = delReq.WithContext(auth.WithUser(ctx, uid.String()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, delReq)
	require.Equal(t, http.StatusOK, w.Code)
	require.Equal(t, http.StatusOK, w.Code)
}

func TestDocumentVersions(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := setupTestDB(t)
	defer cleanup()

	eng := &search.Engine{Pool: pool, ESURL: ""}
	r := chi.NewRouter()
	r.Mount("/documents", documents.Routes(pool, eng.IndexDoc))

	uid := uuid.New()

	// Create doc
	createReq := httptest.NewRequest(http.MethodPost, "/documents", httputil.EncodeBody(t, map[string]any{"title": "Versioned"}))
	createReq = createReq.WithContext(auth.WithUser(ctx, uid.String()))
	createReq.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, createReq)
	require.Equal(t, http.StatusCreated, w.Code)
	var created map[string]any
	json.Unmarshal(w.Body.Bytes(), &created)
	docID := created["id"].(string)

	// Update twice to create versions
	for i := 0; i < 2; i++ {
		updateReq := httptest.NewRequest(http.MethodPatch, "/documents/"+docID, httputil.EncodeBody(t, map[string]any{"title": "v" + string(rune(i+'1'))}))
		updateReq = updateReq.WithContext(auth.WithUser(ctx, uid.String()))
		updateReq.Header.Set("Content-Type", "application/json")
		w = httptest.NewRecorder()
		r.ServeHTTP(w, updateReq)
		require.Equal(t, http.StatusOK, w.Code)
	}

	// Get versions
	verReq := httptest.NewRequest(http.MethodGet, "/documents/"+docID+"/versions", nil)
	verReq = verReq.WithContext(auth.WithUser(ctx, uid.String()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, verReq)
	require.Equal(t, http.StatusOK, w.Code)

	var versions []map[string]any
	require.NoError(t, json.Unmarshal(w.Body.Bytes(), &versions))
	require.GreaterOrEqual(t, len(versions), 2)
}

func TestDocumentPermissions(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := setupTestDB(t)
	defer cleanup()

	eng := &search.Engine{Pool: pool, ESURL: ""}
	r := chi.NewRouter()
	r.Mount("/documents", documents.Routes(pool, eng.IndexDoc))

	owner := uuid.New()
	editor := uuid.New()

	// Owner creates doc
	createReq := httptest.NewRequest(http.MethodPost, "/documents", httputil.EncodeBody(t, map[string]any{"title": "Private"}))
	createReq = createReq.WithContext(auth.WithUser(ctx, owner.String()))
	createReq.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, createReq)
	require.Equal(t, http.StatusCreated, w.Code)
	var created map[string]any
	json.Unmarshal(w.Body.Bytes(), &created)
	docID := created["id"].(string)

	// Editor tries to update (should 403 before share)
	updateReq := httptest.NewRequest(http.MethodPatch, "/documents/"+docID, httputil.EncodeBody(t, map[string]any{"title": "hack"}))
	updateReq = updateReq.WithContext(auth.WithUser(ctx, editor.String()))
	updateReq.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, updateReq)
	require.Equal(t, http.StatusForbidden, w.Code)
}