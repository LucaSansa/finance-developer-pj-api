# Finance Developer PJ API

API REST para apoiar o controle financeiro de profissionais que atuam como pessoa jurídica (PJ). O projeto permite gerenciar conta e autenticação, fechamentos mensais, despesas pessoais e dados operacionais PJ associados aos fechamentos.

> **Status:** em desenvolvimento.

## Funcionalidades disponíveis

- Cadastro de usuário com CNPJ, perfil e percentual de imposto.
- Login com token de acesso JWT e refresh token armazenado em cookie `HttpOnly`.
- Confirmação de e-mail, reenvio da confirmação e recuperação de senha por e-mail.
- Solicitação e confirmação de alteração do e-mail, além de alteração de senha.
- Consulta e atualização do perfil do usuário autenticado.
- Criação, consulta paginada, atualização e exclusão de fechamentos mensais.
- Inclusão, atualização e exclusão de dados operacionais PJ vinculados a um fechamento mensal.
- Inclusão, atualização e exclusão de despesas pessoais vinculadas a um fechamento mensal, além da consulta dos tipos de despesa cadastrados.

**Modelo de dados:** `Invoice` participa do modelo de dados, mas ainda não possui rotas HTTP para gerenciamento de faturas.

## Tecnologias

- Node.js 20 (versão usada pela imagem do Docker).
- TypeScript e NestJS 11.
- PostgreSQL 15 e TypeORM.
- JWT e Passport para autenticação.
- Nodemailer para envio de e-mails.
- Swagger para documentação interativa em desenvolvimento.

## Pré-requisitos

- Docker e Docker Compose.
- As portas `3000`, `5432`, `5050`, `1025` e `8025` devem estar livres para executar todos os serviços do Compose.

## Executando o projeto

Após clonar o repositório, execute os comandos abaixo na raiz do projeto.

### 1. Configure as variáveis de ambiente

Crie um arquivo chamado `.env` na raiz do projeto e copie o exemplo abaixo:

```env
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=finance
POSTGRES_PASSWORD=finance
POSTGRES_DB=finance_developer_pj

JWT_ACCESS_SECRET=troque-por-um-segredo-aleatorio-forte
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=use-outro-segredo-aleatorio-forte
JWT_REFRESH_EXPIRES_IN=1d

MAIL_HOST=mailpit
MAIL_PORT=1025
MAIL_SECURE=false
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=no-reply@example.local
```

`db` e `mailpit` são os nomes dos serviços acessíveis entre os containers do Docker Compose.

As senhas e segredos acima são apenas exemplos para uso local. Substitua os segredos JWT por valores aleatórios diferentes. O `.env` é ignorado pelo Git: não compartilhe nem envie senhas para o repositório.

### 2. Inicie o projeto

Confira se `POSTGRES_HOST=db` e `MAIL_HOST=mailpit` estão no `.env` e execute:

```bash
docker compose up --build
```

Na primeira execução, o Docker baixa as imagens, instala as dependências e inicia a API, o PostgreSQL, o pgAdmin e o Mailpit. Aguarde a mensagem de inicialização da aplicação. O terminal permanece exibindo os logs; pressione `Ctrl+C` para parar os serviços.

O código do projeto é montado no container e a API executa `start:dev`, com observação de alterações. As dependências ficam em um volume Docker separado de `node_modules` do computador. Quando `package-lock.json` mudar, reconstruir a imagem pode não atualizar as dependências já presentes nesse volume. Com os serviços em execução, atualize-o com:

```bash
docker compose exec api npm ci
```

Reinicie a API se necessário com `docker compose restart api`.

### 3. Acesse e teste

| Serviço | Endereço |
| --- | --- |
| API | `http://localhost:3000` |
| Swagger, para consultar e testar as rotas | `http://localhost:3000/docs` |
| Mailpit, para visualizar e-mails de teste | `http://localhost:8025` |
| pgAdmin, para administrar o banco | `http://localhost:5050` |

O Swagger aparece quando `NODE_ENV=development`. A API não possui uma rota `GET /`, portanto uma resposta `404` em `http://localhost:3000/` não significa necessariamente que ela não iniciou.

