# Vitta Beauty

Plataforma de gestão para profissionais autônomos da beleza, desenvolvida pela
I&T Solutions com Next.js, TypeScript, Tailwind CSS, Prisma e PostgreSQL na Neon.

## Requisitos

- Node.js 20.9 ou superior
- Uma instância PostgreSQL na Neon

## Configuração local

1. Instale as dependências:

   ```powershell
   npm install
   ```

   O script `postinstall` gera o Prisma Client.

2. Crie o arquivo local de ambiente:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Configure `DATABASE_URL` com a connection string pooled da Neon,
   `DIRECT_URL` com a connection string direta, `NEXT_PUBLIC_APP_URL` com a
   origem local, as seis variáveis `NEXT_PUBLIC_FIREBASE_*` com a configuração
   do app Web e `AUTH_SESSION_SECRET` com um segredo aleatório de pelo menos
   32 bytes. Gere um com `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   e configure-o somente no servidor. No Firebase Console, habilite os provedores
   E-mail/senha e Google e configure os domínios autorizados para desenvolvimento
   e produção.

4. Crie as tabelas no banco vazio usando a migration versionada:

   ```powershell
   npm run db:migrate:deploy
   ```

   Essa migration cria o schema atual e os índices de expressão usados pela
   busca de clientes.

5. Inicie o servidor de desenvolvimento:

   ```powershell
   npm run dev
   ```

   Acesse `http://localhost:3000/cadastro` para criar uma conta.

## Comandos

- `npm run dev`: inicia o Next.js em desenvolvimento.
- `npm run build`: gera o Prisma Client e cria o build de produção.
- `npm run lint`: executa o ESLint.
- `npm run db:generate`: gera o cliente Prisma a partir do schema.
- `npm run db:migrate`: cria e aplica migrations em desenvolvimento.
- `npm run db:migrate:deploy`: aplica migrations pendentes em um banco
  configurado.
- `npm run db:migrate:status`: exibe o estado das migrations no banco.
- `npm run db:push`: uso somente local em banco descartável; não usar em
  produção.

Para um banco existente sem histórico de migrations, **não aplique a migration
inicial diretamente**: ela cria todas as tabelas. Faça backup e compare o schema
real com a migration. Depois de confirmar que tabelas, constraints e índices
correspondem, registre o baseline com
`npx prisma migrate resolve --applied 20261028233000_initial` e valide com
`npm run db:migrate:status`. Se houver divergência, reconcilie-a em uma etapa
planejada antes de registrar o baseline; não use `migrate resolve` para ocultar
diferenças.

Para produção, aplique as migrations pendentes com `npm run db:migrate:deploy`
antes de disponibilizar a versão correspondente.

### Teste de Pix de sinal via Mercado Pago OAuth

A conexão OAuth é iniciada somente pelo endpoint autenticado
`/api/integrations/mercadopago/connect`; ainda não há botão no painel.
Configure `MERCADOPAGO_CLIENT_ID`, `MERCADOPAGO_CLIENT_SECRET`,
`MERCADOPAGO_OAUTH_REDIRECT_URI` e `MERCADOPAGO_TOKEN_ENCRYPTION_KEY` no
servidor. A URL de callback deve ser estática, cadastrada na aplicação Mercado
Pago, e o fluxo PKCE deve estar habilitado. Gere a chave de criptografia com:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

O callback salva os tokens OAuth criptografados com AES-256-GCM e a renovação
usa o refresh token rotativo; por isso, a autorização solicita
`offline_access`. Nunca altere a chave de criptografia depois de conectar
contas, pois os tokens já salvos não poderão ser descriptografados.

Por padrão, esta fase **cria cobranças somente quando a conexão OAuth é de teste**
(`live_mode=false`). Para um teste controlado com contas reais, configure
`MERCADOPAGO_ALLOW_LIVE_MODE_DEPOSITS=true` e
`MERCADOPAGO_LIVE_MODE_DEPOSIT_MAX_AMOUNT=1.00` no servidor. O teto limita cada
sinal de produção a R$ 1,00; a página pública avisa que a cobrança movimenta
dinheiro real. O valor precisa ser ajustado para um limite maior somente se
necessário e conscientemente. Desative `MERCADOPAGO_ALLOW_LIVE_MODE_DEPOSITS`
depois do teste. Configure
`MERCADOPAGO_DEPOSIT_WEBHOOK_SECRET` com a chave de assinatura do webhook da
aplicação e cadastre o endpoint
`https://seu-dominio/api/webhooks/mercadopago/deposits` para notificações de
pagamentos. A URL `NEXT_PUBLIC_APP_URL` deve apontar para a origem pública da
aplicação. O Pix expira em 30 minutos; só um pagamento aprovado e verificado
diretamente na API do Mercado Pago confirma automaticamente o agendamento.
Para gerar o Pix, a cliente informa o e-mail do pagador.

