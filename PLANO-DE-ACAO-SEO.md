# Plano de ação: SEO, GEO e visibilidade do Vitta Beauty

**Objetivo:** melhorar a capacidade de buscadores e mecanismos de resposta com IA de encontrar, compreender e apresentar o Vitta Beauty para profissionais da beleza que pesquisam soluções de agenda, agendamento online e gestão do negócio.

**Escopo deste documento:** plano de trabalho de SEO (otimização para mecanismos de busca), Search Console e GEO (otimização para mecanismos generativos/de resposta com IA). GEO não é um padrão oficial nem uma garantia de citação. As observações são uma fotografia feita em 2 de novembro de 2026 e devem ser verificadas antes de executar.

**Status em 2 de novembro de 2026:** as melhorias técnicas de SEO/GEO descritas neste plano foram implementadas no código local e validadas com lint, TypeScript, testes, build e verificações HTTP locais. Elas só estarão publicadas após o deploy. Envio/verificação no Search Console, medições externas e monitoramento contínuo ainda dependem de ações pós-deploy.

## 1. O que SEO pode e não pode fazer

SEO reúne melhorias técnicas e editoriais para que mecanismos de busca compreendam melhor um site e o mostrem quando ele for relevante para uma pesquisa. Não existe configuração que garanta primeira posição, quantidade específica de visitantes ou exibição de um título, descrição, sitelink ou snippet exato.

O Google decide se e quando rastreia, indexa e mostra cada página. Mudanças podem levar semanas ou mais para refletirem nos resultados. O Search Console ajuda a acompanhar e diagnosticar esse processo; não é uma ferramenta para escolher uma posição nem para cadastrar palavras-chave que obriguem o Google a exibir o site.

GEO é um nome usado para descrever práticas que tornam informações mais fáceis de encontrar, entender e citar por mecanismos de resposta generativa. Na prática, as bases de SEO continuam fundamentais: páginas rastreáveis e indexáveis, conteúdo útil e original, fatos claros, boa experiência e reputação legítima. O Google informa que não há requisitos técnicos ou marcação especiais para aparecer nas suas experiências de IA. Outras plataformas têm políticas e robôs próprios, que podem mudar.

Portanto, o plano não tenta “enganar” modelos nem promete citações. Ele prioriza informações verificáveis e úteis para pessoas, mantém controle sobre quais rastreadores podem acessar o site e propõe medir menções/citações com uma metodologia consistente, reconhecendo que essa medição é incompleta.

## 2. Situação observada em 2 de novembro de 2026

Esta fotografia considera o código e os endereços de produção consultados durante a análise. Deve ser atualizada antes de executar o plano, pois o site ou o deploy podem mudar.

- A landing page está publicada na rota `/`, com um título e uma descrição definidos no metadata do Next.js.
- A página contém conteúdo textual renderizado, um único título principal (`H1`), apresentação de recursos e demonstrações do produto.
- O sitemap está definido em `src/app/sitemap.ts` e foi observado em `https://vittabeauty.vercel.app/sitemap.xml`, contendo `/`, `/login` e `/cadastro`.
- As páginas `/login` e `/cadastro` respondem publicamente, mas têm como objetivo principal permitir acesso ou registro, não atrair buscas informativas.
- Na resposta HTML da landing consultada não foram encontrados canonical nem metadados Open Graph específicos.
- `/robots.txt` retornou 404 na consulta de produção. Isso não impede automaticamente a indexação, mas significa que ainda não há instruções explícitas para rastreadores nem indicação do sitemap nesse arquivo.
- A landing usa vídeos externos do YouTube. Os vídeos são uma demonstração útil para visitantes, mas não devem substituir os textos que explicam o produto.
- A propriedade do Search Console usada até aqui é `https://vittabeauty.vercel.app/`. Um domínio próprio, caso seja adotado depois, será outra decisão e precisará ser verificado e configurado de maneira consistente.
- A presença do Vitta em respostas de ferramentas de IA, quais robôs de IA acessam o site e quais fontes externas citam a marca não foram auditadas. Não presumir que qualquer plataforma rastreia ou cita o site.

## 3. Decisões de estratégia antes de implementar

### 3.1 Definir o domínio principal

Manter `vittabeauty.vercel.app` enquanto ele for o endereço oficial ou configurar um domínio próprio, como `vittabeauty.com.br`, se estiver disponível e fizer sentido para o negócio.

