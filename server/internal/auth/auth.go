package auth

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type Claims struct {
	UserID string `json:"uid"`
	jwt.RegisteredClaims
}

func HashPassword(pw string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(pw), bcrypt.DefaultCost)
	return string(b), err
}

func CheckPassword(hash, pw string) error {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pw))
}

func SignToken(secret, userID string) (string, error) {
	c := Claims{UserID: userID, RegisteredClaims: jwt.RegisteredClaims{
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(30 * 24 * time.Hour)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, c).SignedString([]byte(secret))
}

func ParseToken(secret, tok string) (string, error) {
	var c Claims
	_, err := jwt.ParseWithClaims(tok, &c, func(t *jwt.Token) (any, error) {
		return []byte(secret), nil
	})
	if err != nil {
		return "", err
	}
	return c.UserID, nil
}

type ctxKey struct{}

func WithUser(ctx context.Context, uid string) context.Context {
	return context.WithValue(ctx, ctxKey{}, uid)
}

func UserID(r *http.Request) (string, bool) {
	v := r.Context().Value(ctxKey{})
	s, ok := v.(string)
	return s, ok && s != ""
}

// Middleware enforces auth; use Optional for public routes.
func Middleware(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if !strings.HasPrefix(h, "Bearer ") {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			uid, err := ParseToken(secret, strings.TrimPrefix(h, "Bearer "))
			if err != nil || uid == "" {
				http.Error(w, "unauthorized", http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r.WithContext(WithUser(r.Context(), uid)))
		})
	}
}

// Optional attaches user if token present, never rejects.
func Optional(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			h := r.Header.Get("Authorization")
			if strings.HasPrefix(h, "Bearer ") {
				if uid, err := ParseToken(secret, strings.TrimPrefix(h, "Bearer ")); err == nil {
					r = r.WithContext(WithUser(r.Context(), uid))
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}
