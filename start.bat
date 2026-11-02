@echo off
chcp 65001 >nul
title Tu Tien Cuu Trong Thien - TikTok Live RPC
cd /d "%~dp0"
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
echo ========================================================
echo   ⚔️ TU TIEN CUU TRONG THIEN — TIKTOK LIVE INTERACTIVE
echo ========================================================
echo   📺 OBS Browser Source (9:16) : http://localhost:3001
echo   🎛️ Bang Dieu Khien Admin     : http://localhost:3001/admin
echo   🔌 JSON-RPC / WebSocket     : ws://localhost:3001/ws
echo ========================================================
node server.js
pause
