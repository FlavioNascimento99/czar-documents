package folders_test

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
	"docbuilder/internal/folders"
	"docbuilder/internal/httputil"
)

func setupTestDB(t *testing.T) (*pgxpool.Pool, func()) {
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, "postgres://docbuilder:docbuilder@localhost:5432/docbuilder?sslmode=disable")
	require.NoError(t, err)

	_, _ = pool.Exec(ctx, `TRUNCATE folders, workspaces, memberships RESTART IDENTITY CASCADE`)

	cleanup := func() { pool.Close() }
	return pool, cleanup
}

func TestFoldersCRUD(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := setupTestDB(t)
	defer cleanup()

	r := chi.NewRouter()
	r.Mount("/folders", folders.Routes(pool))

	uid := uuid.New()

	// Create folder
	createReq := httptest.NewRequest(http.MethodPost, "/folders", httputil.EncodeBody(t, map[string]any{"name": "Test Folder"}))
	createReq = createReq.WithContext(auth.WithUser(ctx, uid.String()))
	createReq.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, createReq)
	require.Equal(t, http.StatusCreated, w.Code)
	var created map[string]any
	json.Unmarshal(w.Body.Bytes(), &created)
	folderID := created["id"].(string)

	// List folders (root)
	listReq := httptest.NewRequest(http.MethodGet, "/folders", nil)
	listReq = listReq.WithContext(auth.WithUser(ctx, uid.String()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, listReq)
	require.Equal(t, http.StatusOK, w.Code)

	// Create child folder
	childReq := httptest.NewRequest(http.MethodPost, "/folders", httputil.EncodeBody(t, map[string]any{"name": "Child", "parent_id": folderID}))
	childReq = childReq.WithContext(auth.WithUser(ctx, uid.String()))
	childReq.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, childReq)
	require.Equal(t, http.StatusCreated, w.Code)

	// List children of parent
	childrenReq := httptest.NewRequest(http.MethodGet, "/folders?parent_id="+folderID, nil)
	childrenReq = childrenReq.WithContext(auth.WithUser(ctx, uid.String()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, childrenReq)
	require.Equal(t, http.StatusOK, w.Code)

	// Update folder
	updateReq := httptest.NewRequest(http.MethodPatch, "/folders/"+folderID, httputil.EncodeBody(t, map[string]any{"name": "Renamed"}))
	updateReq = updateReq.WithContext(auth.WithUser(ctx, uid.String()))
	updateReq.Header.Set("Content-Type", "application/json")
	w = httptest.NewRecorder()
	r.ServeHTTP(w, updateReq)
	require.Equal(t, http.StatusOK, w.Code)

	// Delete folder
	delReq := httptest.NewRequest(http.MethodDelete, "/folders/"+folderID, nil)
	delReq = delReq.WithContext(auth.WithUser(ctx, uid.String()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, delReq)
	require.Equal(t, http.StatusOK, w.Code)
}

func TestFoldersPermission(t *testing.T) {
	ctx := context.Background()
	pool, cleanup := setupTestDB(t)
	defer cleanup()

	r := chi.NewRouter()
	r.Mount("/folders", folders.Routes(pool))

	user1 := uuid.New()
	user2 := uuid.New()

	// User1 creates folder
	createReq := httptest.NewRequest(http.MethodPost, "/folders", httputil.EncodeBody(t, map[string]any{"name": "User1 Folder"}))
	createReq = createReq.WithContext(auth.WithUser(ctx, user1.String()))
	createReq.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	r.ServeHTTP(w, createReq)
	require.Equal(t, http.StatusCreated, w.Code)
	var created map[string]any
	json.Unmarshal(w.Body.Bytes(), &created)
	folderID := created["id"].(string)

	// User2 tries to access (should fail - no membership)
	getReq := httptest.NewRequest(http.MethodGet, "/folders/"+folderID, nil)
	getReq = getReq.WithContext(auth.WithUser(ctx, user2.String()))
	w = httptest.NewRecorder()
	r.ServeHTTP(w, getReq)
	require.Equal(t, http.StatusForbidden, w.Code)
}