Se um domínio próprio for escolhido:

1. Adicioná-lo ao projeto Vercel e confirmar HTTPS.
2. Escolher uma única versão oficial, com ou sem `www`.
3. Redirecionar as outras versões para a oficial com redirecionamento permanente.
4. Atualizar `NEXT_PUBLIC_APP_URL`, links públicos, metadata e sitemap para o domínio escolhido.
5. Adicionar e verificar a propriedade correta no Search Console.

Não alternar URLs canônicas entre o domínio Vercel e o domínio próprio.

### 3.2 Escolher quais páginas devem aparecer na busca

Recomendação inicial:

- **Landing `/`:** indexável; é a principal página de aquisição.
- **Login `/login`:** manter acessível a pessoas e clientes, mas avaliar `noindex` e remover do sitemap. É uma tela funcional, não uma página que precisa competir em buscas.
- **Cadastro `/cadastro`:** mesma recomendação do login.
- **Agendamentos públicos `/agendar/[slug]`:** tomar uma decisão de produto antes de incluí-los no índice. Eles podem ser úteis se a profissional quiser divulgar sua página pública no Google, mas podem conter pouco conteúdo exclusivo e dados de negócio. Se forem indexáveis, cada profissional deve entender isso e consentir com a divulgação; as páginas precisam ter conteúdo público correto, canonical próprio e política clara. Caso contrário, mantê-las fora do índice. O `robots.txt` sozinho não é método para remover conteúdo do índice.
- **Painel, APIs, autenticação e páginas privadas:** nunca incluir no sitemap. A proteção por autenticação continua sendo a medida de acesso; `noindex` e regras de rastreamento não substituem autorização.

O sitemap deve conter somente URLs canônicas, públicas, úteis e que possam ser indexadas. Não é necessário listar todas as rotas do aplicativo.

## 4. Plano de ação por prioridade

### Prioridade 0 — Estabelecer o endereço oficial e confirmar acesso

**Objetivo:** evitar que Google e visitantes encontrem versões divergentes do site.

- [ ] Confirmar se `vittabeauty.vercel.app` continuará sendo o domínio principal ou se será usado domínio próprio.
- [ ] Confirmar que a propriedade do Search Console corresponde exatamente à versão HTTPS e ao domínio oficial escolhido.
- [ ] Verificar que landing, login, cadastro, sitemap e arquivo de verificação respondem sem redirecionamentos inesperados.
- [ ] Revalidar o arquivo de verificação do Search Console depois do deploy que o publicou.
- [ ] Não remover a verificação enquanto a propriedade ainda depender desse método.

**Critério de conclusão:** a versão oficial do site está definida, acessível em HTTPS e verificada no Search Console.

### Prioridade 1 — Concluir o rastreamento e a indexação técnica

**Arquivos prováveis:** `src/app/robots.ts`, `src/app/sitemap.ts` e, para regras por página, metadata dos respectivos `page.tsx`.

#### Sitemap

- [ ] Manter no sitemap apenas as páginas que passaram pela decisão da seção 3.2. A recomendação inicial é deixar a landing; decidir se login e cadastro serão excluídos.
- [ ] Não adicionar URLs com parâmetros de consulta, estados de pagamento, IDs de agendamento ou rotas privadas.
- [ ] Incluir páginas públicas de profissionais somente depois da decisão sobre consentimento, conteúdo e indexação.
- [ ] Usar URLs absolutas, HTTPS e o domínio oficial.
- [ ] Confirmar que cada URL listada responde com sucesso, é canônica e não contém `noindex`.

#### robots.txt

- [ ] Criar a rota `robots.txt` usando a convenção do App Router do Next.js.
- [ ] Apontar para o sitemap absoluto, por exemplo `https://DOMINIO-OFICIAL/sitemap.xml`.
- [ ] Permitir o rastreamento das páginas públicas e dos recursos necessários para renderizá-las.
- [ ] Criar regras de bloqueio apenas quando houver uma necessidade real de reduzir rastreamento. Não usar `Disallow` como substituto de autenticação ou `noindex`.
- [ ] Testar `https://DOMINIO-OFICIAL/robots.txt` e `https://DOMINIO-OFICIAL/sitemap.xml` no navegador e no Search Console.

#### Inspeção e indexabilidade