O Mailpit captura os e-mails localmente; ele não os entrega a endereços reais. Os links nos e-mails apontam para `FRONTEND_URL`, portanto é necessário ter o frontend correspondente em execução para concluir os fluxos por ele. O CORS da API aceita atualmente `http://localhost:5173` com credenciais; alterar `FRONTEND_URL` não altera a origem permitida pelo CORS.

Para entrar no pgAdmin local, use `admin@admin.com` e senha `admin`. Ao registrar o servidor de banco no pgAdmin, informe o host `db`, porta `5432`, e o usuário, senha e nome do banco definidos no `.env`. Essas credenciais do pgAdmin são apenas para desenvolvimento.

### Exemplo de teste pelo Swagger

1. Abra `http://localhost:3000/docs`, expanda `POST /users` e clique em **Try it out**.
2. Preencha o corpo com nome, CNPJ válido com 14 dígitos, e-mail e senha de 8 a 12 caracteres com letras maiúsculas e minúsculas, número e símbolo. Clique em **Execute**.
3. Abra o Mailpit em `http://localhost:8025` e encontre o e-mail de confirmação. Copie apenas o valor após `token=` no link, sem compartilhá-lo.
4. No Swagger, execute `POST /auth/verify-email` com `{"token":"COLE_O_TOKEN_AQUI"}`. Isso permite testar a confirmação mesmo sem iniciar o frontend.
5. Execute `POST /auth/login` com o e-mail e a senha cadastrados. Copie o `access_token` retornado e use **Authorize** no Swagger para testar uma rota protegida, como `GET /users/me`.

O CNPJ e o e-mail precisam ser válidos e ainda não cadastrados no banco local. O login só é permitido após a confirmação do e-mail.

## Parar, reiniciar e consultar logs

Para executar todos os serviços em segundo plano:

```bash
docker compose up -d --build
```

Para consultar o estado e os logs da API:

```bash
docker compose ps
docker compose logs -f api
```

Pressione `Ctrl+C` para deixar de acompanhar os logs. Para parar e remover os containers:

```bash
docker compose down
```

O banco e as dependências permanecem em volumes Docker, inclusive após `docker compose down`. **Não use `docker compose down -v` se quiser preservar os dados**, pois esse comando remove os volumes.

As variáveis `POSTGRES_USER`, `POSTGRES_PASSWORD` e `POSTGRES_DB` inicializam o banco apenas quando o volume está vazio. Alterá-las no `.env` depois da criação não muda automaticamente o banco existente.

## Banco de dados e migrations

Na inicialização, o TypeORM sincroniza as entidades com o banco (`synchronize: true`) e a aplicação executa as migrations encontradas em `dist/migrations`. A compilação gera os arquivos necessários nessa pasta. Essa sincronização pode alterar o esquema e causar perda de dados; a configuração atual é destinada a desenvolvimento.

## Rotas HTTP

As rotas protegidas exigem o token de acesso no cabeçalho `Authorization: Bearer <token>`. Os formatos dos corpos e das respostas podem ser consultados no Swagger.

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

O login retorna os dados do usuário e o token de acesso; o refresh token é enviado em cookie `HttpOnly`.

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

## Problemas comuns

- **Porta já em uso:** pare o programa que está usando a porta indicada no erro ou ajuste a configuração correspondente.
- **A API não conecta ao banco ou ao Mailpit:** confira se os serviços estão ativos com `docker compose ps` e se os hosts no `.env` são `db` e `mailpit`.
- **Erro depois de alterar as credenciais do PostgreSQL:** lembre-se de que o volume existente mantém as credenciais iniciais. Não apague o volume sem antes decidir como preservar os dados.
- **Dependências ausentes no container:** com a API iniciada, execute `docker compose exec api npm ci` e reinicie o serviço.
- **Swagger não abre:** confira os logs da API e se `NODE_ENV=development` está definido.

## Lint e build

Com os serviços em execução, os scripts do `package.json` podem ser executados no container da API:

```bash
docker compose exec api npm run lint       # ESLint com correção automática
docker compose exec api npm run build      # compila a aplicação
```

O lint usa `--fix` e pode alterar arquivos. Os scripts de teste estão definidos no `package.json`, mas o repositório ainda não possui testes unitários ou configuração de testes end-to-end.

## Licença

O `package.json` declara a licença como `UNLICENSED`; portanto, este projeto não declara uma licença de uso ou redistribuição.
