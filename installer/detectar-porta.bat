@echo off
chcp 65001 >nul 2>&1
cd /d "%~dp0"

:: ============================================================
:: detectar-porta.bat
:: Detecta banco de dados existente (MySQL ou MariaDB),
:: determina a porta correta, e atualiza as configuracoes.
:: Executado pelo Inno Setup ANTES do configurar-banco.bat
:: ============================================================

call :main > registro_porta.log 2>&1
exit /b %errorlevel%

:main
echo ======================================================
echo    ContabilPro - Deteccao de Banco de Dados
echo    Data/Hora: %DATE% %TIME%
echo ======================================================
echo.

:: ---------------------------------------------------------
:: PASSO 0: Tentar iniciar servicos de banco conhecidos
:: ---------------------------------------------------------
echo [INFO] Verificando se servicos de banco estao registrados...
sc query MariaDB >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Servico MariaDB detectado. Tentando iniciar caso esteja parado...
    net start MariaDB >nul 2>&1
)
sc query MySQL >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Servico MySQL detectado. Tentando iniciar caso esteja parado...
    net start MySQL >nul 2>&1
)
sc query MySQL80 >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Servico MySQL80 detectado. Tentando iniciar caso esteja parado...
    net start MySQL80 >nul 2>&1
)
sc query wampmysqld64 >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Servico wampmysqld64 detectado. Tentando iniciar caso esteja parado...
    net start wampmysqld64 >nul 2>&1
)

:: ---------------------------------------------------------
:: PASSO 1: Detectar se a porta 3306 ja esta em uso
:: ---------------------------------------------------------
set "PORTA_PADRAO=3306"
set "PORTA_ALTERNATIVA=3307"
set "PORTA_FINAL=%PORTA_PADRAO%"
set "BANCO_EXISTENTE=0"
set "MYSQL_BIN="
set "SENHA_ROOT="

echo [INFO] Verificando se a porta %PORTA_PADRAO% esta em uso...
netstat -ano | findstr "LISTENING" | findstr ":%PORTA_PADRAO% " >nul 2>&1
if %errorlevel% equ 0 (
    echo [AVISO] Porta %PORTA_PADRAO% ja esta em uso por outro processo!
    set "BANCO_EXISTENTE=1"
) else (
    echo [OK] Porta %PORTA_PADRAO% esta livre.
)

:: ---------------------------------------------------------
:: PASSO 2: Localizar binario mysql.exe (MariaDB ou MySQL)
:: ---------------------------------------------------------
echo.
echo [INFO] Procurando binario mysql.exe...

:: Primeiro: verificar no PATH
where mysql >nul 2>&1
if %errorlevel% equ 0 (
    set "MYSQL_BIN=mysql.exe"
    echo [OK] mysql.exe encontrado no PATH.
    goto :encontrou_mysql
)

:: MariaDB (versoes comuns)
for %%V in (11.4 11.3 11.2 11.1 11.0 10.11 10.5) do (
    if exist "C:\Program Files\MariaDB %%V\bin\mysql.exe" (
        set "MYSQL_BIN=C:\Program Files\MariaDB %%V\bin\mysql.exe"
        echo [OK] Encontrado MariaDB %%V
        goto :encontrou_mysql
    )
)

:: MySQL (versoes comuns)
for %%V in (9.0 8.4 8.3 8.2 8.1 8.0 5.7) do (
    if exist "C:\Program Files\MySQL\MySQL Server %%V\bin\mysql.exe" (
        set "MYSQL_BIN=C:\Program Files\MySQL\MySQL Server %%V\bin\mysql.exe"
        echo [OK] Encontrado MySQL Server %%V
        goto :encontrou_mysql
    )
)

echo [AVISO] Nenhum binario mysql.exe encontrado ainda.
echo [INFO] O binario sera disponivel apos a instalacao do MariaDB.
goto :definir_porta

:encontrou_mysql

:: ---------------------------------------------------------
:: PASSO 3: Se ja tem banco na 3306, testar conexao
:: ---------------------------------------------------------
if "%BANCO_EXISTENTE%"=="0" goto :definir_porta

echo.
echo [INFO] Testando conexao com banco existente na porta %PORTA_PADRAO%...

:: Tentar senha "root"
"%MYSQL_BIN%" -u root -proot -P %PORTA_PADRAO% -h 127.0.0.1 -e "SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    set "SENHA_ROOT=root"
    echo [OK] Conexao com senha 'root' bem-sucedida na porta %PORTA_PADRAO%.
    set "PORTA_FINAL=%PORTA_PADRAO%"
    goto :atualizar_configs
)

