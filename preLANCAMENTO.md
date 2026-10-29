# Auditoria técnica pré-lançamento — Vitta Beauty

**Data:** 28/10/2026  
**Escopo:** revisão estática do repositório, com foco em prontidão comercial,
segurança, integridade de dados, desempenho, operações, testes e itens sem uso.
**Alterações de código nesta auditoria:** nenhuma. Este relatório é o único
arquivo criado nesta etapa.

## 1. Resumo executivo

O projeto já tem uma base funcional consistente: isolamento dos registros por
profissional em boa parte das consultas, validações no servidor, chaves
compostas entre entidades relacionadas, assinatura de webhooks, sessão
HTTP-only e testes para regras importantes de agenda e valores. Na verificação
local, o lint passou e os **39 testes existentes passaram**.

Ainda assim, eu **não consideraria a prontidão para lançamento comprovada**
antes de resolver ou validar os itens prioritários abaixo:

1. As rotas públicas de cadastro, login e agendamento não têm limitação de
   requisições implementada no projeto; o próprio README deixa isso como
   configuração pendente no provedor de borda.
2. A integração de checkout gera pagamento único, mas o README descreve
   assinaturas recorrentes. As URLs de retorno do Mercado Pago também estão
   fixadas em um domínio Vercel.
3. Não há migrations rastreadas no repositório; as instruções de produção
   dependem de sincronização manual do schema e de um script SQL manual para
   índices.
4. O modelo e as telas leem e removem bloqueios de calendário, mas não encontrei
   fluxo de criação de bloqueio no código.
5. A exclusão de conta envolve Mercado Pago, Firebase e PostgreSQL em sequência.
   Se a última etapa falhar, a aplicação retorna `cleanupPending`, mas não há
   fluxo automatizado de retomada identificado.
6. Os documentos legais precisam ser confrontados com o comportamento real do
   produto e revisados por profissional qualificado, principalmente em cobrança,
   retenção, exclusão, backups e papéis no tratamento de dados.

Há também oportunidades claras para diminuir carga e custo no banco: relatórios
transferem linhas para somá-las na aplicação, buscas de clientes usam padrões
parciais que podem não aproveitar os índices B-tree existentes, e as consultas
de conflito de agenda comparam intervalos sem limite inferior de início.

### Estado das verificações locais

- `npm run lint`: passou.
- `npm test`: passou, 4 arquivos e 39 testes.
- Checagem de TypeScript dos arquivos do projeto, excluindo os tipos gerados
  obsoletos em `.next/dev/types`: passou em 119 arquivos.
- O build completo deste workspace já havia falhado ao validar um arquivo
  gerado obsoleto que referencia `/api/auth/[...nextauth]`, rota inexistente
  neste projeto. Isso parece ser artefato local do Next.js, não erro apontado no
  código-fonte atual, mas precisa ser confirmado em um ambiente limpo de CI.
- Não foram consultados dados, planos de execução ou métricas de uma instância
  Neon de produção. Não é possível estimar CU-hours ou confirmar uso dos índices
  sem essas medições.

## 2. Critérios de prioridade

- **P1 — Resolver ou aceitar formalmente antes do lançamento:** risco relevante
  de abuso, cobrança incorreta, perda/indisponibilidade de dados, requisito de
  operação ou funcionalidade anunciada que não está disponível.
- **P2 — Prioridade alta:** risco de crescimento de custo, falha operacional ou
  inconsistência funcional que tende a aumentar com clientes e histórico.
- **P3 — Melhorias e manutenção:** limpeza, desempenho de menor impacto ou
  qualidade que não bloqueia isoladamente o primeiro lançamento.

As prioridades refletem a revisão do código; não substituem pentest, revisão
jurídica, avaliação dos fornecedores nem monitoramento de produção.

## 3. Achados detalhados

### P1 — Rotas públicas sem rate limit ou proteção contra automação

