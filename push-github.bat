@echo off
chcp 65001 >nul
echo ================================================
echo   Stoqlab - Push para GitHub
echo ================================================
echo.

:: Verifica se git está instalado
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERRO] Git nao encontrado. Instale em https://git-scm.com
    pause
    exit /b 1
)

cd /d "C:\Users\Romeu\Stoqlab"

:: Inicializa o repositório se necessário
if not exist ".git" (
    echo [1/5] Inicializando repositorio git...
    git init
    git branch -M main
) else (
    echo [1/5] Repositorio git ja existe.
)

:: Solicita a URL do repositório se não tiver remote configurado
git remote get-url origin >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo Informe a URL do repositorio GitHub:
    echo Exemplo: https://github.com/seu-usuario/stoqlab.git
    echo.
    set /p REPO_URL="URL: "
    git remote add origin "%REPO_URL%"
    echo Remote configurado: %REPO_URL%
)

echo.
echo [2/5] Adicionando arquivos...
git add .

echo.
echo [3/5] Informe a mensagem do commit (ou pressione Enter para mensagem padrao):
set /p COMMIT_MSG="Mensagem: "
if "%COMMIT_MSG%"=="" set COMMIT_MSG=chore: atualiza projeto Stoqlab

git commit -m "%COMMIT_MSG%"

echo.
echo [4/5] Enviando para o GitHub...
git push -u origin main

if %errorlevel% equ 0 (
    echo.
    echo ================================================
    echo   [OK] Push realizado com sucesso!
    echo ================================================
) else (
    echo.
    echo ================================================
    echo   [ERRO] Falha no push. Verifique suas credenciais.
    echo   Dica: configure git com:
    echo     git config --global user.email "seu@email.com"
    echo     git config --global user.name "Seu Nome"
    echo ================================================
)

echo.
pause
