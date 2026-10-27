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
   `DIRECT_URL` com a connection string direta, `AUTH_SECRET` com um segredo
   aleatório e `NEXT_PUBLIC_APP_URL` com a origem local da aplicação. O segredo
   pode ser gerado com `npx auth secret`.

4. Crie as tabelas no banco:

   ```powershell
   npm run db:push
   ```

5. Inicie o servidor de desenvolvimento:

   ```powershell
   npm run dev
   ```

   Acesse `http://localhost:3000/register` para criar uma conta.

## Comandos

- `npm run dev`: inicia o Next.js em desenvolvimento.
- `npm run build`: gera o Prisma Client e cria o build de produção.
- `npm run lint`: executa o ESLint.
- `npm run db:generate`: gera o cliente Prisma a partir do schema.
- `npm run db:push`: sincroniza o schema com o banco configurado.
- `npm run db:migrate`: cria e aplica uma migration de desenvolvimento.

## Fundação e segurança

- O Auth.js usa credenciais e sessões JWT em cookies seguros; senhas são
  armazenadas com hash bcrypt.
- Cada profissional recebe um slug exclusivo no cadastro.
- Client, Service, Appointment e Transaction possuem `professionalId`.
- Relações entre agendamentos, clientes, serviços e transações usam chaves
  compostas com `professionalId` para impedir vínculos entre contas distintas.
- O layout do dashboard valida a sessão no servidor antes de renderizar as
  rotas internas.

## Gestão interna

- Clientes: cadastro, edição, busca por nome/WhatsApp e histórico recente de
  atendimentos. A exclusão é impedida quando há histórico, preservando os
  registros associados.
- Serviços: cadastro e edição de nome, descrição, preço, duração e permissão
  para agendamento online. A desativação é reversível e preserva o histórico.
- Agenda: visualização diária, semanal e mensal; criação manual de
  atendimentos, cancelamento e conclusão; bloqueios de horários; e configuração
  de expediente por dia da semana.
- Horários e datas são interpretados usando o fuso horário do profissional.
  Atendimentos exigem cliente, serviço ativo, expediente configurado e um
  período sem conflito com outros atendimentos ou bloqueios.
- Operações da agenda verificam a propriedade dos registros no servidor e
  usam transações serializáveis para evitar conflitos concorrentes.

## Agendamento público

- Compartilhe `/agendar/<slug>`: a página pública mostra apenas serviços
  ativos com agendamento online habilitado e horários calculados com base no
  expediente, atendimentos e bloqueios reais da profissional.
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
- O financeiro permite registrar receitas e despesas independentes, informar
  valor, categoria, data prevista e marcar um lançamento como já pago/recebido.
  Valores pendentes e efetivamente pagos são apresentados separadamente.
- A estimativa de lucro corresponde às receitas previstas menos as despesas
  previstas no período selecionado. O relatório também exibe faturamento
  recebido, despesas pagas e lucro realizado.
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
- Senhas bcrypt são limitadas a 72 bytes tanto no cadastro quanto no login.
- Configure também limites de requisição no provedor de borda para login,
  cadastro e envio de solicitações públicas antes da exposição à internet.

## Deploy na Vercel

O projeto está configurado para o build padrão da Vercel. Cadastre estas
variáveis no projeto antes do primeiro deploy:

- `DATABASE_URL`: connection string pooled da Neon.
- `DIRECT_URL`: connection string direta da Neon para operações do Prisma CLI.
- `AUTH_SECRET`: segredo aleatório forte e exclusivo de produção.
- `NEXT_PUBLIC_APP_URL`: origem pública HTTPS, por exemplo
  `https://seu-dominio.com`.

O build executa `prisma generate && next build`. Alterações ao schema do banco
devem ser aplicadas explicitamente com `npm run db:push` ou migrations antes
de disponibilizar a versão correspondente.

Antes de hospedar, rotacione qualquer senha de banco que tenha sido
compartilhada fora do cofre de segredos do ambiente de deploy e configure
limites de requisição no provedor de borda para login, cadastro e agendamento
público. O teste ponta a ponta com dados reais exige um ambiente Neon e
credenciais de teste específicos; nenhuma seed ou conta demonstrativa é criada.
