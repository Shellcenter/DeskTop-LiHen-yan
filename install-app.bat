@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在安装离恨烟桌宠（构建一次，长期使用）...
echo.
call npm run install:app
echo.
pause
