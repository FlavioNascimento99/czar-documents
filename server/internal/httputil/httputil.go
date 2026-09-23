package httputil

import (
	"bytes"
	"encoding/json"
	"log/slog"
	"net/http"
	"os"
	"time"
)

var logger = slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
	Level: slog.LevelInfo,
}))

func JSON(w http.ResponseWriter, code int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(code)
	_ = json.NewEncoder(w).Encode(v)
}

func Decode(r *http.Request, v any) error {
	return json.NewDecoder(http.MaxBytesReader(nil, r.Body, 2<<20)).Decode(v)
}

func Err(w http.ResponseWriter, code int, msg string) {
	JSON(w, code, map[string]string{"error": msg})
}

func LogRequest(req *http.Request, status int, duration time.Duration) {
	requestID := req.Header.Get("X-Request-ID")
	if requestID == "" {
		if rid := req.Context().Value("request_id"); rid != nil {
			requestID = rid.(string)
		}
	}
	logger.Info("http_request",
		"request_id", requestID,
		"method", req.Method,
		"path", req.URL.Path,
		"status", status,
		"duration_ms", duration.Milliseconds(),
		"remote_ip", req.RemoteAddr,
		"user_agent", req.UserAgent(),
	)
}

func EncodeBody(t interface{ Fatal(args ...any) }, v any) *bytes.Reader {
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatal(err)
	}
	return bytes.NewReader(b)
}
