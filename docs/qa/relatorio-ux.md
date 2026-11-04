# Relatório de QA — Design e Experiência do Usuário (LevelUSP v2)

Branch `qa/design-ux` (a partir de `develop`) · 17/10/2026 · Agente 2 (QA de design/UX)

## 1. Sumário executivo

Percorri todas as rotas de `apps/web/src/app/**` com os 4 perfis (visitante, aluna, professora e
admin), em 4 tamanhos de tela, com a pilha completa no ar: build de produção standalone, API,
executor WASI real, PostgreSQL com o seed de homologação e Pyodide servido localmente.

**46 achados: 2 críticos, 15 altos, 19 médios e 10 baixos. 29 estão corrigidos nesta branch**
(os 2 críticos, 14 dos 15 altos, 10 médios e 3 baixos). Os outros 17 dependem de decisão de
produto, de reestruturação (o outro agente está refatorando em paralelo) ou do sistema no ar.

Os mais graves:

1. **Prova final perdia todas as respostas quando o tempo acabava** (UX-01, crítica). O envio
   automático usava uma *closure* antiga, montada antes das respostas. A aluna marcava as 5 questões e
   recebia **0%**, além de entrar no tempo de espera de 10 minutos.
2. **A verificação pública de certificado dizia "Certificado não encontrado" para códigos válidos**
   (UX-02, crítica). A página renderizada no servidor consulta a API por `API_INTERNAL_URL`, e essa
   variável só existia no *build* da imagem Docker. Em tempo de execução, o contêiner caía em
   `localhost:4000`, que não existe lá dentro. Reproduzi o problema no ambiente simulado, que se
   comporta como a imagem de produção.
3. Problemas de **responsividade** no painel em tablet retrato, nas notas no celular, no editor da
   professora no celular e no botão flutuante de notas sobre os controles da IDE.
4. **Falhas da API pareciam listas vazias**: "Nenhum curso encontrado", "Nenhum estudante ainda" e
   "Nenhuma anotação ainda", o que dava a impressão de que as notas tinham sumido.
5. **Notas criadas no caderno flutuante apareciam como HTML cru** em `/notas`.
6. **Acessibilidade**: diálogos sem foco nem Esc, 22 links sem nome na trilha do painel, campos sem
   rótulo, contraste dos tokens de cor entre 2,1:1 e 3,8:1, animações que ignoravam "reduzir
   movimento" e um *bundle* do TipTap (cerca de 130 KB gzip) carregado em todas as páginas.
7. **Dados fictícios no admin**: o card "98% uptime" tinha números fixos no código e havia frases
   como "pico: 1 conclusão/dia" com zero conclusões.

Para não regredir, adicionei 59 testes Playwright em `apps/web/e2e/ux/` (axe, rolagem horizontal
nos 4 viewports, estados de erro e vazio, teclado e diálogos) e 2 testes de unidade da prova.

## 2. Metodologia e ambiente simulado

| Item | Como foi feito |
|---|---|
| Pilha | `stack.sh … levelusp_qa 3301 4301 8381 up`: `pnpm build`, migração e seed de homologação (`SEED_DEMO_USERS=true`), runner WASI real (CPython 3.14), API NestJS (`APP_ENV=test`) e web em build **standalone** de produção (`node server.js`). O Pyodide 0.25.1 é servido em `/pyodide-local/`, porque o jsDelivr é bloqueado no sandbox. |
| Navegador | Chromium (Playwright 1.64) em `/opt/pw-browsers/chromium`, locale pt-BR, fuso America/Sao_Paulo. |
| Perfis | Visitante, `aluna@levelusp.dev`, `professora@levelusp.dev`, `admin@levelusp.dev`, além de contas criadas pelo cadastro durante os testes. |
| Viewports | 1440×900, 1024×768, 768×1024 e 390×844 (com toque, nos roteiros de IDE móvel). |
| Varredura | Script próprio (fora do repositório) que, para cada rota, perfil e viewport, mede o tempo até `networkidle`, checa rolagem horizontal (`scrollWidth > clientWidth`, listando o elemento culpado), roda o axe-core (WCAG 2.0/2.1/2.2 A+AA), coleta erros e avisos do console e respostas ≥ 400, e tira screenshot de página inteira depois de rolar a tela para disparar as animações de entrada. |
| Jornadas | Cadastro → painel → catálogo → curso → matrícula → lição (Executar no navegador; Verificar no servidor errando e depois acertando) → XP, emblema e modais → ranking → notas → perfil e configurações → prova (aprovação e tempo esgotado com `page.clock`) → emissão de certificado → verificação pública e PDF. Também: esqueci/redefinir senha com o link tirado do log da API, professora criando um questionário com pré-visualização e publicação, aluna respondendo o questionário (errar e acertar) e admin navegando pelas 12 seções. |
| Estados | `page.route` devolvendo 500 em todo `/api/**` (menos `/auth/me`), sessão expirada (`clearCookies()` no meio da lição), 404, rede 3G via CDP `Network.emulateNetworkConditions` (400 ms de latência, 400 kbit/s), duplo clique nos envios, validações de formulário e limite de submissões (429). |
| Teclado | Sequência de Tab com registro do elemento focado e de foco visível, armadilha de foco nos diálogos, Esc, menus e o editor CodeMirror. |
| Desempenho | FCP, LCP e CLS via `PerformanceObserver`, `domInteractive`, JS transferido por rota e análise dos *chunks* em `.next/static/chunks`. |

