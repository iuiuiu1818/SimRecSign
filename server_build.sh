#!/usr/bin/env bash
# 简录签 SimRecSign - 编译脚本（前端内嵌单文件）
set -euo pipefail

BIN_DIR="bin"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "============================================"
echo " 简录签 SimRecSign - 编译（前端内嵌单文件）"
echo "============================================"
echo ""

# 检测 Go 环境
if ! command -v go &>/dev/null; then
    echo "[错误] 未找到 Go 编译器，请安装 Go 1.25+"
    exit 1
fi

echo "[信息] Go 版本: $(go version)"

# ─── 嵌入前端构建产物 ───
if [ ! -f "../web/src/dist/index.html" ]; then
    echo ""
    echo "[步骤 0/3] 前端未构建，开始 npm 构建..."
    (cd ../web/src && npm install && npm run build)
fi

echo ""
echo "[步骤 1/3] 复制前端产物到内嵌目录..."
rm -rf webstatic/webroot
mkdir -p webstatic/webroot
cp -r ../web/src/dist/. webstatic/webroot/
echo "[信息] PC 端产物已复制至 server/webstatic/webroot"

# ─── 移动端：缺失则先构建（vite base=/m/，资源统一挂在 /m 下）───
if [ ! -f "../mobile/dist/index.html" ]; then
    echo ""
    echo "[步骤 1/3] 移动端未构建，开始 npm 构建..."
    (cd ../mobile && npm install && npm run build)
fi
rm -rf webstatic/mobroot
mkdir -p webstatic/mobroot
cp -r ../mobile/dist/. webstatic/mobroot/
echo "[信息] 移动端产物已复制至 server/webstatic/mobroot"

# 确保内嵌字体存在（已随仓库提交于 webstatic/fonts）
if [ ! -f "webstatic/fonts/NotoSansSC-Regular.ttf" ]; then
    echo "[警告] 内嵌字体缺失: webstatic/fonts/NotoSansSC-Regular.ttf（中文签名将乱码）"
fi

# 创建输出目录
mkdir -p "$BIN_DIR"

# 下载依赖
echo ""
echo "[步骤 2/3] 下载依赖..."
go mod download
echo ""

# 编译（前端与字体已内嵌）
echo "[步骤 3/3] 编译服务端..."
CGO_ENABLED=0 go build -ldflags="-s -w" -o "$BIN_DIR/simrecsign-server" ./cmd/server

echo ""
echo "============================================"
echo " ✓ 编译成功"
echo "   输出: $BIN_DIR/simrecsign-server"
echo "   说明: 单文件已内嵌 PC 端 / 移动端页面与中文字体，无需额外部署 web 服务"
echo "         PC 端访问 / ，移动端访问 /m"
echo "============================================"
