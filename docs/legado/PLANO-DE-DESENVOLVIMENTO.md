# Plano de Desenvolvimento — LevelUSP pronta e utilizável

> Estado em 2026-07-14: deploy READY em produção, curso certificado completo
> (24 lições + prova + projeto + certificado verificável), 3 bugs críticos de
> produção corrigidos. Este plano cobre o caminho do estado atual até uma
> plataforma aberta a alunos reais, em 6 fases. Cada fase tem critério de
> saída explícito — não avance sem cumpri-lo.

---

## Fase 0 — Sanear a base de trabalho (½ dia) 🔴 bloqueante

O maior risco do projeto hoje não é código: é o **repositório dentro do OneDrive**,
que corrompeu arquivos 4 vezes numa única sessão (NULs no fim, truncamento com
tamanho antigo em cache) e quebrou 2 deploys.

- [ ] Clonar o repo do GitHub para uma pasta **fora do OneDrive** (ex.: `C:\dev\levelusp`)
      e trabalhar só nela. A cópia do OneDrive vira leitura/backup.
- [ ] `pnpm install` no clone e commitar o `pnpm-lock.yaml` atualizado (hoje o
      `installCommand: --no-frozen-lockfile` no vercel.json compensa; depois disso,
      pode voltar ao install padrão).
- [ ] `pnpm build` local passando — a partir daqui, **nenhum push sem build local**.
- [ ] Rotacionar/desativar as chaves legadas do Supabase (histórico do repo é
      público e já vazou segredos; as chaves novas sb_secret/sb_publishable já
      são suportadas pelo código).

**Critério de saída:** build local verde + lockfile commitado + chaves legadas mortas.

---

## Fase 1 — Validar o fluxo de certificação de ponta a ponta (1 dia) 🔴

Tudo está implementado e o conteúdo foi validado programaticamente (22/22 lições
passam com soluções de referência), mas falta o teste **humano** em produção.

- [ ] Criar um usuário de teste real e percorrer: cadastro → matrícula no
      "Python Completo" → resolver 2–3 lições (Executar + Verificar) → conferir
      XP/streak/badges.
- [ ] Marcar as demais lições como concluídas via SQL (usuário de teste) e fazer
      a **prova de verdade**: cronômetro, retomada de tentativa, reprovação
      (cooldown de 1h), aprovação.
- [ ] Resolver o projeto final no IDE e verificar.
- [ ] Emitir o certificado, baixar o PDF, abrir `/certificado/[code]` numa
      janela anônima e num celular.
- [ ] Testar criação de curso **com capa** como professor (valida o fix do 403).
- [ ] Auditoria funcional do IDE no navegador (pendência da sessão anterior):
      criar/renomear/excluir arquivo e pasta, console interativo, `Parar`,
      timeout com `while True:`, import de biblioteca do catálogo (matplotlib
      com figura), lição teórica.

**Critério de saída:** um certificado real emitido e verificado publicamente,
sem nenhum erro de console/rede no caminho.

---

## Fase 2 — Robustez para alunos reais (2–4 dias) 🟠

- [ ] **Rate limiting** em `/api/evaluate` e `/api/exam/*` (ex.: 10 verificações/min
      por usuário — Vercel KV ou checagem por janela em `exam_attempts`/tabela leve).
- [ ] **Auth de produção:** confirmação de e-mail, redefinição de senha, template
      de e-mails em pt-BR, e ativar a proteção contra senhas vazadas (advisor
      do Supabase já aponta).
- [ ] **Advisors restantes do Supabase:** `search_path` de `update_notes_updated_at`;
      revogar EXECUTE de `handle_new_user` para anon/authenticated (é trigger,
      não RPC); avaliar restringir listagem dos buckets públicos.
- [ ] **Observabilidade:** Sentry (ou Vercel error monitoring) no front e nas
      rotas; alerta para falha em `/api/evaluate` (é o coração do produto).
- [ ] **CI mínimo (GitHub Actions):** `pnpm build` + `tsc --noEmit` + o script
      `verify_lessons.py` (validação dos gabaritos contra soluções de referência)
      a cada PR. Guardar o script em `scripts/` no repo.
- [ ] Testes de integração das rotas de prova/certificado (auth, cooldown,
      idempotência da emissão, tentativa expirada).

**Critério de saída:** CI verde obrigatório, erros monitorados, abuso contido.

---

## Fase 3 — Qualidade de código e dívidas (3–5 dias) 🟡

Agora com build local, é seguro refatorar (pendência herdada da sessão anterior).

- [ ] **Clean Code:** quebrar os arquivos grandes (`app/ide/page.tsx` duplica o
      fluxo de `app/lesson/[id]` + `ide-context` — unificar ou aposentar `/ide`;
      `app/cursos/[id]/page.tsx` em componentes; extrair helpers de auth Bearer
      repetidos nas rotas para `lib/server/auth.ts`).
