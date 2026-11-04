# Documentação técnica — LevelUSP v2

| Documento | Conteúdo |
|---|---|
| [arquitetura.md](./arquitetura.md) | Visão geral, camadas, pastas, decisões e trade-offs |
| [motor-de-correcao.md](./motor-de-correcao.md) | Executor WebAssembly (WASI), sondas, casos de teste, limites |
| [seguranca.md](./seguranca.md) | Modelo de ameaças, controles e o que mudou desde a auditoria |
| [ambientes-e-deploy.md](./ambientes-e-deploy.md) | dev/homolog/prod, CI/CD, notebook + Cloudflare Tunnel, passo a passo |
| [producao-vm.md](./producao-vm.md) | Produção numa VM Linux: deploy, rollback, backups (LGPD), restauração, monitoramento, incidentes e checklist de lançamento |
| [migracao-dados.md](./migracao-dados.md) | Importação do Supabase e conversão de gabaritos |
| [testes.md](./testes.md) | Pirâmide de testes e como rodar cada camada |
| [desempenho-e-carga.md](./desempenho-e-carga.md) | Teste de carga de turma (`pnpm load:turma`), capacidade da VM, fila do executor, Lighthouse e custo por aluno |
| [paridade-python.md](./paridade-python.md) | Python do "Executar" (Pyodide) × "Verificar" (WASI): versões, origem do runtime, teste diferencial |
| [api-rotas.md](./api-rotas.md) | Mapa de rotas da API (contrato) |
| [divida-tecnica.md](./divida-tecnica.md) | Pendências conhecidas e próximos passos |

A documentação da versão anterior (Supabase + Vercel) está em [`../legado/`](../legado/).
