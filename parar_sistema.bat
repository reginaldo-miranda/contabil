@echo off
chcp 65001 >nul 2>&1
setlocal
cd /d "%~dp0"

echo ========================================================
echo       CONTABILPRO - Desligando Sistema e Servicos
echo ========================================================
echo.

:: 1. Parar processo no PM2 se estiver em execucao
echo [1/3] Finalizando processos do PM2...
call npx pm2 delete contabil >nul 2>&1
echo       PM2 finalizado.

:: 2. Limpar qualquer processo remanescente na porta 3000
echo.
echo [2/3] Liberando porta 3000...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%P /F >nul 2>&1
)
echo       Porta 3000 liberada.

:: 3. Parar servico do Banco de Dados local (se existir e estiver rodando)
echo.
echo [3/3] Finalizando banco de dados local...
net stop MySQL96 >nul 2>&1
net stop MySQL >nul 2>&1
net stop MySQL80 >nul 2>&1
net stop MariaDB >nul 2>&1
echo       Servicos de banco de dados encerrados.

echo.
echo ========================================================
echo [OK] Sistema e servicos finalizados com sucesso!
echo ========================================================
echo.

if not "%1"=="--no-pause" (
    pause
)
