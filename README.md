# Finance Developer PJ API

API REST para apoiar o controle financeiro de profissionais que atuam como pessoa jurídica (PJ). O projeto permite gerenciar conta e autenticação, fechamentos mensais, despesas pessoais e dados operacionais PJ associados aos fechamentos.

> **Status:** em desenvolvimento. A documentação abaixo descreve o que está implementado atualmente e distingue os recursos internos do modelo de dados das funcionalidades expostas por rotas HTTP.

## Funcionalidades disponíveis

- Cadastro de usuário com CNPJ, perfil e percentual de imposto.
- Login com token de acesso JWT e refresh token armazenado em cookie `HttpOnly`.
- Confirmação de e-mail, reenvio da confirmação e recuperação de senha por e-mail.
- Solicitação e confirmação de alteração do e-mail, além de alteração de senha.
- Consulta e atualização do perfil do usuário autenticado.
- Criação, consulta paginada, atualização e exclusão de fechamentos mensais.
- Inclusão, atualização e exclusão de dados operacionais PJ vinculados a um fechamento mensal.
- Inclusão, atualização e exclusão de despesas pessoais vinculadas a um fechamento mensal, além da consulta dos tipos de despesa cadastrados.

**Modelo de dados:** a entidade `Invoice` está registrada pelo módulo `InvoiceModule` para compor o modelo de dados e o relacionamento com os dados operacionais PJ. Atualmente, ela não é acessada por rotas HTTP e não representa uma funcionalidade de gerenciamento de faturas disponível pela API.

## Tecnologias

- Node.js 20 (versão usada pela imagem do Docker)
- TypeScript e NestJS 11
- PostgreSQL 15 no ambiente Docker Compose
- TypeORM
- JWT e Passport para autenticação
- Nodemailer para envio de e-mails
- Swagger para documentação interativa em desenvolvimento

## Pré-requisitos

Para executar localmente sem Docker:

- Node.js 20 ou compatível
- npm
- PostgreSQL acessível pela API

Para executar com Docker Compose:

- Docker
- Docker Compose

## Configuração local

1. Instale as dependências:

   ```bash
   npm ci
   ```

2. Crie um arquivo `.env` na raiz do projeto. Exemplo para executar a API na máquina e usar o PostgreSQL e o Mailpit do Docker Compose:

   ```env
   NODE_ENV=development
   PORT=3000
   FRONTEND_URL=http://localhost:5173

   POSTGRES_HOST=localhost
   POSTGRES_PORT=5432
   POSTGRES_USER=finance
   POSTGRES_PASSWORD=finance
   POSTGRES_DB=finance_developer_pj

   JWT_ACCESS_SECRET=troque-por-um-segredo-aleatorio-forte
   JWT_ACCESS_EXPIRES_IN=15m
   JWT_REFRESH_SECRET=use-outro-segredo-aleatorio-forte
   JWT_REFRESH_EXPIRES_IN=1d

   MAIL_HOST=localhost
   MAIL_PORT=1025
   MAIL_SECURE=false
   MAIL_USER=
   MAIL_PASSWORD=
   MAIL_FROM=no-reply@example.local
   ```

   Os valores dos segredos são apenas exemplos: substitua-os por valores fortes e não compartilhe o arquivo `.env`. Ele está incluído no `.gitignore`.

3. Inicie PostgreSQL e Mailpit:

   ```bash
   docker compose up -d db mailpit
   ```

4. Inicie a API em modo de desenvolvimento:

   ```bash
   npm run start:dev
   ```

A API fica disponível em `http://localhost:3000`. Com `NODE_ENV=development`, a interface Swagger fica em `http://localhost:3000/docs`. A interface web do Mailpit fica em `http://localhost:8025`.

### Variáveis de ambiente

| Variável | Finalidade |
| --- | --- |
| `NODE_ENV` | Habilita a documentação Swagger quando o valor é `development`; também define o atributo `secure` do cookie de refresh em produção. |
| `PORT` | Porta HTTP da API; o padrão no código é `3000`. |
| `FRONTEND_URL` | URL do frontend usada para compor links de confirmação de e-mail e recuperação de senha. |
| `POSTGRES_HOST` | Host do PostgreSQL. Use `localhost` com a API executada na máquina ou `db` com a API executada no Compose. |
| `POSTGRES_PORT` | Porta do PostgreSQL. |
| `POSTGRES_USER` | Usuário do banco de dados. |
| `POSTGRES_PASSWORD` | Senha do banco de dados. |
| `POSTGRES_DB` | Nome do banco de dados. |
| `JWT_ACCESS_SECRET` | Segredo usado para assinar tokens de acesso. |
| `JWT_ACCESS_EXPIRES_IN` | Validade do token de acesso, no formato aceito pelo JWT, por exemplo `15m`. |
| `JWT_REFRESH_SECRET` | Segredo usado para assinar refresh tokens. Deve ser diferente do segredo de acesso. |
| `JWT_REFRESH_EXPIRES_IN` | Validade do refresh token, no formato aceito pelo JWT, por exemplo `1d`. |
| `MAIL_HOST` | Host do servidor SMTP. |
| `MAIL_PORT` | Porta do servidor SMTP. |
| `MAIL_SECURE` | Use `true` para conexão SMTP segura; `false` para conexão sem TLS implícito, como no Mailpit local. |
| `MAIL_USER` | Usuário SMTP, quando exigido pelo servidor. |
| `MAIL_PASSWORD` | Senha SMTP, quando exigida pelo servidor. |
| `MAIL_FROM` | Endereço remetente das mensagens enviadas. |

