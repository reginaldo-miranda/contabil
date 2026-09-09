#!/bin/bash
cd "$(dirname "$0")"

echo "========================================================"
echo "Iniciando ContabilPro em Segundo Plano (Linux/Mac)..."
echo "========================================================"

npx pm2 start npm --name "contabil" -- run dev

# Abre o navegador conforme o SO
if [[ "$OSTYPE" == "darwin"* ]]; then
    open http://localhost:3000
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open http://localhost:3000 2>/dev/null || sensible-browser http://localhost:3000 2>/dev/null
fi

echo ""
echo "[OK] O sistema está rodando em segundo plano."