:: Tentar senha em branco (padrao do MySQL)
"%MYSQL_BIN%" -u root -P %PORTA_PADRAO% -h 127.0.0.1 -e "SELECT 1;" >nul 2>&1
if %errorlevel% equ 0 (
    set "SENHA_ROOT="
    echo [OK] Conexao sem senha bem-sucedida na porta %PORTA_PADRAO%.
    set "PORTA_FINAL=%PORTA_PADRAO%"
    goto :atualizar_configs
)

echo [AVISO] Banco na porta %PORTA_PADRAO% nao aceitou conexao com credenciais conhecidas.
echo [INFO] O MariaDB sera instalado na porta alternativa %PORTA_ALTERNATIVA%.
set "PORTA_FINAL=%PORTA_ALTERNATIVA%"
goto :definir_porta

:definir_porta
:: Se a porta 3306 esta em uso e nao conseguimos conectar, usar 3307
if "%BANCO_EXISTENTE%"=="1" (
    if "%PORTA_FINAL%"=="%PORTA_PADRAO%" (
        set "PORTA_FINAL=%PORTA_ALTERNATIVA%"
    )
)

:: Se nao tem banco existente e porta 3306 esta livre, usar 3306
if "%BANCO_EXISTENTE%"=="0" (
    set "PORTA_FINAL=%PORTA_PADRAO%"
)

:: ---------------------------------------------------------
:: PASSO 4: Atualizar arquivos de configuracao
:: ---------------------------------------------------------
:atualizar_configs
echo.
echo ======================================================
echo    PORTA FINAL DEFINIDA: %PORTA_FINAL%
echo ======================================================
echo.

:: Detectar caminho absoluto do Node.exe
set "NODE_EXE=node.exe"
if exist "C:\Program Files\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files\nodejs\node.exe"
) else if exist "C:\Program Files (x86)\nodejs\node.exe" (
    set "NODE_EXE=C:\Program Files (x86)\nodejs\node.exe"
)

:: Definir senha para uso (padrao: root)
if "%SENHA_ROOT%"=="" (
    if "%BANCO_EXISTENTE%"=="1" (
        :: Banco existente sem senha
        set "DB_URL_SENHA="
        set "DB_URL=mysql://root@127.0.0.1:%PORTA_FINAL%/contabil"
    ) else (
        :: MariaDB novo - senha sera 'root'
        set "DB_URL_SENHA=root"
        set "DB_URL=mysql://root:root@127.0.0.1:%PORTA_FINAL%/contabil"
    )
) else (
    set "DB_URL_SENHA=%SENHA_ROOT%"
    set "DB_URL=mysql://root:%SENHA_ROOT%@127.0.0.1:%PORTA_FINAL%/contabil"
)

:: Gerar .env atualizado
echo [INFO] Atualizando arquivo .env...
(
    echo # ContabilPro - Configuracao de Producao
    echo DATABASE_URL="%DB_URL%"
    echo NODE_ENV="production"
) > "%~dp0.env"
echo [OK] .env atualizado com porta %PORTA_FINAL%.

:: Gerar contabilpro-service.xml atualizado
echo [INFO] Atualizando contabilpro-service.xml com executavel: %NODE_EXE%...
(
    echo ^<service^>
    echo   ^<id^>contabilpro-api^</id^>
    echo   ^<name^>ContabilPro^</name^>
    echo   ^<description^>Servidor do Sistema ContabilPro ^(Next.js^)^</description^>
    echo   ^<executable^>%NODE_EXE%^</executable^>
    echo   ^<workingdirectory^>%%BASE%%^</workingdirectory^>
    echo   ^<arguments^>node_modules\next\dist\bin\next start^</arguments^>
    echo   ^<startmode^>Automatic^</startmode^>
    echo   ^<logmode^>rotate^</logmode^>
    echo   ^<logpath^>%%BASE%%\logs^</logpath^>
    echo   ^<env name="DATABASE_URL" value="%DB_URL%"/^>
    echo   ^<env name="NODE_ENV" value="production"/^>
    echo ^</service^>
) > "%~dp0contabilpro-service.xml"
echo [OK] contabilpro-service.xml atualizado com porta %PORTA_FINAL%.

:: Salvar porta detectada para uso pelo configurar-banco.bat
echo %PORTA_FINAL% > "%~dp0porta_detectada.txt"
echo %DB_URL_SENHA% > "%~dp0senha_detectada.txt"

echo.
echo ======================================================
echo    Deteccao de porta concluida!
echo    Porta: %PORTA_FINAL%
echo    URL: %DB_URL%
echo ======================================================
exit /b 0
