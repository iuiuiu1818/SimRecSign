# 简录签 SimRecSign — 多阶段构建
# Stage 1: Go build
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /src
COPY server/go.mod server/go.sum ./
RUN go mod download

COPY server/ ./

# 构建 Go 二进制文件
RUN CGO_ENABLED=1 go build -ldflags="-s -w" -o /app/simrecsign ./cmd/server

# Stage 2: 最小运行时
FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata
ENV TZ=Asia/Shanghai

WORKDIR /app

# 中文字体（可选，用于 PDF 签名外观中文渲染）
COPY fonts/NotoSansSC-Regular.ttf /app/fonts/ 2>/dev/null || true

COPY --from=builder /app/simrecsign /app/simrecsign

# 存储目录（默认 SQLite 数据库 + 文件存储）
RUN mkdir -p /app/data /app/storage

EXPOSE 8080

ENV HTTP_ADDR=:8080
ENV DB_DRIVER=sqlite
ENV DB_DSN=/app/data/simrecsign.db
ENV STORAGE_BASEPATH=/app/storage
ENV FONT_PATH=/app/fonts/NotoSansSC-Regular.ttf

CMD ["/app/simrecsign"]