- [ ] Inspecionar a landing com a ferramenta de Inspeção de URL.
- [ ] Executar o teste da URL publicada e confirmar que o Google consegue rastrear e renderizar a página.
- [ ] Solicitar indexação da landing após o deploy, entendendo que o pedido não garante inclusão imediata.
- [ ] Verificar o relatório **Indexação > Páginas** para erros, duplicatas, URLs bloqueadas ou excluídas.
- [ ] Revisar os relatórios de ações manuais e problemas de segurança.

**Critério de conclusão:** o sitemap pode ser lido, as URLs do sitemap são elegíveis à indexação e a landing pode ser rastreada sem erro.

### Prioridade 2 — Melhorar o resultado de busca da landing

**Arquivos prováveis:** `src/app/page.tsx`, `src/app/layout.tsx` e `src/components/landing/landing-page.tsx`.

#### Título, descrição e canonical

- [ ] Trocar o título exclusivamente emocional por um título conciso que também identifique o que o Vitta oferece e para quem. Exemplo para avaliar: **“Agenda online para profissionais da beleza | Vitta Beauty”**.
- [ ] Escrever uma descrição única e fiel ao conteúdo, explicando agenda, agendamento online e gestão. Exemplo para avaliar: **“Organize serviços e horários, compartilhe seu link de agendamento e acompanhe clientes e atendimentos com o Vitta Beauty.”**
- [ ] Não repetir palavras-chave artificialmente nem depender de uma quantidade fixa de caracteres. O Google pode encurtar ou reescrever título e snippet.
- [ ] Definir um `metadataBase` coerente com o domínio oficial, se necessário para metadados absolutos.
- [ ] Definir um canonical absoluto para a landing no domínio oficial.
- [ ] Garantir um único `H1` descritivo, alinhado ao conteúdo, sem perder o tom acolhedor da marca.
- [ ] Conferir que headings seguintes (`H2`, `H3`) descrevem seções e não são usados apenas para obter tamanho visual.

#### Compartilhamento e identidade visual

- [ ] Definir metadados Open Graph e Twitter para compartilhamento da landing.
- [ ] Criar uma imagem social própria, otimizada e hospedada no domínio oficial, com marca legível e proporção adequada.
- [ ] Usar texto alternativo descritivo em imagens informativas; deixar imagens decorativas com alternativa vazia ou marcação equivalente.
- [ ] Confirmar que o ícone e o nome do site aparecem corretamente em abas e previews.

**Critério de conclusão:** HTML publicado contém título, descrição, canonical e metadados de compartilhamento coerentes; a página tem hierarquia semântica clara.

### Prioridade 3 — Tornar o conteúdo útil para buscas reais

#### Foco inicial: uma página forte em vez de várias páginas rasas

- [ ] Manter a landing como página principal de aquisição e explicar explicitamente que o Vitta é uma plataforma para **profissionais da beleza**.
- [ ] Cobrir naturalmente necessidades como agenda online, agendamento sem conta para a cliente, organização de horários e serviços, gestão de clientes e controle financeiro.
- [ ] Explicar como funciona a modalidade de sinal e distinguir Pix manual de confirmação automática, sem prometer condições ou taxas que não estejam atualizadas.
- [ ] Manter informação real, específica e verificável. Evitar depoimentos, números de clientes, resultados financeiros ou comparações inventados.
- [ ] Transformar vídeos em apoio visual: conservar texto suficiente na página para explicar cada funcionalidade, já que o conteúdo falado/visual do vídeo não substitui uma explicação HTML clara.
- [ ] Adicionar uma seção de perguntas frequentes se ela ajudar pessoas de verdade, com respostas visíveis na página. Não criar FAQ só para tentar obter um resultado especial no Google.

#### Conteúdo futuro

- [ ] Coletar dúvidas frequentes de profissionais e suporte.
- [ ] Planejar artigos ou páginas que respondam dúvidas específicas, por exemplo: como organizar a agenda de uma profissional da beleza; como reduzir faltas com confirmação de horários; como apresentar serviços e duração para clientes.
- [ ] Publicar somente quando houver orientação original, completa e útil. Não criar páginas quase iguais trocando apenas “manicure”, “designer” ou outra profissão.
- [ ] Cada página editorial deve ter intenção clara, título próprio, conteúdo suficiente, links internos úteis e um próximo passo apropriado.
- [ ] Usar os dados de **Desempenho > Consultas** para descobrir termos que já geram impressões e ajustar o conteúdo com base nesses sinais.