### Medições (rede local, Chromium, viewport de celular)

| Tela | FCP | LCP | CLS | JS (transferido) |
|---|---|---|---|---|
| `/` | 0,50 s | 1,50 s | 0 | 492 KB |
| `/login` | 0,33 s | 0,33 s | 0 | 478 KB |
| `/dashboard` | 0,21 s | 0,21 s | 0,016 | 435 KB |
| `/lesson/:id` | 0,17 s | 0,76 s | 0 | 645 KB (Pyodide pronto em ~3 s) |

**Em 3G, antes da correção UX-25:** FCP de 9,7 a 9,9 s em `/` e `/login` e de cerca de 4,1 s nas
telas logadas; o LCP da lição ficou em 16 s. Com o TipTap fora do carregamento inicial, o JS da
página de login caiu de 1.651 KB para 1.306 KB (descomprimido). As medições de 3G servem só para
comparar antes e depois; não substituem o teste com a rede real (seção 6).

**Console e rede:** não houve erro de JavaScript (`pageerror`) em nenhuma tela. Os ruídos
encontrados foram:

- `401 /api/auth/me` para o visitante (esperado);
- aviso do TipTap sobre extensões duplicadas (corrigido);
- aviso do Radix sobre `Description` ausente no menu móvel do admin (corrigido);
- `404 /perfil` causado pelo *prefetch* de um link sem nome de usuário (baixo).

## 3. Achados

Severidade: **Crítica** (perda de dados ou de função essencial), **Alta** (bloqueia ou engana numa
jornada principal, ou falha WCAG A/AA de impacto amplo), **Média** e **Baixa**.

Evidências em `docs/qa/screenshots/`: arquivos `antes-…` são da build original e `depois-…` são da
build corrigida.

