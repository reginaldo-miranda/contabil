@echo off
chcp 65001 >nul 2>&1
title ContabilPro - Liberacao de Acesso em Rede
color 0A

:: -------------------------------------------------------------
:: Verifica permissao de administrador e solicita elevacao
:: -------------------------------------------------------------
net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Solicitando permissao de Administrador...
    powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo ==========================================================
echo        CONTABILPRO - LIBERACAO DE REDE LOCAL
echo ==========================================================
echo.
echo [1/2] Removendo regras antigas (se houver)...
netsh advfirewall firewall delete rule name="ContabilPro (Porta 3000)" >nul 2>&1

echo [2/2] Criando regra no Firewall para liberar a Porta 3000...
netsh advfirewall firewall add rule name="ContabilPro (Porta 3000)" dir=in action=allow protocol=TCP localport=3000 profile=any >nul 2>&1

if %errorlevel% equ 0 (
    echo       [OK] Porta 3000 liberada com sucesso no Firewall!
) else (
    echo       [AVISO] Verifique a regra manualmente no Firewall do Windows.
)

echo.
echo ==========================================================
echo             ENDERECOS DE ACESSO DA OUTRA MAQUINA
echo ==========================================================
echo.
echo   Na outra maquina (conectada na mesma rede Wi-Fi/cabo):
echo.
echo   Opcao 1 (Recomendada):
echo   http://192.168.0.49:3000
echo.
echo   Opcao 2 (Nome de Rede):
echo   http://AZUS-PC:3000
echo.
echo ==========================================================
echo.
echo Pressione qualquer tecla para fechar esta janela...
pause >nul