Depois de aplicar as migrations pendentes e publicar:

1. Confirme que `MERCADOPAGO_CLIENT_ID` e `MERCADOPAGO_CLIENT_SECRET` pertencem
   à aplicação Mercado Pago correta; para OAuth de uma conta profissional real,
   use as credenciais de produção dessa aplicação. Não use Access Token no
   lugar do Client Secret.
2. Configure as duas variáveis de habilitação e o teto de R$ 1,00 acima na
   Vercel, junto com a chave de assinatura do webhook. Faça um novo deploy.
3. Reconecte a conta real da profissional pelo endpoint autenticado
   `/api/integrations/mercadopago/connect`. O callback precisa informar
   `live_mode=true`.
4. Configure o serviço com sinal de R$ 1,00 ou menos. A cliente informa nome,
   WhatsApp e um e-mail válido do pagador; esse e-mail não precisa ser o da
   profissional. A cliente paga o QR Code usando uma conta bancária real, e o
   valor será recebido pela conta Mercado Pago da profissional.
5. Confira o QR Code, faça somente um pagamento de teste controlado e confirme
   que o webhook atualizou o agendamento. Consulte a atividade da conta antes
   de repetir qualquer tentativa.
6. Ao terminar, defina `MERCADOPAGO_ALLOW_LIVE_MODE_DEPOSITS=false` e faça
   redeploy. O limite é uma proteção extra, não um modo sandbox.

### Cloudinary para fotos de perfil

As fotos de perfil são enviadas pelo servidor ao Cloudinary, e o PostgreSQL
guarda somente a URL segura da imagem. Configure `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY` e `CLOUDINARY_API_SECRET` no ambiente local e na Vercel.
O nome da nuvem é a parte após `@` na URL exibida pela Cloudinary
(`cloudinary://<api_key>:<api_secret>@<cloud_name>`). A chave e o segredo são
server-only; nunca use o segredo em variáveis `NEXT_PUBLIC_*`.
Os uploads são WebP, limitados a 50 KB e usam um identificador por profissional.

Fotos antigas que já estejam salvas como Data URL no banco continuam sendo
exibidas por compatibilidade; elas devem ser migradas/recarregadas antes de
remover o suporte legado.

## Fundação e segurança

- O cadastro exige nome e sobrenome, CPF validado, telefone, especialidade e
  senha com requisitos de segurança em duas etapas; o nome pode ser o nome
  profissional, do negócio ou uma combinação (por exemplo, "Ana HairStudio").
  CPF é armazenado sem máscara e único.
- Cada profissional recebe um slug exclusivo no cadastro.
- Client, Service, Appointment e Transaction possuem `professionalId`.
- Relações entre agendamentos, clientes, serviços e transações usam chaves
  compostas com `professionalId` para impedir vínculos entre contas distintas.
- O layout do dashboard valida a sessão no servidor antes de renderizar as
  rotas internas.

## Gestão interna

- Clientes: cadastro, edição, busca por nome/WhatsApp e histórico recente de
  atendimentos, sem coleta de data de nascimento. A exclusão é impedida quando
  há histórico, preservando os registros associados.
- Serviços: cadastro e edição de nome, descrição, preço, custo estimado de
  material, sinal opcional via PIX, duração e permissão para agendamento online.
  A chave PIX é configurada pelo profissional; a desativação é reversível e
  preserva o histórico.
- Agenda: visualização diária, semanal e mensal; criação manual de
  atendimentos, cancelamento e conclusão; criação e remoção de bloqueios
  pontuais por data; e configuração de expediente e pausas recorrentes por dia
  da semana.
- Horários e datas são interpretados usando o fuso horário do profissional.
  Atendimentos exigem cliente, serviço ativo, expediente configurado e um
  período sem conflito com outros atendimentos ou bloqueios.
- Operações da agenda verificam a propriedade dos registros no servidor e
  usam transações serializáveis para evitar conflitos concorrentes.
