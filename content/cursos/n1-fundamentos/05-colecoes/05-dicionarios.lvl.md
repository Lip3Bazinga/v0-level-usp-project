---
slug: n1-m5-05-dicionarios
titulo: Dicionários
descricao: 'Pares chave → valor: criar, consultar com segurança, percorrer com items() e contar frequências.'
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar dicionários, consultar, inserir e atualizar valores por chave
- Usar get(), in, keys(), values() e items() e prever KeyError
- Construir um contador de frequências com dicionário
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Dicionário como agenda (chave única → valor); `d[chave]` e `KeyError`; `get(chave, padrao)`; `in` testa chaves; inserir e atualizar com `=`; `del`; percorrer com `for chave, valor in d.items()`; o padrão de contagem (`contagem[x] = contagem.get(x, 0) + 1`); dicionário aninhado como registro de pessoa. Tipos válidos de chave (imutáveis: texto, número, tupla).

**Passos previstos.** Leitura (dicionários) → Exercício: montar o dicionário `estoque` do enunciado, atualizar uma quantidade, inserir um produto e remover outro (`variable`) → Exercício: `frequencia(lista)` devolvendo o dicionário de contagens (`call`) → Leitura (percorrendo e aninhando) → Exercício: imprimir um relatório `produto: quantidade` em ordem alfabética das chaves (`io` exato; usar `sorted`) → Quiz (3 perguntas: `KeyError`; `get` com padrão; o que `for x in d` percorre) → Exercício: `inverter(dicionario)` trocando chaves e valores (`call`).

**Erros comuns a cobrir.** `d[chave]` para chave ausente sem tratar; `for k, v in d` sem `items()`; usar lista como chave; esquecer que a ordem de inserção é mantida mas o enunciado pede ordem alfabética.
