# scripts

## verify_lessons.py

Validador dos gabaritos das lições de Python do LevelUSP. Para cada lição, o
script executa as soluções de referência (gabaritos) contra os casos de teste
usados pelo avaliador e confirma que todas passam — garantindo que nenhuma
alteração no conteúdo quebre os exercícios.

O script é autocontido: usa apenas a biblioteca padrão do Python (3.11+), sem
dependências externas nem acesso ao banco.

### Como rodar localmente

```bash
python3 scripts/verify_lessons.py
```

Saída esperada: uma linha `[PASS]` por lição e, ao final, `TODAS PASSARAM`
(exit code 0). Qualquer falha imprime o detalhe do caso e retorna exit code
diferente de 0 — é o mesmo comando executado pelo job `gabaritos` do CI
(`.github/workflows/ci.yml`).
