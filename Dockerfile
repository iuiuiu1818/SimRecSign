# 简录签 SimRecSign — 多阶段构建
# Stage 1: 前端构建
FROM node:22-alpine AS frontend

WORKDIR /build/web
COPY web/src/package.json web/src/package-lock.json ./
RUN npm ci
COPY web/src/ ./
RUN npm run build

# Stage 2: Go build
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /src
COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ ./

# 将前端构建产物复制到 webstatic 目录（Go embed 需要）
COPY --from=frontend /build/web/dist ./webstatic/webroot/

# 构建 Go 二进制文件（纯 Go SQLite 驱动，无需 CGO）
RUN CGO_ENABLED=0 go build -ldflags="-s -w" -o /app/simrecsign ./cmd/server

# Stage 3: 最小运行时
FROM alpine:3.22

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app

# 中文字体（从内嵌字体目录复制）
COPY server/webstatic/fonts/ /app/fonts/

COPY --from=builder /app/simrecsign /app/simrecsign

# 存储目录
RUN mkdir -p /app/data /app/storage /app/ca && \
    chown -R 1000:1000 /app

# 非 root 用户运行
USER 1000:1000

EXPOSE 8080

ENV HTTP_ADDR=:8080
ENV DB_DRIVER=sqlite
ENV DB_DSN=file:/app/data/simrecsign.db?_pragma=journal_mode(WAL)&_pragma=busy_timeout(5000)
ENV STORAGE_BASEPATH=/app/storage
ENV FONT_PATH=/app/fonts/NotoSansSC-Regular.ttf

CMD ["/app/simrecsign"]
