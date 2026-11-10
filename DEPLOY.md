# Guia para colocar a API no ar

Este guia explica, passo a passo, como publicar esta API em um servidor e
configurar atualizações automáticas quando houver um novo commit na branch
`main`. Ele foi escrito para quem está começando e não pressupõe experiência
com servidores.

> **Antes de começar:** leia o guia inteiro, principalmente as partes sobre o
> banco de dados e os avisos de segurança. A publicação torna a API acessível
> pela internet e pode gerar custos. Este guia é um caminho inicial para uma
> aplicação pequena, não uma garantia de segurança ou disponibilidade.

## 1. O que vamos construir

Imagine o servidor como um computador que fica ligado na internet. Nele
rodaremos três programas dentro de *containers* Docker:

```text
Você altera o código → GitHub (branch main) → GitHub Actions
                                               │
                                               ▼
                                      Servidor contratado
                                  ┌──────────────────────────┐
Internet → HTTPS → api.seudominio.com.br → Caddy → API NestJS
                                  │                    │
                                  │                PostgreSQL
                                  └──────────────────────────┘
```

- **GitHub:** guarda o código.
- **GitHub Actions:** executa a atualização no servidor depois de um push na
  `main`. Isso só acontece após você configurar o workflow.
- **Docker:** executa os serviços em containers.
- **PostgreSQL:** guarda os dados; eles ficam em um volume persistente.
- **Caddy:** recebe os acessos públicos, encaminha à API e obtém e renova o
  certificado HTTPS.
- **SMTP:** serviço externo que envia e-mails reais de confirmação e
  recuperação de senha.

O frontend não será hospedado por este guia. Ele precisa existir separadamente
para que seus links de confirmação e recuperação funcionem.

### O que você vai precisar

1. Uma conta no GitHub com acesso de administrador ao repositório.
2. Um servidor virtual (**VPS**) com Ubuntu 24.04 LTS e endereço IPv4 público.
3. Um domínio, como `seudominio.com.br`, com acesso à configuração de DNS.
4. Um serviço de e-mail transacional com SMTP e remetente/domínio verificado.
5. Um computador com Git e SSH. Os comandos locais abaixo usam Linux ou macOS;
   no Windows, use WSL com Ubuntu ou adapte ao seu terminal.
6. Um frontend publicado em HTTPS, preferencialmente em
   `https://app.seudominio.com.br`.

**Custos:** normalmente há cobrança recorrente pelo VPS, domínio, armazenamento
de backups e, conforme o volume, pelo serviço de e-mail. Consulte preços,
limites, impostos e política de cobrança dos fornecedores antes de contratar.
Um VPS com 2 GB de RAM e 1 CPU pode servir para testes de um projeto pequeno,
mas não é garantia de desempenho; compilação Docker, tráfego e PostgreSQL
podem exigir mais memória, disco ou recursos.

### Antes de digitar comandos

- **No computador:** terminal da sua própria máquina, dentro do projeto.
- **No servidor:** terminal conectado ao VPS por SSH. O nome da máquina no
  prompt costuma mudar.
- Valores como `SEU_IP`, `seudominio.com.br` e `SEU_USUARIO` são exemplos.
  Troque-os pelos seus valores; não digite os sinais `<` e `>`.
- Não cole senhas, chaves privadas ou conteúdo do `.env` em conversas, issues
  ou commits. Guarde-os em um gerenciador de senhas.
- Use apenas um projeto Compose neste VPS para este tutorial. Nunca execute
  `docker compose down -v`: o `-v` remove volumes, inclusive o banco.

## 2. Escolha um VPS e um domínio

Você pode escolher qualquer fornecedor de VPS que ofereça Ubuntu 24.04 LTS,
IPv4 público, acesso SSH e firewall de rede. DigitalOcean, Hetzner e AWS
Lightsail são exemplos, não recomendações obrigatórias. As telas e os preços
mudam; procure por **Create server**, **Droplet**, **Instance** ou equivalente.

Ao contratar:

1. Escolha Ubuntu 24.04 LTS, arquitetura `amd64` ou `arm64`, um plano adequado
   e uma região próxima dos seus usuários.
2. Crie ou informe uma chave SSH para acesso administrativo. Prefira chave a
   senha; siga o painel do fornecedor para cadastrar a chave pública.
