# Guia de deploy da API na AWS Free Tier

Este guia explica, passo a passo, como publicar esta API em um servidor e
configurar atualizações automáticas quando houver um novo commit na branch
`main`. Ele foi escrito para quem está começando e não pressupõe experiência
com servidores.

> **Antes de começar:** leia o guia inteiro, principalmente as partes sobre o
> banco de dados e os avisos de segurança. Este guia configura um ambiente
> experimental: o Free Tier é temporário e pode encerrar o servidor e seus
> dados. Não use dados reais antes de testar backups e planejar a continuidade.

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
2. Um servidor virtual (**VPS**) com Ubuntu Server 24.04 LTS ou 26.04 LTS e
   endereço IPv4 público.
3. Um endereço público para a API: o DNS público do EC2 para testes, ou um
   domínio próprio com acesso à configuração de DNS.
4. Um serviço de e-mail transacional com SMTP e remetente verificado.
5. Um computador com Git e SSH. Os comandos locais abaixo usam Linux ou macOS;
   no Windows, use WSL com Ubuntu ou adapte ao seu terminal.
6. Para testar os fluxos completos pelo navegador, um frontend publicado em
   HTTPS. Ele não é necessário para verificar DNS ou iniciar a API.

**Custos:** o Free Tier não inclui automaticamente domínio e todos os
serviços. Consulte as condições da sua conta, de cada recurso e do plano
antes de criar ou contratar qualquer coisa, como explicado na seção 2.

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

Vamos usar a **Amazon Web Services (AWS)** e o serviço **Amazon EC2**. EC2 é
um servidor virtual: nele instalaremos Docker e executaremos a API e o banco.
Não contrate Lightsail nem RDS para seguir este exemplo.

### Entenda o Free Tier antes de abrir a conta

