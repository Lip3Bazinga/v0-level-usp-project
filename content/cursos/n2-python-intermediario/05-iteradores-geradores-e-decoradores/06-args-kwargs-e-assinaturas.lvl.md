---
slug: n2-m5-06-args-kwargs-e-assinaturas
titulo: '*args, **kwargs e assinaturas flexíveis'
descricao: Funções com número variável de argumentos, desempacotamento em chamadas e parâmetros somente-nomeados.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Definir funções com *args e **kwargs e repassá-los a outras funções
- Desempacotar listas e dicionários em chamadas com * e **
- Usar parâmetros somente-nomeados (após *) e somente-posicionais (antes de /)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `def soma(*numeros)`, `def configurar(**opcoes)`; ordem dos parâmetros (posicionais, `*args`, nomeados, `**kwargs`); `*` em chamadas (`print(*lista)`), `**` com dicionários; `def f(a, *, b)` para forçar nomes; `/` para posicionais; `inspect.signature` como curiosidade. Relação direta com os envolucros dos decoradores.

**Exercícios previstos.** `media(*notas)` que devolve `None` sem argumentos (`call`); `montar_url(base, **parametros)` gerando query string ordenada (`call`); `aplicar(funcao, *args, **kwargs)` repassando (`expr`); `criar_usuario(nome, *, admin=False)` que recusa `admin` posicional (`expr` + `raises TypeError`); quiz sobre a ordem dos parâmetros.

**Erros comuns a cobrir.** `*args` depois de `**kwargs`; esquecer o `*` ao repassar (passa a tupla inteira); `**` com chaves que não são strings; parâmetro nomeado antes de `*args`.