3. Anote o **IPv4 público**. Configure o firewall do fornecedor para permitir
   TCP 22, 80 e 443; mantenha as demais portas de entrada fechadas. Se possível,
   limite a porta 22 ao seu IP e aos IPs necessários para automação. GitHub
   Actions hospedado pelo GitHub usa endereços variáveis; uma regra restrita ao
   seu IP pode impedir o deploy automático.
4. Ative autenticação em dois fatores na conta do fornecedor e no GitHub.
5. Confira se o plano inclui backups e se eles podem ser restaurados. Mesmo
   assim, faça também os backups de banco descritos adiante.

No painel DNS de quem administra seu domínio, crie:

| Tipo | Nome/host | Valor |
| --- | --- | --- |
| A | `api` | IPv4 do VPS |

Isso fará `api.seudominio.com.br` apontar para o servidor. O campo de nome pode
variar entre fornecedores. Não crie registro `AAAA` sem IPv6 corretamente
configurado. Aguarde a propagação; teste no computador com:

```bash
nslookup api.seudominio.com.br
```

O resultado deve incluir o IPv4 do servidor. O frontend do exemplo usa outro
endereço, `app.seudominio.com.br`, e deve apontar para onde ele estiver
hospedado, não necessariamente para este VPS.

## 3. Ajustes no código antes de publicar

> Faça estes ajustes **no computador**, no projeto. Este documento não os
> aplica por você. Publique-os na `main` antes de configurar o deploy
> automático. Confira o nome da branch no GitHub: neste guia usamos `main`.

### 3.1 Proteja os arquivos usados na construção Docker

O arquivo existente se chama `.dockerIgnore`, mas no Linux o Docker procura
`.dockerignore` com `i` minúsculo. Crie na raiz um arquivo **novo** chamado
`.dockerignore`, com:

```dockerignore
node_modules
dist
.git
.env
.env.*
```

Assim segredos e histórico Git não entram no contexto de build. Não adicione
segredos ao repositório. Verifique com `git status` antes de cada commit.

### 3.2 Configure o endereço permitido do frontend

Em `src/main.ts`, dentro de `app.enableCors`, substitua a origem
`http://localhost:5173` pela origem **exata** do seu frontend publicado:

```ts
app.enableCors({
  origin: 'https://app.seudominio.com.br',
  credentials: true,
});
```

Troque pelo endereço real, sem barra final. `FRONTEND_URL` sozinho **não**
altera o CORS. Para continuar usando o frontend local, você precisará adaptar
e testar as origens permitidas para cada ambiente; não use `*` com credenciais.

O cookie de refresh é `HttpOnly`, `Secure` em produção e `SameSite=Strict`.
O exemplo usa frontend e API no mesmo domínio de site, com HTTPS nos dois.
O frontend deve enviar credenciais nas requisições que usam o cookie, por
exemplo `fetch(..., { credentials: 'include' })` ou a configuração equivalente
do cliente HTTP. Se frontend e API estiverem em sites diferentes, o cookie
`Strict` pode não ser enviado: será preciso revisar a política de cookie,
proteção contra CSRF e restrições dos navegadores antes de publicar.

### 3.3 Entenda o banco antes de começar

Hoje `src/app.module.ts` contém `synchronize: true`. Isso faz o TypeORM
modificar o esquema automaticamente ao iniciar, o que **pode causar perda de
dados**. `src/main.ts` também executa migrations na inicialização; a migration
atual insere tipos de despesas e precisa da tabela já criada.

Para um **banco novo e vazio**, este guia usa `synchronize: true` uma única vez
para criar as tabelas e executar a migration existente. Depois manda trocar para
`false` antes de abrir o acesso público. Não use esse procedimento sobre um
banco com dados existentes. Para migrar dados existentes ou construir uma
baseline de migrations reproduzível, peça ajuda especializada e teste em uma
cópia antes. Com `synchronize: false`, um banco vazio **não** será criado
completamente apenas pela migration atual.

A partir daí, mudanças de entidades precisam de migrations versionadas e
testadas **antes** do deploy. Não volte a ativar `synchronize` para consertar
produção. Não existe neste projeto, atualmente, uma configuração pronta do
TypeORM CLI para gerar migrations; crie e teste esse fluxo antes da primeira
alteração de esquema. Faça backup e ensaio de restauração antes de cada
migration. Migrations destrutivas podem impedir rollback do código.

