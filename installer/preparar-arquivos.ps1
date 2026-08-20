# Script PowerShell para preparar os arquivos de build do Instalador do ContabilPro
# Executado no ambiente de desenvolvimento do programador.

$ErrorActionPreference = "Stop"

# 1. Configurar diretorios
$InstallerDir = $PSScriptRoot
$ProjectRoot = (Get-Item -Path $InstallerDir).Parent.FullName
$BuildDir = Join-Path -Path $InstallerDir -ChildPath "build"
$CacheDir = Join-Path -Path $InstallerDir -ChildPath "cache"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "     Preparador do Instalador - ContabilPro" -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Raiz do projeto: $ProjectRoot"
Write-Host "Pasta do instalador: $InstallerDir"
Write-Host "Pasta de build final: $BuildDir"
Write-Host "------------------------------------------------------"

# 2. Criar pastas basicas
if (!(Test-Path -Path $CacheDir)) {
    New-Item -ItemType Directory -Path $CacheDir | Out-Null
}
if (Test-Path -Path $BuildDir) {
    Write-Host "Limpando pasta de build anterior..." -ForegroundColor Yellow
    Remove-Item -Path $BuildDir -Recurse -Force
}
New-Item -ItemType Directory -Path $BuildDir | Out-Null

# 3. Baixar pre-requisitos (se nao estiverem no cache)
$NodeMsiUrl = "https://nodejs.org/dist/v18.18.2/node-v18.18.2-x64.msi"
$MariaDbMsiUrl = "https://archive.mariadb.org/mariadb-10.11.5/winx64-packages/mariadb-10.11.5-winx64.msi"
$WinSwUrl = "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe"

$NodeMsiCache = Join-Path -Path $CacheDir -ChildPath "node.msi"
$MariaDbMsiCache = Join-Path -Path $CacheDir -ChildPath "mariadb.msi"
$WinSwCache = Join-Path -Path $CacheDir -ChildPath "winsw.exe"

# Baixar Node.js MSI
if (!(Test-Path -Path $NodeMsiCache)) {
    Write-Host "Baixando Node.js MSI para o cache..." -ForegroundColor Green
    Invoke-WebRequest -Uri $NodeMsiUrl -OutFile $NodeMsiCache -UseBasicParsing
} else {
    Write-Host "Node.js MSI ja esta no cache." -ForegroundColor Gray
}

# Baixar MariaDB MSI
if (!(Test-Path -Path $MariaDbMsiCache)) {
    Write-Host "Baixando MariaDB MSI para o cache..." -ForegroundColor Green
    Invoke-WebRequest -Uri $MariaDbMsiUrl -OutFile $MariaDbMsiCache -UseBasicParsing
} else {
    Write-Host "MariaDB MSI ja esta no cache." -ForegroundColor Gray
}

# Baixar WinSW
if (!(Test-Path -Path $WinSwCache)) {
    Write-Host "Baixando WinSW para o cache..." -ForegroundColor Green
    Invoke-WebRequest -Uri $WinSwUrl -OutFile $WinSwCache -UseBasicParsing
} else {
    Write-Host "WinSW ja esta no cache." -ForegroundColor Gray
}

# Copiar WinSW para a pasta de build (os MSIs ficam em cache/ e o Inno Setup busca de la)
Copy-Item -Path $WinSwCache -Destination (Join-Path -Path $BuildDir -ChildPath "contabilpro-service.exe")

# 4. Copiar arquivos de configuracao do servico e banco
Copy-Item -Path (Join-Path -Path $InstallerDir -ChildPath "contabilpro-service.xml") -Destination (Join-Path -Path $BuildDir -ChildPath "contabilpro-service.xml")
Copy-Item -Path (Join-Path -Path $InstallerDir -ChildPath "configurar-banco.bat") -Destination (Join-Path -Path $BuildDir -ChildPath "configurar-banco.bat")
Copy-Item -Path (Join-Path -Path $InstallerDir -ChildPath "detectar-porta.bat") -Destination (Join-Path -Path $BuildDir -ChildPath "detectar-porta.bat")

# 5. Gerar Build de Producao do Next.js
Write-Host "Gerando Build de Producao do Next.js..." -ForegroundColor Green
Push-Location $ProjectRoot
try {
    # Criar .env temporario para o build
    $EnvBuild = @"
DATABASE_URL="mysql://root:root@127.0.0.1:3306/contabil"
NODE_ENV="production"
"@
    $EnvBuild | Out-File -FilePath (Join-Path -Path $ProjectRoot -ChildPath ".env.production") -Encoding utf8 -Force

    npm run build
} finally {
    # Remover .env temporario
    $EnvProd = Join-Path -Path $ProjectRoot -ChildPath ".env.production"
    if (Test-Path $EnvProd) { Remove-Item $EnvProd -Force }
    Pop-Location
}

# 6. Copiar arquivos do projeto para o build
Write-Host "Copiando arquivos do projeto para o build..." -ForegroundColor Green

$ExcludeList = @("node_modules", ".env", ".env.local", ".git", ".gitignore", ".next", "installer", "AGENTS.md", "CLAUDE.md")

# Copiar arquivos e pastas necessarios
Get-ChildItem -Path $ProjectRoot | Where-Object { $_.Name -notin $ExcludeList } | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $BuildDir -Recurse -Force
}

# Copiar a pasta .next (build de producao)
$NextBuildSrc = Join-Path -Path $ProjectRoot -ChildPath ".next"
$NextBuildDest = Join-Path -Path $BuildDir -ChildPath ".next"
if (Test-Path $NextBuildSrc) {
    Copy-Item -Path $NextBuildSrc -Destination $NextBuildDest -Recurse -Force
    Write-Host "[OK] Pasta .next copiada." -ForegroundColor Gray
} else {
    Write-Host "[ERRO] Pasta .next nao encontrada! O build falhou?" -ForegroundColor Red
    exit 1
}

# 7. Criar .env de producao no build
$EnvContent = @"
# ContabilPro - Configuracao de Producao
DATABASE_URL="mysql://root:root@127.0.0.1:3306/contabil"
NODE_ENV="production"
"@
$EnvContent | Out-File -FilePath (Join-Path -Path $BuildDir -ChildPath ".env") -Encoding utf8

# 8. Instalar dependencias de producao no build
Write-Host "Instalando dependencias de producao..." -ForegroundColor Green
Push-Location $BuildDir
try {
    npm install --omit=dev

    # Gerar Prisma Client
    Write-Host "Gerando Prisma Client..." -ForegroundColor Yellow
    npx prisma generate
} finally {
    Pop-Location
}

# 9. Criar pasta de logs para o WinSW
New-Item -ItemType Directory -Path (Join-Path -Path $BuildDir -ChildPath "logs") | Out-Null

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "     ARQUIVOS DE BUILD PREPARADOS COM SUCESSO!" -ForegroundColor Green
Write-Host "     Pasta: $BuildDir" -ForegroundColor Green
Write-Host "======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximo passo:" -ForegroundColor Yellow
Write-Host "  Abra o arquivo 'contabilpro.iss' no Inno Setup e compile." -ForegroundColor Yellow
Write-Host "  O instalador sera gerado em: installer\Output\ContabilPro_Setup.exe" -ForegroundColor Yellow
