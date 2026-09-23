package ratelimit

import (
	"net/http"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"

	"docbuilder/internal/httputil"
)

type Limiter struct {
	rdb    *redis.Client
	prefix string
}

func New(rdb *redis.Client, prefix string) *Limiter {
	return &Limiter{rdb: rdb, prefix: prefix}
}

// Limit returns middleware that limits requests per window per key (IP by default).
// keyFunc can extract a custom key from the request (e.g., user ID).
func (l *Limiter) Limit(max int, window time.Duration, keyFunc func(*http.Request) string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := l.prefix + ":" + keyFunc(r)
			ctx := r.Context()

			now := time.Now().UnixMilli()
			windowMs := window.Milliseconds()
			windowStart := now - windowMs

			pipe := l.rdb.TxPipeline()
			pipe.ZRemRangeByScore(ctx, key, "0", strconv.FormatInt(windowStart, 10))
			countCmd := pipe.ZCard(ctx, key)
			pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: now})
			pipe.Expire(ctx, key, window+time.Second)
			_, err := pipe.Exec(ctx)
			if err != nil {
				// On Redis error, fail open (don't block)
				next.ServeHTTP(w, r)
				return
			}

			count := countCmd.Val()
			remaining := max - int(count)
			if remaining < 0 {
				remaining = 0
			}

			w.Header().Set("X-RateLimit-Limit", strconv.Itoa(max))
			w.Header().Set("X-RateLimit-Remaining", strconv.Itoa(remaining))
			w.Header().Set("X-RateLimit-Reset", strconv.FormatInt((now+windowMs)/1000, 10))

			if int(count) > max {
				httputil.Err(w, 429, "rate limit exceeded")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// IPKeyFunc extracts client IP
func IPKeyFunc(r *http.Request) string {
	return r.RemoteAddr
}