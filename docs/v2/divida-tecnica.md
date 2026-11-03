# Dívida técnica e próximos passos

| Item | Impacto | Próximo passo |
|---|---|---|
| 19 das 22 lições do seed ainda têm um caso `legacy` | Correção mais fraca nessas lições | Reescrever os blocos com preparação (setup) como casos `call`/`io` |
| Patch do Python: navegador 3.14.2 (Pyodide 314.0.7), executor 3.14.0 (WASI) | Nenhuma lição afetada; o teste de paridade documenta as diferenças restantes (`sqlite3` só no navegador, mensagens de `zoneinfo`/`subprocess`) | Atualizar o CPython WASI do executor para 3.14.2 e rodar `test:paridade` ([paridade-python.md](./paridade-python.md)) |
| Pacotes via `micropip` (fora do `pyodide-lock.json`) | A CSP não libera o PyPI: só os pacotes do lock instalam no navegador | Espelhar os wheels necessários em `NEXT_PUBLIC_PYODIDE_PACKAGE_BASE_URL` ou liberar o PyPI na CSP |
| `input()` e botão Parar no navegador | Parar recarrega o runtime; sem `input()` interativo | `SharedArrayBuffer` + cabeçalhos COOP/COEP + `setInterruptBuffer` |
| Login com Google/GitHub | Botões desabilitados ("em breve") | Tabela `oauth_accounts` pronta; implementar fluxo OAuth na API |
| SMTP | Links de redefinição vão para o log da API | Configurar `SMTP_URL` |
| Rate limit em memória | Não compartilha entre réplicas | Trocar por Postgres/Redis ao escalar |
| Diálogos do admin feitos à mão (`AdminModal`, paleta de comandos) | Usam `useModalA11y`, não o `Dialog` do Radix | Migrar para `components/ui` quando houver um `Dialog` gerado pelo shadcn |
| `window.prompt` no convite de usuário (admin) e no novo arquivo do editor do professor | Visual do navegador, fora do padrão do `swal*` | Criar um `swalPrompt` em `lib/swal.ts` e trocar os dois |
| DAU/MAU do admin com ponto decimal ("12.3%") | Destoa do `formatPercent` ("12,3%") | Decidir o formato e usar `formatPercent(valor, 1)` |
| Cores em hex nos gráficos do admin e no editor de texto rico | Valores repetem os tokens de `globals.css` | Ler as cores dos tokens CSS (`getComputedStyle`) se o tema mudar |
| Imagens no Storage do Supabase | Dependência residual após a importação | Script de cópia para o volume `uploads` |
| Prova final de demonstração (5 questões) | Seed de homologação | Importar o banco de questões real |

Resolvido na auditoria de clean code: os 32 avisos de ESLint da web (lint com 0 erros e 0 avisos em todos
os pacotes; `react-hooks/*` agora é erro), duplicações entre telas (marca, spinner, downloads, validação de
senha, tempos) e os nomes de métodos da API e de `lib/api` (convenção em `padroes-de-codigo.md` §2).
