@echo off
title ContabilPro - Iniciando Servidor...
echo.
echo ==========================================
echo          INICIANDO CONTABILPRO
echo ==========================================
echo.
echo 1. Acessando a pasta do projeto...
cd /d D:\contabil
echo.
echo 2. Abrindo o navegador em http://localhost:3000...
start "" "http://localhost:3000"
echo.
echo 3. Iniciando o servidor de desenvolvimento (Next.js)...
echo (Mantenha esta janela do terminal aberta para usar o sistema!)
echo.
npm run dev
