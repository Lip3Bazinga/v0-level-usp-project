---
name: entregar
description: Loop de entrega do LevelUSP — validar integridade, commitar, push e acompanhar o deploy na Vercel até READY. Use ao finalizar qualquer mudança de código que precise ir para produção.
---

# Entregar mudanças do LevelUSP

Siga este loop na ordem, sem pular etapas. Contexto do projeto: `CLAUDE.md` na raiz.

## 1. Validar integridade dos arquivos tocados

Para cada arquivo criado/editado (via bash no diretório do repo):

```bash
python3 -c "
import sys
for f in sys.argv[1:]:
    d = open(f,'rb').read()
    assert b'\x00' not in d, f'{f}: byte NUL'
    assert d.endswith(b'\n'), f'{f}: sem newline final'
    if f.endswith(('.ts','.tsx','.json')):
        assert d.count(b'{') == d.count(b'}'), f'{f}: chaves desbalanceadas'
    print(f, 'OK')
" ARQUIVO1 ARQUIVO2
```

Se algum falhar: reescrever o arquivo INTEIRO via python (`open('w')` + conteúdo
+ `truncate()`) e revalidar.

## 2. Se mexeu em gabaritos/lições

`python3 scripts/verify_lessons.py` — precisa terminar em "TODAS PASSARAM".

## 3. Se mexeu em schema

- Aplicar via MCP Supabase `apply_migration` (projeto `pzmxaoxtljmqajyyrkhw`)
- Versionar o mesmo SQL em `supabase/migrations/AAAAMMDD_nome.sql`
- Refletir em `supabase/schema.sql`

## 4. Commit e push

- `git add` com caminhos EXPLÍCITOS (nunca `-A` após incidente de índice)
- Conferir staged == disco: `git show :caminho` deve bater byte a byte
- Mensagem pt-BR: `tipo: resumo` + bullets do que mudou e por quê
- `git push origin main`
- Se o git reclamar de índice corrompido: `rm -f .git/index && git reset` e
  refazer o add explícito conferindo `git diff --cached --stat` antes do commit.

## 5. Acompanhar o deploy (obrigatório)

Via MCP da Vercel (team `team_7iSRvMimkEQXNFk7aEiG1IgU`, projeto
`prj_IgQa8TR1hyZxpX48dmzbems7cMZi`):

1. `list_deployments` até aparecer o deployment do seu commit
2. Poll `get_deployment` até `READY` ou `ERROR`
3. `ERROR` → `get_deployment_build_logs` (errorsOnly) → corrigir → repetir o loop

Nunca declare a entrega concluída sem o deploy `READY` do SEU commit.