| ID | Tela/rota | Perfil | Viewport | Descrição | Como reproduzir | Sev. | Evidência | Status |
|---|---|---|---|---|---|---|---|---|
| UX-01 | `/cursos/:id/prova` | aluna | todos | O envio automático ao acabar o tempo mandava `answers: {}`: nota 0% e tempo de espera, mesmo com todas as questões marcadas. O efeito do cronômetro guardava a `handleSubmit` do início da prova (dependências desligadas com `eslint-disable`). | Conclua as lições, comece a prova, marque as 5 respostas e deixe o tempo acabar (no teste: `page.clock.fastForward("20:02")`). O *payload* sai com `answers: {}` e o resultado é 0%. | Crítica | `antes-ux01-prova-envio-automatico-zerado.png`, `depois-ux01-prova-envio-automatico-com-respostas.png` | **Corrigido**. O cronômetro chama a versão mais recente da função por meio de uma ref. Teste de unidade `prova/page.test.tsx`, que falha no código original. |
| UX-02 | `/certificado/[code]` (SSR) | visitante | todos | Certificado recém-emitido aparecia como "Certificado não encontrado". O SSR usa `process.env.API_INTERNAL_URL ?? "http://localhost:4000"`, mas a imagem `web` só define a variável no estágio de *build* (o `compose.yml` também não a passa). | Emita um certificado e abra `/certificado/LVL-…` em outra sessão. | Crítica | `antes-ux02-certificado-valido-nao-encontrado.png`, `depois-ux02-certificado-autentico.png`, `evidencia-ux02-pdf-certificado.png` | **Corrigido**. Sem a variável, o fallback passa pelo próprio Next (`http://127.0.0.1:$PORT`, que usa o *rewrite* de `/api`), e `web.Dockerfile` agora também define `API_INTERNAL_URL` em tempo de execução. Validar em homologação (seção 6). |
| UX-03 | `/dashboard`, `/cursos`, `/leaderboard` | aluna, professora | 768×1024 | Com o menu completo a partir de 768px, a marca colava em "Aprender", o selo de XP cobria "Perfil" e o avatar era cortado, gerando rolagem horizontal (+21px). | Abra o painel em 768×1024. | Alta | `antes-ux03-painel-768-menu-sobreposto.png` | **Corrigido**. O menu do topo aparece a partir de `lg` (1024px); abaixo disso fica a barra inferior. Os menus ganharam `aria-label`. |
| UX-04 | `/notas` | aluna | todos | Notas escritas no caderno flutuante (editor rico) apareciam como HTML cru (`<p>…<strong>`) na textarea de `/notas`. Além disso, o salvamento automático só gravava o último campo editado: título e conteúdo editados em menos de 800 ms perdiam o título. Erros de salvamento eram silenciosos. | Crie uma nota com negrito pelo botão flutuante e abra `/notas`. | Alta | `antes-ux04-notas-html-cru.png` | **Corrigido**. `/notas` usa o mesmo editor rico (carregado sob demanda), o *patch* acumula os campos e um erro de salvamento aparece na tela. |
| UX-05 | `/notas` e caderno flutuante | aluna | 390×844 | Duas colunas espremidas (barra lateral de 288px), rolagem horizontal e botão "Nova anotação" cortado. O modal do caderno tinha a barra lateral fixa em 256px. | Abra `/notas` no celular. | Alta | `antes-ux05-notas-celular-rolagem-horizontal.png` | **Corrigido**. No celular a lista fica acima do editor (em `/notas` e no modal). |
| UX-06 | `/lesson/:id` e questionário | aluna | todos | O botão flutuante de notas (z-100) cobria "Próximo" no desktop e, no celular, a aba "Arquivos", o "Verificar" e o "Tentar novamente". Também ficava acima do fundo escurecido dos modais. Na própria página `/notas` era redundante. | Abra uma lição e observe o canto inferior direito. | Alta | `antes-ux06-ide-botao-notas-sobre-proximo.png`, `antes-ux06-ide-celular-botao-notas-sobre-abas.png`, `depois-ux06-ide-celular-sem-botao-flutuante.png` | **Corrigido**. Na IDE o botão sobe acima do rodapé no desktop e some no celular (as notas continuam em `/notas`); fica escondido em `/notas` e foi para z-40. |
| UX-07 | `/cursos`, `/leaderboard`, `/notas`, `/lesson/:id` | aluna | todos | Com a API em erro, as telas mostravam "Nenhum curso encontrado", "Nenhum estudante ainda — Seja o primeiro!" e "Nenhuma anotação ainda". A lição mostrava "Lição não encontrada" para falhas de rede. Nenhuma tinha nova tentativa. | `page.route('**/api/**', 500)` e abra as telas. | Alta | `antes-ux07-cursos-falha-api-parece-vazio.png`, `antes-ux07-ranking-falha-api-parece-vazio.png` | **Corrigido**. Alerta com "Tentar novamente" (`role="alert"`), e a lição distingue "não foi possível carregar" de "não encontrada". |
| UX-08 | Modal de emblema (gamificação) | aluna | todos | O emblema exibia a palavra "Rocket" (nome do ícone lucide gravado pelo seed e pelo admin) no lugar do ícone, justamente no momento de recompensa. | Conclua a primeira lição; aparece o emblema "Primeiros passos". | Alta | `depois-ux08-emblema-com-icone.png` (o screenshot "antes" se perdeu ao rodar a jornada de novo; reproduzi duas vezes na build original) | **Corrigido**. Usa `BADGE_ICONS` (os mesmos ícones do perfil); emojis antigos continuam funcionando. |
| UX-09 | `/admin` (visão geral) | admin | todos | O card "Saúde da plataforma · 98% uptime · 30d" tinha números fixos no código. Além disso: "pico: 1 conclusão/dia" com 0 conclusões (`Math.max(…, 1)`), plural quebrado ("conclusãoões" quando > 1), "1 cursos" e "usuários ativos" mostrando o total de cadastrados. | Abra `/admin`. | Alta | `antes-ux09-admin-uptime-ficticio.png` | **Corrigido**. Card removido até existir monitoramento real; plurais e textos corrigidos. |
| UX-10 | `/teacher/edit/:id`, `/teacher/curso/:id` | professora | 390×844 | No editor de lição, "Voltar", "Salvar rascunho" e "Editor de Lição" ficavam sobrepostos e a página rolava na horizontal (+32px). No editor de curso, os botões do topo e a grade com pré-visualização causavam +118px de rolagem horizontal. | Abra os editores no celular. | Alta | `antes-ux10-editor-licao-celular-cabecalho.png`, `antes-ux10-editor-curso-celular-rolagem.png` | **Corrigido**. Cabeçalhos compactos no celular, dificuldade e tipo de lição quebram linha, a grade usa `minmax(0,1fr)` e foi adicionado o *landmark* `main`. |
| UX-11 | Modais de gamificação, "Parabéns" da lição, sucesso do professor e caderno de notas | aluna, professora | todos | Diálogos feitos à mão sem `role="dialog"` nem nome; o foco não entrava neles, o Tab vazava para a página de trás, o Esc não fechava (exceto no caderno) e o foco não voltava ao gatilho (WCAG 2.1.2, 2.4.3 e 4.1.2). | Conclua uma lição e use Tab e Esc. | Alta | teste `teclado.spec.ts` | **Corrigido** nos 9 diálogos de aluno e professora (novo hook `use-modal-a11y.ts`). **Pendente:** modais do admin (usuários, badges, módulos, aprovações, paleta de comandos); recomendo migrar para o `Dialog` do Radix na refatoração. |
| UX-12 | `/lesson/:id` (IDE) | aluna | todos | Não havia saída da lição para o painel: a marca "L" não era link e o menu do avatar não tinha "Painel" (só Perfil, Configurações e Sair). | Abra uma lição e tente voltar ao painel sem usar o "Voltar" do navegador. | Alta | — | **Corrigido**. A marca vira link "Voltar ao painel", o menu ganhou "Painel" e o avatar tem nome acessível. |
| UX-13 | `/lesson/:id` (IDE) | aluna | todos | "Resetar workspace" (botão e atalho Alt+G) apagava o código do aluno sem confirmação. | Escreva código e clique no ícone ↺. | Alta | teste `teclado.spec.ts` | **Corrigido**. Agora pede confirmação. O texto mudou para "Restaurar código inicial" e os botões de ícone (copiar, restaurar, solução, fechar aba e ações de arquivo) ganharam nome. |
| UX-14 | `/signup`, `/settings`, `/admin` (selects e switches), editor de lição, trilha do painel, perfil | todos | todos | Campos sem rótulo associado: os 3 do cadastro, os 4 das configurações, os selects do admin, os gatilhos de select "Curso" e "Módulo", as alternativas do questionário e os switches dos ajustes. Outros problemas: botão de mostrar senha sem nome e com 16px; **22 links sem nome** na trilha do painel; botões de ícone sem nome no perfil e no professor; `<button>` dentro de `<a>`. | axe `label`, `button-name`, `link-name`, `select-name`, `target-size`, `nested-interactive`. | Alta | testes `a11y.spec.ts` | **Corrigido**. As 20 telas principais estão zeradas nessas regras. |
| UX-15 | Global (tokens) e diversas telas | todos | todos | Contraste abaixo de 4,5:1 nos tokens `--success` (#10B981, 2,5:1), `--warning` (2,1:1), `--destructive` (3,8:1) e `--info` (3,7:1). Também: *hover* dos botões primários em #A78BFA com texto branco (2,7:1), textos `/70` e `/80`, botão "Entregar prova" verde 500 (2,3:1) e mensagens de erro em vermelho 500. | axe `color-contrast`. | Alta | testes `a11y.spec.ts` (contraste exigido em 13 telas) | **Corrigido** (tokens e classes ajustados, sem mudar a identidade roxa). Restante em UX-41. |
| UX-16 | `/perfil/:username`, `/dashboard` | aluna | todos | O botão "Compartilhar" não fazia nada. O progresso de nível era dividido pelo teto absoluto: no nível 2 aparecia "500/2.000 XP" e a barra ficava pela metade (perfil e anel do painel via `progress-context`). | Use uma conta com 1.500 XP e abra o perfil e o painel. | Alta | teste `teclado.spec.ts` (compartilhar) | **Corrigido**. Compartilhamento nativo no celular ou cópia do link com aviso, e faixa do nível calculada como teto − piso. |
| UX-17 | Perfil e configurações | aluna | todos | O fluxo "Quero ensinar" (pedido de acesso de professor), descrito no `GUIA-DO-PROFESSOR.md` §1, não existe na interface; a API e o cliente (`requestTeacherRole`) estão prontos, mas sem tela. | Procure como pedir acesso de professor. | Alta | — | **Pendente**: decisão de produto e tela nova (formulário com motivo e status do pedido em Configurações). |
| UX-18 | `/perfil/:username` | todos | 390×844 | O selo "Nível 1" quebrava em duas linhas sobre o avatar. | Abra o perfil no celular. | Média | `antes-ux18-perfil-nivel-quebrado.png` | **Corrigido** (`whitespace-nowrap`). |
| UX-19 | `/leaderboard` | aluna | 390×844 | Colunas fixas (48+100+80px) cortavam o cabeçalho ("STREA") e os nomes; aparecia "(voce)" sem acento. | Abra o ranking no celular. | Média | `antes-ux19-ranking-celular-colunas.png` | **Corrigido**. Colunas responsivas, "Sequência" e "(você)". |
| UX-20 | Site público (nav, hero, CTA final, IDE showcase, FAQ, trilhas) e `/teacher` | visitante | todos | `<button>` dentro de `<a>` gerava 2 paradas de Tab por CTA e HTML inválido. O menu "Mais" não tinha `aria-expanded` nem fechava com Esc ou ao perder o foco. O menu do celular não tinha `aria-expanded` e dizia "Abrir menu" mesmo aberto. | Tab pela home. | Média | testes `teclado.spec.ts` | **Corrigido**. |
| UX-21 | Editor de lição → lição publicada | professora, aluna | todos | Toda lição nova nasce com texto-modelo real ("Introdução / Descreva aqui o conceito… / Seu Desafio / Explique o que o aluno deve implementar."). O texto da professora é acrescentado depois do modelo e tudo vai para o aluno, inclusive em questionários. | Crie um questionário, digite no Conteúdo e publique. | Média | `antes-ux21-modelo-padrao-visivel-ao-aluno.png` | **Pendente**: decidir entre conteúdo vazio com *placeholder* ou modelo por tipo de lição (`lesson-form.ts`, `DEFAULT_CONTENT`). |
| UX-22 | Editor de lição (modal de sucesso) | professora | todos | Depois de publicar, o modal dizia "Sua lição foi salva! Publique para que os alunos possam acessá-la." | Publique uma lição. | Média | `antes-ux16-professora-publicou-mas-diz-publique.png` | **Corrigido**. A mensagem depende do estado publicada/rascunho. |
| UX-23 | `/lesson/:id` (celular) | aluna | 390×844 | O "Verificar" fica na aba Aprender, mas o resultado (aprovado ou os testes que falharam) só aparece na aba Console; na tela atual nada muda. | No celular, toque em Verificar. | Média | `evidencia-ux23-celular-feedback-so-no-console.png` | **Pendente**: decisão de design. Sugestões: trocar para o Console automaticamente ou mostrar um resumo ("3 de 5 testes falharam — ver detalhes") abaixo do botão. |
| UX-24 | Global (animações) | todos | todos | O framer-motion ignorava `prefers-reduced-motion`, os 12 disparos de confete não usavam `disableForReducedMotion` e `animate-pulse`/`bounce`/`ping` e `btn-3d` continuavam animando. | Ative "reduzir movimento" no SO. | Média | teste `a11y.spec.ts` | **Corrigido**: `MotionConfig reducedMotion="user"`, confete desligado e CSS em `@media (prefers-reduced-motion)`. |
| UX-25 | Todas as páginas (layout raiz) | todos | todos | O caderno de notas no layout raiz importava o TipTap estaticamente: ~426 KB descomprimidos (~131 KB gzip) baixados em todas as páginas, inclusive login, site e certificado. | Veja a aba Rede em `/login`. | Média | medição na seção 2 | **Corrigido**: `next/dynamic` no caderno e em `/notas`. |
| UX-26 | `/`, `/login` | visitante | celular, 3G | Em 3G, FCP de ~10 s: o conteúdo inicial do hero nasce com `opacity: 0` (framer-motion) e o login inteiro fica num `<Suspense>` sem *fallback* (por causa de `useSearchParams`) até hidratar. O *chunk* do zod/contracts (402 KB descomprimidos) também é baixado no login e na home. | Teste de 3G com CDP. | Média | medição na seção 2 | **Parcial** (03/11/2026, [desempenho-e-carga.md](../v2/desempenho-e-carga.md) §4.8): a entrada dos cabeçalhos virou animação CSS na primeira pintura, só com deslocamento — LCP da home em 4G lento + CPU 4× de 3,82 s para **1,15 s** (mediana de 3, Chromium real). O `<Suspense>` do login **não** atrasa a pintura (a rota é dinâmica e o servidor já entrega o formulário: LCP = FCP ≈ 0,9 s), então ficou como está. **Pendente**: o *chunk* do zod/contracts (113 KB descomprimidos, 32 KB gzip) continua em todas as rotas, porque utilitários usados no cliente (`nonEmpty`, `XP_PER_LEVEL`) moram em módulos que criam schemas Zod no topo; exige separar um ponto de entrada sem Zod em `@levelusp/contracts`. |
| UX-27 | `/cursos/:id/prova` | aluna | todos | A prova podia ser entregue com questões em branco sem aviso; as questões não eram grupos de rádio com nome; o cronômetro não tinha semântica; o erro não era anunciado. | Clique em "Entregar prova" com 1 de 5 questões respondida. | Média | testes `prova/page.test.tsx` | **Corrigido**: confirmação, `radiogroup` nomeado pelo enunciado, `role="timer"` e `role="alert"`. |
| UX-28 | `/login`, `/signup` | visitante | todos | Duplo clique em "Entrar" ou "Criar conta" podia mandar duas requisições, porque `loading` só desabilita o botão no render seguinte. | Duplo clique no envio. | Média | teste `estados.spec.ts` | **Corrigido** (trava síncrona com ref). |
| UX-29 | IDE | aluna | todos | "Executar" usa o Pyodide 0.25.1 (Python 3.11) e "Verificar" usa o CPython 3.14 (WASI). Código que usa recursos novos (ex.: f-strings aninhadas da PEP 701) se comporta diferente nos dois botões; a barra de status mostra "Python 3.11". | Rode `print(f"{'a' + f"{1}"}")`. | Média | `test:paridade`, [paridade-python.md](../v2/paridade-python.md) | **Corrigido** (03/11/2026): Pyodide 314.0.7 (Python 3.14) servido pelo próprio front; a barra mostra "Python 3.14 (Pyodide)" e um teste diferencial compara Executar × Verificar em todas as lições do seed (divergências restantes documentadas). |
| UX-30 | Cabeçalhos do app | aluna | todos | Cada tela tem seu próprio cabeçalho: o painel tem 5 itens, Cursos 4 e Ranking 3 (sem menu da conta e sem "Sair"); a barra inferior do Ranking troca Cursos/Notas por Config; questionário e teoria não têm o cabeçalho de gamificação; a IDE usa a marca "L" e o resto, o foguete. | Navegue entre as telas. | Média | — | **Pendente** (refatoração: componente único de navegação). Corrigido nesta branch apenas o XP de `/cursos`, que mostrava o XP do nível (≠ painel). |
| UX-31 | Microcopy | todos | todos | Termos misturados: "streak" e "sequência", "Dashboard" e "Painel", "Tipo de aula" e "lição". Também: "Resetar workspace", "Licoes Completas", "Maior Streak", "JPG, PNG. Max 2MB" (o campo aceita WebP), "Streak freeze". | — | Média | — | **Corrigido** (padronizado em sequência, painel, lição e restaurar). |
| UX-32 | `/admin` → Ajustes | admin | todos | Opções que não refletem o sistema: "Novo editor IDE — Editor Monaco" (a IDE usa CodeMirror), integrações marcadas como "conectadas" fixas no código e "XP por nível" editável enquanto o front usa 1.000 fixo. | Abra Ajustes. | Média | — | **Pendente** (produto: remover, ou ligar à API e à configuração real). |
| UX-33 | `/login`, `/signup` | visitante | ≥ 1024 | Números de marketing ("50K+ estudantes, 200+ lições, 15 trilhas", "Certificados reconhecidos pela USP") não batem com a plataforma (1 curso, 22 lições) e podem gerar problema institucional. | Abra o login no desktop. | Média | — | **Pendente** (comunicação/produto: usar números reais da API ou retirar). |
| UX-34 | `/login`, `/signup`, 404, erro | visitante | todos | Não havia como voltar ao site pelo login ou cadastro (marca não clicável) nem *landmark* `main`. O 404 e a tela de erro levavam o visitante a `/dashboard`, que redireciona para o login. | Abra uma rota inexistente sem sessão. | Média | teste `estados.spec.ts` | **Corrigido**: marca leva a `/`, 404 com "Página inicial" e "Ir para o painel", `main` nessas telas. |
| UX-35 | Curso e prova | aluna | todos | Contagens inconsistentes: "22 lições + projeto final", lista com 22 itens que já incluem o projeto e prova pedindo "as 9 lições restantes (de 21)". | Compare `/cursos/:id` e `/prova`. | Média | — | **Pendente** (conteúdo e regra: definir se o projeto conta como lição). |
| UX-36 | Lição 1 (seed) | aluna | todos | O enunciado diz "Leia o enunciado nos comentários do código", mas o código inicial é só `# Escreva sua solução aqui`. | Abra a lição 1. | Média | — | **Pendente**: o conteúdo de demonstração vem dos gabaritos; o conteúdo real vem da importação do Supabase (seção 6). |
| UX-37 | Editor rico | professora, aluna | — | Aviso no console: `[tiptap warn] Duplicate extension names: link, underline` (o StarterKit v3 já inclui as duas). | Abra o editor. | Baixa | — | **Corrigido**. O editor também ganhou `role="textbox"` e nome. |
| UX-38 | `/admin` (menu móvel) | admin | 390×844 | Aviso do Radix: `Missing Description … DialogContent`. | Abra o menu móvel do admin. | Baixa | — | **Corrigido** (`SheetDescription`). |
| UX-39 | IDE (CodeMirror) | aluna | teclado | O Tab indenta, o que parece armadilha de teclado; a saída é Esc e depois Tab, mas isso não era informado. | Tab dentro do editor. | Baixa | teste `teclado.spec.ts` | **Corrigido em parte**: o nome acessível do editor ensina "Esc e depois Tab". Falta uma dica visual (sugestão: no rodapé da IDE). |
| UX-40 | `/showcase` | visitante | todos | A vitrine do design system é pública em produção: leva 15 s até ficar ociosa (animações em loop), tem rolagem horizontal no celular (+32px), campo sem rótulo e falhas de contraste. | Abra `/showcase`. | Baixa | — | **Pendente**: decidir entre remover do build de produção ou proteger. |
| UX-41 | Trilha do painel, curso, IDE | aluna | todos | Itens bloqueados com texto entre 1,7 e 2,3:1 (estados inativos são isentos pela WCAG 1.4.3, mas ficam difíceis de ler). Comentários do tema oneDark do CodeMirror têm 3,6:1. | axe na trilha. | Baixa | — | **Pendente** (design): o cadeado já comunica o estado; sugiro texto em `muted-foreground` sem opacidade. |
| UX-42 | `/perfil/:inexistente` | todos | — | Perfil inexistente devolve HTTP 200 com "Perfil não encontrado" (*soft* 404). | `curl -I /perfil/xyz` | Baixa | — | **Pendente** (`notFound()` exige consultar no servidor). |
| UX-43 | Datas (perfil, admin) | todos | Safari | A API devolve `created_at` como `"2026-10-17 06:02:24.604569+00"` (formato do PostgreSQL, não ISO 8601). O `new Date()` do Safari/iOS pode devolver `Invalid Date` em "Membro desde" e nas datas do admin. O Chromium aceita. | Abra o perfil no Safari. | Baixa | — | **Pendente**: requer Safari real (seção 6). Recomendo serializar ISO na API (`toISOString()` nos *mappers*). |
| UX-44 | Sessão expirada | aluna | todos | O redirecionamento para `/login?next=…` funciona (teste), mas sem a mensagem "Sua sessão expirou, entre novamente". | Apague o cookie e navegue. | Baixa | teste `estados.spec.ts` | **Pendente** (exige tratar 401 de forma global no cliente). |
| UX-45 | Fim de lição | aluna | todos | O modal de emblema aparece por cima do "Parabéns" ao mesmo tempo (dois diálogos empilhados). | Primeira lição concluída. | Baixa | `depois-ux08-emblema-com-icone.png` | **Pendente**: enfileirar as celebrações no `progress-context`. |
| UX-46 | Tipografia | todos | — | `--font-sans` aponta para `var(--font-inter)`, mas a Inter nunca é carregada (não há `next/font`). A aparência muda conforme o SO (Segoe no Windows, SF no macOS). | Compare em SOs diferentes. | Baixa | — | **Pendente** (decisão de design: carregar a Inter via `next/font/local` ou assumir a fonte do sistema). |

Os roteiros que funcionaram bem também estão documentados como evidência:

- esqueci/redefinir senha (`evidencia-esqueci-redefinir-senha.png`): mensagem neutra, senhas que
  não coincidem, sucesso e token reutilizado, tudo em pt-BR claro;
- IDE no celular com as abas Aprender, Código, Console e Arquivos (`depois-ux06-…`);
- limite de verificações (429): "Muitas verificações seguidas. Aguarde um instante.";
- PDF do certificado (`evidencia-ux02-pdf-certificado.png`).

### Arquivos alterados

**Novos**

- `apps/web/src/hooks/use-modal-a11y.ts`: foco, armadilha de Tab, Esc e devolução de foco.
- `apps/web/src/app/cursos/[id]/prova/page.test.tsx`: regressão do UX-01 e do UX-27.
- `apps/web/e2e/ux/ux-helpers.ts`, `a11y.spec.ts`, `responsivo.spec.ts`, `estados.spec.ts` e
  `teclado.spec.ts`.
- `docs/qa/relatorio-ux.md` e `docs/qa/screenshots/*` (23 PNGs, ~350 KB).

**Dependência**

- `apps/web/package.json` e `pnpm-lock.yaml`: `@axe-core/playwright` (devDependency).

**Infra**

- `infra/docker/web.Dockerfile`: `API_INTERNAL_URL` também no estágio de execução (UX-02).

**Front (`apps/web/src`), por área**

- Global: `app/globals.css` (tokens de contraste e *reduced motion*), `components/providers.tsx`
  (`MotionConfig`), `lib/api/client.ts` (fallback do SSR), `components/design-system/level-button.tsx`.
- Painel, catálogo e ranking: `app/dashboard/page.tsx`, `app/cursos/page.tsx`,
  `app/leaderboard/page.tsx`, `components/dashboard/{course-trail,lesson-trail,widgets}.tsx`,
  `contexts/progress-context.tsx`.
- Lição e IDE: `app/lesson/[id]/page.tsx`, `contexts/ide-context.tsx`,
  `components/ide/{header,code-editor,console-panel,file-explorer,lesson-footer,lesson-panel,quiz-lesson-layout,success-feedback,theory-lesson-layout}.tsx`.
- Notas: `app/notas/page.tsx`, `components/notes/notes-floating-widget.tsx`,
  `components/editor/rich-text-editor.tsx`.
- Gamificação: `components/gamification/{badge-earned-modal,course-complete-modal,enrollment-modal,level-up-modal,streak-modal,teacher-success-modal}.tsx`.
- Prova e certificado: `app/cursos/[id]/prova/page.tsx`, `app/certificado/[code]/page.tsx`.
- Perfil e configurações: `app/perfil/[username]/page.tsx`, `app/settings/page.tsx`,
  `components/profile/activity-map.tsx`.
- Autenticação e páginas de sistema: `app/login/page.tsx`, `app/signup/page.tsx`,
  `app/esqueci-senha/page.tsx`, `app/redefinir-senha/page.tsx`, `app/not-found.tsx`,
  `app/error.tsx`.
- Professora: `app/teacher/{page,layout}.tsx`, `app/teacher/edit/[id]/page.tsx`,
  `app/teacher/curso/[id]/page.tsx`,
  `components/teacher/lesson-editor/{config-tab,editor-header,editor-tabs,quiz-tab,library-request-modal}.tsx`.
- Admin: `app/admin/page.tsx`,
  `components/admin/{settings-page,exam-questions-page,lessons/lessons-page,users/users-page}.tsx`.
- Site público: `app/(site)/{faq,trilhas}/page.tsx`,
  `components/marketing/{site-nav,hero,final-cta,ide-showcase,impact-section,journey-scroll}.tsx`.

As mudanças são cirúrgicas: classes, textos, atributos ARIA, estados e pequenos ajustes de layout.
Nenhum arquivo foi renomeado ou movido, e não houve mudança na API.

## 4. Testes automatizados de regressão (`apps/web/e2e/ux/`)

| Arquivo | Testes | O que garante |
|---|---|---|
| `a11y.spec.ts` | 22 | axe com 0 violações estruturais (nomes, rótulos, ARIA, interativo aninhado, `target-size`…) em 20 telas dos 4 perfis; contraste AA em 13 telas; `lang="pt-BR"` e título; `prefers-reduced-motion`. |
| `responsivo.spec.ts` | 18 | Sem rolagem horizontal em 1440, 1024, 768 e 390px para 27 rotas dos 4 perfis; menu completo × barra inferior; IDE utilizável no celular sem o botão flutuante por cima. |
| `estados.spec.ts` | 11 | API em erro (500) não vira lista vazia e "Tentar novamente" recupera; lição com erro × inexistente; 404; sessão expirada; validação e duplo clique no cadastro; login em 3G; erro no admin; ausência do card fictício. |
| `teclado.spec.ts` | 8 | Caderno de notas (foco, armadilha, Esc e devolução de foco); menu "Mais" e menu móvel (`aria-expanded`, Esc); nenhum `<button>` dentro de `<a>`; ordem do Tab no login; saída da IDE; confirmação de "Restaurar código"; botões do perfil e compartilhar. |

Os specs existentes em `apps/web/e2e/*.spec.ts` não foram alterados.

## 5. Resultado da verificação

```
pnpm --filter @levelusp/web typecheck   → ok (tsc --noEmit sem erros)
pnpm --filter @levelusp/web lint        → 0 erros, 65 avisos (todos em linhas anteriores a esta branch; nenhum novo)
pnpm --filter @levelusp/web test        → 13 arquivos, 63 testes passando (linha de base 61 + 2 da prova)
stack.sh … all                          → Playwright: 73 passed (14 existentes + 59 novos)
```

## 6. Requer o sistema no ar

Estes itens **não podem ser validados no sandbox** e devem ser feitos em homologação ou produção.
Cada um vem com o roteiro de teste.

| # | O quê | Por que não deu aqui | Roteiro quando estiver no ar |
|---|---|---|---|
| R1 | **UX-02 em homologação**: verificação pública de certificado e PDF | Não há Docker/compose no sandbox; simulei o mesmo modo (standalone sem a variável em tempo de execução). | 1) Fazer o deploy da nova imagem `web`. 2) Emitir um certificado com uma conta de teste. 3) Abrir `https://<domínio>/certificado/<código>` numa janela anônima: deve aparecer "Certificado autêntico". 4) Baixar o PDF e conferir que o link "Verifique a autenticidade em …" aponta para o domínio público (hoje sai `http://localhost:3000`, configurado na API; ajustar a URL pública no `.env` de homolog/prod). |
| R2 | **Túnel Cloudflare e HTTPS real** | Sem túnel nem certificado TLS. | Confirmar o cadeado e HSTS; cookie `lvl_session` com `Secure`, `HttpOnly` e `SameSite`; a CSP não bloqueia nada (DevTools → Console); `/api/health/ready` passa pelo túnel; WebSocket e *streaming* não são usados; tempo de resposta do túnel medido no Brasil (3 regiões). |
| R3 | **E-mail SMTP real** (esqueci a senha, convites do admin) | O link sai no log da API. | Pedir redefinição para Gmail, Outlook e o e-mail da USP; medir o tempo de chegada; checar SPF, DKIM e DMARC (cabeçalhos), se cai no spam, a renderização no celular, se o link abre o domínio público com HTTPS, se expira e não pode ser reutilizado (já validado na tela) e se o assunto e o remetente estão em pt-BR. |
| R4 | **Pyodide pelo CDN real e sua latência** | O jsDelivr é bloqueado; servi localmente. | Em 4G e Wi-Fi doméstico: tempo até "Python pronto" na primeira visita (sem cache) e na segunda (com cache); comportamento com o CDN bloqueado (rede escolar com filtro) e a mensagem mostrada; CSP `connect-src`/`script-src` com o jsDelivr; o `pyodide-worker-v2.js` não é cacheado. O núcleo do Pyodide agora é servido pelo próprio domínio (`/pyodide/v314.0.7/`, cache de 1 ano); falta medir o download dos pacotes extras (numpy, matplotlib), que ainda vêm do CDN. |
| R5 | **Dispositivos reais**: iOS/Safari, Android/Chrome e Samsung Internet | Só há Chromium no sandbox. | iPhone (Safari 17+): datas do perfil e do admin (UX-43), teclado virtual sobre o editor CodeMirror, zoom em campos (`font-size` < 16px faz o iOS ampliar), confete e animações, `navigator.share` do perfil, abas da IDE e área segura (*notch*) na barra inferior. Android de entrada (2–3 GB de RAM): memória do Pyodide, travamentos ao executar e rolagem do console. Testar também com o VoiceOver e o TalkBack nos diálogos (UX-11). |
| R6 | **Lighthouse / Core Web Vitals com rede real** | Rede local ou emulada. | Lighthouse (celular, 4G lento) em `/`, `/login`, `/cursos`, `/dashboard` e `/lesson/:id`; metas LCP < 2,5 s, INP < 200 ms e CLS < 0,1. Acompanhar no Search Console ou RUM depois do lançamento. Linha de base com rede emulada em [desempenho-e-carga.md](../v2/desempenho-e-carga.md) §4.8 (a lição continua com LCP de ~4,5 s em 4G lento: JS da IDE + chamadas da API antes do enunciado). |
| R7 | **Dados reais importados do Supabase** | O seed tem 1 curso de demonstração com textos genéricos (UX-36). | Depois da importação: textos longos (títulos de 80+ caracteres nos cards e na trilha), imagens de capa (proporção, peso, `alt`), Markdown e HTML antigos no conteúdo (sanitização e estilos `.prose-lesson`), cursos com 50+ lições (desempenho da trilha), ranking com milhares de usuários (paginação), notas antigas em texto puro (agora exibidas no editor rico), avatares externos quebrados, contagens do UX-35 e emblemas com nomes de ícone fora do mapa (`BADGE_ICONS`). |
| R8 | **Testes com usuários reais** (alunos e professores) | Não há pessoas no sandbox. | 5–8 alunos do ensino médio ou de início de graduação e 2–3 professores, com tarefas guiadas ("cadastre-se e conclua a primeira lição", "faça a prova", "crie um questionário"), protocolo *think-aloud*, SUS ao final e métricas de taxa de sucesso, tempo e erros por tarefa. Validar especialmente o UX-23 (feedback do Verificar no celular), o UX-21 (modelo de conteúdo) e o UX-30 (navegação). Incluir ao menos um usuário de leitor de tela. |
| R9 | **Carga e limites em produção** | Medido localmente com a pilha de produção (03/11/2026): `pnpm load:turma`, resultados em [desempenho-e-carga.md](../v2/desempenho-e-carga.md). Turma de 40 clicando em Verificar em 10 s: p95 0,5–0,7 s, sem 503 nem 429 (depois das correções da fila do executor). | Repetir na VM real, fora do horário de aula e com a equipe avisada (`--alvo-autorizado`): rajada de 40 e de 80 alunos, uma turma de laboratório atrás do mesmo NAT (limite de 60 cadastros/min por IP), prova com 40 alunos simultâneos e a latência do túnel; disponibilidade do notebook com o túnel (queda e retorno). |
| R10 | **Monitoramento real para o admin** | — | Substituir o card removido no UX-09 por dados reais (uptime do túnel ou da API via health check externo) antes de exibir qualquer número de disponibilidade. |

## 7. Recomendações (para o refatorador e o produto)

1. Criar um **AppShell único** (cabeçalho, barra inferior, menu da conta) para painel, cursos,
   ranking, perfil, notas e IDE (UX-30). Hoje há 6 implementações divergentes.
2. Migrar os diálogos feitos à mão para o `Dialog` do Radix, que já está no projeto (UX-11,
   pendência do admin).
3. Ter uma única fonte para estados de carregamento, vazio e erro (um componente `<EstadoCarga>`),
   para não repetir o UX-07 em telas novas.
4. Serializar datas em ISO 8601 na API (UX-43). O Pyodide já foi atualizado (UX-29).
5. Revisar os textos de marketing e os ajustes fictícios (UX-32, UX-33) antes da divulgação.
