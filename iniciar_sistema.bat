@echo off
chcp 65001 >nul 2>&1
title ContabilPro - Iniciando Servidor...
color 0A

echo.
echo  ==========================================
echo       CONTABILPRO - Iniciando Sistema
echo  ==========================================
echo.

:: Forcar diretorio do script (detecta automaticamente)
cd /d "%~dp0"
echo  Diretorio: "%CD%"
echo.

:: -----------------------------------------------
:: 1. Verificar se Node.js esta instalado
:: -----------------------------------------------
echo  [1/4] Verificando Node.js...
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo  [ERRO] Node.js nao encontrado!
    echo  Instale em: https://nodejs.org
    echo.
    pause
    exit /b 1
)
for /f "tokens=*" %%V in ('node -v') do echo         Node.js %%V encontrado
echo.

:: -----------------------------------------------
:: 2. Verificar e instalar dependencias
:: -----------------------------------------------
echo  [2/4] Verificando dependencias...
if not exist "node_modules" (
    echo         node_modules nao encontrado. Instalando...
    call npm install
    if %errorlevel% neq 0 (
        echo.
        echo  [ERRO] Falha ao instalar dependencias!
        echo.
        pause
        exit /b 1
    )
    echo         Dependencias instaladas com sucesso!
) else (
    echo         OK - node_modules encontrado
)
echo.

:: -----------------------------------------------
:: 3. Matar processos antigos na porta 3000
:: -----------------------------------------------
echo  [3/4] Limpando processos antigos na porta 3000...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING" 2^>nul') do (
    taskkill /PID %%P /F >nul 2>&1
)
echo         OK
echo.

:: -----------------------------------------------
:: 4. Iniciar Next.js em nova janela
:: -----------------------------------------------
echo  [4/4] Iniciando servidor Next.js...
start "ContabilPro - Next.js (porta 3000)" cmd /k "cd /d "%~dp0" && npm run dev"

:: -----------------------------------------------
:: 5. Aguardar servidor ficar pronto (porta 3000)
:: -----------------------------------------------
echo.
echo         Aguardando servidor na porta 3000...

set TENTATIVAS=0
set MAX_TENTATIVAS=30

:AGUARDAR
set /a TENTATIVAS+=1
if %TENTATIVAS% gtr %MAX_TENTATIVAS% (
    echo.
    echo  [AVISO] Servidor demorou mais de 30 segundos.
    echo  O navegador sera aberto mesmo assim.
    echo  Recarregue a pagina se necessario (F5).
    goto ABRIR_NAVEGADOR
)

timeout /t 1 /nobreak >nul
netstat -ano | findstr ":3000" | findstr "LISTENING" >nul 2>&1
if %errorlevel% neq 0 (
    <nul set /p "=."
    goto AGUARDAR
)

echo.
echo         Servidor pronto! (%TENTATIVAS%s)

:: -----------------------------------------------
:: 6. Abrir navegador
:: -----------------------------------------------
:ABRIR_NAVEGADOR
echo.
echo         Abrindo navegador...
start "" "http://localhost:3000"

:: -----------------------------------------------
:: 7. Resumo final
:: -----------------------------------------------
echo.
echo  ==========================================
echo      SISTEMA INICIADO COM SUCESSO!
echo  ==========================================
echo.
echo   Local:  http://localhost:3000
echo.
echo   Uma janela do CMD foi aberta com o servidor.
echo   Para parar: feche a janela "ContabilPro"
echo   ou pressione Ctrl+C nela.
echo.
echo  ==========================================
echo.
pause
