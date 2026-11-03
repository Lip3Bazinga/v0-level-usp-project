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
  executor; só o front escuta em `127.0.0.1`; acesso público pelo túnel.
- **Auditoria**: ações administrativas registradas em `audit_log`.
- **LGPD**: exportação dos próprios dados e exclusão da conta pelo usuário.

## Antes de abrir para alunos reais

1. Rotacionar a chave `service_role` do Supabase antigo (já exposta) e desligar o projeto após o corte.
2. Configurar SMTP para confirmação e redefinição de senha.
3. ~~Converter os gabaritos `legacy` para casos declarativos.~~ Feito no curso
   Python Completo; conteúdo importado do Supabase ainda precisa ser convertido.
4. Mover produção para um servidor institucional (dados de alunos fora do notebook).
