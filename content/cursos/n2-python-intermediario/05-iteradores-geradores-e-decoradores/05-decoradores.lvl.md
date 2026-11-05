---
slug: n2-m5-05-decoradores
titulo: Decoradores
descricao: 'Funções que embrulham funções: @cronometrar, @registrar, @cache, functools.wraps e decoradores com parâmetros.'
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever um decorador que envolve uma função preservando nome e docstring com functools.wraps
- Explicar a equivalência entre @d e f = d(f)
- Criar decoradores com parâmetros e usar lru_cache em funções caras
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `@decorador` é `f = decorador(f)`; a função `envolucro(*args, **kwargs)`; `functools.wraps`; decoradores úteis: `cronometrar`, `registrar_chamadas`, `tentar_novamente(vezes)`, `validar_positivos`; decorador com parâmetros (três níveis); `lru_cache` e memoização (gancho para o Nível 3); ordem de empilhamento; decoradores em métodos (`@property` já visto é um deles).

**Exercícios previstos.** `registrar` que acumula chamadas em uma lista global do decorador (`expr` + `source decorator wraps`); `repetir(n)` com parâmetro (`expr` + `expected_stdout`); `memoizar` manual com dicionário e `fibonacci` grande rápido (`expr` com `fibonacci(80)`); `validar_tipos` que levanta `TypeError` (`expr` + `raises`); quiz sobre `wraps` e ordem de decoradores.

**Erros comuns a cobrir.** Envolucro sem `return funcao(...)` (perde o retorno); sem `*args, **kwargs` (quebra com argumentos); sem `wraps` (`__name__` vira `envolucro`); decorador com parâmetros usado sem parênteses.
