.PHONY: dev up down test
up:
	cp -n .env.example .env || true
	docker compose up --build
down:
	docker compose down
test-server:
	cd server && go test ./...
test-client:
	cd client && npm test -- --run