- [ ] Pasta `lib/shared/` para utilitários comuns; tipos TS estritos nos pontos
      com `as never`/`any` (gerar tipos do Supabase via `generate_typescript_types`).
- [ ] Investigar e, se possível, remover `typescript.ignoreBuildErrors` (bug de
      codegen do Next 16 — retestar a cada minor).
- [ ] Limpar os arquivos duplicados na raiz do repo (docs/*.puml copiados) e o
      `public/pyodide-worker.js` legado.
- [ ] `runConsoleCommand` passar os arquivos do projeto (console hoje não enxerga
      os módulos do aluno).

**Critério de saída:** nenhum arquivo >400 linhas nos fluxos principais,
type-check limpo, `/ide` unificado ou removido.

---

## Fase 4 — Experiência do aluno e do professor (1 semana) 🟡

**Aluno**
- [ ] Página "Meus certificados" no perfil (lista + link público + PDF).
- [ ] Notificações internas nos eventos: prova desbloqueada, aprovação, certificado
      emitido (tabela `notifications` já existe).
- [ ] Revisão mobile dos fluxos novos (prova e certificado) e do IDE.
- [ ] Onboarding curto no primeiro login (o que é XP, como verificar resposta).

**Professor/Admin**
- [ ] CRUD de questões da prova no painel admin (rotas service role — hoje o
      banco de questões só é gerenciável por SQL; o guia do professor já
      documenta o formato).
- [ ] Estatísticas por curso: taxa de conclusão por lição, notas da prova,
      certificados emitidos (leituras agregadas via service role).
- [ ] Testar o ciclo completo professor: solicitação de acesso → aprovação →
      criação de curso com lições/testes → publicação.

**Critério de saída:** professor cria curso certificável sem tocar em SQL;
aluno acha o certificado sem ajuda.

---

## Fase 5 — Conteúdo e piloto (1–2 semanas, em paralelo às fases 3–4) 🟢

- [ ] Revisão pedagógica humana das 24 lições do Python Completo (um professor
      resolve tudo no próprio IDE; ajustar enunciados/dicas onde travar).
- [ ] Revisar as 30 questões da prova (clareza, distratores, dificuldade).
- [ ] Decidir o destino dos cursos de teste no catálogo ("Teste", "Curso Python
      Teste 2" etc. — despublicar) e do Python Básico (mantê-lo como trilha de
      entrada sem certificado, apontando para o Python Completo).
- [ ] **Piloto fechado:** 10–20 alunos reais, uma semana, com canal de feedback.
      Métricas: conclusão da lição 1, tempo até travar, taxa de aprovação na
      prova, bugs reportados.
- [ ] Iterar sobre o feedback antes de abrir.

**Critério de saída:** ≥70% do piloto conclui o módulo 1 sem suporte; nenhum
bug bloqueante aberto.

---

## Fase 6 — Lançamento (2–3 dias) 🟢

- [ ] Domínio definitivo (ex.: levelusp.usp.br ou similar) + atualizar a URL de
      verificação impressa no PDF do certificado (hoje: levelusp.vercel.app).
- [ ] Termos de uso e política de privacidade (LGPD — dados de menores exigem
      atenção; consultar o jurídico da universidade).
- [ ] Backup automático do banco confirmado no plano do Supabase + plano de
      restauração testado.
- [ ] Verificar limites do plano (Supabase pausou o projeto por inatividade no
      free tier — para produção com alunos, avaliar upgrade; idem Vercel para
      `maxDuration` e volume de invocações do avaliador).
- [ ] Anúncio + monitoramento ativo na primeira semana.

---

## Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Repo no OneDrive corrompe arquivos | Fase 0 — mover já; foi a maior fonte de falha até aqui |
| Free tier pausa o Supabase | Upgrade antes do piloto (Fase 5) |
| Avaliador Python sob carga (função síncrona, 30s) | Rate limit (Fase 2) + monitorar p95; se saturar, fila leve ou região adicional |
| Gabaritos só existem no banco (decisão de segurança — repo público) | Backup do banco cobre; export documentado nas migrações |
| `ignoreBuildErrors` mascara erro de tipo novo | `tsc --noEmit` no CI (Fase 2) cobre o buraco |

## Ordem de execução resumida

**Semana 1:** Fases 0 + 1 + início da 2 · **Semana 2:** Fases 2 + 3 ·
**Semana 3:** Fase 4 + revisão de conteúdo · **Semana 4:** Piloto ·
**Semana 5:** Ajustes + Lançamento.

Com uma pessoa dedicada (+ o agente para implementação), é ~5 semanas até
lançamento aberto. O caminho crítico é: **Fase 0 → Fase 1 → piloto** — todo o
resto pode se ajustar em paralelo.
