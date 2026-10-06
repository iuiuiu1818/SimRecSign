@echo off
chcp 65001 >nul
title SimRecSign 移动端

echo ============================================
echo  简录签 SimRecSign 移动端 - 启动服务
echo ============================================
echo.

setlocal enabledelayedexpansion

:: 设置输出目录
set BIN_DIR=bin

:: 检查编译产物是否存在，不存在则先编译
cd mobile
npm run dev
if errorlevel 1 (
    echo.
    echo [错误] 服务异常退出，错误码: %errorlevel%
    pause
    exit /b %errorlevel%
)

endlocal
pause
