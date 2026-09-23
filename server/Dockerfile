FROM golang:1.22-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /api ./cmd/api

FROM alpine:latest
RUN apk add --no-cache ca-certificates
COPY --from=build /api /api
COPY migrations /migrations
EXPOSE 8080
CMD ["/api"]
