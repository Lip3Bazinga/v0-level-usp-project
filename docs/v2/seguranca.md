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

## Controles

- **Autenticação**: senha argon2id (parâmetros OWASP), migração transparente de
  bcrypt do Supabase; sessão opaca de 256 bits em cookie `httpOnly`,
  `SameSite=Lax`, `Secure` fora de dev; banco guarda só o SHA-256 do token;
  revogação no logout, troca/redefinição de senha e suspensão.
- **Força bruta**: 60 tentativas/min por IP nas rotas de credencial; bloqueio de
  15 min após 10 senhas erradas (resposta idêntica à de senha errada); tempo
  constante quando o e-mail não existe.
- **CSRF**: cabeçalho `x-levelusp-csrf` obrigatório em métodos que alteram estado
  (a API não habilita CORS) + `SameSite=Lax`.
- **Autorização**: guard global deny-by-default, `@Roles()`, checagem de dono no
  service; rascunhos de outros respondem 404.
- **Validação**: toda entrada passa por schema Zod; caminhos de arquivo do aluno
  sem `..` nem caminho absoluto; uploads verificados pelos bytes (PNG/JPEG/WebP, 2 MB).
- **Erros**: mensagens pt-BR genéricas; stack traces só no log; `x-request-id`
  para correlação.
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
  com `PUBLIC_BASE_URL` ausente, `http` ou `localhost` em produção; SMTP exige
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

## Executor e correção: catálogo de ataques

