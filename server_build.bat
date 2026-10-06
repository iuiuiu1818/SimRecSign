@echo off
chcp 65001 >nul
title SimRecSign Server Build

echo ============================================
echo  简录签 SimRecSign - 编译（前端内嵌单文件）
echo ============================================
echo.

setlocal enabledelayedexpansion

:: 设置输出目录
set BIN_DIR=../bin
cd server
if not exist "%BIN_DIR%" mkdir "%BIN_DIR%"

:: 检测 Go 环境
where go >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] 未找到 Go 编译器，请安装 Go 1.25+
    pause
    exit /b 1
)

echo [信息] Go 版本:
go version

:: ─── 嵌入前端构建产物 ───
:: 若前端未构建（dist 缺失）则先用 npm 构建
if not exist "..\web\src\dist\index.html" (
    echo.
    echo [步骤 0/3] 前端未构建，开始 npm 构建...
    cd ..\web\src
    call npm install
    if errorlevel 1 (
        echo [错误] 前端依赖安装失败
        pause
        exit /b 1
    )
    call npm run build
    if errorlevel 1 (
        echo [错误] 前端构建失败
        pause
        exit /b 1
    )
    cd ..\..
)

echo.
echo [步骤 1/3] 复制前端产物到内嵌目录...
if exist "webstatic\webroot" ( rmdir /S /Q webstatic\webroot )
mkdir webstatic\webroot
xcopy /E /I /Y "..\web\src\dist" "webstatic\webroot" >nul
echo [信息] PC 端产物已复制至 server\webstatic\webroot

:: 移动端：缺失则先构建（vite base=/m/，资源统一挂在 /m 下）
if not exist "..\mobile\dist\index.html" (
    echo.
    echo [步骤 1/3] 移动端未构建，开始 npm 构建...
    cd ..\mobile
    call npm install
    if errorlevel 1 (
        echo [错误] 移动端依赖安装失败
        pause
        exit /b 1
    )
    call npm run build
    if errorlevel 1 (
        echo [错误] 移动端构建失败
        pause
        exit /b 1
    )
    cd ..\..
)
if exist "webstatic\mobroot" ( rmdir /S /Q webstatic\mobroot )
mkdir webstatic\mobroot
xcopy /E /I /Y "..\mobile\dist" "webstatic\mobroot" >nul
echo [信息] 移动端产物已复制至 server\webstatic\mobroot

:: 确保内嵌字体存在（已随仓库提交于 webstatic/fonts）
if not exist "webstatic\fonts\NotoSansSC-Regular.ttf" (
    echo [警告] 内嵌字体缺失: webstatic\fonts\NotoSansSC-Regular.ttf（中文签名将乱码）
)

echo.
echo [步骤 2/3] 下载依赖...
go mod download
if %ERRORLEVEL% neq 0 (
    echo [错误] 依赖下载失败
    pause
    exit /b 1
)

echo.
echo [步骤 3/3] 编译服务端（前端与字体已内嵌）...
set CGO_ENABLED=0
set GOOS=linux
set GOARCH=amd64
go build -ldflags="-s -w" -o "%BIN_DIR%\simrecsign-server" ./cmd/server
if %ERRORLEVEL% equ 0 (
    echo.
    echo ============================================
    echo  ? 编译成功
    echo   输出: %BIN_DIR%\simrecsign-server
    echo   说明: 单文件已内嵌前端页面与中文字体，无需额外部署 web 服务
    echo ============================================
) else (
    echo [错误] 编译失败
    pause
    exit /b 1
)

endlocal
pause