**Evidência:** o README recomenda configurar limites de requisição para login,
cadastro e agendamento antes de expor a plataforma, mas não encontrei rate
limiting implementado nas ações públicas. O agendamento cria ou reutiliza
cliente, grava atendimento e cria lançamento financeiro em
[public-booking.ts](src/app/actions/public-booking.ts#L30). Cadastro e login
também são ações de servidor públicas em
[auth.ts](src/app/actions/auth.ts#L61) e
[auth.ts](src/app/actions/auth.ts#L212).

**Risco:** automação pode gerar muitas tentativas de autenticação ou solicitações
de agenda, aumentar custo de Firebase, Vercel e Neon, acumular registros
indesejados e afetar a disponibilidade. Validações de dados não limitam a taxa
de chamadas.

**Solução recomendada:**

1. Definir limites por IP, rota e, quando aplicável, conta/profissional no
   provedor de borda ou em serviço compartilhado compatível com execução
   serverless.
2. Aplicar proteção contra bots ao agendamento público e ao cadastro; escolher
   CAPTCHA/alternativa de baixo atrito conforme o risco e a experiência desejada.
3. Definir limites de tamanho e frequência também para ações de servidor, sem
   depender apenas de uma camada de interface.
4. Registrar contadores e alertas de abuso sem guardar tokens, senhas ou dados
   pessoais desnecessários.

**Critério de aceite:** testes de limite por rota e uma configuração de produção
documentada e aplicada, incluindo a forma de identificar IP real sem confiar
em cabeçalhos arbitrários.

### P1 — Modelo de cobrança documentado diverge do checkout

**Evidência:** a ação constrói uma `Preference` com item e `unit_price`, isto é,
um checkout de pagamento único, em
[subscriptions.ts](src/app/actions/subscriptions.ts#L105). A página de termos
descreve explicitamente pagamento único e ausência de renovação automática em
[termos-e-politica.txt](public/termos-e-politica.txt), enquanto o README fala
em assinaturas recorrentes em
[README.md](README.md#L167). O checkout ainda define as `back_urls` diretamente
como `https://vittabeauty.vercel.app` em
[subscriptions.ts](src/app/actions/subscriptions.ts#L119).

**Risco:** a descrição do que será cobrado pode não corresponder ao checkout
real. A URL fixa pode levar o usuário ao domínio errado se o domínio de
produção for outro ou mudar.

**Solução recomendada:**

1. Decidir o modelo comercial: pagamento único com renovação manual ou
   recorrência automática.
2. Fazer código, telas de planos, README, termos e comunicações de suporte
   refletirem o mesmo modelo.
3. Se a cobrança permanecer como pagamento único, derivar as URLs de retorno de
   uma origem de produção validada, como já é feito para a notificação, evitando
   host arbitrário.
4. Se houver recorrência, implementar e testar o fluxo de assinatura recorrente
   propriamente dito, incluindo cancelamento, renovação, atraso, reembolso e
   contestação.
5. Antes de ativar acesso, verificar o estado e confrontar valor/moeda do
   pagamento confirmado com o plano esperado em
   [subscription-payments.ts](src/lib/subscription-payments.ts#L22). Definir
   também a política de acesso para pagamentos reembolsados ou contestados.

**Critério de aceite:** um teste de ponta a ponta no ambiente de homologação
confirma preço, duração, retorno ao domínio correto, evento de webhook e estado
final da assinatura para cada plano e cenários de falha.

### P1 — Sem migrations rastreadas; deploy do banco é manual

**Evidência:** a configuração aponta para `prisma/migrations` em
[prisma.config.ts](prisma.config.ts), mas não há migrations versionadas no
repositório. As instruções de deploy mencionam `db:push` em
[README.md](README.md#L214); os índices recentes de busca dependem de comando
SQL separado, definido em [package.json](package.json) e
[client-search-indexes.sql](prisma/client-search-indexes.sql).

**Risco:** código e schema podem divergir entre ambientes; alterações destrutivas
podem ser aplicadas sem um histórico reproduzível; esquecer o script de índices
pode degradar buscas em produção. `db:push` é útil em desenvolvimento, mas não
substitui um processo controlado de migração para deploy.

**Solução recomendada:**

1. Gerar e versionar migrations para o schema e para índices SQL adicionais.
2. Aplicar migrations por um comando de produção controlado, com backup e
   política de rollback/recuperação documentados.
3. Manter `db:push` limitado ao desenvolvimento local.
4. Fazer CI criar um banco temporário, aplicar todas as migrations desde zero,
   gerar Prisma Client e validar a aplicação.
5. Documentar o procedimento de rollout para mudanças incompatíveis e, se
   necessário, a estratégia expand/contract.

**Critério de aceite:** uma base vazia consegue ser criada somente a partir do
repositório e a versão anterior continua operável durante o rollout definido.

### P1 — Bloqueios de calendário sem fluxo de criação

**Evidência:** `CalendarBlock` é consultado para exibição e disponibilidade e
há ação para excluir bloqueios, mas a busca em `src` não encontrou qualquer
`calendarBlock.create`, `createCalendarBlockAction` ou formulário de criação.
Exemplos: [calendar.ts](src/app/actions/calendar.ts#L242),
[calendar/page.tsx](src/app/dashboard/calendar/page.tsx#L78) e
[public-booking.ts](src/app/actions/public-booking.ts#L198). O README anuncia
bloqueios de horários em [README.md](README.md#L74).

**Risco:** a funcionalidade anunciada não pode ser criada pela interface
observada. Bloqueios inseridos manualmente no banco podem aparecer e impedir
reservas, mas não há caminho normal para a profissional cadastrar um novo.

**Solução recomendada:** implementar o formulário, a ação autenticada e
validada, as regras de início/fim/fuso horário e a revalidação da agenda; ou
retirar a promessa de bloqueios até isso existir. Adicionar teste do fluxo
completo, inclusive o efeito sobre a disponibilidade pública.

### P1 — Exclusão de conta pode ficar parcialmente concluída

**Evidência:** a rotina cancela a assinatura externa e exclui o usuário Firebase
antes de apagar os dados PostgreSQL; se a transação do banco falhar, a ação
retorna `cleanupPending: true` e orienta contato com suporte em
[account-deletion.ts](src/app/actions/account-deletion.ts#L174) e
[account-deletion.ts](src/app/actions/account-deletion.ts#L212).

**Risco:** é uma operação distribuída entre três sistemas e não existe transação
atômica entre eles. Uma falha após remover o usuário Firebase pode deixar dados
pessoais no banco sem uma forma normal de a pessoa autenticar novamente, além
de exigir intervenção manual. A aplicação reconhece a falha, mas não há fila,
tarefa de retomada nem painel operacional identificados.

**Solução recomendada:**

1. Registrar um estado de exclusão/tombstone e uma tarefa idempotente antes de
   começar a limpeza externa.
2. Executar cancelamento e remoção em etapas recuperáveis, com retries,
   observabilidade e alerta para tarefas pendentes.
3. Não depender de sessão Firebase ativa para retomar limpeza.
4. Mostrar protocolo/estado ao usuário e disponibilizar procedimento de suporte.
5. Exercitar falhas após cada etapa em testes de integração.

**Critério de aceite:** uma falha simulada em qualquer dependência pode ser
retomada sem recriar a conta, duplicar cancelamentos ou deixar dados órfãos sem
alerta.

### P1 — Política de privacidade não define retenção e precisa de validação

**Evidência:** a política lista dados e fornecedores, mas a seção de retenção
apresenta práticas gerais sem prazos ou critérios concretos. A exclusão promete
apagamento irreversível, enquanto a operação depende de PostgreSQL, Firebase,
Mercado Pago e infraestrutura externa. Consulte
[termos-e-politica.txt](public/termos-e-politica.txt#L100).

**Risco:** a comunicação pode não explicar por quanto tempo dados são mantidos,
como funcionam backups, logs, dados financeiros, solicitações pendentes,
suboperadores e transferências internacionais. O código não permite atestar
conformidade jurídica; essa verificação requer revisão especializada.

**Solução recomendada:**

1. Revisar termos, política, consentimentos e papéis de controlador/operador com
   advogado ou profissional de privacidade.
2. Definir inventário de dados, finalidade/base legal, prazo por categoria,
   descarte em backups, subprocessadores/regiões e canal/SLA para solicitações
   de titulares.
3. Alinhar a promessa de exclusão aos prazos técnicos de backups e à retenção
   eventualmente exigida para registros de cobrança.
4. Garantir que o aceite e a versão dos termos aceitos possam ser comprovados,
   se isso for necessário para o modelo jurídico do produto.

**Critério de aceite:** documentação revisada e coerente com as configurações
reais de Firebase, Neon, Vercel e Mercado Pago.

## 4. Desempenho, banco de dados e custo

### P2 — Relatórios transferem linhas ao servidor para somar valores

**Evidência:** financeiro e relatórios executam várias consultas `findMany`,
buscam valores e calculam somas no Node.js. A lista apresentada no financeiro
tem limite de 100, mas as consultas usadas para os totais não têm esse limite:
[finance/page.tsx](src/app/dashboard/finance/page.tsx#L62) e
[reports/page.tsx](src/app/dashboard/reports/page.tsx#L40).

**Impacto:** à medida que o número de lançamentos ou atendimentos no período
cresce, o banco transfere e o servidor processa mais linhas sem necessidade
para métricas que podem ser agregadas no PostgreSQL.

**Solução:** mover somas para `SUM`/`aggregate` e contagens/agrupamentos por
serviço e estado para consultas agregadas. Manter a consulta de detalhe da lista
separada, com paginação. Comparar resultado e custo com os filtros atuais,
incluindo nulos, datas e valores monetários.

### P2 — Consultas de conflito de horário podem percorrer histórico

**Evidência:** a validação de disponibilidade usa `startsAt < fim` e
`endsAt > início`, sem um limite inferior de `startsAt`, em
[calendar.ts](src/app/actions/calendar.ts#L82) e
[public-booking.ts](src/app/actions/public-booking.ts#L190). O schema indexa
profissional/início, mas não `endsAt`, em
[schema.prisma](prisma/schema.prisma#L125).

**Impacto:** a condição de início pode incluir praticamente todos os
atendimentos passados daquele profissional; a condição de fim é aplicada como
filtro. A tendência de custo cresce com o histórico da agenda.

**Solução:** medir com `EXPLAIN (ANALYZE, BUFFERS)` em dados representativos.
Depois, usar um limite inferior correto baseado nas durações máximas e nas
regras de mesmo dia, ou avaliar índice GiST sobre intervalos de tempo. Se for
apropriado, considerar uma restrição de exclusão no banco para impedir
sobreposições concorrentes, mantendo o isolamento por profissional e status.
Não adicionar índice sem medir tamanho, plano e custo de escrita.

### P2 — Busca da lista de clientes não corresponde aos índices atuais

**Evidência:** a tela usa `contains` para nome e WhatsApp, em
[clients/page.tsx](src/app/dashboard/clients/page.tsx#L53). O schema tem
índices B-tree comuns em `[professionalId, name]` e
`[professionalId, whatsapp]` em [schema.prisma](prisma/schema.prisma#L80).
O novo autocomplete usa prefixo normalizado e tem índices próprios, mas a
pesquisa da lista ainda usa correspondência parcial.

**Impacto:** em PostgreSQL, padrões equivalentes a `%termo%` não são normalmente
acelerados por B-tree. A paginação limita o resultado enviado, mas não torna
necessariamente barata a busca que encontra esses resultados.

**Solução:** confirmar o plano da consulta com volumes reais; decidir se o
produto precisa de substring, prefixo, trigram ou busca por telefone
normalizado; criar somente o índice compatível com a semântica escolhida. O
índice trigram tem custo adicional de armazenamento e manutenção.

### P2 — Consultas financeiras filtram por `paidAt` sem índice dedicado

**Evidência:** financeiro e relatórios filtram por profissional, estado/tipo e
faixa de `paidAt`; no schema há índice em profissional/tipo/estado e em
profissional/data de vencimento, mas não há índice em `paidAt` para
`Transaction`. Ver [schema.prisma](prisma/schema.prisma#L172).

**Solução:** obter planos e métricas antes de criar índice composto/parcial
específico, pois novos índices ocupam espaço e aumentam o custo de cada
gravação.

### P2 — Foto do perfil ocupa espaço do PostgreSQL como Base64

**Evidência:** `logoUrl` é `TEXT` em
[schema.prisma](prisma/schema.prisma#L45) e a ação grava uma Data URL em
[account.ts](src/app/actions/account.ts#L227). A entrada é limitada a 50 KB,
mas Base64 aumenta o tamanho do conteúdo binário em aproximadamente um terço,
além do prefixo da Data URL.

**Impacto:** a imagem aumenta o armazenamento e o tráfego de leitura do perfil.
O layout do dashboard também seleciona a coluna do perfil em
[layout.tsx](src/app/dashboard/layout.tsx#L20).

**Solução:** guardar a imagem em armazenamento de objetos (por exemplo,
Firebase Storage ou serviço compatível), manter no PostgreSQL apenas a URL/chave
e definir substituição, acesso público, remoção, limite de tamanho e compressão.
Migrar imagens existentes com verificação e rollback antes de remover o formato
atual.

### P2 — Painel administrativo executa muitas consultas e grava a cada visita

**Evidência:** a página cria um `AdminAuditLog` a cada carregamento e inicia
várias contagens, agregações e duas listagens em
[admin/page.tsx](src/app/admin/page.tsx#L75). As listagens são limitadas a 100;
as contagens são globais.

**Impacto:** chamadas administrativas repetidas geram gravações de auditoria
sem retenção visível e diversas consultas sobre o conjunto global de contas.

**Solução:** decidir quais acessos precisam de auditoria e retenção, eliminar
registros redundantes ou consolidar eventos, e medir se contagens podem ser
agrupadas/cacheadas sem comprometer precisão. A lista recente é limitada a 100,
mas não há navegação para consultar itens anteriores.

### P3 — Revisar tamanho de imagens estáticas

**Evidência:** as imagens `slide_1.png` a `slide_7.png` em `public/brand`
ocupam juntas cerca de 2,2 MB. São referenciadas pelo tour de boas-vindas, em
[welcome-tour.tsx](src/components/onboarding/welcome-tour.tsx#L14).

**Solução:** verificar dimensões, compressão e formatos modernos; manter
originais somente se necessários e confirmar o tamanho efetivamente transferido
no navegador/CDN. Priorizar a otimização das imagens carregadas no primeiro
acesso do tour.

## 5. Paginação e listas

As mudanças recentes já corrigem parte importante do problema: a tela de
clientes carrega 25 por página, o formulário da agenda consulta clientes por
autocomplete e o agendamento público não carrega a carteira inteira. Ainda
restam observações:

- A paginação de clientes usa `skip`/offset e permite páginas muito distantes
  em [clients/page.tsx](src/app/dashboard/clients/page.tsx#L14). Para volumes
  elevados, trocar para paginação por cursor com ordenação estável por nome e
  ID; no curto prazo, também convém limitar o número máximo de página aceito.
- A pesquisa da tela e a busca do autocomplete têm semânticas diferentes:
  a primeira usa substring; o autocomplete usa prefixo normalizado e a busca
  por telefone é pelo início do número. Documentar isso na interface ou
  unificar a experiência.
- A seleção de serviços continua sem paginação em várias telas. É aceitável se
  o número de serviços por profissional for naturalmente pequeno; definir um
  limite de produto ou busca sob demanda caso isso mude.
- A agenda e a página pública consultam compromissos por janela temporal, o que
  é melhor que carregar o histórico inteiro. O risco específico está nas
  consultas de conflito sem limite inferior descritas acima.
- Financeiro já limita a lista visível a 100, mas não permite navegar além
  desse conjunto; se o usuário esperar histórico completo, adicionar paginação
  sem alterar a consulta dos agregados.

## 6. Pagamentos, consistência e retenção

### P2 — Estados de reembolso/contestação não têm política de acesso explícita

O sincronizador atualiza os dados de pagamento, mas só concede prazo adicional
quando o estado é `approved`; não há um fluxo evidente que reverta ou bloqueie
acesso em caso de reembolso ou chargeback. Definir a regra comercial e jurídica
e implementá-la de forma idempotente, testando reentrega e mudança de estado de
webhook. Referências: [subscription-payments.ts](src/lib/subscription-payments.ts#L50)
e [route.ts](src/app/api/webhooks/mercadopago/route.ts#L69).

### P2 — Dados de pagamento e logs sem retenção operacional definida

`SubscriptionPayment` conserva detalhes e status de pagamentos; `AdminAuditLog`
guarda consultas administrativas. Não encontrei política de retenção ou tarefa
de limpeza/anonimização no repositório. Definir a retenção exigida e a necessária
para suporte, reconciliação e obrigações legais, sem apagar evidência contábil
indevidamente.

### P2 — Detalhes de pagamento são enviados ao log

**Evidência:** a ação registra o payload do checkout em `console.log`; esse
payload contém o e-mail do pagador e a referência da conta/plano. No caminho de
erro, `serializeErrorDetails` serializa propriedades próprias do erro do SDK
Mercado Pago, em [subscriptions.ts](src/app/actions/subscriptions.ts#L131).

**Risco:** dados pessoais e detalhes técnicos podem ser retidos em logs do
provedor por mais tempo e com acesso mais amplo que o banco da aplicação.

**Solução:** substituir o payload completo por evento, resultado, código seguro
e identificador de correlação; redigir e-mails, tokens, headers e corpos antes
de registrar erros; definir acesso e retenção de logs.

## 7. Segurança, confiabilidade e prontidão operacional

### P2 — Sessão própria não acompanha revogação Firebase até expirar

O cookie JWT da aplicação dura cinco dias em
[firebase-session.ts](src/lib/firebase-session.ts#L47). A sessão é validada
localmente; ela não consulta a revogação do Firebase em cada requisição. O
README já documenta esse comportamento em
[README.md](README.md#L159).

**Solução:** decidir se a janela de até cinco dias é aceitável para o risco do
produto. Se não for, reduzir a duração ou implementar revogação/versionamento
server-side com custo de consulta consciente. Testar logout, senha alterada,
conta desativada e remoção de usuário.

### P2 — Ausência de pipeline automatizado de release no repositório

Não há workflow `.github`, configuração de teste ponta a ponta ou teste de
integração de ações, banco, Firebase, webhook e checkout identificados. Os
testes existentes cobrem helpers de agenda, valores e normalização; o suite
atual possui 39 casos.

**Solução:** adicionar CI que execute lint, teste, geração Prisma, typecheck e
build em ambiente limpo; acrescentar testes de integração com PostgreSQL
temporário para isolamento por profissional, criação/cancelamento/conclusão de
atendimento, idempotência de pagamento e exclusão parcial. Manter sandbox dos
provedores para testes de ponta a ponta que não possam ser simulados.

### P2 — Build local depende de limpar/verificar tipo gerado obsoleto

O `tsconfig.json` inclui `.next/dev/types/**/*.ts` em
[tsconfig.json](tsconfig.json#L32). Neste workspace, esse diretório contém
referências geradas para uma rota NextAuth que não existe no código
([validator.ts](.next/dev/types/validator.ts#L245)); o build local falhou na
etapa de TypeScript por essa referência.

**Solução:** reproduzir `npm ci` e build em workspace limpo/CI sem reaproveitar
tipos de desenvolvimento antigos. Se necessário, ajustar o processo para limpar
artefatos gerados antes do build; não excluir artefatos compartilhados sem
confirmar o impacto para quem usa o workspace.

### P2 — Backup e recuperação não estão descritos como operação testada

O README deixa backups essenciais por conta do usuário e não documenta plano
operacional de backup/restauração do banco. A configuração real da Neon pode
oferecer mecanismos próprios, mas isso não foi verificável pelo repositório.

**Solução:** confirmar retenção/PITR e limites do plano Neon, RPO/RTO, acesso,
criptografia e alertas; testar restauração em ambiente separado; documentar
passos e responsáveis. Fazer o mesmo para arquivos de perfil caso sejam
migrados para armazenamento de objetos.

### P3 — Observabilidade de produção não está definida no código

Não encontrei integração de monitoramento de erros, métricas de latência,
correlação de requisições ou health checks. Há `console.error` e logs
estruturados limitados em autenticação; isso ajuda em desenvolvimento, mas não
estabelece alertas ou acompanhamento de incidentes.

**Solução:** escolher uma plataforma de logs/erros compatível com a política de
privacidade, incluir IDs de correlação sem PII, acompanhar falhas de webhook,
checkout, banco e exclusão e configurar alertas de volume/custo/latência.

## 8. Arquivos e itens possivelmente sem uso

1. **SVGs de template do Next.js:** `public/file.svg`, `public/globe.svg`,
   `public/next.svg`, `public/vercel.svg` e `public/window.svg` não apareceram
   referenciados em `src` ou no README. Confirmar que não são consumidos por
   conteúdo externo ou ferramenta de deploy antes de removê-los.
2. **Pasta `vitta-beauty` no workspace:** a pasta observada é um reparse point
   vazio e não consta entre os arquivos rastreados pelo Git. Parece artefato
   local, não parte do projeto versionado; confirmar o destino/uso no OneDrive
   antes de qualquer limpeza.
3. **Utilitário `gerar_estrutura.py`:** não é chamado pelos scripts npm nem
   documentado no README. Se continuar útil, documentar o uso e declarar a
   dependência Python `pathspec`; caso contrário, avaliar remoção em uma mudança
   separada.
4. **Service worker sem estratégia de cache/offline:** `public/sw.js` apenas
   encaminha requisições GET para `fetch`. Isso não oferece modo offline nem
   caching; a instalação PWA pode continuar funcional, mas não se deve anunciar
   suporte offline até implementar e testar uma estratégia segura.
5. **Status `NO_SHOW`:** aparece no enum e em rótulos de exibição, mas não
   encontrei uma ação da interface que marque atendimento como falta.
   Implementar a transição se a funcionalidade for parte do produto ou retirar
   o estado/rótulo não utilizado em alteração de schema controlada.

## 9. Plano sugerido antes do lançamento

### Etapa A — Decisões e bloqueadores

- Confirmar modelo de cobrança (pagamento único ou recorrente) e atualizar
  checkout, textos, política e retorno do Mercado Pago.
- Implementar limites de chamadas públicas e proteções antiabuso.
- Decidir e fechar o fluxo de bloqueio de agenda anunciado.
- Validar com especialista os termos, privacidade, retenção e exclusão.
- Desenhar e testar recuperação automática de exclusões parciais.

### Etapa B — Deploy reproduzível e segurança operacional

- Criar migrations versionadas e incluir índices SQL no processo de deploy.
- Configurar CI em workspace limpo para lint, testes, typecheck e build.
- Confirmar backups, restauração, monitoramento e alertas de produção.
- Reduzir dados pessoais em logs e definir retenção/auditoria.
- Testar webhooks e checkout com os domínios e credenciais de produção.

### Etapa C — Desempenho e escala

- Medir queries e CU-hours reais na Neon por rota e profissional.
- Agregar no banco os totais de relatórios/financeiro.
- Otimizar buscas de clientes e paginação com planos de execução.
- Medir queries de conflito e aplicar índices/restrições somente com evidência.
- Avaliar mover imagens de perfil para object storage.

## 10. Limites desta auditoria

- Revisão estática do repositório local; não foi feito pentest nem acesso a
  contas de produção.
- Sem métricas Neon, volume real de registros, `EXPLAIN ANALYZE`, custos de
  Vercel/Firebase/Mercado Pago ou configuração real do ambiente, os achados de
  desempenho e operação são hipóteses baseadas no padrão de código e precisam de
  medição.
- A revisão de termos e privacidade identifica lacunas técnicas/documentais,
  mas não é parecer jurídico.
- Itens apontados como “possíveis sem uso” devem ser confirmados com o processo
  de deploy e o workspace antes de qualquer exclusão.
