# ContábilPro — Sistema de Contabilidade V1

Sistema completo e independente de contabilidade desenvolvido com **Next.js 16 (App Router)**, **React 19**, **Prisma ORM** e **MySQL**. 

A aplicação gerencia múltiplos planos de contas, lançamentos contábeis (Livro Diário), Balancete de Verificação de 4 colunas, DRE (Demonstração do Resultado do Exercício) e Balanço Patrimonial lado a lado com apuração automática de lucro ou prejuízo do período.

---

## 🚀 Como Instalar o Sistema em Outra Máquina

Siga o passo a passo abaixo para configurar e rodar o projeto do zero:

### 1. Pré-requisitos
Certifique-se de ter instalado em sua máquina:
- **Node.js** (versão 18 ou superior)
- **MySQL Server** (rodando localmente, por padrão na porta `3306`)

---

### 2. Configuração Passo a Passo

#### Passo 2.1: Copiar o Projeto e Acessar a Pasta
Extraia ou clone o projeto na pasta desejada e abra o terminal nela.

#### Passo 2.2: Configurar o Arquivo de Variáveis de Ambiente (`.env`)
1. Na raiz do projeto, crie uma cópia do arquivo `.env.example` e salve-a com o nome de `.env`.
2. Abra o arquivo `.env` e configure a conexão desejada:
   - **Banco Local**: substitua `SUA_SENHA_AQUI` pela senha real do seu MySQL local (ex: `mysql://root:senha@localhost:3306/contabil`).
   - **Banco na Nuvem (Aiven)**: cole a URL fornecida pelo serviço de nuvem (com SSL, ex: `mysql://avnadmin:senha@host:porta/defaultdb?ssl-mode=REQUIRED`).
   - *Nota*: Se a sua senha contiver caracteres especiais como `@`, use URL encoding (ex: `@` vira `%40`).

#### Passo 2.2.1: Alternância Rápida entre Local e Nuvem (Windows)
Você pode criar seus próprios arquivos `.bat` para alternar entre os bancos:
1. Copie `conectar-local.example.bat` para `conectar-local.bat` e configure sua senha local.
2. Copie `conectar-nuvem.example.bat` para `conectar-nuvem.bat` e configure a URL da nuvem.
3. Dê dois cliques no `.bat` desejado para alternar o banco instantaneamente (esses arquivos são ignorados pelo Git para proteger suas senhas).


#### Passo 2.3: Instalar as Dependências do Node
No terminal, execute o comando abaixo para instalar as bibliotecas do projeto:
```bash
npm install
```

#### Passo 2.4: Criar a Estrutura do Banco de Dados (Migrations)
Execute o comando do Prisma para criar as tabelas automaticamente no seu servidor MySQL:
```bash
npx prisma migrate dev --name init
```
*Este comando lerá o arquivo schema.prisma, criará o banco de dados `contabilidade_db` e as tabelas correspondentes.*

#### Passo 2.5: Rodar o Seed (Plano de Contas CFC)
O sistema possui um seed com 109 contas oficiais recomendadas pelo Conselho Federal de Contabilidade. Para popular o banco de dados com essas contas, execute:
```bash
npx prisma db seed
```

---

### 3. Como Iniciar o Sistema

#### Opção A: Em Segundo Plano (Sem Janela do CMD Aberta — Recomendado)
O sistema inicia em background e não fecha se o usuário fechar o terminal:
- **Windows**: Dê dois cliques em **`iniciar_segundo_plano.bat`**. (Para parar, dê dois cliques em **`parar_sistema.bat`**).
- **Linux / macOS**: Execute `./iniciar_segundo_plano.sh` no terminal. (Para parar: `./parar_sistema.sh`).

#### Opção B: Em Primeiro Plano (Com Janela do Terminal)
- **Windows**: Dê dois cliques em `iniciar_sistema.bat`.
- **Qualquer SO (Terminal)**:
  ```bash
  npm run dev
  ```
  E abra [http://localhost:3000](http://localhost:3000) no seu navegador.


---

## 🛠️ Tecnologias Utilizadas
- **Framework**: Next.js 16 (App Router)
- **Biblioteca Visual**: React 19
- **Estilização**: Vanilla CSS Modules (Design Premium Dark Mode com Glassmorphism)
- **Banco de Dados**: MySQL
- **ORM**: Prisma ORM v5.22.0
