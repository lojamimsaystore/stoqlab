@echo off
title Stoqlab Push
cd /d "%~dp0"
echo.
echo ============================================
echo   Stoqlab - Push para GitHub
echo ============================================
echo.
git status --short
echo.
set /p MSG=Mensagem do commit (Enter para padrao): 
if "%MSG%"=="" set MSG=feat: atualizacoes
git add -A
git commit -m "%MSG%"
if %ERRORLEVEL% NEQ 0 (
  echo Nada para commitar.
  pause
  exit /b
)
echo.
echo Enviando...
git push origin main
if %ERRORLEVEL% EQU 0 (
  echo Enviado com sucesso!
) else (
  echo Erro ao enviar.
)
echo.
pause