### 3.4 Envie os ajustes iniciais ao GitHub

Trabalhe em uma branch de desenvolvimento, revise as alterações e crie um pull
request para `main`. Por exemplo, depois de salvar os arquivos:

```bash
git status
git add .dockerignore src/main.ts
git commit -m "Prepare API for production deployment"
git push -u origin NOME_DA_SUA_BRANCH
```

No GitHub, abra o pull request, revise e faça o merge. Não execute esses
comandos se houver alterações que você não deseja incluir. Confirme que a
`main` contém os ajustes. Ainda não configure o workflow: primeiro vamos
preparar e testar o servidor manualmente.

## 4. Prepare o servidor

### 4.1 Conecte por SSH e crie um usuário

No **computador**, conecte-se conforme a instrução do fornecedor. Exemplos de
usuário inicial são `root` ou `ubuntu`; consulte o painel:

```bash
ssh USUARIO_INICIAL@SEU_IP
```

Na primeira conexão, confirme a impressão digital da chave do servidor usando
o painel ou console do fornecedor antes de aceitá-la. Se ela mudar depois,
investigue; não aceite automaticamente.

No **servidor**, crie um usuário de operação chamado `deploy`:

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

Para acessar esse usuário com sua chave de administração, copie a **chave
pública** do seu computador, aquela terminada em `.pub`, para
`/home/deploy/.ssh/authorized_keys`. Uma opção é, no **computador**:

```bash
ssh-copy-id -i ~/.ssh/id_ed25519.pub deploy@SEU_IP
```

Isso pode pedir a senha criada no `adduser`. Se a sua chave tiver outro nome,
ajuste o caminho. Se o fornecedor desabilitou autenticação por senha, o
`ssh-copy-id` pode falhar: na sessão administrativa original, execute
`sudo nano /home/deploy/.ssh/authorized_keys`, cole a linha completa da sua
chave **pública**, salve e ajuste o arquivo com
`sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys` e
`sudo chmod 600 /home/deploy/.ssh/authorized_keys`.

Abra **outro terminal** e teste `ssh deploy@SEU_IP` e `sudo
whoami` antes de sair da sessão original. Guarde a senha de sudo com segurança.

No servidor, instale atualizações e ferramentas:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw openssl
```

### 4.2 Instale o Docker

Em um Ubuntu novo, siga a seção **Install using the apt repository** da
[documentação oficial do Docker para Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
Ela fornece os comandos atuais para configurar a chave, o repositório oficial
e instalar `docker-ce`, `docker-ce-cli`, `containerd.io`,
`docker-buildx-plugin` e `docker-compose-plugin`. Não use scripts de instalação
rápida em produção. Se já houver Docker ou pacotes conflitantes, siga as
instruções oficiais antes de continuar.

Depois, no servidor:

```bash
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo usermod -aG docker deploy
```

Saia e conecte novamente como `deploy`; então confira:

```bash
docker --version
docker compose version
docker info
```

> Quem tem acesso ao grupo `docker` tem, na prática, poderes equivalentes a
> administrador no servidor. A chave de automação criada mais adiante precisa
> ser tratada como uma chave administrativa. Para um ambiente com maior risco,
> use uma solução de deploy com privilégios mais restritos.

### 4.3 Configure o firewall sem perder o SSH

No servidor, **antes de habilitar o UFW**, libere SSH:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Mantenha também o firewall do fornecedor configurado. Docker pode contornar
regras UFW em portas publicadas: neste guia **somente** o Caddy publica 80 e
443. Não publique 3000, 5432, 5050, 8025 ou 1025. Não inicie o
`docker-compose.yml` de desenvolvimento no servidor: ele expõe o banco,
inclui pgAdmin com senha padrão e usa Mailpit e modo de desenvolvimento.

## 5. Permita que o servidor leia o repositório

Usaremos uma chave **separada e somente de leitura** para o servidor buscar
código no GitHub. No servidor, como `deploy`:

```bash
ssh-keygen -t ed25519 -C "servidor-finance-leitura" -f ~/.ssh/github_repo
cat ~/.ssh/github_repo.pub
```

Para uso não interativo, deixe a passphrase dessa chave específica vazia.
Copie somente a linha exibida da chave **pública**. No GitHub, acesse o
repositório → **Settings → Deploy keys → Add deploy key**. Cole a chave,
escolha um título e deixe **Allow write access** desmarcado. Esta chave é
diferente da chave que o Actions usará para entrar no servidor.

No servidor, cadastre a identidade do GitHub e verifique a impressão digital
pelos [dados oficiais de chaves SSH do GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints):

```bash
ssh-keyscan -t ed25519 github.com > ~/.ssh/github_known_hosts
ssh-keygen -lf ~/.ssh/github_known_hosts
chmod 600 ~/.ssh/github_known_hosts
```

Compare o resultado com a impressão digital Ed25519 publicada pelo GitHub. Se
não corresponder, pare e investigue; `ssh-keyscan` sozinho não autentica a
identidade.

Crie `~/.ssh/config` no servidor com `nano ~/.ssh/config`:

```sshconfig
Host github.com
    HostName github.com
    User git
    IdentityFile ~/.ssh/github_repo
    IdentitiesOnly yes
    UserKnownHostsFile ~/.ssh/github_known_hosts
    StrictHostKeyChecking yes
