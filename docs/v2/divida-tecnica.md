# Dívida técnica e próximos passos

| Item | Impacto | Próximo passo |
|---|---|---|
| Lições importadas do Supabase chegam com um caso `legacy` | Correção mais fraca nessas lições (o seed já não tem nenhum) | Reescrever como casos `expr`/`unittest`, como em `packages/db/tools/manual_conversions.py` |
| Modo estrito do executor (lições com `unittest`/`legacy`) bloqueia frames | `logging`, `inspect.stack()` e tracebacks não funcionam no código do aluno nessas lições | Aceito; documentado em `motor-de-correcao.md` |
| Patch do Python: navegador 3.14.2 (Pyodide 314.0.7), executor 3.14.0 (WASI) | Nenhuma lição afetada; o teste de paridade documenta as diferenças restantes (`sqlite3` só no navegador, mensagens de `zoneinfo`/`subprocess`) | Atualizar o CPython WASI do executor para 3.14.2 e rodar `test:paridade` ([paridade-python.md](./paridade-python.md)) |
| Pacotes via `micropip` (fora do `pyodide-lock.json`) | A CSP não libera o PyPI: só os pacotes do lock instalam no navegador | Espelhar os wheels necessários em `NEXT_PUBLIC_PYODIDE_PACKAGE_BASE_URL` ou liberar o PyPI na CSP |
| `input()` e botão Parar no navegador | Parar recarrega o runtime; sem `input()` interativo | `SharedArrayBuffer` + cabeçalhos COOP/COEP + `setInterruptBuffer` |
| Login com Google/GitHub | Os botões foram retirados da tela (não existe o fluxo) | Tabela `oauth_accounts` pronta; implementar fluxo OAuth na API |
| Notebook/células | Lições de dados (níveis 4 a 6) ainda são arquivos `main.py` | Células em cima do motor `python-dados`, junto com o Nível 4 |
| Módulos "globais" (sem curso) do conteúdo antigo | Dois modelos convivendo (`modules.course_id` nulo) | Migrar os dados quando o conteúdo antigo for aposentado |
| Colunas `courses.final_project_*` | Sem uso: o projeto agora é uma lição `is_project`; a UI já saiu | Remover as colunas numa migração e apagar `legacy/` |
| SMTP | E-mails (recuperação de senha, convites) não saem em homolog | Configurar o provedor e testar com `pnpm --filter @levelusp/api mail:test` |
| Mermaid só tem validação estrutural no lint | Erro fino de sintaxe de diagrama só aparece no player | Validar com o parser oficial num passo com navegador (Playwright) |
| Imagens das lições (`content_assets`) | Públicas pela URL mesmo com o curso em rascunho; guardadas em base64 no Postgres | Checar a publicação do curso na rota e mover para o volume `uploads` se crescerem |
| Sem regra `source` para operadores e `continue` | Alguns exercícios do Nível 1 aceitam o valor final digitado à mão ou outra construção equivalente (listados em `pendencias-curso-completo.md`) | Acrescentar regras de AST para operador e `continue` no motor |
| `uses recursion` por função | O harness só registra recursão no projeto inteiro; com `function` até a solução reprova | Registrar recursão por função em `apps/runner/python/harness.py` |
| Visualizador de execução | Só acompanha o arquivo de entrada; sem `input()` | Rastrear os outros arquivos do projeto |
| Editor do professor | A saída da Previsão é digitada à mão; no modo ordenar os ids das linhas mudam a cada edição | Gerar a saída executando o código; ids estáveis |
| Testes Playwright | Não cobrem o player de passos, as trilhas nem os recursos novos | Escrever os fluxos e rodar com a pilha no ar |
| SMTP | Links de redefinição vão para o log da API | Configurar `SMTP_URL` |
| Rate limit em memória | Não compartilha entre réplicas | Trocar por Postgres/Redis ao escalar |
| Diálogos do admin feitos à mão (`AdminModal`, paleta de comandos) | Usam `useModalA11y`, não o `Dialog` do Radix | Migrar para `components/ui` quando houver um `Dialog` gerado pelo shadcn |
| `window.prompt` no convite de usuário (admin) e no novo arquivo do editor do professor | Visual do navegador, fora do padrão do `swal*` | Criar um `swalPrompt` em `lib/swal.ts` e trocar os dois |
| DAU/MAU do admin com ponto decimal ("12.3%") | Destoa do `formatPercent` ("12,3%") | Decidir o formato e usar `formatPercent(valor, 1)` |
| Cores em hex nos gráficos do admin e no editor de texto rico | Valores repetem os tokens de `globals.css` | Ler as cores dos tokens CSS (`getComputedStyle`) se o tema mudar |
| Sequência diária no login: `lockStreak` faz `SELECT … FOR UPDATE` fora de transação | Dois logins simultâneos podem gravar a sequência duas vezes (inofensivo, mesmo valor) | Rodar `touchStreak` do login dentro de `TransactionRunner` |
| Gabaritos do seed/importação gravados sem passar pelo `testCasesSchema` | A web trata campos com default ausentes (`args`, `kwargs`, `stdin`, `match`) com `eslint-disable` justificado | Normalizar os casos na importação/seed (ou devolver o gabarito já parseado em `/authoring`) e remover os fallbacks |
| Imagens no Storage do Supabase | Dependência residual após a importação | Script de cópia para o volume `uploads` |
| Prova final de demonstração (5 questões) | Seed de homologação | Importar o banco de questões real |
| Perfis do motor Pyodide (`pyodide-profiles.ts`) e `PACKAGES` de `fetch-pyodide.sh` são conferidos contra o manifesto de bibliotecas só por teste de CI, não derivados dele | Biblioteca nova exige editar o manifesto E esses dois lugares (o teste do runner diz o que falta) | Fase F, item 6: o runner passa a derivar `LIBRARY_PROFILES`/perfis do manifesto e o script lê a lista dele |
| Aprovação de biblioteca gera só o rascunho da entrada do manifesto (`manifest_snippet`); o PR é manual e a tela do admin ainda não mostra o rascunho | O admin precisa chamar `GET /admin/library/manifest-pending` (ou copiar da resposta da revisão) e abrir o PR | Mostrar a lista de pendências na tela de bibliotecas, com botão de copiar; avaliar abrir o PR por GitHub App (exigiria segredo no servidor: só com revisão de segurança) |
| Correção por métrica com conjunto de teste oculto, fila com vários executores e renderizador web/dashboards | Fora da Fase F (registrado por ela) | Fases futuras |
| Piso de ~4 s por lote no executor `python-dados` na política `fresh` (padrão) | Medido na Fase C (`desempenho-executor.md`): o piso é o aquecimento do worker, que só é reposto depois do uso. A fila do pool agora entrega o próximo worker pronto e pedidos em sequência caem de 2,9 s para 1,6 s de média no `dados` (9,1 s para 4,9 s no `ml`); a mediana segue ~3 s. Com `RUNNER_PYODIDE_POLICY=reuse` some (46 ms no `dados`, 223 ms no `ml`), ao custo de reaproveitar o worker | Decidir se o ambiente de verificação e de produção usa `reuse`; propostas de pool maior e reciclagem adiantada em `desempenho-executor.md` ("O que sobra") |

