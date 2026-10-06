#!/usr/bin/env bash
# 简录签 SimRecSign - 启动服务脚本
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$SCRIPT_DIR/bin"
cd "$SCRIPT_DIR"

echo "============================================"
echo " 简录签 SimRecSign - 启动服务"
echo "============================================"
echo ""

# 检查编译产物，不存在则编译
if [ ! -f "$BIN_DIR/simrecsign-server" ]; then
    echo "[信息] 未找到编译产物，开始编译..."
    bash "$SCRIPT_DIR/build.sh"
    echo ""
fi

# ── 环境变量配置（可覆盖默认值）──
# HTTP 监听地址
: "${HTTP_ADDR:=:8080}"

# 数据库驱动：sqlite | mysql | postgres
: "${DB_DRIVER:=sqlite}"

# SQLite 数据文件路径
: "${DB_DSN:=file:simrecsign.db?cache=shared&_journal_mode=WAL}"

# JWT 签名密钥（生产环境请务必修改）
: "${JWT_SECRET:=dev-only-change-me-in-production}"

# JWT 有效期（分钟，默认 1440 = 24h）
: "${JWT_TTL_MINUTES:=1440}"

# 种子数据：超管邮箱
: "${SEED_ADMIN_EMAIL:=admin@simrecsign.local}"

# 种子数据：超管密码
: "${SEED_ADMIN_PASSWORD:=admin12345}"

# 种子数据：默认租户名称
: "${SEED_TENANT_NAME:=默认机构}"

export HTTP_ADDR DB_DRIVER DB_DSN JWT_SECRET JWT_TTL_MINUTES
export SEED_ADMIN_EMAIL SEED_ADMIN_PASSWORD SEED_TENANT_NAME

echo "配置："
echo "  HTTP_ADDR        = $HTTP_ADDR"
echo "  DB_DRIVER        = $DB_DRIVER"
echo "  DB_DSN           = $DB_DSN"
echo "  JWT_TTL_MINUTES  = $JWT_TTL_MINUTES"
echo "  SEED_ADMIN_EMAIL = $SEED_ADMIN_EMAIL"
echo ""
echo "Ctrl+C 停止服务"
echo "============================================"
echo ""

exec "$BIN_DIR/simrecsign-server"