**Critério de conclusão:** cada página publicada resolve uma intenção real, sem conteúdo duplicado ou criado apenas para inserir termos.

### Prioridade 4 — Preparar conteúdo para respostas de IA (GEO)

**Objetivo:** facilitar que buscadores e sistemas de resposta encontrem fatos corretos sobre o Vitta e possam referenciar as páginas como fonte, sem sacrificar clareza para o público.

#### Conteúdo claro, comprovável e útil

- [ ] Criar uma página institucional “Sobre o Vitta Beauty” com o que é o produto, para quem foi criado, quais problemas resolve, quem o desenvolve/operacionaliza e formas de contato. Publicar apenas dados que possam ser confirmados.
- [ ] Explicar funcionalidades com estrutura previsível: o que é, para quem serve, como funciona, requisitos/limitações e onde obter ajuda. Responder à dúvida principal diretamente e acrescentar contexto útil.
- [ ] Organizar cada página com um `H1` que descreva o assunto principal e subtítulos em ordem lógica (`H2` para seções, `H3` para subseções relacionadas). Não pular níveis sem motivo nem escolher headings apenas pelo estilo visual; tamanho e aparência devem ser controlados por CSS.
- [ ] Revisar protótipos visuais de telas do produto: textos que parecem títulos dentro de um mockup não devem entrar na hierarquia de headings da página se forem apenas decoração da demonstração. Usar elementos de texto comuns nesse caso; preservar headings semânticos quando o conteúdo realmente for uma seção da página.
- [ ] Usar HTML semântico para o conteúdo e suas relações: `main`, `section` com título associado, `article` quando houver conteúdo independente, listas para conjuntos de itens e links com texto que explique o destino. Manter a navegação entre páginas por links HTML rastreáveis.
- [ ] Colocar a resposta e os fatos essenciais em texto visível no HTML da página, próximos ao título da seção correspondente. Evitar depender de canvas, imagem, texto embutido em imagem, interação obrigatória, conteúdo inacessível ou scripts de terceiros para comunicar o que o produto faz.
- [ ] Ao publicar informação estruturada (`JSON-LD`/Schema.org), garantir que descreva a mesma informação visível no conteúdo, manter os dados atualizados e validar a implementação. Dados estruturados ajudam a descrever entidades, mas não garantem que uma IA os use, nem substituem conteúdo claro.
- [ ] Esclarecer detalhes sensíveis à decisão, como preços, planos, taxas, formas de pagamento, confirmação de sinal e disponibilidade de recursos. Informar condições e fonte quando aplicável; não publicar valores que possam ficar desatualizados sem processo de revisão.
- [ ] Manter descrições textuais das funcionalidades e demonstrações em HTML legível, além dos vídeos. Não depender apenas de vídeo, imagem, texto dentro de imagem ou conteúdo que só aparece após interação.
- [ ] Quando houver artigos, atribuir autoria ou revisão a alguém com experiência pertinente e incluir fontes primárias para afirmações factuais, especialmente sobre pagamentos, privacidade e obrigações legais.
- [ ] Exibir data de publicação ou revisão quando isso ajudar a pessoa a avaliar conteúdo sujeito a mudanças. Atualizar a página quando o produto ou as condições mudarem; não alterar datas sem revisão real.
- [ ] Criar FAQ apenas com dúvidas reais e respostas completas, visíveis na página e coerentes com o produto atual. A organização em pergunta e resposta ajuda a leitura, mas não garante citação ou resultado especial.
- [ ] Usar nomes consistentes para a marca e funcionalidades em todas as páginas, canais próprios e perfis oficiais, sem criar perfis falsos ou páginas de marca duplicadas.

#### Acesso dos rastreadores e controle