Resolvido na Fase C: o corretor deixou de executar o bloco `if __name__ == "__main__":` do aluno nos casos `call`, `variable`,
`expr`, `source` e `unittest` (o arquivo carrega como o módulo `main`; só `io` e `legacy` seguem como `__main__`). As lições
m6-03 e m6-04 do N6 voltaram a treinar 3000 e 500 passos no `__main__`; a verificação da agenda do N2 (`n2-m4-05`) e dois
casos de semente do N5 (`n5-m6-05`, passos 5 e 7) foram refeitos; o pacote de conteúdo passou a sair minificado
(14,0 MB contra 19,5 MB; limite de 20 MB na importação).

Resolvido na auditoria de clean code: os 32 avisos de ESLint da web (lint com 0 erros e 0 avisos em todos
os pacotes; `react-hooks/*` agora é erro), duplicações entre telas (marca, spinner, downloads, validação de
senha, tempos) e os nomes de métodos da API e de `lib/api` (convenção em `padroes-de-codigo.md` §2).

Resolvido no endurecimento de tipos: tsconfig estrito em todos os pacotes (inclusive a web), ESLint tipado
com regras únicas em `packages/eslint-config` (também no runner, contracts e db, que antes só rodavam `tsc`),
tipos de retorno explícitos, testes e2e lendo as respostas pelos DTOs do contrato e TSDoc obrigatório nas
camadas públicas (`padroes-de-codigo.md` §9). As regras do React Compiler (`react-hooks/*`) são todas erro
e não há nenhuma violação.
