---
slug: n4-m3-02-tipos-datas-e-strings
titulo: Tipos, datas e strings
descricao: astype, to_numeric(errors='coerce'), to_datetime com formatos brasileiros, acessor .dt e .str, categorias e normalização de texto.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Converter colunas para numérico e para datetime tratando valores inválidos
- Extrair componentes de datas (ano, mês, dia da semana) e calcular diferenças
- Normalizar textos (strip, lower, remoção de acentos simples, padronização de categorias)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `to_numeric(errors="coerce")` para `"R$ 1.234,56"` após limpar com `.str.replace`; `to_datetime(format="%d/%m/%Y")`, `dayfirst`; `.dt.year/.month/.day_name()/.dayofweek`; diferenças (`Timedelta`) em dias; `.str` (`strip`, `lower`, `replace`, `extract` com regex simples, `split(expand=True)`); `category` para economizar memória e ordenar; `unidecode` não disponível: tabela própria de acentos.

**Exercícios previstos.** `limpar_precos(serie)` (`call` lista de floats + `tolerance`); `converter_datas(df)` e `idade_em_dias(df, referencia)` (`expr`); `padronizar_cidades(serie)` unificando `"são paulo"`, `" SAO PAULO "`, `"São Paulo"` (`call`); `extrair_ddd(telefones)` com `.str.extract` (`call`); quiz sobre `errors="coerce"` e `dayofweek`.

**Erros comuns a cobrir.** `astype(float)` em coluna com texto (`ValueError`); datas ambíguas sem `format`; comparar strings com espaços invisíveis; `.str` em coluna numérica.