As regras abaixo foram consultadas em **10/11/2026** e podem mudar. Consulte
o [Free Tier oficial](https://aws.amazon.com/free/) e as condições da sua conta.

- Para novos clientes que criaram a conta em ou após 15/07/2025, a AWS informa
  US$ 100 em créditos iniciais e até US$ 100 adicionais por atividades
  qualificadas. Esses valores são **créditos de uso elegível**, não dinheiro
  disponível para saque e não garantem seis meses de execução.
- No **Free plan**, a AWS informa que não há cobrança enquanto você permanece
  no plano gratuito, mas o plano termina ao acabar o crédito ou após seis
  meses, o que ocorrer primeiro. A conta é fechada e o acesso aos recursos
  interrompido. A AWS informa retenção por 90 dias antes da exclusão definitiva;
  confira as regras vigentes e planeje recuperar ou migrar seus dados **antes**
  do vencimento. O acesso a alguns recursos pode ser limitado.
- No **Paid plan**, podem existir créditos elegíveis, mas valores não cobertos
  podem gerar cobrança. Contas antigas seguem regras diferentes. Não presuma
  que uma conta já existente tem créditos ou que `Free tier eligible`
  signifique uso ilimitado. Alguns produtos ou ações podem exigir o plano pago
  ou resultar em alteração de plano: confira a tela antes de confirmar.
- EC2, disco EBS, IPv4 público, tráfego, snapshots e outros serviços podem
  consumir créditos ou gerar custos conforme o plano. A AWS cobra por IPv4
  público, inclusive Elastic IP sem uso. Domínio próprio e serviço de SMTP
  podem ser pagos e não são automaticamente oferecidos gratuitamente.

Leia também [planos Free e Paid](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)
e [regras do EC2 Free Tier](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html).
**Este guia não garante custo zero nem disponibilidade permanente.** Antes de
escolher o plano pago, veja o custo projetado e decida se aceita a cobrança.

Vamos criar **uma instância EC2**, que é o computador virtual onde rodarão
Docker, API e PostgreSQL. Neste exemplo não criaremos um banco RDS separado.
Os nomes das telas podem mudar e aparecer em inglês ou português.

### 2.1 Crie a conta e entenda a cobrança

1. Acesse [aws.amazon.com/free](https://aws.amazon.com/free/), escolha criar
   uma conta e siga o cadastro. A AWS pode solicitar cartão, dados de
   faturamento e confirmação de identidade. Se aparecer a escolha de plano,
   selecione **Free plan**, leia o prazo e as limitações e confirme apenas se
   concordar. Se você já tem conta, entre nela e confira seu plano e
   elegibilidade no Billing: não suponha que poderá criar uma nova conta grátis.
   Espere a ativação antes de criar a instância.
2. Proteja a conta com uma senha única e **MFA** (autenticação em dois
   fatores). Use o usuário raiz apenas para as tarefas que o exigem; para o
   dia a dia, configure acesso administrativo adequado conforme as
   [orientações de segurança da AWS](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html).
   Ative também o 2FA no GitHub.
3. Antes de contratar, consulte o preço **na região escolhida** para instância
   EC2 sob demanda, armazenamento EBS, IPv4 público, tráfego, snapshots e
   eventuais serviços extras. Consulte também domínio e SMTP, que podem ser
   cobrados por outros fornecedores. Preços, impostos e elegibilidade a
   créditos ou oferta gratuita variam: não suponha que o projeto será grátis.
   Use a [calculadora de preços da AWS](https://calculator.aws/) e confira o
   orçamento antes de clicar em criar.
4. No console AWS, abra **Billing and Cost Management** e procure **Free Tier**
   e **Credits**. Anote o plano, saldo, validade e uso elegível exibidos. Volte
   a essas páginas regularmente: os valores não são atualizados em tempo real.
   Crie um lembrete para verificar antes dos seis meses e antes de o crédito
   acabar. Depois pesquise
   **Budgets**. Escolha **Create budget**, crie um orçamento mensal de custo
   e informe um limite e um e-mail para alertas. Verifique a confirmação
   solicitada pela AWS, se houver. **O alerta não limita a cobrança nem desliga
   o servidor automaticamente**; valores podem demorar a aparecer. Acompanhe
   também a página de custos.

### 2.2 Abra a criação do servidor

1. Entre no [console da AWS](https://console.aws.amazon.com/).
2. No canto superior, escolha uma **região**. Uma região próxima dos usuários
   pode reduzir a latência, mas pode ter preço diferente. Por exemplo,
   **São Paulo (`sa-east-1`)** é uma opção; confira preços e disponibilidade
   antes de escolher. Anote a região e permaneça nela ao procurar seus recursos:
   uma instância criada em outra região não aparece na lista atual.
3. Na caixa de pesquisa superior, digite `EC2` e abra **EC2**.
4. No menu lateral, abra **Instances / Instâncias** e clique em
   **Launch instances / Executar instâncias**.

### 2.3 Preencha a tela de criação

Preencha os campos abaixo. Não clique em **Launch instance** até conferir
também rede, armazenamento e custo.

1. **Name and tags / Nome:** digite `finance-api`. Esse nome é apenas uma
   etiqueta para você encontrar o servidor no painel.
2. **Application and OS Images / Imagem:** escolha **Ubuntu** e procure uma
   imagem oficial **Ubuntu Server 24.04 LTS** ou **26.04 LTS**, publicada pela
   Canonical, com arquitetura **64-bit (x86)**. Confira o nome da imagem e o
   fornecedor antes de selecionar; não escolha uma imagem paga de terceiros
   por engano.
3. **Instance type / Tipo de instância:** como ponto de partida para um
   experimento pequeno, procure `t3.small`, que tem 2 GiB de memória, e
   confira se o console marca o tipo como **Free tier eligible** para a sua
   conta e região. Para contas criadas a partir de 15/07/2025, a documentação
   lista esse tipo entre os elegíveis; contas anteriores têm regras diferentes.
   Se não estiver disponível ou elegível, pare e avalie custo e alternativas.
   A família `t3` tem créditos de CPU e, dependendo do modo e do uso, pode
   gerar cobranças adicionais. Esse tamanho não garante desempenho: a
   compilação Docker e o banco compartilham memória e disco. Se necessário,
   aumente o tamanho conforme a documentação AWS.
4. **Key pair / Par de chaves:** clique em **Create new key pair / Criar novo
   par de chaves**. Dê o nome `finance-aws`, escolha tipo `RSA` e formato
   `.pem` para usar SSH no Linux, macOS ou WSL. Confirme e salve o arquivo
   `finance-aws.pem` baixado **no seu computador**. Ele é a chave privada:
   não o envie ao GitHub nem compartilhe com outras pessoas. Se perdê-lo,
   não é possível baixar o mesmo arquivo novamente; será necessário um
   procedimento de recuperação de acesso. Não escolha continuar sem chave.

### 2.4 Configure rede e portas

Na mesma tela de criação:

1. Em **Network settings / Configurações de rede**, clique em **Edit / Editar**.
   Escolha a VPC padrão e uma subnet pública com rota de saída para um
   *Internet Gateway*. Se sua conta não tiver VPC/subnet padrão ou você não
   souber se a subnet é pública, consulte a documentação da AWS ou peça ajuda
   antes de continuar. Habilite **Auto-assign public IP / Atribuir IP público
   automaticamente**.
2. Crie um **security group / grupo de segurança** novo, por exemplo
   `finance-api-sg`. Ele funciona como um porteiro que decide quais conexões
   externas entram no servidor. Configure as regras de **entrada**:

   | Tipo | Porta TCP | Origem | Para quê |
   | --- | --- | --- | --- |
   | SSH | `22` | Seu IPv4 público seguido de `/32` | Acesso administrativo da sua conexão |
   | HTTP | `80` | `0.0.0.0/0` | Emissão do certificado e redirecionamento para HTTPS |
   | HTTPS | `443` | `0.0.0.0/0` | Acesso público seguro à API |

   Para preencher a origem SSH, no terminal do **seu computador**, execute:

   ```bash
   curl -4 https://checkip.amazonaws.com
   ```

   O resultado é o IPv4 público da sua conexão, por exemplo `123.45.67.89`.
   Na regra SSH, escolha **Personalizado / Custom** como tipo de origem e
   digite o endereço retornado seguido de `/32`, por exemplo
   `123.45.67.89/32`. Substitua o exemplo pelo seu endereço real.

   A opção **My IP / Meu IP** pode identificar um endereço IPv6 em vez do
   IPv4, dependendo da sua conexão. Como este guia acessa a instância pelo
   IPv4 público, confira a origem gerada: se ela for IPv6, remova-a e use o
   IPv4 com `/32` conforme explicado acima. Em IPv4, `/32` limita a regra a
   um endereço; em IPv6, `/32` representa uma faixa ampla, não um único
   endereço.

   `0.0.0.0/0` significa qualquer endereço IPv4. Para SSH, **não** selecione
   essa origem na configuração inicial. Se mudar de rede ou seu IPv4 mudar,
   repita o comando e atualize a origem SSH no grupo de segurança. Essa regra
   é adicional ao firewall do próprio Ubuntu, configurado depois.
3. Não crie regras de entrada para `3000`, `5432`, `5050`, `1025` ou `8025`.
   Mantenha a saída necessária para acessar GitHub, baixar imagens, obter
   certificados e enviar SMTP; o padrão costuma permitir saída. Não associe
   privilégios AWS extras à instância sem necessidade.

> **Importante para o deploy automático:** na seção 10, o GitHub Actions
> hospedado pelo GitHub precisará entrar por SSH. Seus IPs de saída variam,
> então somente o IPv4 da sua conexão não basta. A seção 10 explica esse
> impasse; não abra
> a porta 22 para todo o mundo sem compreender e aceitar o risco.

### 2.5 Configure o disco e crie

1. Em **Configure storage / Configurar armazenamento**, localize o volume
   raiz, que é o disco principal do servidor. Altere o tamanho de `8` para
   **20 GiB** e mantenha o tipo **gp3**. Não clique em **Adicionar novo
   volume**; um volume é suficiente para começar.
2. Clique em **Avançado** no canto da seção de armazenamento e confira os
   campos do volume raiz:

   - **Criptografado:** escolha **Criptografado**. Em **Chave do KMS**,
     selecione a chave padrão da AWS, geralmente `aws/ebs`, se disponível.
     Se não encontrar essa opção, confira as alternativas e seus custos antes
     de continuar.
   - **IOPS:** mantenha `3000`.
   - **Taxa de transferência:** mantenha `125`.
   - **Taxa de inicialização de volume:** deixe em branco; preencher esse
     campo pode gerar cobranças adicionais.
   - **Excluir no encerramento:** se estiver **Sim**, encerrar definitivamente
     a instância poderá apagar o volume raiz e seus dados. **Não** preserva
     esse volume após o encerramento, mas ele pode continuar consumindo
     créditos ou gerando custos. Escolha conscientemente; o volume preservado
     não substitui um backup separado.

   Em **Sistemas de arquivos**, mantenha **Nenhum**. Não é necessário
   adicionar S3, EFS ou FSx para este exemplo.
3. Confira se o volume aparece como criptografado, com **20 GiB** e tipo
   **gp3**. Mesmo que o console indique que o tipo é qualificado para o nível
   gratuito, isso não garante custo zero: confira os limites, créditos e
   elegibilidade da sua conta. Aumente o espaço conforme o uso e o preço;
   20 GiB não garante capacidade suficiente.
4. Se aparecer uma mensagem de que a instância não permite volumes de
   **armazenamento de instâncias** da AMI, ela se refere a outro tipo de
   armazenamento; o volume EBS `gp3` configurado acima continua sendo o disco
   raiz.
5. Não altere outras opções avançadas sem entender seus efeitos. Em particular,
   não cole senhas ou chaves em **User data / Dados do usuário**.
6. Revise imagem, tipo, chave, rede, regras e armazenamento. Depois de
   conferir os custos, clique em **Launch instance / Executar instância**.
7. Volte a **Instances**, selecione `finance-api` e espere o estado
   **Running / Em execução** e as verificações de estado passarem. Isso pode
   levar alguns minutos. Anote o **Instance ID**, como `i-...`.

O disco EBS não é um backup independente. Conforme a configuração, o volume
raiz pode ser apagado ao **terminar** a instância. Não clique em
**Terminate / Encerrar** pensando que isso é apenas desligar o servidor.

### 2.6 Reserve um IPv4 fixo

O IPv4 público atribuído automaticamente à instância pode mudar após
pará-la e iniciá-la. Para manter o DNS apontando para o mesmo endereço, vamos
associar um **Elastic IP**. **A AWS cobra por IPv4 público, inclusive por
Elastic IP alocado e sem uso**; confira o preço antes de prosseguir.

No console EC2, na mesma região da instância:

1. No menu lateral, vá em **Network & Security / Rede e segurança → Elastic
   IPs / IPs elásticos**.
2. Clique em **Allocate Elastic IP address / Alocar endereço IP elástico**.
   Use o pool de endereços da Amazon e a mesma região/grupo de rede da instância.
   Confirme em **Allocate**.
3. Selecione o IP criado e escolha **Actions → Associate Elastic IP address**.
   Em **Resource type**, escolha **Instance**; em **Instance**, escolha
   `finance-api` pelo ID anotado. Confirme em **Associate**.
4. Volte aos detalhes da instância e anote o novo **Public IPv4 address**.
   Esse será `SEU_IP` nos comandos do guia. Ao associar o Elastic IP, o IPv4
   automático anterior é substituído; use somente o novo.

Se decidir desistir, desassociar o IP não encerra a cobrança: é preciso
**liberá-lo** no painel. Mais detalhes estão na
[documentação de Elastic IP da AWS](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/working-with-eips.html).

### 2.7 Domínio e DNS

**Você não precisa comprar um domínio para começar.** Escolha uma das opções:

#### Opção A — Testar com o DNS público do EC2

1. No console AWS, entre em **EC2 → Instâncias**, selecione `finance-api` e
   abra **Detalhes**.
2. Copie o valor de **DNS pública / Public DNS (IPv4)**. Ele se parece com
   `ec2-12-34-56-78.us-east-2.compute.amazonaws.com`. Não copie o **DNS
   privado**. Esse nome é fornecido pela AWS; não é um domínio registrado em
   seu nome.
3. No **computador**, abra o terminal e execute o comando abaixo, trocando o
   exemplo pelo DNS copiado, sem `https://`:

   ```bash
   nslookup ec2-12-34-56-78.us-east-2.compute.amazonaws.com
   ```

4. Na resposta, procure o **Address** associado ao nome consultado. Ele deve
   corresponder ao **Endereço IPv4 público** da instância mostrado pela AWS.
   O primeiro `Address` da saída pode ser o endereço do seu servidor DNS,
   como `127.0.0.53`; esse não é o endereço da instância.

Esse teste verifica somente se o nome é traduzido para o endereço correto.
Ainda não verifica a API, a porta 443 ou o certificado HTTPS: esses testes
serão feitos na seção 8, depois que os serviços estiverem rodando. Se
`nslookup` não estiver instalado, use `dig +short SEU_DNS_PUBLICO` ou instale
uma ferramenta de consulta DNS.

Se o campo de DNS público estiver vazio, confira se a instância tem IPv4
público e se as opções de DNS da VPC estão habilitadas; consulte a
[documentação da AWS](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-dns-viewing.html).
Quando um Elastic IP é associado, o DNS público pode mudar: copie novamente
o valor exibido após a associação e use esse nome nas próximas seções.

Anote esse nome como **SEU_DNS_PUBLICO**. Nas seções 6 e 8, siga as instruções
de teste sem domínio. HTTPS com esse nome depende da emissão de um certificado
por uma autoridade certificadora; se não funcionar, siga a alternativa de
túnel SSH na seção 8. Não coloque dados reais em um teste sem HTTPS válido.

#### Opção B — Usar um domínio próprio

Se você quiser usar um domínio próprio, registre um com um fornecedor de sua escolha
e verifique o preço de compra e renovação. Não é obrigatório comprar o domínio
ou hospedar o DNS na AWS. No painel do fornecedor que **administra o DNS**
do domínio, procure **DNS**, **Zona DNS** ou **Gerenciar registros** e crie:

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

Por exemplo, se o domínio for `meusite.com.br` e o Elastic IP for o que você
anotou, o registro tem nome `api` e valor igual a esse IP; o endereço final é
`api.meusite.com.br`. Não coloque `https://` nem a porta no valor do registro.
Se já houver um registro `api`, edite-o em vez de criar entradas conflitantes.
No Route 53, crie o registro na zona hospedada que realmente atende ao domínio;
uma zona nova, sozinha, não altera os servidores DNS do domínio e pode ter
custo. A propagação pode demorar. Se `nslookup` não estiver instalado, use
uma ferramenta de consulta DNS disponível no seu sistema.

### 2.8 Saiba interromper custos

**Stop / Parar** desliga a instância e interrompe a cobrança de computação
sob demanda enquanto ela está parada, mas o armazenamento EBS, snapshots,
Elastic IP e outros recursos podem continuar sendo cobrados. O serviço também
fica indisponível. **Terminate / Encerrar** é uma operação definitiva e pode
apagar o disco e os dados. Antes de qualquer ação, faça e teste backups e
consulte a documentação AWS. Após encerrar recursos de teste, verifique volumes,
snapshots e Elastic IPs remanescentes e a página de faturamento; não apague
dados que você precisa manter.

Com a instância criada, o IP fixo e o nome público anotados, continue para
a seção 3. A primeira conexão SSH da seção 4 usa o arquivo `.pem` criado aqui.

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

**Se ainda não tem frontend publicado**, mantenha temporariamente
`http://localhost:5173` no código. Um teste por `curl` não depende de CORS.
O DNS público do EC2 é o endereço da API, não automaticamente o endereço do
frontend. Antes de usar um frontend publicado, faça o ajuste abaixo.

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
request para `main`. Um pull request é uma proposta para incorporar as
alterações à branch principal. No terminal do **computador**, dentro do
projeto, confira primeiro a branch e alterações que já existem:

```bash
git status
git branch --show-current
```

Se já estiver usando `develop` para suas alterações, você pode usá-la. Caso
queira criar uma branch nova a partir de uma `main` atualizada e **não tenha
alterações não salvas em outras branches**, execute:

```bash
git switch main
git pull --ff-only origin main
git switch -c preparar-deploy-aws
```

Se o Git impedir a troca ou o pull, não force nem descarte alterações:
resolva primeiro. Depois de salvar os arquivos da seção 3, confira a branch
novamente e substitua `NOME_DA_SUA_BRANCH` pelo nome exibido:

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

Se você criou a instância EC2 na seção 2, encontre o arquivo
`finance-aws.pem` baixado **no computador**. Por exemplo, se ele estiver em
`~/Downloads`, crie uma pasta protegida para chaves e copie-o:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cp ~/Downloads/finance-aws.pem ~/.ssh/finance-aws.pem
chmod 600 ~/.ssh/finance-aws.pem
```

Se o arquivo estiver em outra pasta, ajuste o caminho do `cp`. Em Windows com
WSL, copie-o para a pasta Linux `~/.ssh`, não trabalhe diretamente na pasta
montada do Windows. A cópia original em Downloads continua existindo: proteja
ou remova essa cópia com cuidado depois de verificar que a nova funciona.

Antes de conectar, confirme a identidade do servidor para não aceitar uma
conexão com uma máquina desconhecida:

1. No console da AWS, abra **EC2 → Instances (Instâncias)** e selecione sua
   instância.
2. Escolha **Actions → Monitor and troubleshoot → Get system log**.
3. No log, procure `BEGIN SSH HOST KEY FINGERPRINTS`. Logo abaixo, encontre a
   linha que termina em `(ED25519)` e anote o valor iniciado por `SHA256:`.
   Ignore as linhas `(RSA)` e `(ECDSA)`.
4. No terminal do computador, rode o comando SSH abaixo. Na primeira conexão,
   o SSH mostrará uma mensagem com a impressão digital ED25519 e perguntará se
   deseja continuar.
5. Compare o valor `SHA256:...` mostrado pelo SSH com o que anotou no log da
   AWS. Só digite `yes` se forem exatamente iguais. Se forem diferentes, ou se
   não conseguir encontrar a linha ED25519 no log, digite `no`/cancele e não
   prossiga até verificar a impressão pela
   [orientação oficial da AWS](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connection-prereqs-general.html#connection-prereqs-fingerprint).

No computador, conecte-se substituindo `SEU_IP` pelo **Elastic IP**:

```bash
ssh -i ~/.ssh/finance-aws.pem ubuntu@SEU_IP
```

O usuário inicial da imagem Ubuntu oficial é `ubuntu`. Se a impressão digital
corresponder à obtida no console, confirme com `yes`. Se não corresponder ou
mudar depois, não aceite: investigue. Para outro fornecedor, use seu usuário
inicial, chave e procedimento seguro de verificação.

No **servidor**, crie um usuário de operação chamado `deploy`:

```bash
sudo adduser deploy
sudo usermod -aG sudo deploy
sudo install -d -m 700 -o deploy -g deploy /home/deploy/.ssh
```

Agora configure o acesso SSH do usuário `deploy`. Você vai usar **dois
terminais**:

- **Terminal do computador:** o terminal aberto no seu próprio computador.
- **Terminal do servidor:** a sessão SSH que já está conectada como `ubuntu`.

A chave `.pem` é privada: não a envie nem a copie para o servidor. No terminal
do computador, rode este comando para exibir a chave **pública** correspondente:

```bash
ssh-keygen -y -f ~/.ssh/finance-aws.pem
```

O comando exibirá uma linha longa começando com `ssh-rsa`. Selecione e copie
essa linha inteira. Ela é a chave pública; não copie nem compartilhe o
conteúdo do arquivo `.pem`.

Agora vá para o terminal do servidor, ainda conectado como `ubuntu`. Abra o
arquivo onde o servidor vai guardar a chave pública:

```bash
sudo nano /home/deploy/.ssh/authorized_keys
```

No editor `nano`, cole a linha pública que copiou. Ela deve ficar inteira em
uma única linha. Para salvar, pressione `Ctrl+O`, depois `Enter`; para sair,
pressione `Ctrl+X`. Em seguida, ainda no terminal do servidor, execute:

```bash
sudo chown deploy:deploy /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
```

No **outro terminal do computador**, teste a nova conta:

```bash
ssh -i ~/.ssh/finance-aws.pem deploy@SEU_IP
sudo whoami
```

O segundo comando roda **no servidor** e deve responder `root` depois de
solicitar a senha criada no `adduser`. Só feche a sessão original depois de
confirmar o acesso. Guarde a senha de sudo com segurança. Nas próximas
conexões SSH manuais como `deploy`, informe também `-i ~/.ssh/finance-aws.pem`.

No servidor, instale atualizações e ferramentas:

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y ca-certificates curl git ufw openssl
```

### 4.2 Instale o Docker

"Ubuntu novo" significa a mesma instância EC2 criada na seção 2; não é para
instalar outro Ubuntu. Estes passos funcionam para Ubuntu 24.04 LTS e
26.04 LTS, incluindo a instância 26.04.1 criada neste tutorial. No **servidor**,
configure a chave e o repositório oficial do Docker:

```bash
sudo apt update
sudo apt install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

Agora crie um pequeno arquivo de configuração para o `apt` saber de onde baixar
o Docker. No **terminal do servidor**, copie e cole o bloco inteiro abaixo de
uma vez, desde `sudo tee...` até a linha `EOF`. `EOF` é só o marcador de fim
do bloco: ele também precisa ser enviado. Não digite os comandos desse bloco um
por vez.

```bash
sudo tee /etc/apt/sources.list.d/docker.sources <<EOF
Types: deb
URIs: https://download.docker.com/linux/ubuntu
Suites: $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
```

O comando grava a configuração em `/etc/apt/sources.list.d/docker.sources` e
mostra o conteúdo criado. No seu Ubuntu 26.04, confira se a linha `Suites:`
mostrada diz `Suites: resolute`. Se o terminal voltar ao prompt sem mensagem de
erro, a configuração foi criada.

Agora instale e teste o Docker:

```bash
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Se `apt update` ou a instalação disser que não encontrou os pacotes do Docker,
confira se a versão do Ubuntu é 24.04 ou 26.04 e siga a
[documentação oficial do Docker para Ubuntu](https://docs.docker.com/engine/install/ubuntu/).
Depois:

```bash
sudo systemctl enable --now docker
sudo docker run --rm hello-world
sudo usermod -aG docker deploy
```

Saia com `exit` e, no **computador**, conecte novamente para que o grupo tenha
efeito:

```bash
ssh -i ~/.ssh/finance-aws.pem deploy@SEU_IP
```

No servidor, confira:

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

O firewall é como um porteiro: bloqueia conexões que não foram liberadas. A
AWS já tem um firewall próprio (grupo de segurança); agora você vai configurar
também o firewall do Ubuntu, chamado **UFW**. Os dois precisam permitir as
mesmas portas necessárias. As regras da AWS foram configuradas na seção 2.4.

Faça os passos abaixo no **terminal conectado ao servidor como `deploy`**.
Primeiro, libere as portas que o tutorial usa: `22` para SSH (sua conexão
remota), `80` para HTTP e `443` para HTTPS. Só depois ative o firewall:

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

Quando `sudo ufw enable` perguntar se deseja continuar, digite `y` e pressione
`Enter`. A regra da porta 22 já foi adicionada para preservar o acesso SSH;
mesmo assim, **não feche este terminal** até confirmar que consegue abrir uma
segunda conexão SSH. O último comando, `sudo ufw status`, deve mostrar
`Status: active` e as portas `22/tcp`, `80/tcp` e `443/tcp` como `ALLOW`.

Mantenha também o grupo de segurança da AWS configurado como na seção 2.4.
Docker pode contornar regras UFW em portas publicadas; neste guia, somente o
Caddy publica as portas 80 e 443. Não publique as portas `3000`, `5432`,
`5050`, `8025` ou `1025`. Não inicie o `docker-compose.yml` de desenvolvimento
no servidor: ele expõe o banco, inclui pgAdmin com senha padrão e usa Mailpit
e modo de desenvolvimento.

## 5. Permita que o servidor leia o repositório

Nesta etapa, você autoriza o **servidor** a baixar o código do seu repositório
no GitHub. A chave criada aqui é só para essa leitura; não é a chave
`finance-aws.pem` usada para entrar no servidor e não é a chave que o GitHub
Actions usará mais adiante.

Todos os comandos desta etapa são executados no **servidor**, conectado como
`deploy`. Primeiro, crie uma nova chave SSH:

```bash
ssh-keygen -t ed25519 -C "servidor-finance-leitura" -f ~/.ssh/github_repo
cat ~/.ssh/github_repo.pub
```

Quando aparecer `Enter passphrase`, pressione **Enter** sem digitar nada; na
pergunta seguinte, pressione **Enter** de novo. Isso deixa essa chave própria
para o acesso automatizado do servidor.

O trecho `-f ~/.ssh/github_repo` **não é o nome do repositório GitHub**. Ele
define o nome e o local dos arquivos da chave no servidor: `github_repo` é a
chave privada, e `github_repo.pub` é a chave pública. O comando `cat` mostra
esta última. Copie a linha inteira exibida por `cat`; **não copie nem envie**
o arquivo sem `.pub`.

No site do GitHub, abra **o repositório que este servidor deverá baixar**.
Entre em **Settings → Deploy keys → Add deploy key**, dê um título que ajude
a identificar o servidor e cole a linha pública no campo **Key**. Deixe
**Allow write access** desmarcado e salve. Isso autoriza este servidor a ler
esse repositório, sem permitir que envie alterações.

Depois de salvar a chave pública no GitHub, confirme que a chave do servidor
GitHub é legítima antes de confiar nela. Ainda no terminal do servidor, rode:

```bash
ssh-keyscan -t ed25519 github.com > ~/.ssh/github_known_hosts
ssh-keygen -lf ~/.ssh/github_known_hosts
```

O segundo comando mostrará uma linha com um código `SHA256:...` e `(ED25519)`.
Por exemplo, a linha termina com algo semelhante a:

```text
SHA256:+DiY3wvvV6TuJJhbpZisF/zLDA0zPMSvHdkr4UvCOqU github.com (ED25519)
```

Esse é o valor Ed25519 publicado pelo GitHub no momento em que este guia foi
atualizado. Abra também a
[página oficial de impressões digitais SSH do GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/githubs-ssh-key-fingerprints)
no navegador do computador e confira a seção **Ed25519**. Compare o código
`SHA256:...` da página com o código exibido pelo comando no servidor. Eles
precisam ser exatamente iguais. Se forem diferentes, ou se o valor oficial
publicado tiver mudado, pare e confirme o valor correto na página oficial antes
de continuar. Não aceite uma chave diferente sem verificar.

`ssh-keyscan` apenas busca a chave apresentada por `github.com`; sozinho, não
prova que a chave é mesmo do GitHub. É a comparação com a página oficial que
faz essa verificação. Depois de confirmar que os códigos são iguais, proteja
o arquivo com:

```bash
chmod 600 ~/.ssh/github_known_hosts
```

Em seguida, crie o arquivo de configuração SSH no servidor:

```bash
nano ~/.ssh/config
```

Cole o conteúdo abaixo no `nano`:

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

Agora copie o código do GitHub para o servidor. Faça isso no **terminal do
servidor**, conectado como `deploy`. O repositório configurado acima é
`LucaSansa/finance-developer-pj-api`; o comando abaixo baixa a branch `main`
para a pasta `~/finance/app`:

```bash
mkdir -p ~/finance
git clone --branch main git@github.com:LucaSansa/finance-developer-pj-api.git ~/finance/app
```

`mkdir -p ~/finance` cria a pasta principal para os arquivos do projeto. O
`git clone` baixa o código do GitHub e cria dentro dela a pasta `app`. Aguarde
o comando terminar; ao final, deve aparecer uma mensagem de conclusão, como
`Branch 'main' set up to track remote branch 'main'`.

Agora crie uma pasta separada para as configurações privadas usadas na
produção:

```bash
mkdir -p ~/finance/producao
chmod 700 ~/finance/producao
```

`producao` fica fora do repositório e será usada mais adiante para guardar
configurações que não devem ser publicadas no GitHub. `chmod 700` restringe o
acesso a essa pasta ao usuário `deploy`.

Se o repositório do seu projeto tiver outro endereço, substitua
`LucaSansa/finance-developer-pj-api` pela parte `dono/nome-do-repositorio` da
URL SSH dele. Não altere `git@github.com:` nem acrescente `.git` duas vezes.
Se o `git clone` disser que a pasta `~/finance/app` já existe, não apague a
pasta: verifique se o repositório já foi baixado antes de tentar novamente.

## 6. Configure banco, e-mail e HTTPS

Esta seção prepara a versão que vai rodar no **servidor**, não a versão local
do seu computador. No projeto local, o Mailpit recebe os e-mails de teste e
permite visualizá-los no navegador; ele **não envia mensagens para pessoas
reais**. O Compose de produção desta seção não instala o Mailpit. Para que
cadastro, confirmação e recuperação de senha enviem e-mails no servidor, você
precisa de uma conta em um serviço de e-mail que ofereça SMTP.

O tutorial usa o **Amazon SES** como exemplo. Em resumo, você vai:

1. configurar o SES para enviar e-mail;
2. guardar os dados SMTP e outras configurações privadas num arquivo `.env` no
   servidor;
3. criar os arquivos que iniciam a API, o banco de dados e o acesso HTTPS.

Se você só quer continuar um teste e ainda não precisa enviar e-mails reais,
saiba que o Mailpit local não substitui a configuração SMTP do servidor. Para
testar os fluxos de e-mail no EC2, o SES em modo de teste permite enviar
mensagens para endereços previamente verificados; para enviar a outros
destinatários, a AWS precisa aprovar a saída do sandbox.

### 6.0 Prepare o envio de e-mail com Amazon SES

O SES é o serviço da AWS que enviará os e-mails da API. SMTP é o modo pelo qual
a API se conecta a esse serviço. Não é preciso instalar um servidor de e-mail
na EC2. Antes de começar, confira no console AWS se o SES está disponível para
sua conta e região e se haverá cobrança. Se não quiser usar SES, você pode
escolher outro serviço SMTP; nesse caso, use os dados fornecidos por ele no
arquivo `.env` da seção 6.1.

1. Primeiro descubra a região onde sua EC2 está rodando. No console AWS,
   procure **EC2** na barra de pesquisa e abra **Instances / Instâncias**.
   O seletor de região fica na barra superior, perto do canto superior direito
   e do nome da conta; pode mostrar o nome, por exemplo **Ohio**, em vez do
   código. Se não conseguir localizar o seletor, clique na instância
   `finance-api` e procure **Availability Zone / Zona de disponibilidade** nos
   detalhes. Ela terá um valor como `us-east-2a`; a região é o mesmo código
   sem a letra final: `us-east-2`.

   No seu caso, o terminal mostrou endereços Ubuntu começando com
   `us-east-2.ec2.archive.ubuntu.com`, então a região é **US East (Ohio),
   código `us-east-2`**. O assistente inicial do SES pode esconder o seletor
   de região. Se não conseguir alterá-lo na tela, abra uma nova aba e cole este
   endereço na barra do navegador:

   ```text
   https://us-east-2.console.aws.amazon.com/ses/home?region=us-east-2
   ```

   Pressione `Enter` e, se necessário, entre novamente na AWS. Continue no SES
   aberto por esse endereço. Para conferir a região da EC2, você também pode
   abrir:

   ```text
   https://us-east-2.console.aws.amazon.com/ec2/home?region=us-east-2
   ```

   As identidades, credenciais SMTP e endpoint do SES precisam ser dessa
   mesma região.
2. Se esta é a primeira vez que abre o SES, pode aparecer o assistente inicial
   **“Adicione seu endereço de e-mail”**, como na tela do tutorial. No campo
   **Endereço de e-mail**, digite um endereço que você consegue abrir e que
   pretende usar como remetente. Clique em **Próxima**. Abra a caixa de entrada
   desse endereço, encontre a mensagem da AWS e clique no link de verificação.
   Volte ao SES e confirme que o endereço aparece como **Verified**.
3. A próxima tela do assistente pode ser **“Adicione seu domínio de envio”**.
   Ela pede um **domínio próprio**, por exemplo `meudominio.com.br`, cujo
   painel DNS você consegue alterar. Não é o endereço de e-mail, o endereço
   IP, nem o DNS público da EC2.

   **Se você não comprou um domínio ou não controla o DNS dele:** não preencha
   essa tela e não invente um endereço. Clique em **Cancelar** para sair do
   assistente. Depois, no SES, abra **Configuration → Verified identities →
   Create identity → Email address**, cadastre o e-mail que você verificou no
   passo anterior e confirme que ele aparece como **Verified**. Esse e-mail
   individual será o remetente (`MAIL_FROM`) nos testes.

   **Se você tem domínio próprio e controla o DNS:** digite o domínio, sem
   `https://` e sem caminho (por exemplo, `meudominio.com.br`), e clique em
   **Próxima**. A AWS mostrará registros DNS para você adicionar no painel do
   domínio. O campo **Domínio MAIL FROM** da tela é opcional; deixe-o em branco
   para usar a opção padrão da AWS. Só configure um MAIL FROM personalizado se
   souber adicionar os registros DNS que a AWS solicitar. Aguarde a identidade
   do domínio aparecer como **Verified**.
4. Para o primeiro teste, o SES normalmente está no modo **sandbox**. Nesse
   modo, ele só envia para endereços que também foram verificados. Verifique
   pelo mesmo processo o endereço de e-mail onde você quer receber o teste.
   Depois que a AWS aprovar a saída do sandbox, não será necessário verificar
   cada destinatário.
5. Agora obtenha os dados que a API precisa para se conectar ao SES. Abra
   **SMTP settings**. Na área **Choose credential method / Escolha o método
   de credencial**, selecione **IAM SMTP credentials / Credenciais SMTP do
   IAM** (a opção à direita na tela mostrada). Não escolha **SMTP email
   manager / Gerenciador de e-mail SMTP**: esse recurso gerenciado é
   desnecessário para este tutorial e a própria tela informa que podem ser
   cobradas taxas de processamento do Mail Manager.

   Na tela **Specify user details / Especificar detalhes do usuário**, a AWS
   sugere um nome automático, como `ses-smtp-user...`. Você pode manter esse
   nome ou trocá-lo por `finance-api-smtp`; ele serve apenas para identificar
   esse usuário na lista do IAM. Deixe o grupo e a política de permissões que a
   AWS preencheu como estão. A tela deve indicar a ação
   `ses:SendRawEmail`; não cole políticas próprias nem conceda outras
   permissões. Role até o fim, clique em **Next / Próxima** ou
   **Create user / Criar usuário** (o texto do botão pode variar) e confirme a
   criação se a AWS pedir.

   Na etapa **Recover SMTP credentials / Recuperar credenciais SMTP**, faça
   primeiro o seguinte:

   1. Clique em **Baixar arquivo .csv** e salve o arquivo em um local privado
      do seu computador. Não o envie por e-mail, chat ou GitHub; ele contém a
      senha SMTP.
   2. A tela informa que o usuário foi criado **com alguns erros**. Clique em
      **Visualizar usuário** no aviso amarelo. Na página do usuário, abra a aba
      **Permissões**. Se ela mostrar **Políticas de permissões (0)**, como na
      imagem deste tutorial, a política necessária não foi anexada; esse
      usuário ainda não pode enviar e-mails.
   3. Para corrigir isso, na página do usuário clique em **Adicionar
      permissões → Criar política em linha**. Na tela de criação, escolha a
      opção **JSON**, apague o conteúdo de exemplo e cole somente esta política:

      ```json
      {
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": "ses:SendRawEmail",
            "Resource": "*"
          }
        ]
      }
      ```

      Clique em **Próxima** ou **Revisar política**, dê o nome
      `FinanceSesSmtpSend` e crie/salve a política. Volte à aba **Permissões**
      do usuário e confirme que aparece **Políticas de permissões (1)** e a
      linha `FinanceSesSmtpSend`. Essa confirmação verde, como na imagem do
      tutorial, significa que a política foi criada. Ela permite ao usuário
      enviar mensagens pelo SES; não dá acesso geral à conta AWS.
   4. Se a aba já mostrar uma política, não crie outra. Se a tela mostrar uma
      mensagem de erro diferente, ou não encontrar **Criar política em linha**,
      pare e peça ajuda compartilhando apenas o texto do erro — nunca o CSV,
      a senha SMTP ou chaves.
   5. Guarde o **SMTP username** e a **SMTP password** do CSV. São diferentes
      da senha do console AWS e podem não ser exibidos novamente. Depois você
      vai preencher `MAIL_USER` e `MAIL_PASSWORD` no `.env` do servidor.
   6. Só depois de salvar o CSV e confirmar a permissão necessária, clique em
      **Retornar ao console do SES**.

   Essas credenciais pertencem à região escolhida no passo 1.
6. Volte à página do SES para obter o endereço do servidor SMTP. Se estiver
   na página do usuário IAM, use a busca da AWS no alto da tela, digite `SES`
   e abra **Amazon Simple Email Service (SES)**. Confirme que está em **US
   East (Ohio) / `us-east-2`** e, no menu esquerdo, clique em
   **Configurações SMTP**.

   Na página **Configurações do Simple Mail Transfer Protocol (SMTP)**, haverá
   duas opções: **Gerenciador de e-mail SMTP** e **Credenciais SMTP do IAM**.
   Selecione **Credenciais SMTP do IAM** (a opção à direita). Não preencha
   **Nome do endpoint de entrada**, não gere uma senha nessa tela e não crie
   um endpoint de entrada: esses campos são do Gerenciador de e-mail SMTP, que
   não será usado neste tutorial. Você já criou o usuário e guardou as
   credenciais SMTP nos passos anteriores.

   Para a região US East (Ohio), o endereço de envio SMTP é
   `email-smtp.us-east-2.amazonaws.com`. Esse é o valor de `MAIL_HOST`; não use
   o nome `ingressendpoint-...`, pois esse é um endpoint de entrada. O **SMTP
   username** vai em `MAIL_USER` e a **SMTP password** vai em `MAIL_PASSWORD`.
   Use `MAIL_PORT=587` e `MAIL_SECURE=false`. O remetente `MAIL_FROM` deve ser
   o endereço ou domínio que você verificou nos passos 2 ou 3.
7. Para permitir que a API envie para qualquer usuário, peça à AWS para tirar
   a conta do sandbox: abra **Account dashboard → Get set up → Request
   production access** e solicite envio de e-mails transacionais. Aguarde a
   aprovação. Até ela acontecer, só será possível enviar para destinatários
   verificados. A AWS pode não aprovar o pedido.

Veja [credenciais SMTP do SES](https://docs.aws.amazon.com/ses/latest/dg/smtp-credentials.html),
[identidades](https://docs.aws.amazon.com/ses/latest/dg/creating-identities.html)
e [saída do sandbox](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html).
Não use a porta 25: EC2 pode restringi-la.

### 6.1 Crie segredos e o arquivo de ambiente

Há dois arquivos `.env` diferentes:

- O `.env` do projeto no seu **computador** continua com `MAIL_HOST=mailpit`
  para os testes locais. Não o altere por causa desta etapa.
- Aqui você vai criar outro `.env` no **servidor**, no caminho
  `~/finance/producao/.env`. Esse arquivo configura o envio de e-mails real
  pela API publicada na EC2.

Faça tudo abaixo no **terminal conectado ao servidor como `deploy`**. O
arquivo contém senhas e chaves secretas: não o publique no GitHub, não envie
seu conteúdo por mensagem e não compartilhe capturas de tela que mostrem os
valores.

#### 1. Gere três segredos

Execute este comando **três vezes**, uma por vez:

```bash
openssl rand -hex 32
```

Cada execução mostra uma sequência longa de letras e números. Anote os
resultados em um local privado e identifique-os pela ordem:

1. Primeiro resultado: senha do banco (`POSTGRES_PASSWORD`).
2. Segundo resultado: segredo da sessão de acesso (`JWT_ACCESS_SECRET`).
3. Terceiro resultado: segredo da sessão de renovação (`JWT_REFRESH_SECRET`).

Use um resultado diferente em cada linha. Não digite aspas ao redor deles.

#### 2. Abra o arquivo de produção no servidor

Rode:

```bash
nano ~/finance/producao/.env
```

Esse comando abre o editor de texto `nano` no terminal e cria o arquivo caso
ele ainda não exista. **Confira o caminho antes de editar:** é
`~/finance/producao/.env`, não o `.env` que está na pasta do projeto no seu
computador.

#### 3. Preencha o arquivo

Digite ou cole o modelo abaixo dentro do `nano`. Troque cada instrução em
maiúsculas pelo valor real correspondente. Não deixe nenhum texto
`SUBSTITUA...` ou `COLE...` no arquivo:

- `POSTGRES_PASSWORD`: primeiro segredo gerado.
- `JWT_ACCESS_SECRET`: segundo segredo gerado.
- `JWT_REFRESH_SECRET`: terceiro segredo gerado.
- `MAIL_USER`: SMTP username do CSV que baixou da AWS.
- `MAIL_PASSWORD`: SMTP password do CSV; não é sua senha de login da AWS.
- `MAIL_FROM`: e-mail que aparece como **Verified** no SES.
- `FRONTEND_URL`: endereço do frontend, se já estiver publicado. Se não
  estiver, use temporariamente `http://localhost:5173`, conforme explicado
  abaixo.

Para as outras linhas de e-mail, mantenha `MAIL_HOST`,
`MAIL_PORT` e `MAIL_SECURE` como estão:

- `MAIL_HOST`: mantenha `email-smtp.us-east-2.amazonaws.com` para sua região
  US East (Ohio).
- `MAIL_PORT` e `MAIL_SECURE`: mantenha `587` e `false`.

Não copie este modelo para o `.env` local do projeto.

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

MAIL_HOST=email-smtp.us-east-2.amazonaws.com
MAIL_PORT=587
MAIL_SECURE=false
MAIL_USER=COLE_O_SMTP_USERNAME_DO_CSV
MAIL_PASSWORD=COLE_A_SMTP_PASSWORD_DO_CSV
MAIL_FROM=COLE_O_ENDERECO_VERIFICADO_NO_SES
```

Por exemplo, se o e-mail verificado for `voce@exemplo.com`, a linha fica
`MAIL_FROM=voce@exemplo.com`. Esse endereço é só um exemplo: use o endereço
exato que você verificou.

Se o provedor SMTP fornecer uma senha com caracteres especiais como `$` ou
`#`, coloque o valor entre aspas simples no `.env`, por exemplo
`MAIL_PASSWORD='senha$exemplo#'`; não use literalmente essa senha. Consulte a
[sintaxe de arquivos de ambiente do Compose](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/#env-file-syntax)
se o valor contiver aspas ou outras particularidades.

Se ainda não tem frontend publicado, troque a linha `FRONTEND_URL` por
`FRONTEND_URL=http://localhost:5173`. Isso serve apenas para continuar a
configuração e testar manualmente: sem um frontend rodando nesse endereço, os
links dos e-mails não abrirão uma página funcional. A seção 8 explica como
testar usando o token. Quando publicar o frontend, atualize essa linha e o CORS
da API antes de recriá-la.

#### 4. Salve e proteja o arquivo

No `nano`, pressione **Ctrl+O** para salvar, pressione **Enter** para confirmar
o nome do arquivo e depois **Ctrl+X** para sair. Você voltará ao prompt do
terminal. Agora execute:

```bash
chmod 600 ~/finance/producao/.env
```

Esse comando restringe a leitura do arquivo ao usuário `deploy`. Não mostre o
conteúdo do `.env` para conferir; verifique apenas se o terminal voltou ao
prompt sem mensagem de erro.

No Docker, `db` é o nome do serviço PostgreSQL, não `localhost`. O PostgreSQL
usa usuário, senha e nome do banco **apenas na primeira inicialização de um
volume vazio**. Mudar essas variáveis depois não altera automaticamente o
banco existente. Para alterar a senha, faça também a alteração no PostgreSQL
com um procedimento apropriado e coordenado.

Para e-mail, use os dados SMTP reais preparados na seção 6.0. Mailpit é só
para testes locais e não envia e-mails reais. A porta 587 normalmente usa
`MAIL_SECURE=false` e STARTTLS; para TLS implícito na porta 465 use
`MAIL_SECURE=true`, conforme as instruções do provedor. A porta 25 pode ser
bloqueada pelo VPS. Para concluir os fluxos pelo navegador, `FRONTEND_URL`
deve apontar para o frontend real, que precisa implementar `/confirmar-email`,
`/reset-password` e `/confirmar-troca-email`. Sem frontend, a confirmação pode
ser testada manualmente conforme a seção 8.

### 6.2 Crie o Compose de produção

O arquivo `compose.yaml` é a receita que o Docker usará para iniciar três
partes da aplicação no servidor: o banco de dados (`db`), a API (`api`) e o
servidor HTTPS (`caddy`). Nesta seção, você vai criar esse arquivo e outro
chamado `Caddyfile`, que informa ao Caddy para onde encaminhar as conexões.

Faça tudo no **terminal conectado ao servidor como `deploy`**. Para criar ou
editar um arquivo de texto, sim: coloque `nano` antes do caminho. Primeiro
abra o arquivo Compose:

```bash
nano ~/finance/producao/compose.yaml
```

O editor `nano` vai abrir. Cole nele todo o bloco abaixo, começando por
`services:` e terminando em `caddy_config:`:

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

Salve e saia do `nano`: pressione **Ctrl+O**, depois **Enter** e, por fim,
**Ctrl+X**. Esse arquivo é separado do Compose local do seu computador. Ele
mantém o banco e a API acessíveis apenas dentro da rede do Docker; somente o
Caddy recebe conexões externas nas portas 80 e 443. O Caddy encaminha essas
conexões para a API. O Docker também compila a aplicação para iniciar no modo
de produção.

Agora crie o arquivo de configuração do Caddy. Abra-o com `nano`:

```bash
nano ~/finance/producao/Caddyfile
```

Cole o bloco abaixo no editor. Troque `api.seudominio.com.br` pelo endereço
que você usará para acessar a API:

```caddyfile
api.seudominio.com.br {
    reverse_proxy api:3000
}
```

Se você ainda não tem domínio próprio, use o **DNS público da EC2** anotado na
seção 2.7 no lugar de `api.seudominio.com.br`. Cole só o nome, sem
`https://`, sem caminhos e sem barra no final. Por exemplo:

```caddyfile
ec2-12-34-56-78.us-east-2.compute.amazonaws.com {
    reverse_proxy api:3000
}
```

O nome acima é apenas um exemplo: use o DNS público da sua própria instância.
Depois de colar o conteúdo, salve e saia do `nano` com **Ctrl+O**, **Enter** e
**Ctrl+X**.

O Caddy tentará obter HTTPS automaticamente. A AWS não garante certificado
para o DNS público da EC2; se não conseguir obtê-lo, use a alternativa de
teste por túnel SSH explicada na seção 8.

Por fim, confira se os arquivos estão corretos. Execute estes comandos no
servidor:

```bash
cd ~/finance/producao
docker compose config --quiet
```

`cd` muda para a pasta onde você salvou os arquivos. `docker compose config
--quiet` verifica se a receita do Docker e o `.env` têm sintaxe válida; quando
está tudo certo, o comando termina sem imprimir uma mensagem de sucesso. Se
aparecer um erro, não continue: confira se salvou os dois arquivos nos
caminhos indicados e se substituiu todos os valores de exemplo no `.env`.
Não compartilhe a saída completa de `docker compose config`, pois ela pode
mostrar senhas.

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

Aguarde os comandos terminarem. No log da API, a linha
`Nest application successfully started` significa que a API iniciou. Como o
código executa as migrations antes de iniciar a API, essa linha sem erro de
migration é um bom sinal; mesmo assim, ela **não confirma sozinha** que a
tabela e os dados esperados estão no banco. A confirmação é feita consultando
o banco nos próximos comandos.

Execute os três comandos abaixo, um por vez, ainda na pasta
`~/finance/producao` do servidor:

```bash
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\dt"'
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT * FROM migrations;"'
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SELECT count(*) FROM expense_type;"'
```

Confira os resultados:

- No primeiro resultado, procure `expense_type` na lista de tabelas.
- No segundo, procure uma linha chamada
  `AddDefaultExpenseType1765994220255`.
- No terceiro, o número deve ser `17`.

Esses são os sinais de que o banco novo foi preparado. Se um comando mostrar
erro, a tabela não aparecer, a migration não estiver listada ou o total não
for 17, **pare aqui**. Copie a mensagem de erro (sem senhas) e verifique os
logs com `docker compose logs --tail=100 api`. Não apague o volume do banco
para tentar corrigir: apagar o volume remove os dados e pode não resolver a
causa.

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
guardam os dados necessários para isso. Use abaixo o endereço configurado no
`Caddyfile`: seu domínio **ou seu DNS público do EC2**. No computador:

```bash
curl -i https://SEU_ENDERECO_PUBLICO/
```

Substitua `SEU_ENDERECO_PUBLICO` pelo nome real, sem adicionar uma segunda
vez `https://`. Para DNS do EC2, por exemplo, use o nome completo anotado na
seção 2.7. Não use `-k` para ignorar erros de certificado.

Este projeto não define uma rota `GET /`, portanto **404 é esperado**; isso
mostra apenas que o HTTPS chegou a uma aplicação HTTP, não que todas as funções
e o banco estão saudáveis. Erro de certificado, timeout ou 502 não é sucesso.
O Swagger `/docs` está disponível apenas com `NODE_ENV=development`; não
ative esse modo em produção apenas para vê-lo.

### Se o certificado não for emitido para o DNS do EC2

Verifique se o DNS resolve para o IP atual, se as portas 80 e 443 estão
acessíveis e veja `docker compose logs --tail=100 caddy`. A emissão para o
nome fornecido pela AWS depende da autoridade certificadora e pode falhar.
Não envie senhas ou dados financeiros por HTTP público e não ignore avisos
de certificado. Você pode testar a API **privadamente** por um túnel SSH:

1. No **servidor**, crie `~/finance/producao/compose.teste.yaml`:

   ```yaml
   services:
     api:
       ports:
         - "127.0.0.1:3000:3000"
   ```

2. Na pasta `~/finance/producao`, aplique o arquivo adicional:

   ```bash
   docker compose -f compose.yaml -f compose.teste.yaml up -d api
   ```

   A porta 3000 ficará disponível apenas no próprio servidor, não na internet.
3. Em outro terminal do **computador**, abra o túnel, substituindo `SEU_IP`
   pelo IPv4 público:

   ```bash
   ssh -i ~/.ssh/finance-aws.pem -L 3000:127.0.0.1:3000 deploy@SEU_IP
   ```

   Mantenha essa sessão aberta. Em outro terminal do computador, teste:

   ```bash
   curl -i http://127.0.0.1:3000/
   ```

   Um **404** é esperado para `/`; o tráfego entre computador e servidor
   passa pelo SSH criptografado. Uma porta local 3000 ocupada pode impedir o
   túnel: nesse caso use `-L 3001:127.0.0.1:3000` e consulte a porta `3001`.
4. Ao terminar, feche a sessão do túnel com `exit`. Para remover a publicação
   temporária da porta no servidor, execute:

   ```bash
   cd ~/finance/producao
   docker compose -f compose.yaml up -d --force-recreate api
   ```

Esse teste não prova que HTTPS público funciona. O cookie de refresh é
`Secure` em produção; clientes podem não enviá-lo em HTTP, mesmo pelo túnel.
Para testar integralmente frontend e cookies, será necessário HTTPS válido e
uma configuração adequada de origem e domínio.

### Testes funcionais

Teste também com um frontend de teste ou cliente HTTP:

1. Cadastre uma conta de teste em `POST /users`, com CNPJ válido, e-mail que
   você controla e senha que atenda às validações. Não use dados reais de
   terceiros sem necessidade.
2. Confira o recebimento do e-mail e complete a confirmação no frontend. Se
   não tiver frontend, copie o valor de `token` no link recebido e envie-o no
   corpo JSON `{"token":"VALOR_DO_TOKEN"}` para `POST /auth/verify-email`
   usando um cliente HTTP pelo HTTPS válido ou pelo túnel SSH. Não compartilhe
   o token.
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

Mostre a chave pública no computador:

```bash
cat ~/.ssh/finance_actions.pub
```

Copie a linha exibida. Em uma sessão já conectada ao **servidor** como
`deploy`, abra `nano ~/.ssh/authorized_keys` e acrescente essa chave em uma
**nova linha**, mantendo a chave de administração que já está no arquivo.
Salve e saia. No **computador**, teste a chave de automação:

```bash
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

Para visualizar os dois valores no terminal **privado do computador**, use
`cat ~/.ssh/finance_actions` e `cat ~/.ssh/finance_servidor_known_hosts`,
respectivamente. Copie a chave privada apenas para o campo do secret correto;
não compartilhe tela ou terminal, tire captura, envie por mensagem ou a salve
no repositório. O GitHub não mostra o valor do secret depois de salvo.

Não imprima a chave privada em logs públicos nem cole em arquivos versionados.
O Actions precisa alcançar a porta 22; avalie a exposição com cuidado. Proteja
a `main` com regras de branch, revisão de pull requests e permissão de escrita
apenas a pessoas confiáveis. Quem puder alterar o workflow ou código executado
em `main` pode comprometer o servidor ou acessar dados e secrets. Habilite 2FA
e monitore os acessos.

**Se estiver usando o EC2 da seção 2:** volte ao console AWS, na mesma região,
abra **EC2 → Instances → finance-api → Security**, clique no grupo de
segurança e em **Edit inbound rules** para administrar as origens SSH. A
regra restrita ao IPv4 da sua conexão permite o acesso administrativo, mas
não libera automaticamente os
runners do GitHub. Para automatizar com menos exposição, configure uma alternativa
adequada ao seu nível de segurança, como um runner
em infraestrutura própria com IP fixo e confiável, ou uma solução de acesso
privado; isso exige configuração adicional fora deste guia. Outra possibilidade
é gerenciar uma lista atualizada de faixas de IP do GitHub, que pode ser
ampla, mudar e exceder quotas do security group. Consulte a
[documentação oficial dos IPs do GitHub](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-githubs-ip-addresses)
e avalie o risco. **Sem uma dessas soluções, o deploy manual funciona, mas o
workflow automático não conseguirá conectar ao servidor.** Não confunda os IPs
do GitHub com a chave pública SSH.

Como alternativa mais simples, mas **menos segura**, você pode permitir SSH
de qualquer IPv4. Isso expõe a porta 22 a tentativas de acesso da internet
inteira; uma vulnerabilidade ou chave roubada pode permitir invasão. Use essa
opção apenas se entender e aceitar o risco:

1. Confirme que o acesso com as duas chaves funciona e que as chaves privadas
   e os secrets estão protegidos. No servidor, consulte a configuração efetiva
   do SSH com:

   ```bash
   sudo sshd -T | grep -E '^(passwordauthentication|kbdinteractiveauthentication|pubkeyauthentication) '
   ```

   Para este caminho, a autenticação por senha e por teclado interativo deve
   estar `no`, e a por chave pública deve estar `yes`. Se estiver diferente,
   configure e teste o SSH por chaves com cuidado antes de prosseguir; mantenha
   uma sessão administrativa aberta para não perder o acesso.
2. Na edição das regras de entrada do grupo de segurança, edite a regra
   **SSH**: deixe TCP `22` e escolha **Anywhere-IPv4** (`0.0.0.0/0`). Salve
   e confira também o UFW. Não abra PostgreSQL nem outras portas internas.
3. Configure monitoramento e mantenha Ubuntu e OpenSSH atualizados. A regra
   não autoriza login por si só, mas aumenta a superfície de ataque. Para
   voltar a restringir o acesso, substitua a origem pelo IPv4 público da sua
   conexão com `/32` ou por outros IPs confiáveis; o Actions hospedado pelo
   GitHub pode voltar a falhar.

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

Na raiz do projeto **no computador**, crie as pastas se ainda não existirem:

```bash
mkdir -p .github/workflows
```

Salve o conteúdo acima em `.github/workflows/deploy.yml`. Confira a branch e
as alterações antes de registrar somente o workflow:

```bash
git status
git branch --show-current
git add .github/workflows/deploy.yml
git commit -m "Add production deployment workflow"
git push -u origin NOME_DA_SUA_BRANCH
```

Substitua `NOME_DA_SUA_BRANCH` pelo nome exibido e use uma branch de trabalho,
não `main`, se for abrir um pull request. Abra o pull request no GitHub e
confira se aponta para `main`. Depois do
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
| Não chega e-mail | Credenciais SMTP, porta, identidade do remetente e destinatário verificado no sandbox; confira logs sem expor senhas. |
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

- [Free Tier da AWS](https://aws.amazon.com/free/)
- [Planos de conta Free e Paid](https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/free-tier-plans.html)
- [Regras do Free Tier para EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-free-tier-usage.html)
- [Instalação do Docker no Ubuntu](https://docs.docker.com/engine/install/ubuntu/)
- [HTTPS automático do Caddy](https://caddyserver.com/docs/automatic-https)
- [Secrets do GitHub Actions](https://docs.github.com/en/actions/security-for-github-actions/security-guides/using-secrets-in-github-actions)
- [Migrations do TypeORM](https://typeorm.io/docs/advanced-topics/migrations/)
- [Backup e restauração do PostgreSQL](https://www.postgresql.org/docs/15/backup-dump.html)