- **Minha Conta** permite revisar dados profissionais, editar nome/e-mail/
  telefone/especialidade, alterar senha após confirmar a senha atual e enviar
  uma foto de perfil comprimida no navegador para WebP 256x256. A imagem é
  validada no servidor e limitada a 50 KB antes de ser armazenada. O CPF fica
  somente para leitura; a senha é reautenticada e atualizada pelo Firebase
  Authentication.

## Agendamento público

- Compartilhe `/agendar/<slug>`: a página pública mostra apenas serviços
  ativos com agendamento online habilitado e horários calculados com base no
  expediente, atendimentos e bloqueios reais da profissional.
- Se o serviço exigir sinal, a cliente recebe o valor e a chave PIX após
  solicitar o horário, além de um atalho para enviar o comprovante ao WhatsApp
  cadastrado da profissional. O sinal configurado é armazenado como snapshot
  no atendimento.
- A cliente informa nome e WhatsApp e solicita um horário sem criar conta. O
  atendimento é criado como pendente e precisa ser confirmado pela profissional.
- O servidor valida novamente o serviço, expediente, data, horário e conflitos
  antes de gravar, usando transação serializável para proteger a agenda.
- Em **Meu link de agendamento**, a profissional copia o endereço exclusivo ou
  compartilha uma mensagem pronta pelo WhatsApp. `NEXT_PUBLIC_APP_URL` pode
  definir a origem pública absoluta (por exemplo, o domínio de produção).

## Financeiro, WhatsApp e relatórios

- Atendimentos manuais e solicitações públicas criam uma receita prevista
  vinculada ao agendamento. Ao cancelar um atendimento, a receita pendente
  correspondente é cancelada; pagamentos já realizados permanecem registrados.
- Ao concluir um atendimento, o custo atual do material é copiado para o
  agendamento e são registrados automaticamente a receita recebida e o custo
  operacional pago, ambos vinculados ao atendimento. A restrição por
  atendimento e tipo evita lançamentos duplicados.
- O financeiro permite registrar receitas e despesas independentes, informar
  valor, categoria, data prevista e marcar um lançamento como já pago/recebido.
  O painel alterna entre valores previstos (atendimentos futuros pendentes ou confirmados,
  custos de material estimados e despesas pendentes) e realizados (transações
  pagas), apresentando faturamento bruto, custos de serviços, despesas fixas e
  lucro líquido.
- Os relatórios consideram custos de materiais dos atendimentos confirmados
  nas despesas previstas, além dos custos já registrados ao concluir sessões.
- Atalhos da agenda criam mensagens de WhatsApp para solicitações recebidas,
  confirmações, lembretes e agradecimentos, conforme o estado do atendimento.
  A confirmação de um horário solicitado também pode ser registrada na agenda.
- Relatórios filtráveis por período apresentam serviços mais realizados
  (atendimentos concluídos) e taxa de cancelamento, calculada sobre os
  atendimentos agendados no período.
- Todos os registros financeiros e consultas de relatório são delimitados no
  servidor pelo profissional autenticado.

## Segurança e produção

- As rotas internas e ações de escrita exigem uma sessão autenticada e filtram
  registros pelo ID do profissional. Relacionamentos no schema também vinculam
  os registros transacionais ao mesmo profissional.
- A aplicação configura `X-Content-Type-Options`, proteção contra framing,
  política de referência e permissões de recursos. HSTS é habilitado em
  produção; o link público exige `NEXT_PUBLIC_APP_URL` com HTTPS nesse ambiente.
- A autenticação de usuários e a verificação de e-mail são gerenciadas pelo
  Firebase Authentication. O servidor valida ID tokens pelas chaves públicas
  oficiais do Firebase e cria cookies de sessão assinados com
  `AUTH_SESSION_SECRET`, HTTP-only, Secure em produção e SameSite=Lax. O Proxy
  do Next.js e as páginas/ações protegidas validam esses cookies no servidor.
  As sessões duram cinco dias; a revogação de tokens no Firebase não invalida
  automaticamente uma sessão já emitida. O logout limpa o cookie atual e a
  rotação de `AUTH_SESSION_SECRET` invalida todas as sessões.
- Os links de redefinição de senha e verificação/alteração de e-mail usam as
  telas hospedadas padrão do Firebase Authentication. Não configure uma tela
  de ação personalizada no app; autorize no Firebase os domínios usados como
  `continueUrl` (incluindo o domínio da Vercel). A rota legada
  `/auth/action` apenas encaminha links antigos ao handler padrão do domínio
  Firebase. Após confirmar uma troca de e-mail, o retorno ao dashboard
  sincroniza o endereço no perfil profissional.