- [ ] Antes de alterar `robots.txt`, identificar quais mecanismos de IA são relevantes e consultar a documentação atual de cada fornecedor sobre user agents, finalidades e regras.
- [ ] Para o Google, não confundir rastreamento da Pesquisa com treinamento: a documentação indica que as funcionalidades de IA da Pesquisa usam os controles do Googlebot, enquanto Google-Extended controla usos em alguns outros sistemas de IA. Revisar a documentação oficial antes de bloquear qualquer agente, pois um bloqueio pode afetar a busca ou outros usos de forma diferente.
- [ ] Decidir separadamente se o Vitta permite rastreadores usados para busca/respostas e se permite rastreadores associados a outros usos, como treinamento, quando o fornecedor oferecer controles distintos.
- [ ] Aplicar regras somente depois de avaliar implicações de negócio, privacidade, direitos sobre conteúdo e comportamento real da infraestrutura/CDN. Não presumir que todos os robôs obedecem às mesmas regras.
- [ ] Confirmar que firewall, hospedagem ou proteção contra bots não bloqueia inadvertidamente rastreadores que o Vitta decidiu permitir.
- [ ] Não expor conteúdo privado, dados de clientes, informações de agendamento ou material interno para facilitar a leitura por IA. Conteúdo público precisa ser aprovado para divulgação pública.
- [ ] Não criar `llms.txt`, arquivos “AI-friendly” ou marcação especial como prioridade inicial. O Google declara que não precisa de arquivos ou marcações adicionais para suas funcionalidades de IA; outros fornecedores podem ter orientações próprias. Tratar propostas sem suporte claro como experimentais e nunca como substituto de SEO, sitemap ou controle de acesso.

#### Medição realista de presença em IA

- [ ] Registrar uma linha de base antes de mudanças: um conjunto pequeno e estável de perguntas que clientes potenciais realmente fariam, como “como organizar agendamentos para uma profissional da beleza?” e “quais sistemas oferecem agendamento online para profissionais da beleza?”.
- [ ] Testar periodicamente as mesmas perguntas em cada plataforma relevante, em português do Brasil e sem induzir respostas. Registrar data, plataforma, pergunta, se a marca foi mencionada, se as informações estavam corretas e quais URLs foram citadas.
- [ ] Separar menção sem link, citação com link, tráfego encaminhado e conversão; não contar uma menção como visita ou cliente.
- [ ] Quando possível, usar analytics e relatórios de referência para acompanhar visitas provenientes de ferramentas de IA. Interpretar com cautela: fontes podem não ser identificadas, encaminhamentos podem perder o referenciador e nem toda visita resulta de uma resposta citada.
- [ ] Consultar Search Console para desempenho da Pesquisa Google, inclusive recursos de IA quando incluídos nos relatórios disponíveis. Não tratar o Search Console como relatório universal de citações de todas as IAs.
- [ ] Anotar alterações de conteúdo e produto junto com as medições; comparar períodos e exemplos, sem atribuir causalidade a uma única mudança.

**Critério de conclusão:** fatos importantes sobre o Vitta estão publicados em páginas acessíveis, corretos e revisáveis; as permissões de rastreamento foram decididas conscientemente; existe uma medição repetível de menções e citações, sem alegar cobertura total.

**Como a extração funciona:** rastreadores acessam URLs públicas permitidas, recebem a página e tentam interpretar seu HTML e conteúdo. Títulos, subtítulos, parágrafos, listas, links e dados estruturados coerentes ajudam a identificar relações e contexto. Cada plataforma usa seus próprios sistemas e pode não processar todos os recursos ou citar a página. Não há um formato especial que force a extração; conteúdo bloqueado, privado, não renderizado ou presente apenas em vídeo/imagem pode não ser compreendido como se fosse texto HTML acessível.

### Prioridade 5 — Dados estruturados, sem promessas de rich results

- [ ] Avaliar marcação `Organization` ou `WebSite` para identificar corretamente a marca e o domínio, usando somente dados verdadeiros.
- [ ] Avaliar `SoftwareApplication` somente se os campos exigidos e os detalhes sobre o produto, plataforma e preço forem atuais e verificáveis.
- [ ] Não marcar o Vitta como salão local (`LocalBusiness`) se ele não for um estabelecimento físico que atende clientes naquele endereço.
- [ ] Não criar avaliações, notas, preço ou disponibilidade estruturados sem correspondência visível e comprovável na página.
- [ ] Não esperar que `FAQPage` gere um FAQ expandido nos resultados: o Google restringe bastante esse formato e não há garantia de exibição.
- [ ] Validar dados estruturados com o teste de resultados avançados do Google e corrigir somente erros e avisos aplicáveis.

**Critério de conclusão:** marcação válida e alinhada ao conteúdo visível; nenhuma informação estruturada fictícia ou exagerada.

