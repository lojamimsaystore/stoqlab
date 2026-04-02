@echo off
title Stoqlab Dev Server
cd /d "%~dp0"
echo Iniciando Stoqlab...
echo Acesse: http://localhost:3000
echo.
start "" http://localhost:3000
npm run dev
pause