```

Salve no nano com `Ctrl+O`, Enter e `Ctrl+X`, e execute:

```bash
chmod 600 ~/.ssh/config
ssh -T git@github.com
```

Uma mensagem de autenticação bem-sucedida que informa que o GitHub não oferece
acesso shell é esperada; esse teste pode terminar com código 1. Se houver erro
de chave ou de identidade, resolva antes de continuar.

Clone a branch `main` no servidor:

```bash
mkdir -p ~/finance
git clone --branch main git@github.com:LucaSansa/finance-developer-pj-api.git ~/finance/app
mkdir -p ~/finance/producao
chmod 700 ~/finance/producao
```

Se seu repositório for outro, substitua a URL. A pasta `app` é código; a pasta
`producao` contém configuração privada e fica **fora** do repositório.

## 6. Configure banco, e-mail e HTTPS

### 6.1 Crie segredos e o arquivo de ambiente

No servidor, gere três valores aleatórios independentes:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Use um para a senha do banco e os outros dois para os segredos JWT. Guarde-os
com segurança. Crie `~/finance/producao/.env` com `nano` e substitua **todos**
os valores de exemplo:

```env
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://app.seudominio.com.br

POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=finance
POSTGRES_PASSWORD=SUBSTITUA_PELA_SENHA_ALEATORIA_DO_BANCO
POSTGRES_DB=finance_developer_pj

JWT_ACCESS_SECRET=SUBSTITUA_PELO_PRIMEIRO_SEGREDO_ALEATORIO
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_SECRET=SUBSTITUA_PELO_SEGUNDO_SEGREDO_ALEATORIO
JWT_REFRESH_EXPIRES_IN=1d

