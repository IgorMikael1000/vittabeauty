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

4. Crie as tabelas no banco:

   ```powershell
   npm run db:push
   ```

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
- `npm run db:push`: sincroniza o schema com o banco configurado.
- `npm run db:migrate`: cria e aplica uma migration de desenvolvimento.

O schema atual adiciona CPF, telefone e especialidade para profissionais e
remove a data de nascimento de clientes. Antes de sincronizar um banco que já
tenha dados, faça backup: o `db:push` pode remover a coluna de aniversário e
apagar os valores existentes nela.

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
  atendimentos, cancelamento e conclusão; bloqueios de horários; e configuração
  de expediente por dia da semana.
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
- Os links de ação do Firebase devem usar o handler personalizado
  `https://vittabeauty.vercel.app/auth/action`. Configure essa URL nos modelos
  de e-mail em Authentication > Templates no Firebase Console e autorize o
  domínio `vittabeauty.vercel.app`. A aplicação encaminha redefinição de senha,
  verificação/alteração de e-mail e recuperação de e-mail para telas próprias.
- Configure também limites de requisição no provedor de borda para login,
  cadastro e envio de solicitações públicas antes da exposição à internet.
- O trial profissional dura três dias a partir do cadastro. Após o vencimento,
  o dashboard exige a escolha de um plano; o link público de agendamento fica
  indisponível até a assinatura ser ativada.
- As assinaturas recorrentes usam o SDK oficial do Mercado Pago. Configure
  `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` no ambiente de
  execução. O checkout envia notificações para
  `/api/webhooks/mercadopago`; habilite os eventos
  `subscription_preapproval` e `subscription_authorized_payment`.
- Os pagamentos são deduplicados pelo ID da fatura do Mercado Pago. A validação
  HMAC do webhook exige os cabeçalhos assinados e rejeita notificações com mais
  de cinco minutos.

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
- `MERCADOPAGO_ACCESS_TOKEN`: token de acesso de produção do Mercado Pago.
- `MERCADOPAGO_WEBHOOK_SECRET`: segredo de assinatura dos webhooks do Mercado
  Pago.

O build executa `prisma generate && next build`. Alterações ao schema do banco
devem ser aplicadas explicitamente com `npm run db:push` ou migrations antes
de disponibilizar a versão correspondente.

Antes de hospedar, rotacione qualquer senha de banco que tenha sido
compartilhada fora do cofre de segredos do ambiente de deploy e configure
limites de requisição no provedor de borda para login, cadastro e agendamento
público. O teste ponta a ponta com dados reais exige um ambiente Neon e
credenciais de teste específicos; nenhuma seed ou conta demonstrativa é criada.
