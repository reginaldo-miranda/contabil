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
2. Abra o arquivo `.env` e substitua `SUA_SENHA_AQUI` pela senha real do seu MySQL local.
   - *Nota*: Se a sua senha do MySQL contiver caracteres especiais como `@`, use URL encoding. Por exemplo, se a senha for `saguides@123`, ela deve ser escrita como `saguides%40123`.

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

#### Atalho Rápido (Somente Windows)
Basta dar dois cliques no arquivo **[`iniciar_sistema.bat`](file:///C:/contabil/iniciar_sistema.bat)** na raiz do projeto. Ele vai:
1. Iniciar o servidor local.
2. Abrir automaticamente o navegador em [http://localhost:3000](http://localhost:3000).

#### Pelo Terminal (Qualquer Sistema Operacional)
1. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
2. Abra o seu navegador de internet e acesse:
   [http://localhost:3000](http://localhost:3000)

---

## 🛠️ Tecnologias Utilizadas
- **Framework**: Next.js 16 (App Router)
- **Biblioteca Visual**: React 19
- **Estilização**: Vanilla CSS Modules (Design Premium Dark Mode com Glassmorphism)
- **Banco de Dados**: MySQL
- **ORM**: Prisma ORM v5.22.0
