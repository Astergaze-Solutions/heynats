FROM node:24.11.0-trixie AS client-builder
WORKDIR /app/client
RUN corepack enable
COPY client/package.json client/pnpm-lock.yaml ./
RUN pnpm install
COPY client/ ./
RUN pnpm build

FROM golang:1.24.7-alpine3.22 AS server-builder
WORKDIR /app
ARG TARGETOS=linux
ARG TARGETARCH=amd64

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN GOOS=$TARGETOS GOARCH=$TARGETARCH CGO_ENABLED=0 go build -ldflags "-s -w" -o bin/server main.go

FROM alpine:3.22.2
RUN apk --no-cache add ca-certificates
WORKDIR /app

COPY --from=server-builder /app/bin/server .

COPY --from=client-builder /app/client/dist ./client/dist
COPY --from=client-builder /app/client/public ./client/public

EXPOSE 5000

CMD ["./server"]