@echo off
chcp 65001 >nul
title SimRecSign Server

echo ============================================
echo  简录签 SimRecSign - 启动服务
echo ============================================
echo.

setlocal enabledelayedexpansion

:: 设置输出目录
set BIN_DIR=bin

:: 检查编译产物是否存在，不存在则先编译
if not exist "%BIN_DIR%\simrecsign-server.exe" (
    echo [信息] 未找到编译产物，开始编译...
    call server_build.bat
    if errorlevel 1 exit /b 1
    echo.
)

:: 设置环境变量（仅当未定义时使用默认值）
if not defined HTTP_ADDR set HTTP_ADDR=:8080
if not defined DB_DRIVER set DB_DRIVER=sqlite
if not defined DB_DSN set "DB_DSN=file:simrecsign.db?cache=shared&_journal_mode=WAL"
if not defined JWT_SECRET set JWT_SECRET=dev-only-change-me-in-production
if not defined JWT_TTL_MINUTES set JWT_TTL_MINUTES=1440
if not defined SEED_ADMIN_EMAIL set SEED_ADMIN_EMAIL=admin@simrecsign.local
if not defined SEED_ADMIN_PASSWORD set SEED_ADMIN_PASSWORD=admin12345
if not defined SEED_TENANT_NAME set SEED_TENANT_NAME=默认租户

echo 配置：
echo   HTTP_ADDR        = %HTTP_ADDR%
echo   DB_DRIVER        = %DB_DRIVER%
echo   DB_DSN           = file:simrecsign.db?cache=shared^&_journal_mode=WAL
echo   JWT_TTL_MINUTES  = %JWT_TTL_MINUTES%
echo   SEED_ADMIN_EMAIL = %SEED_ADMIN_EMAIL%
echo.
echo Ctrl+C 停止服务
echo ============================================
echo.

"%BIN_DIR%\simrecsign-server.exe"

if errorlevel 1 (
    echo.
    echo [错误] 服务异常退出，错误码: %errorlevel%
    pause
    exit /b %errorlevel%
)

endlocal
pause