Revisão adversarial de 03/11/2026 do executor (`apps/runner`), do harness
(`apps/runner/python/harness.py`) e da comparação na API
(`apps/api/src/modules/grading`). Atacante: aluno que conhece o código do
harness (é público) e envia Python arbitrário. Todos os testes rodam no
CPython WASI real; as garantias por tipo de caso estão em
[motor-de-correcao.md § Garantias por tipo de caso](motor-de-correcao.md#garantias-por-tipo-de-caso-precisas).
Esta seção substitui a linha "Disco do executor" dos riscos aceitos acima
(agora há cota por lote, achado 6).

Como rodar: `pnpm --filter @levelusp/runner test:attacks` (57 testes, ~30 s) e,
com um executor no ar, `RUNNER_URL=... RUNNER_TOKEN=... pnpm --filter
@levelusp/api test:attacks` (40 testes: forjadores contra as 22 lições do seed e
ataques à lição 22). Os testes de robustez da API estão em `pnpm test`
(`grading.security.spec.ts`) e em `pnpm --filter @levelusp/api test:e2e`
(`grading-security.e2e.ts`). O CI roda tudo no job `sandbox`.

### Achados e correções

| # | Severidade | Técnica | Exploração | Correção | Teste |
|---|---|---|---|---|---|
| 1 | Crítico | Frames no modo estrito sem evento de auditoria: `gc.set_debug(DEBUG_SAVEALL)` + ciclo frame→exceção→traceback (o frame cai em `gc.garbage`) e `signal.signal` + `raise_signal` (o handler recebe o frame) | Pelo `f_back` chega-se a `_run_harness`: nonce, escritor e sondas (inclusive a implementação de referência). Numa sonda `unittest`/`legacy` o aluno emite a observação que quiser e sai com `os._exit` | `gc.set_debug` e `_signal.signal` trocados por versões que recusam (sem a original no fecho); recriar `gc`/`_signal` via `create_builtin` é recusado | `strict-mode.attack.ts` ("observação forjada run=999" falhava antes), `sandbox.test.ts` |
| 2 | Alto | `unittest`: reconhecer a referência pela estática (`__code__.co_names`/`co_consts`, docstring, `__globals__`, linhas do traceback, evento `exec` num audit hook, `id()`/blocos alocados) | Uma suíte sem nenhum teste de comportamento (`assertTrue(eh_referencia())`) aprovava a lição 22 num único envio | Implementação executada antes do código do aluno; função embrulhada em invólucro C opaco; `sys.modules` restaurado; ruído no alocador; `__code__`/`gi_code`/`cr_code`/`ag_code` bloqueados no modo estrito | `unittest.attack.ts`; `grading-forgery.e2e.ts` ("impressão digital estática" aprovava antes) |
| 3 | Alto | DoS da API: `normalizeOutput` usava `/\s+$/` por linha (quadrático no V8) sobre a saída do aluno | 64 000 espaços + `x` = 3 s de event loop travado por caso `io`/`expr` com saída; 20 casos ≈ 60 s para todos os usuários | `trimEnd()` (linear) | `grading.security.spec.ts`, `grading-security.e2e.ts` |
| 4 | Médio | ReDoS: regex do professor (`match: "regex"`) contra a saída do aluno, no processo da API | `^(a+)+$` + `aaaa…b` trava o event loop (exige regex vulnerável no gabarito; o seed não tem) | Comparação em contexto `vm` com `timeout` (50 ms por comparação, 250 ms por correção, falha fechada); no cadastro: compila, até 1 000 caracteres, sem quantificador aninhado | `grading.security.spec.ts` |
| 5 | Médio | Regras negativas de `source` contornadas por apelido (`maior = max`), `getattr(builtins, "m" + "ax")`, `exec("for ...")` | "Não use max" (lição 4) aprovava com apelido ou `getattr` | A AST informa nomes citados e código dinâmico; `not_calls`/`not_uses` falham com eles | `forgery.attack.ts`; `grading-forgery.e2e.ts` (lição 4 aprovava antes); spec |
| 6 | Médio | Encher o disco: o convidado grava ~250 MB/s no tmpfs de 256 MB compartilhado | Correções simultâneas de outros alunos falhavam (ENOSPC) | Cota por lote: 32 MB e 2 000 entradas (`MAX_JOB_DISK_MB`), medida a cada 100 ms | `resources.attack.ts` (arquivo grande, milhares de arquivos, pastas) |
| 7 | Médio (configuração) | Stdlib `/lib` gravável pelo convidado quando o executor roda como root ou é dono de `/opt/levelusp-python` (desenvolvimento, CI) | Trocar `json/__init__.py` (importado pelo harness antes de ler o nonce) forjaria as correções de **todos** os jobs seguintes. Confirmado em desenvolvimento (root); a imagem de produção não é afetada (usuário `node`, stdlib do root, FS somente leitura) | O executor verifica na partida: com `NODE_ENV=production` recusa partir; fora dela, avisa no log | `escape.attack.ts` |
| 8 | Médio | `unittest`: suíte aleatória ("chute") | Aprovação da lição 22 com chance 1/64 por envio (~5 min a 12 envios/min) | Cada implementação do professor roda duas vezes; divergência reprova ("testes não determinísticos"): chance 2^-12 | `grading.security.spec.ts` (enumeração exaustiva) |
| 9 | Baixo | `\u0000` em valor/saída/exceção do aluno ia para a mensagem gravada em `jsonb` | A submissão respondia 500 e não era registrada | Troca por `U+FFFD` nas mensagens | `grading-security.e2e.ts` (dava 500 antes) |
| 10 | Baixo | `min_tests` contava testes pulados | `skipTest` em tudo cumpria o mínimo | `run - skipped` | spec, `unittest.attack.ts` |
| 11 | Baixo | `sys.set_int_max_str_digits(0)` + inteiro gigante fugia do orçamento de texto do harness | Observação com 100 000+ dígitos | Tamanho conferido por `bit_length` antes de gerar o texto | `resources.attack.ts` |
| 12 | Baixo | `jsonEquals` lia chaves herdadas (`{"__proto__": {}}` no gabarito casava com qualquer dict de uma chave), recursão sem limite, floats > 2^53 sem tolerância | Gabarito com `__proto__`; executor comprometido derrubando a API com JSON fundo | `Object.hasOwn`, profundidade ≤ 128, `Number.isSafeInteger` | spec, e2e |
| 13 | Baixo | Linha com o nonce gigante ou funda (quem achou o nonce numa instância compartilhada) | Recursão no `JSON.parse`/`stringify` do executor e da API | Linha ≤ 4 MB e profundidade ≤ 256 no host | `resources.attack.ts` |

### Catálogo (técnica × categoria × teste × resultado × correção)

| Técnica | Categoria | Teste | Resultado | Correção |
|---|---|---|---|---|
| `/`, `/proc`, `/etc`, `/dev`, `/tmp`, caminhos do host, `..`, `chdir('..')` | Fuga | `escape.attack.ts` | Recusado (ENOENT/EPERM) | — |
| Links simbólicos absolutos, relativos, para `/lib`, com barra final | Fuga | `escape.attack.ts` | Recusado | — |
| Escrever, renomear ou criar hardlink em `/lib` e `/harness` | Fuga | `escape.attack.ts` | Recusado sem root; com root o executor acusa | #7 |
| Nomes de arquivo do projeto com `..` ou absolutos | Fuga | `escape.attack.ts` (`safeJoin`) | Recusado | — |
| Lote em disco, argv, stdin, ambiente | Fuga | `escape.attack.ts` | Nada exposto | — |
| Sockets, DNS, HTTP, `fork`, `system`, `subprocess`, threads, `kill`, `ctypes`, `mmap` | Fuga | `escape.attack.ts` | Indisponível | `allow-ip-name-lookup=n` explícito |
| Arquivos e estado de outro job | Fuga | `escape.attack.ts` | Invisível (pasta e instância novas) | — |
| `bytearray(10**9)`, `'a'*10**10`, listas e dicts sem fim | Recursos | `resources.attack.ts` | `MemoryError` ou falha | — |
| Laço infinito, em `__del__`, `atexit`, `__repr__`, engolindo `KeyboardInterrupt`; `10**10**9` | Recursos | `resources.attack.ts` | Morto no tempo limite | — |
| Recursão infinita (também com `setrecursionlimit(10**8)`) | Recursos | `resources.attack.ts` | `RecursionError` ou estouro de pilha | — |
| Inundação de stdout, fd 1, stderr; linha única de 20 MB | Recursos | `resources.attack.ts` | Cortada (64 000 caracteres capturados; 8 MB no host) | — |
| UTF-8 inválido, surrogates e `\x00` na saída e nos valores | Recursos | `resources.attack.ts`, e2e | JSON válido; sem 500 | #9 |
| Valores "bomba" (aninhamento 10⁵, 5 000 chaves, inteiro gigante) | Recursos | `resources.attack.ts` | Truncado pelo harness | #11 |
| Disco: arquivo grande, milhares de arquivos ou pastas | Recursos | `resources.attack.ts` | "Disco excedido" | #6 |
| Pastas de job após timeout, kill por saída ou disco, erro | Recursos | `resources.attack.ts` | Removidas | — |
| 5 jobs simultâneos (1 vaga, fila 1); cancelar job na fila | Recursos | `resources.attack.ts` | 2 × 200 e 3 × 503; o cancelado não roda e libera a vaga | — |
| Flags do Wasmtime (fuel, memória, timeout, ambiente, rede, 3 diretórios) | Recursos | `resources.attack.ts` | Conferidas | — |
| `sys._getframe`, `_current_frames`, `inspect`, `traceback.walk_stack`, `tb_frame` (direto, descritor, `object.__getattribute__`), `gi/cr/ag_frame` | Forja (estrito) | `strict-mode.attack.ts` | Bloqueado | — |
| `gc.DEBUG_SAVEALL` (direto, `reload`, reimportação, `create_builtin`, `exec_builtin`); sinais (`signal`, `_signal`, recriado) | Forja (estrito) | `strict-mode.attack.ts` | Bloqueado | #1 |
| `gc.get_objects/referrers/referents`, `settrace`, `setprofile`, `settrace_all_threads`, `sys.monitoring` | Forja (estrito) | `strict-mode.attack.ts` | Bloqueado (sem threads no WASI) | — |
| `_testcapi`, `_testinternalcapi`, `_testlimitedcapi`, `_testbuffer`, `_xxtestfuzz` por `import`, `import_module`, `create_builtin`, `module_from_spec`; `_ctypes` | Forja (estrito) | `strict-mode.attack.ts` | Recusado | — |
| Varredura de tudo o que é alcançável por atributos (módulos, classes vivas, fechos instalados pelo harness) | Forja (estrito) | `strict-mode.attack.ts` | Nonce não encontrado | — |
| Observação forjada com todas as rotas + `os._exit` (unittest) | Forja (estrito) | `strict-mode.attack.ts` | Não chega ao host | #1 |
| Audit hook do aluno observando `compile`/`exec` da implementação | Forja (unittest) | `strict-mode.attack.ts` | Nada visto | #2 |
| Impressão digital estática da implementação; `id()` e blocos alocados | Forja (unittest) | `unittest.attack.ts`, `grading-forgery.e2e.ts` | Indistinguível | #2 |
| Testes vazios, todos pulados, "só passa/falha contra a minha", `TestResult` e `TestSuite.run` adulterados | Forja (unittest) | `grading-forgery.e2e.ts` | Reprovado | #10 |
| Suíte aleatória | Forja (unittest) | `grading.security.spec.ts` | Chance 2^-12 na lição 22 | #8 |
| Teste diferencial contra uma implementação própria correta | Forja (unittest) | `grading-forgery.e2e.ts` | **Aprovado** (é comportamento; fronteira documentada) | — |
| Subclasses com `__eq__`/`__iter__`/`__len__`/`__repr__` mentirosos, `__class__` falso, metaclasse com `__instancecheck__` | Forja | `forgery.attack.ts` | Valor real da classe base ou `$repr`; tipo real | — |
| `bool` × `int`, NaN, ±inf, -0.0, inteiros > 2^53, ciclos, geradores sem fim | Forja | `forgery.attack.ts`, spec | Distinguidos ou truncados | #12 |
| Classe chamada `ValueError`, `__qualname__`/`__module__` adulterados, `__str__`/`args` hostis | Forja | `forgery.attack.ts` | Não vira o embutido; mensagem segura | — |
| `SystemExit`, `KeyboardInterrupt`, `GeneratorExit`, `BaseException` na sonda | Forja | `forgery.attack.ts` | Exceção observada; a sonda seguinte segue íntegra | — |
| Linhas falsas sem nonce, escrita no fd 1, troca ou fechamento de `sys.stdout`, `os.close(1)`, `os._exit` no meio | Forja | `forgery.attack.ts`, `grading-forgery.e2e.ts` | Nunca aprova (sonda sem observação = falha) | — |
| Nonce numa instância compartilhada + `os._exit` | Forja | `forgery.attack.ts`, `grading-forgery.e2e.ts` | Possível; só aprova com os valores esperados (**fronteira**) | — |
| Builtins trocados (`isinstance`, `issubclass`, `len`, `sorted`, `range`, `print`) | Forja | `forgery.attack.ts` | Muda o que a expressão do professor vê (**fronteira**) | — |
| Três forjadores universais contra as 22 lições do seed | Forja | `grading-forgery.e2e.ts` | Nenhuma lição aprovada | — |
| Fixar a resposta do exemplo visível | Forja | `grading-forgery.e2e.ts` | Reprovado nos casos ocultos | — |
| `io` `contains` imprimindo todas as respostas possíveis | Forja | `grading-forgery.e2e.ts` | **Aprovado** (fronteira: use `trimmed`) | — |
| Apelido, `getattr`, `exec` contra "não use X" | Forja (`source`) | `forgery.attack.ts`, `grading-forgery.e2e.ts`, spec | Reprovado | #5 |
| Código morto para regra positiva | Forja (`source`) | `forgery.attack.ts` | **Aceito** (fronteira) | — |
| Estado entre sondas (builtins, módulos, `sys.path`, recursão, cwd, arquivos) | Forja | `forgery.attack.ts` | Restaurado; o conteúdo de módulos importados persiste (sem poder extra) | — |
| ReDoS pela saída do aluno (`trimmed`) e pela regex do professor | API | spec, e2e | Linear / tempo limitado | #3, #4 |
| `__proto__`/`constructor` no esperado ou no observado; JSON fundo | API | spec, e2e | Não casa; sem estouro de pilha | #12 |
| NFC × NFD, tolerância, `$repr`/`$dict` × valores comuns | API | spec | Comparação estrita, documentada | — |

### Wasmtime 49.0.0 (avisos publicados até 03/11/2026)

O convidado é um módulo **fixo e confiável** (CPython 3.14 pré-compilado no
build); o aluno controla dados do interpretador, não instruções Wasm. Os
avisos de compilador, *component model*, GC e streams não são alcançáveis por
ele, mas a versão deve subir para **49.0.5** (que corrige todos os abaixo na
linha 49.x), atualizando `WASMTIME_VERSION` e os SHA-256 em
`apps/runner/scripts/fetch-python-wasi.sh`.

| Aviso | Afeta 49.0.0 (corrigido em) | Aplicável aqui | Motivo |
|---|---|---|---|
| RUSTSEC-2026-0315 / GHSA-m63x-6p34-q65x / CVE-2026-115390 (amplificação de fuel em `call_ref`/`catch`) | Sim (49.0.1) | Não | O CPython WASI não usa *function references* nem exceções Wasm; o tempo de parede (`-W timeout` + kill do host) independe do fuel |
| RUSTSEC-2026-0316 / GHSA-jqpg-j7w6-42pr / CVE-2026-115389 (lifting excede o *hostcall fuel*) | Sim (49.0.1) | Não | `hostcall-fuel` não é usado; lifting de *component model* |
| RUSTSEC-2026-0327 / GHSA-32h6-97mm-8q3c (resultado de callback async não validado) | Sim (49.0.2) | Não | Só *component model* async |
| RUSTSEC-2026-0353 a 0364 (pânicos em streams/async; GHSA-q554-3cjc-rx7p: tabelas de handles sem teto global) | Sim (49.0.3) | Não | Só *component model*; o convidado é um módulo núcleo WASIp1 |
| RUSTSEC-2026-0378 (stream com tipo de payload diferente) | Sim | Não | *Component model* |
| RUSTSEC-2026-0379 / GHSA-mghf-wjfp-p5xm / CVE-2026-115893 (`br_table` grande no aarch64) | Sim (49.0.4) | Só em host ARM, e o módulo é fixo | Produção atual é x86-64; atualizar antes de usar ARM |
| RUSTSEC-2026-0380 / GHSA-897f-g5gm-fmxm (overflow de bit-packing no Cranelift) | Não (≥ 43) | — | — |
| RUSTSEC-2026-0269 / GHSA-vqjp-4c8c-hfgg (fuga de FS com barra final) | Não (≥ 47.0.4) | — | Coberto também por `escape.attack.ts` |
| RUSTSEC-2026-0422/0423/0424 (GC; recursos entre componentes, GHSA-6fr9-xmw9-5352) | Sim (49.0.5) | Não | GC e *component model* |

### Riscos residuais (não corrigidos)

- **Instâncias compartilhadas** (`call`/`io`/`variable`/`expr`) não têm modo
  estrito: o aluno pode achar o nonce e escrever as próprias observações. A
  garantia é só a de que forjar exige conhecer o valor esperado; casos com
  resposta booleana ou dada no enunciado são "chutáveis" um a um.
- **Comparações dentro da expressão do professor** (`f(x) == y`, `isinstance`,
  `issubclass`) são decididas pelo aluno.
- **`contains`/`regex`** aceitam saídas que contêm todas as respostas.
- **`unittest`**: o teste diferencial contra implementação própria passa;
  `target` classe não é opaco; importações e tempo da implementação são
  observáveis; aprovação por chute com chance 2^-2k por envio (não há limite
  diário de envios, só 12/min por usuário).
- **Modo estrito** é uma lista de bloqueio sobre o CPython 3.14: atualizar o
  Python exige rodar `test:attacks` de novo.
- **Stdlib gravável** em desenvolvimento/CI quando o executor é root ou dono de
  `/opt/levelusp-python` (só aviso no log fora de produção).
- **Wasmtime 49.0.0**: avisos acima, não aplicáveis ao uso atual; atualizar.
- **Job em execução** não é interrompido quando a API desiste (só os da fila);
  o custo fica limitado ao tempo do lote.
