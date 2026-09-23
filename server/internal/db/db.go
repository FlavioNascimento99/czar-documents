package db

import (
	"context"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, url string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		return nil, err
	}
	// App tables live in the `czar` schema (see migrations/001_init.sql). The
	// migration's SET search_path only affects its own session, so every pooled
	// connection must resolve unqualified names to czar first.
	cfg.AfterConnect = func(ctx context.Context, conn *pgx.Conn) error {
		_, err := conn.Exec(ctx, "SET search_path TO czar, public")
		return err
	}
	return pgxpool.NewWithConfig(ctx, cfg)
}
