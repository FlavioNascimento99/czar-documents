package config

import "os"

type Config struct {
	PostgresURL string
	RedisAddr   string
	ESURL       string
	S3Endpoint  string
	S3Region    string
	S3Bucket    string
	S3Key       string
	S3Secret    string
	S3UseSSL    bool
	JWTSecret   string
	Port        string
	ClientOrigin string
}

func getenv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func Load() Config {
	return Config{
		PostgresURL:  getenv("POSTGRES_URL", "postgres://docbuilder:docbuilder@localhost:5432/docbuilder?sslmode=disable"),
		RedisAddr:    getenv("REDIS_ADDR", "localhost:6379"),
		ESURL:        getenv("ELASTICSEARCH_URL", "http://localhost:9200"),
		S3Endpoint:   getenv("S3_ENDPOINT", "localhost:9000"),
		S3Region:     getenv("S3_REGION", "us-east-1"),
		S3Bucket:     getenv("S3_BUCKET", "docbuilder"),
		S3Key:        getenv("S3_ACCESS_KEY", "minioadmin"),
		S3Secret:     getenv("S3_SECRET_KEY", "minioadmin"),
		S3UseSSL:     getenv("S3_USE_SSL", "false") == "true",
		JWTSecret:    getenv("JWT_SECRET", "dev-secret-change-me-32-chars-min!!"),
		Port:         getenv("PORT", "8080"),
		ClientOrigin: getenv("CLIENT_ORIGIN", "http://localhost:5173"),
	}
}
