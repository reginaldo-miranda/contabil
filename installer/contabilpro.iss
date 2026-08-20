; Script do Inno Setup para o ContabilPro
; Gera o instalador executavel final (.exe) do sistema para Windows.
;
; Baseado no instalador do appBarCash, adaptado para Next.js.

[Setup]
AppId={{A7C3E1B2-8F4D-4B6A-9D2E-3FC7A8B1D5E9}
AppName=ContabilPro
AppVersion=1.0.0
AppPublisher=ContabilPro
DefaultDirName=C:\ContabilPro
DefaultGroupName=ContabilPro
DisableProgramGroupPage=yes
OutputBaseFilename=ContabilPro_Setup
OutputDir=Output
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
; Privilegios administrativos sao necessarios para instalar servicos e bancos de dados
PrivilegesRequired=admin

[Languages]
Name: "brazilianportuguese"; MessagesFile: "compiler:Languages\BrazilianPortuguese.isl"

[Files]
; Copiar arquivos do sistema
Source: "build\*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs

; Copiar instaladores MSI para pasta temporaria (excluidos apos instalacao)
Source: "cache\node.msi"; DestDir: "{tmp}"; Flags: deleteafterinstall
Source: "cache\mariadb.msi"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Icons]
; Atalho na Area de Trabalho que abre a aplicacao no navegador padrao
Name: "{commondesktop}\ContabilPro"; Filename: "http://localhost:3000"; Comment: "Iniciar ContabilPro"
Name: "{group}\ContabilPro"; Filename: "http://localhost:3000"
Name: "{group}\Desinstalar ContabilPro"; Filename: "{uninstallexe}"

[Run]
; 1. Instalar Node.js silenciosamente se necessario
Filename: "msiexec.exe"; Parameters: "/i ""{tmp}\node.msi"" /qn /norestart"; StatusMsg: "Verificando e instalando Node.js (Ambiente de Execucao)..."; Flags: runhidden; Check: NodeNecessario

; 2. Instalar MariaDB silenciosamente se necessario
Filename: "msiexec.exe"; Parameters: "/i ""{tmp}\mariadb.msi"" /qn /norestart PASSWORD=root PORT={code:GetMariaDbPortParam} SERVICENAME=MariaDB ADD_TO_PATH=1"; StatusMsg: "Verificando e instalando Banco de Dados MariaDB..."; Flags: runhidden; Check: MariaDbNecessario

; 3. Detectar porta do banco e atualizar configuracoes (.env, service.xml)
;    DEVE rodar ANTES do configurar-banco.bat
Filename: "{cmd}"; Parameters: "/c ""{app}\detectar-porta.bat"""; StatusMsg: "Detectando configuracao do banco de dados..."; Flags: runhidden waituntilterminated

; 4. Configurar banco de dados (criar banco 'contabil' e tabelas via Prisma)
Filename: "{cmd}"; Parameters: "/c ""{app}\configurar-banco.bat"""; StatusMsg: "Configurando banco de dados e criando tabelas..."; Flags: runhidden waituntilterminated

; 5. Registrar o Next.js como Servico do Windows usando WinSW
Filename: "{app}\contabilpro-service.exe"; Parameters: "install"; StatusMsg: "Registrando Servico de Sistema ContabilPro..."; Flags: runhidden

; 6. Liberar porta 3000 no Firewall do Windows
Filename: "netsh"; Parameters: "advfirewall firewall add rule name=""ContabilPro"" dir=in action=allow protocol=TCP localport=3000"; StatusMsg: "Configurando Firewall do Windows..."; Flags: runhidden

; 7. Iniciar o Servico do Windows recem-registrado
Filename: "{app}\contabilpro-service.exe"; Parameters: "start"; StatusMsg: "Iniciando Servico do Sistema..."; Flags: runhidden

; 8. Abrir a aplicacao no navegador no final da instalacao
Filename: "cmd.exe"; Parameters: "/c start http://localhost:3000"; Description: "Iniciar o ContabilPro agora"; Flags: postinstall nowait

[UninstallRun]
; Remover a regra do firewall
Filename: "netsh"; Parameters: "advfirewall firewall delete rule name=""ContabilPro"""; Flags: runhidden; RunOnceId: "DeleteFirewallRule"
; Parar o servico antes de desinstalar
Filename: "{app}\contabilpro-service.exe"; Parameters: "stop"; Flags: runhidden; RunOnceId: "StopService"
; Remover o servico do Windows
Filename: "{app}\contabilpro-service.exe"; Parameters: "uninstall"; Flags: runhidden; RunOnceId: "UninstallService"

[Code]
// Funcao para checar se o Node.js ja esta instalado
function NodeNecessario(): Boolean;
begin
  Result := not FileExists('C:\Program Files\nodejs\node.exe') and
            not FileExists('C:\Program Files (x86)\nodejs\node.exe');
end;

// Determina a porta para instalar o MariaDB
function GetMariaDbPortParam(Param: String): String;
var
  ResultCode: Integer;
begin
  if Exec('cmd.exe', '/c netstat -ano | findstr "LISTENING" | findstr ":3306 "', '',
          SW_HIDE, ewWaitUntilTerminated, ResultCode) then
  begin
    if ResultCode = 0 then
      Result := '3307'
    else
      Result := '3306';
  end
  else
    Result := '3306';
end;

// Funcao para checar se algum banco de dados compativel ja esta instalado
function MariaDbNecessario(): Boolean;
var
  PortaParam: String;
begin
  PortaParam := GetMariaDbPortParam('');

  if PortaParam = '3307' then
  begin
    if RegKeyExists(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Services\MariaDB') then
      Result := False
    else
      Result := True;
    Exit;
  end;

  if RegKeyExists(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Services\MariaDB') or
     RegKeyExists(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Services\MySQL') or
     RegKeyExists(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Services\MySQL80') or
     RegKeyExists(HKEY_LOCAL_MACHINE, 'SYSTEM\CurrentControlSet\Services\wampmysqld64') then
  begin
    Result := False;
  end
  else
  begin
    Result := True;
  end;
end;

procedure CurUninstallStepChanged(JustAfterAnsiNextStep: TUninstallStep);
begin
  if JustAfterAnsiNextStep = usPostUninstall then
  begin
    MsgBox('O servico do ContabilPro foi removido com sucesso.' + #13#10 +
           'Por motivos de seguranca, o banco de dados e os seus dados contabeis foram mantidos no computador.' + #13#10 +
           'Se desejar remove-los permanentemente, desinstale o MariaDB atraves do Painel de Controle.', mbInformation, MB_OK);
  end;
end;