- Login, cadastro e agendamento público usam rate limiting distribuído via
  Upstash Redis. Configure `UPSTASH_REDIS_REST_URL` e
  `UPSTASH_REDIS_REST_TOKEN` no servidor antes da exposição à internet; sem
  essas credenciais ou sem acesso ao Redis, as ações são recusadas.
- A exclusão da conta registra a solicitação em `deletionRequestedAt`, bloqueia
  o acesso autenticado e desativa o agendamento público. A remoção do usuário do
  Firebase, da foto do Cloudinary e dos dados relacionais é tentada imediatamente.
  Se uma etapa falhar, a tarefa fica pendente e o Cron da Vercel (diariamente às
  03:00 UTC) tenta novamente com backoff.
- O trial profissional dura três dias a partir do cadastro. Após o vencimento,
  o dashboard exige a escolha de um plano; o link público de agendamento fica
  indisponível até que um pagamento de plano seja confirmado.
- Os planos são vendidos exclusivamente por pagamento único no Checkout Pro do
  Mercado Pago; a renovação é manual e não há cobrança recorrente automática.
  Configure `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` no
  ambiente de execução. O checkout envia notificações para
  `/api/webhooks/mercadopago`; habilite os eventos `payment`.
- Os pagamentos são deduplicados pelo ID do pagamento do Mercado Pago e o
  webhook valida o HMAC, exige os cabeçalhos assinados e rejeita notificações
  com mais de cinco minutos. Reembolsos e contestações de pagamentos aplicados
  revogam o acesso.

## Deploy na Vercel

O projeto está configurado para o build padrão da Vercel. Cadastre estas
variáveis no projeto antes do primeiro deploy:

- `DATABASE_URL`: connection string pooled da Neon.
- `DIRECT_URL`: connection string direta da Neon para operações do Prisma CLI.
- `AUTH_SESSION_SECRET`: segredo aleatório de pelo menos 32 bytes, configurado
  somente no servidor.
- `NEXT_PUBLIC_APP_URL`: origem pública HTTPS, por exemplo
  `https://seu-dominio.com`.
- `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`,
  `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`,
  `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` e `NEXT_PUBLIC_FIREBASE_APP_ID`:
  configuração pública do app Web Firebase usado pelo Authentication.
- `FIREBASE_ADMIN_CLIENT_EMAIL` e `FIREBASE_ADMIN_PRIVATE_KEY`: credencial
  server-only de uma service account com a função Firebase Authentication Admin,
  usada exclusivamente para concluir exclusões sem depender da sessão do usuário.
- `CRON_SECRET`: segredo server-only usado para autenticar o Cron da Vercel que
  processa exclusões pendentes diariamente às 03:00 UTC, compatível com o plano
  Hobby. Nesse plano, uma nova tentativa pode aguardar até cerca de um dia;
  falhas repetidas podem prolongar o prazo total da exclusão.
- `CLOUDINARY_CLOUD_NAME` e `CLOUDINARY_API_KEY`: configuração do Cloudinary.
- `CLOUDINARY_API_SECRET`: segredo server-only do Cloudinary.
- `MERCADOPAGO_ACCESS_TOKEN`: token de acesso de produção do Mercado Pago.
- `MERCADOPAGO_WEBHOOK_SECRET`: segredo de assinatura dos webhooks do Mercado
  Pago.
- `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`: credenciais server-only
  do Upstash Redis para rate limiting distribuído.

Configure a service account no Google Cloud/Firebase e armazene a chave privada
somente nas variáveis server-only da Vercel. Em `FIREBASE_ADMIN_PRIVATE_KEY`,
preserve as quebras de linha da chave como `\n`. Gere um valor aleatório para
`CRON_SECRET`; não reutilize `AUTH_SESSION_SECRET`. O Cron retenta exclusões com
backoff exponencial (de um minuto até 24 horas), registra apenas código de erro
seguro e remove a tarefa quando todas as etapas são concluídas.

O build executa `prisma generate && next build`. Alterações ao schema do banco
devem ser aplicadas explicitamente com migrations antes de disponibilizar a
versão correspondente.

Antes de hospedar, rotacione qualquer senha de banco que tenha sido
compartilhada fora do cofre de segredos do ambiente de deploy e configure as
credenciais Upstash exigidas para login, cadastro e agendamento público. O
teste ponta a ponta com dados reais exige um ambiente Neon e credenciais de
teste específicos; nenhuma seed ou conta demonstrativa é criada.