### Prioridade 6 — Experiência, velocidade e acessibilidade

- [ ] Medir a landing com PageSpeed Insights em celular e desktop antes de otimizar.
- [ ] Acompanhar LCP, INP e CLS; priorizar problemas percebidos por pessoas e confirmados por medições.
- [ ] Verificar tamanho e carregamento das imagens, dimensões explícitas e estabilidade do layout.
- [ ] Confirmar que o vídeo não bloqueia a página: carregar o player apenas quando necessário, manter miniatura leve e permitir abrir o vídeo no YouTube.
- [ ] Revisar contraste, navegação por teclado, foco visível, rótulos e links para telas menores.
- [ ] Evitar enviar a visitantes dados pessoais em URLs ou em ferramentas de medição.
- [ ] Consultar o relatório **Core Web Vitals** do Search Console quando houver dados de campo suficientes; uma propriedade nova pode não ter dados ainda.

**Critério de conclusão:** a experiência funciona em dispositivos móveis e medições não apontam problemas graves que possam ser corrigidos no código.

### Prioridade 7 — Descoberta fora do site e confiança

- [ ] Manter nome, domínio e descrição da marca consistentes nas redes sociais e perfis públicos.
- [ ] Compartilhar o site em canais próprios e buscar referências editoriais legítimas de parceiros ou comunidades relevantes.
- [ ] Não comprar links, avaliações ou tráfego artificial, nem participar de esquemas de links.
- [ ] Criar Perfil da Empresa no Google somente se a operação atender às regras de elegibilidade para negócios locais. Uma plataforma online sem atendimento presencial elegível não deve inventar endereço ou perfil local.
- [ ] Não esperar que o Search Console gere divulgação por si só; ele é diagnóstico e medição, não canal de promoção.

## 5. Como usar o Search Console e acompanhar GEO depois do deploy

1. **Sitemaps:** enviar `sitemap.xml` depois que a versão atualizada estiver publicada; verificar status e URLs descobertas.
2. **Inspeção de URL:** testar a landing, conferir acesso e canonical e pedir indexação quando apropriado.
3. **Indexação > Páginas:** revisar por que URLs foram indexadas ou excluídas; não tratar toda exclusão como erro — páginas com `noindex` podem estar corretamente excluídas.
4. **Desempenho > Resultados da pesquisa:** acompanhar impressões, cliques, CTR e posição média; segmentar por consulta, página, país, dispositivo e período.
5. **Core Web Vitals:** monitorar grupos de páginas com dados de usuários reais quando houver volume.
6. **Segurança e ações manuais:** verificar alertas sempre que houver notificação e durante revisões periódicas.
7. **Links:** usar como diagnóstico de links que o Google encontrou; não é uma lista completa nem uma ferramenta para solicitar posicionamento.
8. **Experiências de IA do Google:** a documentação atual informa que o tráfego dessas experiências é incluído no tipo de pesquisa **Web** do relatório de desempenho, sem um relatório universal de citações. O Search Console não identifica menções em outras plataformas e pode não separar cada experiência de IA.

### Rotina mensal inicial

- Registrar cliques, impressões e CTR da landing.
- Identificar consultas relevantes com impressões e poucos cliques; revisar título e descrição sem prometer algo que a página não entrega.
- Conferir se as páginas principais estão indexadas e se o sitemap foi lido recentemente.
- Revisar erros novos em páginas e experiência.
- Publicar ou atualizar conteúdo apenas quando houver algo útil a acrescentar.
- Repetir uma amostra de perguntas em ferramentas de IA relevantes e anotar menções, citações e erros factuais; usar sempre as mesmas condições para comparação.
- Conferir referências de tráfego atribuídas a assistentes de IA na ferramenta de analytics, quando disponíveis, sem assumir que a atribuição é completa.

## 6. O que não fazer

