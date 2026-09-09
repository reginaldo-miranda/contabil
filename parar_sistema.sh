#!/bin/bash
cd "$(dirname "$0")"

echo "========================================================"
echo "Parando ContabilPro..."
echo "========================================================"

npx pm2 delete contabil

echo ""
echo "[OK] Sistema finalizado com sucesso."
