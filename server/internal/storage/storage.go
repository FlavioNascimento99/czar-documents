package storage

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"docbuilder/internal/auth"
	"docbuilder/internal/httputil"
)

type S3 struct {
	Client *s3.Client
	Presign *s3.PresignClient
	Bucket string
}

func New(endpoint, region, bucket, key, secret string, useSSL bool) *S3 {
	scheme := "http"
	if useSSL {
		scheme = "https"
	}
	c := s3.New(s3.Options{
		Region:       region,
		Credentials:  aws.NewCredentialsCache(credentials.NewStaticCredentialsProvider(key, secret, "")),
		BaseEndpoint: aws.String(fmt.Sprintf("%s://%s", scheme, endpoint)),
		UsePathStyle: true,
	})
	return &S3{Client: c, Presign: s3.NewPresignClient(c), Bucket: bucket}
}

func (s *S3) RegisterAuth(r chi.Router, pool *pgxpool.Pool) {
	// Request upload URL for a document attachment (metadata in PG, bytes in S3)
	r.Post("/documents/{id}/attachments/upload-url", func(w http.ResponseWriter, req *http.Request) {
		uid, _ := auth.UserID(req)
		docID := chi.URLParam(req, "id")
		var owner string
		if err := pool.QueryRow(req.Context(), `SELECT owner_id::text FROM documents WHERE id=$1`, docID).Scan(&owner); err != nil {
			httputil.Err(w, 404, "not found"); return
		}
		var role *string
		_ = pool.QueryRow(req.Context(), `SELECT role FROM document_permissions WHERE document_id=$1 AND user_id=$2`, docID, uid).Scan(&role)
		if owner != uid && (role == nil || (*role != "owner" && *role != "editor")) {
			httputil.Err(w, 403, "forbidden"); return
		}
		var in struct {
			Filename string `json:"filename"`
			Mime     string `json:"mime_type"`
			Size     int64  `json:"size"`
		}
		if err := httputil.Decode(req, &in); err != nil || in.Filename == "" {
			httputil.Err(w, 400, "filename required"); return
		}
		if in.Size > 25<<20 {
			httputil.Err(w, 400, "max 25MB"); return
		}
		key := fmt.Sprintf("docs/%s/%s-%s", docID, uuid.NewString(), in.Filename)
		ctx, cancel := context.WithTimeout(req.Context(), 10*time.Second)
		defer cancel()
		ps, err := s.Presign.PresignPutObject(ctx, &s3.PutObjectInput{
			Bucket: &s.Bucket, Key: &key, ContentType: &in.Mime,
		}, s3.WithPresignExpires(15*time.Minute))
		if err != nil {
			httputil.Err(w, 500, "presign failed"); return
		}
		// Also generate a presigned GET URL for immediate display (24h)
		gs, err := s.Presign.PresignGetObject(ctx, &s3.GetObjectInput{
			Bucket: &s.Bucket, Key: &key,
		}, s3.WithPresignExpires(24*time.Hour))
		if err != nil {
			httputil.Err(w, 500, "presign get failed"); return
		}
		var attID string
		_ = pool.QueryRow(ctx, `INSERT INTO attachments (document_id, storage_key, filename, mime_type, size)
			VALUES ($1,$2,$3,$4,$5) RETURNING id::text`, docID, key, in.Filename, in.Mime, in.Size).Scan(&attID)
		httputil.JSON(w, 201, map[string]string{
			"attachment_id": attID,
			"upload_url":    ps.URL,
			"public_url":    gs.URL,
			"storage_key":   key,
		})
	})
}