- Não adicionar a antiga meta tag `keywords` esperando que o Google a use para posicionar páginas.
- Não repetir a mesma expressão em títulos, subtítulos e parágrafos de forma artificial.
- Não enviar ao sitemap login, painel ou URLs de ação/transação apenas para aumentar a contagem de páginas.
- Não bloquear no `robots.txt` uma página que precisa ser rastreada para o Google ler sua regra `noindex`.
- Não usar `robots.txt` para proteger informações; autenticação e autorização devem proteger conteúdo privado.
- Não criar páginas de FAQ ou schema com a expectativa de garantir rich results.
- Não solicitar indexação repetidamente esperando acelerar ou garantir posicionamento.
- Não publicar endereços, avaliações, preços, números ou promessas que não sejam verdadeiros.
- Não alterar domínio canônico sem planejar redirecionamentos e atualização do Search Console.
- Não criar conteúdo em massa, páginas quase duplicadas, respostas superficiais ou textos gerados apenas para tentar aparecer em respostas de IA.
- Não inventar estatísticas, comparações, depoimentos, autoria ou fontes para parecer uma autoridade.
- Não tratar `llms.txt`, schema, repetição de perguntas ou qualquer “hack de GEO” como requisito ou garantia de citação.
- Não permitir rastreamento de conteúdo privado. `robots.txt` não é controle de acesso nem garantia de confidencialidade.
- Não concluir que o Vitta está ou não está sendo citado com base em uma única consulta, plataforma ou captura isolada.

## 7. Ordem recomendada de execução

1. Confirmar domínio principal e estratégia para páginas públicas de agendamento.
2. Ajustar sitemap e implementar `robots.txt`.
3. Decidir e aplicar `noindex` para login/cadastro, se mantidos fora dos resultados.
4. Atualizar título, descrição, canonical e metadados sociais da landing.
5. Fazer deploy e validar respostas públicas, sitemap, robots, canonical e renderização.
6. Reenviar sitemap e inspecionar a landing no Search Console.
7. Criar/atualizar conteúdo institucional e explicações factuais do produto; verificar autoria, fontes e processo de atualização.
8. Decidir quais rastreadores de IA permitir ou bloquear com base nas políticas atuais e na estratégia do Vitta.
9. Registrar a linha de base de consultas, menções/citações em IA e referências de tráfego.
10. Medir a página com PageSpeed Insights e revisar acessibilidade.
11. Acompanhar consultas e dados reais antes de investir em novas páginas de conteúdo.
12. Adicionar dados estruturados somente após definir quais tipos correspondem ao produto.
13. Repetir a revisão mensalmente e priorizar problemas observados, em vez de fazer mudanças sem evidência.

## 8. Critérios gerais de sucesso

O plano estará tecnicamente executado quando:

- o domínio canônico estiver definido e consistente;
- sitemap e `robots.txt` responderem corretamente em produção;
- o sitemap listar somente páginas públicas e intencionalmente indexáveis;
- a landing tiver metadata, canonical e compartilhamento coerentes;
- a Inspeção de URL confirmar que o Google consegue buscar e renderizar a landing;
- os relatórios do Search Console não mostrarem erros técnicos sem investigação;
- o conteúdo for claro, correto, útil e coerente com as consultas que o público usa;
- as políticas de acesso para rastreadores relevantes tiverem sido decididas e registradas;
- fatos essenciais sobre o produto estiverem publicados em conteúdo textual acessível e forem mantidos atualizados;
- houver uma rotina simples para observar, por amostragem, citações em IA e tráfego encaminhado, reconhecendo limitações de cobertura.

Esses critérios melhoram a preparação do site para buscadores e sistemas de resposta, mas **não garantem indexação, tráfego, rich results, menções ou citações em IA nem uma posição específica**.

## 9. Referências oficiais

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Guia inicial de SEO do Google](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Recursos de IA e seu site na Pesquisa Google](https://developers.google.com/search/docs/appearance/ai-features)
- [Criar conteúdo útil, confiável e voltado às pessoas](https://developers.google.com/search/docs/fundamentals/creating-helpful-content)
- [Documentação de sitemap do Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/sitemap)
- [Documentação de robots.txt do Next.js](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/robots)
- [Rastreadores comuns do Google e Google-Extended](https://developers.google.com/search/docs/crawling-indexing/google-common-crawlers)
- [Visão geral de sitemaps do Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview)
- [Inspeção de URL do Search Console](https://support.google.com/webmasters/answer/9012289?hl=pt-BR)
- [Relatório de desempenho do Search Console](https://support.google.com/webmasters/answer/7576553?hl=pt-BR)
- [Sitelinks](https://developers.google.com/search/docs/appearance/sitelinks)
- [Snippets em destaque](https://developers.google.com/search/docs/appearance/featured-snippets)
- [Documentação dos rastreadores da OpenAI](https://developers.openai.com/api/docs/bots)
