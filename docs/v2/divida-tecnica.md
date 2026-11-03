# Dívida técnica e próximos passos

| Item | Impacto | Próximo passo |
|---|---|---|
| Lições importadas do Supabase chegam com um caso `legacy` | Correção mais fraca nessas lições (o seed já não tem nenhum) | Reescrever como casos `expr`/`unittest`, como em `packages/db/tools/manual_conversions.py` |
| Modo estrito do executor (lições com `unittest`/`legacy`) bloqueia frames | `logging`, `inspect.stack()` e tracebacks não funcionam no código do aluno nessas lições | Aceito; documentado em `motor-de-correcao.md` |
| Pyodide do navegador em 0.25.1 (Python 3.11) | "Executar" pode divergir do "Verificar" (3.14) | Testar `NEXT_PUBLIC_PYODIDE_INDEX_URL` com a versão 314.x e trocar o padrão |
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
