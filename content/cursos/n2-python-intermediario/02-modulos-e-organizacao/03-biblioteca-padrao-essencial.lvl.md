---
slug: n2-m2-03-biblioteca-padrao-essencial
titulo: Biblioteca padrão essencial
descricao: 'math, random, datetime, collections, itertools e functools: resolver problemas comuns sem reinventar a roda.'
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Usar math, random (com seed) e datetime para cálculos, sorteios e datas
- Aplicar Counter, defaultdict, deque e namedtuple de collections
- Combinar itertools (product, permutations, combinations, groupby) e functools.reduce em problemas de contagem e agregação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Tour guiado por uso, não por catálogo: `math` (`sqrt`, `ceil`, `floor`, `gcd`, `pi`), `random` (`choice`, `sample`, `shuffle`, `seed`), `datetime` (`date`, `timedelta`, `strftime`/`strptime` no formato brasileiro), `collections` (`Counter.most_common`, `defaultdict(list)`, `deque` com `maxlen`, `namedtuple`), `itertools` (`product`, `permutations`, `combinations`, `groupby`, `chain`), `functools.reduce` e `lru_cache` (aperitivo para decoradores e para o Nível 3).

**Exercícios previstos.** `dias_ate(data_texto)` com `strptime` e uma data de referência fixa fornecida (`call`); `top_palavras` com `Counter` (`call` + `source imports collections`); `agrupar_por_inicial(nomes)` com `defaultdict` (`call`); `senhas_possiveis(alfabeto, tamanho)` com `product` (`call`); `sortear_equipes(nomes, tamanho, semente)` com `random.seed` e `sample` (`call` determinístico); quiz sobre `Counter` e `deque`.

**Erros comuns a cobrir.** `random` sem semente em código testável; `strptime` com formato americano; `defaultdict` sem o factory; `permutations` quando o problema pede `combinations`; esquecer de converter `groupby` que exige entrada ordenada.
