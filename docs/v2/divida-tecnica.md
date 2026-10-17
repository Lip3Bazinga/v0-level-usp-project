# Dívida técnica e próximos passos

| Item | Impacto | Próximo passo |
|---|---|---|
| 19 das 22 lições do seed ainda têm um caso `legacy` | Correção mais fraca nessas lições | Reescrever os blocos com preparação (setup) como casos `call`/`io` |
| Pyodide do navegador em 0.25.1 (Python 3.11) | "Executar" pode divergir do "Verificar" (3.14) | Testar `NEXT_PUBLIC_PYODIDE_INDEX_URL` com a versão 314.x e trocar o padrão |
| `input()` e botão Parar no navegador | Parar recarrega o runtime; sem `input()` interativo | `SharedArrayBuffer` + cabeçalhos COOP/COEP + `setInterruptBuffer` |
| Login com Google/GitHub | Botões desabilitados ("em breve") | Tabela `oauth_accounts` pronta; implementar fluxo OAuth na API |
| SMTP | Links de redefinição vão para o log da API | Configurar `SMTP_URL` |
| Rate limit em memória | Não compartilha entre réplicas | Trocar por Postgres/Redis ao escalar |
| 67 avisos de ESLint (regras do React Compiler) | Padrões antigos de efeitos/refs | Refatorar gradualmente; regras como aviso |
| Imagens no Storage do Supabase | Dependência residual após a importação | Script de cópia para o volume `uploads` |
| Prova final de demonstração (5 questões) | Seed de homologação | Importar o banco de questões real |