O CORS está configurado diretamente no código para aceitar `http://localhost:5173` com credenciais. Não há variável de ambiente para alterar essa origem atualmente.

## Executar tudo com Docker Compose

Configure um `.env` na raiz com as variáveis necessárias acima. Para a API dentro do Compose, defina `POSTGRES_HOST=db`. Depois, execute:

```bash
docker compose up --build
```

O Compose sobe a API, PostgreSQL, pgAdmin e Mailpit. Endereços locais:

- API: `http://localhost:3000`
- Swagger (somente com `NODE_ENV=development`): `http://localhost:3000/docs`
- pgAdmin: `http://localhost:5050`
- Mailpit: `http://localhost:8025`

O serviço pgAdmin está configurado no Compose com credenciais locais padrão (`admin@admin.com` / `admin`). Use esse serviço apenas para desenvolvimento local e não exponha essas credenciais em ambientes acessíveis por terceiros.

Para parar os serviços:

```bash
docker compose down
```

## Rotas HTTP

As rotas abaixo refletem os controllers registrados atualmente. Rotas marcadas como protegidas exigem o token de acesso no cabeçalho `Authorization: Bearer <access_token>`.

### Autenticação — `/auth`

| Método | Rota | Acesso |
| --- | --- | --- |
| `POST` | `/auth/login` | Público |
| `POST` | `/auth/refresh` | Refresh token no cookie `refresh_token` |
| `POST` | `/auth/logout` | Token de acesso |
| `POST` | `/auth/verify-email` | Público |
| `POST` | `/auth/resend-verification-email` | Público |
| `POST` | `/auth/forgot-password` | Público |
| `POST` | `/auth/reset-password` | Público |
| `POST` | `/auth/confirm-email-change` | Público |

O login retorna os dados do usuário e o token de acesso; o refresh token é enviado em cookie `HttpOnly`. As rotas de confirmação e recuperação recebem os tokens enviados nos e-mails.

### Usuários — `/users`

| Método | Rota | Acesso |
| --- | --- | --- |
| `POST` | `/users` | Público |
| `PATCH` | `/users` | Token de acesso |
| `GET` | `/users/me` | Token de acesso |
| `POST` | `/users/me/email-change` | Token de acesso |
| `POST` | `/users/change-password` | Token de acesso |

### Fechamentos mensais — `/monthly-closing`

Todas as rotas exigem token de acesso.

| Método | Rota | Ação |
| --- | --- | --- |
| `POST` | `/monthly-closing` | Cria um fechamento mensal |
| `GET` | `/monthly-closing/find-all` | Lista os fechamentos do usuário com paginação e filtros |
| `GET` | `/monthly-closing/find-one?id=<id>` | Consulta um fechamento por ID |
| `PATCH` | `/monthly-closing/:id` | Atualiza um fechamento |
| `DELETE` | `/monthly-closing/:id` | Exclui um fechamento |

### Operacional PJ — `/operacional-pj`

Todas as rotas exigem token de acesso.

| Método | Rota | Ação |
| --- | --- | --- |
| `POST` | `/operacional-pj/:id` | Cria dados operacionais para o fechamento mensal identificado por `id` |
| `PATCH` | `/operacional-pj/:id` | Atualiza os dados operacionais identificados por `id` |
| `DELETE` | `/operacional-pj/:id` | Exclui os dados operacionais identificados por `id` |

### Despesas pessoais — `/personal-expenses`

Todas as rotas exigem token de acesso.

| Método | Rota | Ação |
| --- | --- | --- |
| `POST` | `/personal-expenses/:id` | Cria uma despesa para o fechamento mensal identificado por `id` |
| `PATCH` | `/personal-expenses/:id` | Atualiza a despesa identificada por `id` |
| `DELETE` | `/personal-expenses/:id` | Exclui a despesa identificada por `id` |
| `GET` | `/personal-expenses/expense-types` | Lista os tipos de despesas cadastrados |

Os formatos dos corpos de requisição e das respostas estão definidos pelos DTOs e podem ser consultados na interface Swagger durante o desenvolvimento.

## Banco de dados e migrations

Na inicialização, a aplicação conecta ao PostgreSQL, executa as migrations encontradas em `dist/migrations` e inicia o servidor HTTP. O TypeORM também está configurado com `synchronize: true`, que sincroniza o schema das entidades registradas, incluindo `Invoice`, com o banco. A entidade de fatura participa do modelo de dados, mas não possui rotas HTTP nesta versão. A configuração `synchronize: true` está presente no código atual; avalie desativá-la antes de usar o projeto em produção.

## Testes, lint e build

O `package.json` define os seguintes scripts:

```bash
npm run test       # testes unitários
npm run test:e2e   # testes end-to-end
npm run test:cov   # cobertura dos testes
npm run lint       # executa ESLint com correção automática
npm run build      # compila a aplicação
```

Não há arquivos de teste `*.spec.ts` nem configuração end-to-end no repositório atualmente; os scripts de teste estão definidos, mas precisam desses arquivos/configuração para validar funcionalidades. O lint usa `--fix` e pode alterar arquivos. Execute `npm run lint` apenas quando quiser aplicar as correções automáticas.

## Licença

O `package.json` declara a licença como `UNLICENSED`; portanto, este projeto não declara uma licença de uso ou redistribuição.