MAIL_HOST=SMTP_DO_SEU_PROVEDOR
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=USUARIO_SMTP
MAIL_PASSWORD=SENHA_SMTP
MAIL_FROM=no-reply@seudominio.com.br
```

Se o provedor SMTP fornecer uma senha com caracteres especiais como `$` ou
`#`, escreva o valor entre aspas simples no `.env`, por exemplo
`MAIL_PASSWORD='senha$exemplo#'`; não use literalmente essa senha. Consulte a
[sintaxe de arquivos de ambiente do Compose](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/#env-file-syntax)
se o valor contiver aspas ou outras particularidades.

```bash
chmod 600 ~/finance/producao/.env
```

No Docker, `db` é o nome do serviço PostgreSQL, não `localhost`. O PostgreSQL
usa usuário, senha e nome do banco **apenas na primeira inicialização de um
volume vazio**. Mudar essas variáveis depois não altera automaticamente o
banco existente. Para alterar a senha, faça também a alteração no PostgreSQL
com um procedimento apropriado e coordenado.

Para e-mail, contrate ou configure um provedor SMTP transacional, verifique o
domínio remetente e configure os registros DNS exigidos pelo fornecedor, como
SPF e DKIM. Copie os dados SMTP reais do painel. A porta 587 normalmente usa
`MAIL_SECURE=false` e STARTTLS; para TLS implícito na porta 465 use
`MAIL_SECURE=true`, conforme as instruções do provedor. A porta 25 pode ser
bloqueada pelo VPS. Mailpit só captura mensagens de desenvolvimento e não
envia e-mails reais. `FRONTEND_URL` deve apontar para o frontend real, que
precisa implementar `/confirmar-email`, `/reset-password` e
`/confirmar-troca-email`. Sem frontend, os links enviados não completarão
esses fluxos.

### 6.2 Crie o Compose de produção

No servidor, crie `~/finance/producao/compose.yaml`:

```yaml
services:
  db:
    image: postgres:15
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U \"$${POSTGRES_USER}\" -d \"$${POSTGRES_DB}\""]
      interval: 5s
      timeout: 5s
      retries: 12

  api:
    build:
      context: ../app
    restart: unless-stopped
    env_file: .env
    command: ["npm", "run", "start:prod"]
    depends_on:
      db:
        condition: service_healthy

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      - api

volumes:
  postgres_data:
  caddy_data:
  caddy_config:
```

Esse arquivo é separado do Compose local. Não há porta publicada para o banco
ou para a API; o Caddy comunica-se com a API pela rede interna. O Dockerfile
atual instala dependências e compila a aplicação; o comando acima substitui o
modo de desenvolvimento do Dockerfile por `start:prod`.

Crie `~/finance/producao/Caddyfile`, trocando o domínio:

```caddyfile
api.seudominio.com.br {
    reverse_proxy api:3000
}
```

Na pasta de produção, confira a sintaxe sem mostrar senhas na tela:

```bash
cd ~/finance/producao
docker compose config --quiet
```

Em caso de erro, confira os arquivos e valores. Não publique a saída completa
de `docker compose config`: ela pode revelar senhas.

## 7. Inicialize o banco vazio e desligue a sincronização

> Execute esta seção apenas com um banco novo e vazio. Mantenha o Caddy parado
> e não cadastre usuários reais até concluir a seção e testar um backup.

No servidor:

```bash
cd ~/finance/producao
docker compose up -d --build db api
docker compose ps
docker compose logs --tail=100 api
```

Aguarde a API iniciar. Procure nos logs mensagens de inicialização e erros de
conexão ou migration. Confira que as tabelas e a migration foram criadas:

```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT * FROM migrations;"'
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM expense_type;"'
```

Deve existir a tabela `expense_type`, uma linha para a migration
`AddDefaultExpenseType1765994220255` e 17 tipos de despesa em um banco novo.
Se isso não acontecer, pare: verifique os logs. Não apague o volume como forma
de resolver um problema sem antes entender suas consequências.

Agora, **no computador**, altere em `src/app.module.ts`:

```ts
synchronize: false,
```

Faça commit, push e merge dessa mudança na `main`, como na seção 3.4. Antes de
continuar, confirme no GitHub que a `main` já contém `synchronize: false`.
Então, no servidor:

```bash
cd ~/finance/app
git fetch origin main
git checkout --detach origin/main
cd ~/finance/producao
docker compose up -d --build api
docker compose ps
docker compose logs --tail=100 api
```

Confira novamente as tabelas, a migration e os 17 tipos. A API deve continuar
iniciando sem sincronização. Se falhar, não exponha a API; corrija e teste.
Mantenha o servidor e o volume: a migration atual não recria as tabelas em
outro banco vazio. Veja a seção de backup e restauração.

## 8. Ative HTTPS e teste a API

Depois que o DNS apontar para o VPS e as portas 80 e 443 estiverem abertas:

```bash
cd ~/finance/producao
docker compose up -d caddy
docker compose ps
docker compose logs --tail=100 caddy
```

O Caddy solicita e renova o certificado automaticamente. Os volumes dele
guardam os dados necessários para isso. No computador:

```bash
curl -i https://api.seudominio.com.br/
```

Este projeto não define uma rota `GET /`, portanto **404 é esperado**; isso
mostra apenas que o HTTPS chegou a uma aplicação HTTP, não que todas as funções
e o banco estão saudáveis. Erro de certificado, timeout ou 502 não é sucesso.
O Swagger `/docs` está disponível apenas com `NODE_ENV=development`; não
ative esse modo em produção apenas para vê-lo.

Teste também com um frontend de teste ou cliente HTTP:

1. Cadastre uma conta de teste em `POST /users`, com CNPJ válido, e-mail que
   você controla e senha que atenda às validações. Não use dados reais de
   terceiros sem necessidade.
2. Confira o recebimento do e-mail e complete a confirmação no frontend.
3. Faça login em `POST /auth/login`, teste uma rota protegida como
   `GET /users/me`, renovação em `POST /auth/refresh` e logout.
4. Teste recuperação de senha e troca de e-mail. Confirme que o navegador envia
   o cookie e não apresenta erro de CORS na aba Network do DevTools.
5. Reinicie a API e verifique se os dados de teste continuam disponíveis:

   ```bash
   cd ~/finance/producao
   docker compose restart api
   docker compose logs --tail=100 api
   ```

Um cadastro pode ser gravado mesmo se o envio de e-mail falhar. Nesse caso,
após corrigir SMTP, use a funcionalidade de reenvio de confirmação em vez de
assumir que a conta não existe.

## 9. Backups: faça antes de aceitar dados reais

Um volume Docker **não é backup**: se o VPS ou o disco falhar, os dados podem
ser perdidos. Configure cópias automáticas, criptografadas e externas ao VPS,
com retenção, monitoramento e testes de restauração. O exemplo abaixo cria
apenas uma cópia local; envie-a com segurança para armazenamento externo
privado. Dados financeiros e pessoais exigem controle de acesso e cuidados
legais adequados.

No servidor:

```bash
mkdir -p ~/finance/backups
chmod 700 ~/finance/backups
cd ~/finance/producao
umask 077
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > ~/finance/backups/finance-$(date +%Y%m%d-%H%M%S).dump
```

Confira o código de saída: se o comando falhar, o arquivo pode estar vazio ou
incompleto e não é um backup válido. Liste e verifique um arquivo específico,
substituindo o nome:

```bash
ls -lh ~/finance/backups
docker compose exec -T db pg_restore -l < ~/finance/backups/NOME_DO_BACKUP.dump
```

Para testar restauração, use **outro servidor ou outro banco vazio isolado**,
nunca o banco de produção. Por exemplo, em uma instância PostgreSQL 15 de teste
previamente criada, com banco vazio e credenciais próprias, copie o dump de
forma segura e execute `pg_restore --no-owner --no-acl -U USUARIO_TESTE -d
BANCO_TESTE NOME_DO_BACKUP.dump`. Confira tabelas, migration, contagem e dados
esperados. Um dump contém dados sensíveis: proteja e remova cópias de teste
conforme sua política. A restauração real deve usar um banco vazio, considerar
papéis/extensões e ser ensaiada; **não restaure por cima da produção ativa**.

Automatize a geração e cópia externa usando o sistema de backup do fornecedor
ou uma solução apropriada; esta configuração não cria agendamento por si só.
Defina frequência, retenção e alertas de falha. Faça backup antes de atualizar
o esquema ou de qualquer operação de recuperação. Não publique o serviço para
usuários reais até ter pelo menos uma restauração de teste bem-sucedida.

## 10. Configure o deploy automático pelo GitHub

**Como funciona:** um push ou merge na `main` inicia o workflow. Uma branch
como `develop` ou uma feature branch **não** publica por si só; a publicação
acontece quando suas alterações chegam à `main`. A atualização reconstrói a
imagem e reinicia a API. Pode haver uma breve indisponibilidade. Não há rollback
automático de banco.

### 10.1 Crie a chave de acesso do Actions ao servidor

No **computador**, crie uma chave dedicada, sem passphrase, para o Actions
(não reutilize sua chave pessoal e não use a chave de leitura do repositório):

```bash
ssh-keygen -t ed25519 -C "github-actions-finance" -f ~/.ssh/finance_actions
```

Instale a chave pública no servidor:

```bash
ssh-copy-id -i ~/.ssh/finance_actions.pub deploy@SEU_IP
ssh -i ~/.ssh/finance_actions deploy@SEU_IP
```

Teste a conexão. A chave privada `~/.ssh/finance_actions` dará ao Actions
acesso ao usuário `deploy`, que tem poder administrativo pelo Docker. Guarde-a
com segurança e nunca a adicione ao Git.

No **servidor**, descubra a impressão digital SSH:

```bash
sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

No **computador**, obtenha uma entrada `known_hosts` e compare sua impressão
digital com a do servidor por um canal confiável, como o console do fornecedor:

```bash
ssh-keyscan -t ed25519 SEU_IP > ~/.ssh/finance_servidor_known_hosts
ssh-keygen -lf ~/.ssh/finance_servidor_known_hosts
```

Se forem diferentes, pare e investigue. O valor para `SSH_KNOWN_HOSTS` será o
conteúdo do arquivo `~/.ssh/finance_servidor_known_hosts`, e não somente a
impressão digital. Se usar hostname em vez de IP no secret, obtenha e verifique
a entrada para esse hostname.

### 10.2 Adicione os secrets no GitHub

No repositório GitHub: **Settings → Secrets and variables → Actions → New
repository secret**. Cadastre:

| Nome | Valor |
| --- | --- |
| `SSH_HOST` | IPv4 do VPS, sem `https://` |
| `SSH_USER` | `deploy` |
| `SSH_PRIVATE_KEY` | Conteúdo completo da chave **privada** `~/.ssh/finance_actions`, incluindo linhas BEGIN e END |
| `SSH_KNOWN_HOSTS` | Conteúdo da entrada verificada de `~/.ssh/finance_servidor_known_hosts` |

Não imprima a chave privada em logs públicos nem cole em arquivos versionados.
O Actions precisa alcançar a porta 22; avalie a exposição com cuidado. Proteja
a `main` com regras de branch, revisão de pull requests e permissão de escrita
apenas a pessoas confiáveis. Quem puder alterar o workflow ou código executado
em `main` pode comprometer o servidor ou acessar dados e secrets. Habilite 2FA
e monitore os acessos.

### 10.3 Crie o workflow

No **computador**, crie `.github/workflows/deploy.yml` no repositório:

```yaml
name: Deploy producao

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: deploy-producao
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Conectar e atualizar servidor
        env:
          SSH_HOST: ${{ secrets.SSH_HOST }}
          SSH_USER: ${{ secrets.SSH_USER }}
          SSH_PRIVATE_KEY: ${{ secrets.SSH_PRIVATE_KEY }}
          SSH_KNOWN_HOSTS: ${{ secrets.SSH_KNOWN_HOSTS }}
        run: |
          set -eu
          install -d -m 700 ~/.ssh
          printf '%s\n' "$SSH_PRIVATE_KEY" > ~/.ssh/deploy_key
          printf '%s\n' "$SSH_KNOWN_HOSTS" > ~/.ssh/known_hosts
          chmod 600 ~/.ssh/deploy_key ~/.ssh/known_hosts
          ssh -i ~/.ssh/deploy_key -o IdentitiesOnly=yes -o StrictHostKeyChecking=yes "$SSH_USER@$SSH_HOST" 'bash -s' <<'REMOTE'
          set -eu
          cd ~/finance/app
          git fetch origin main
          git checkout --detach origin/main
          cd ~/finance/producao
          docker compose up -d --build api
          for tentativa in $(seq 1 30); do
            if docker compose exec -T api node -e 'require("http").get("http://127.0.0.1:3000/", r => { r.resume(); process.exit(r.statusCode === 404 ? 0 : 1); }).on("error", () => process.exit(1))'; then
              echo "API respondeu; confira os testes funcionais."
              exit 0
            fi
            sleep 2
          done
          echo "A API nao respondeu como esperado; verifique os logs." >&2
          exit 1
          REMOTE
```

O workflow busca a `main` **mais recente no momento do deploy**, não
necessariamente o commit que disparou aquela execução. A concorrência impede
dois deploys automáticos simultâneos; evite fazer deploy manual ao mesmo tempo.
Essa verificação de HTTP é superficial: ela não substitui testes de login,
e-mail, banco ou monitoramento. Se a atualização falhar, ela pode deixar a API
indisponível; não existe rollback automático. Para acionar manualmente, abra
**Actions → Deploy producao → Run workflow** na `main`.

Faça commit desse arquivo em uma branch e abra um pull request. Depois do
merge na `main`, abra a aba **Actions**, selecione a execução e acompanhe os
logs. Um ícone verde indica que o comando e a verificação simples passaram;
confira também a URL HTTPS e os testes funcionais. Um ícone vermelho significa
que é preciso ler a etapa com erro. A execução de workflows precisa estar
habilitada nas configurações do repositório.

## 11. Operação do dia a dia

No servidor, sempre comece com:

```bash
cd ~/finance/producao
```

| Objetivo | Comando |
| --- | --- |
| Ver containers | `docker compose ps` |
| Ver logs recentes da API | `docker compose logs --tail=100 api` |
| Acompanhar logs da API | `docker compose logs -f api` (saia com `Ctrl+C`) |
| Ver logs do proxy | `docker compose logs --tail=100 caddy` |
| Ver logs do banco | `docker compose logs --tail=100 db` |
| Reiniciar API | `docker compose restart api` |
| Ver espaço em disco | `df -h` |

Logs podem conter informações pessoais; não os compartilhe sem revisar. Configure
monitoramento externo de disponibilidade, espaço em disco, certificados,
backups e consumo de recursos. Planeje atualizações de segurança do Ubuntu,
Docker e imagens; teste-as primeiro. `postgres:15` e `caddy:2` são tags móveis,
portanto novas imagens podem trazer mudanças; controle e teste versões antes
de atualizar, especialmente antes de migrar a versão principal do PostgreSQL.

### Atualização manual, se o Actions falhar

Depois de corrigir a causa e confirmar que nenhuma execução automática está em
andamento, no servidor:

```bash
cd ~/finance/app
git fetch origin main
git checkout --detach origin/main
cd ~/finance/producao
docker compose up -d --build api
docker compose ps
docker compose logs --tail=100 api
```

Teste a URL e os fluxos importantes. Este comando não reverte migrations nem
restaura dados.

### Se uma atualização quebrar

1. Pare novas publicações e leia os logs e a execução no Actions.
2. Identifique se houve migration ou alteração de dados. **Voltar o código não
   desfaz alterações no banco.** Não execute rollback ou restauração às cegas.
3. Corrija por um novo commit e faça merge na `main`; para um incidente
   complexo, envolva alguém com experiência e use o backup testado conforme o
   plano de recuperação. Reverter código só é seguro se ele for compatível
   com o esquema atual.

### Problemas comuns

| Sintoma | O que conferir |
| --- | --- |
| SSH não conecta | IP, porta 22 no firewall do fornecedor e UFW, usuário e chave pública autorizada. |
| Actions não consegue entrar | Secrets, chave correspondente em `authorized_keys`, identidade verificada e acesso à porta 22. |
| Servidor não busca o GitHub | Deploy key de leitura, URL do repositório e identidade do GitHub verificada. |
| HTTPS não funciona | DNS correto, portas 80/443, logs do Caddy e eventual proxy DNS do fornecedor. |
| Erro 502 | API não iniciou ou falhou; veja `docker compose ps` e logs da API e do banco. |
| API não conecta ao banco | `POSTGRES_HOST=db`, variáveis, saúde do banco e credenciais originais do volume. |
| Migration/tabela não existe | Confira a inicialização do banco vazio; não ative sincronização em banco com dados. |
| Não chega e-mail | Credenciais SMTP, porta, DNS e domínio remetente verificado; confira logs sem expor senhas. |
| Login funciona, refresh falha | HTTPS, `SameSite`, mesmo site e envio de credenciais pelo frontend. |
| Erro de CORS | Origem exata configurada em `src/main.ts`; `FRONTEND_URL` não altera CORS. |
| `/docs` retorna 404 | É esperado em produção neste projeto. |

## 12. Checklist final

- [ ] Domínio correto, HTTPS válido e somente portas necessárias abertas.
- [ ] `.dockerignore` correto e nenhum segredo no Git ou na imagem.
- [ ] Banco não publicado na internet; sem pgAdmin ou Mailpit de desenvolvimento.
- [ ] Banco inicializado sem dados reais e `synchronize: false` na `main`.
- [ ] Plano de migrations para futuras alterações e backup externo automatizado.
- [ ] Restauração testada em ambiente isolado.
- [ ] SMTP real, frontend e fluxos de confirmação/recuperação testados.
- [ ] CORS, cookies, login, refresh e logout testados no navegador.
- [ ] Chaves distintas, secrets protegidos, 2FA e proteção da `main`.
- [ ] Deploy automático testado, logs e monitoramento configurados.

### Referências oficiais

- [Instalação do Docker no Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [HTTPS automático do Caddy](https://caddyserver.com/docs/automatic-https)
- [Secrets do GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
- [Migrations do TypeORM](https://typeorm.io/docs/advanced-topics/migrations/)
- [Backup e restauração do PostgreSQL](https://www.postgresql.org/docs/15/backup-dump.html)
