# 09 — Prova Final e Certificação

Sistema de certificação do LevelUSP: prova teórica + projeto prático + emissão
automática de certificado com verificação pública.

## Modelo de dados

| Tabela | Papel | Acesso do cliente |
|--------|-------|-------------------|
| `exams` | 1 prova por curso: nota mínima, tempo limite, cooldown | SELECT (só `active`) |
| `exam_questions` | Banco de questões com `correct_index` (gabarito) | **NENHUM** (RLS deny-all + revoke) |
| `exam_attempts` | Tentativas: questões sorteadas, respostas, nota | SELECT das próprias; escrita só service role |
| `certificates` | Certificados emitidos: código único, nota, data | SELECT dos próprios; escrita só service role |

Proteção do gabarito = mesma filosofia de `hidden_tests`: o cliente nunca tem
como ler `correct_index`, nem por `select("*")` — a tabela inteira é inacessível.

## Rotas

- `GET /api/exam/[courseId]` — status: elegibilidade (todas as lições concluídas,
  exceto módulo de certificação), tentativas, melhor nota, cooldown.
- `POST /api/exam/[courseId]/start` — cria (ou retoma) tentativa; sorteia a ordem
  das questões; retorna `{id, prompt, options}` — sem gabarito.
- `POST /api/exam/[courseId]/submit` — corrige no servidor, grava score/passed,
  devolve nota + correção por questão (explicação apenas nas erradas).
- `POST /api/certificate/issue` — emite o certificado se e somente se:
  todas as lições concluídas (inclui o projeto final) + prova aprovada.
  Idempotente. Registra `certificate.issued` no `audit_log`.
- `GET /api/certificate/pdf/[code]` — PDF oficial (pdf-lib), público por código.
- `/certificado/[code]` — página pública de verificação (RPC `verify_certificate`,
  security definer, sem login).

## Regras da prova (decisões de produto)

- **Nota mínima:** 70%
- **Tempo limite:** 45 min (validado no servidor com 2 min de tolerância;
  tentativa expirada = nota 0 e cooldown normal)
- **Tentativas:** ilimitadas, com **cooldown de 60 min** após reprovação
- Tentativa aberta e não expirada é **retomada** (mesma ordem de questões)
- Aprovado não repete a prova (409)

## Fluxo do aluno

matrícula → lições (básico → intermediário) → prova desbloqueia ao concluir
todas as lições fora do módulo de certificação → aprovação na prova → projeto
final (lição `coding` com testes unittest ocultos) → certificado emite via
`/api/certificate/issue` (chamado pela UI do curso/prova) → PDF + página
pública `/certificado/[code]`.

## UI

- `app/cursos/[id]/prova/page.tsx` — página da prova (status → prova com
  cronômetro → resultado com correção).
- `app/cursos/[id]/page.tsx` — seção "Prova Final e Certificação" + botão de
  certificado (emite e abre o PDF).
- `app/certificado/[code]/page.tsx` — verificação pública (rota liberada no
  middleware).
