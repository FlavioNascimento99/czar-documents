# syntax=docker/dockerfile:1

# Single application container: React SPA + Go API.
# vImagem unica — zero comunicação com o CzarManager.

# Stage 1: build the React client (same-origin API: VITE_API_URL=<empty>)
FROM node:20-alpine AS client
WORKDIR /src/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ .
RUN VITE_API_URL= npm run build

# Stage 2: build the Go server
FROM golang:1.25-alpine AS server
WORKDIR /src/server
COPY server/go.mod server/go.sum ./
RUN go mod download
COPY server/ .
RUN CGO_ENABLED=0 go build -o /api ./cmd/api

# Final stage: single app
FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=server /api /app/api
COPY --from=server /src/server/migrations /app/migrations
COPY --from=client /src/client/dist /app/public
ENV PORT=8080
EXPOSE 8080
CMD ["/app/api"]