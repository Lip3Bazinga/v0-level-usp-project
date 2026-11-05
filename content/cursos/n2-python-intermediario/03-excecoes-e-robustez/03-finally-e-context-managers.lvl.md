---
slug: n2-m3-03-finally-e-context-managers
titulo: finally, with e context managers próprios
descricao: Garantir limpeza de recursos com finally, o protocolo with e como escrever seu próprio gerenciador de contexto.
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
- Usar finally para liberar recursos mesmo com exceção
- Explicar o protocolo __enter__/__exit__ e como with o utiliza
- Criar context managers com classe e com contextlib.contextmanager
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O problema (arquivo aberto, conexão, cronômetro) e a solução com `finally`; `with` como açúcar sobre `__enter__`/`__exit__`; o que `__exit__` recebe e o que significa devolver `True` (suprimir); `contextlib.contextmanager` com `yield` (apresentado antes dos geradores, só como receita); exemplos: `Cronometro`, `DiretorioTemporario`, `Transacao` que desfaz em erro.

**Exercícios previstos.** `Sessao` que registra `abriu`/`fechou` em `eventos` mesmo com exceção dentro do bloco (`expr` com `setup` usando `with` e lançando erro; esperado a lista de eventos); `cronometro()` com `contextmanager` que grava a duração em um dicionário (`expr` checando chave presente e `type float`); `Transacao` que reverte uma lista ao estado inicial se o bloco falhar (`expr`); quiz sobre `__exit__` devolvendo `True`.

**Erros comuns a cobrir.** `return` dentro de `try` pulando a limpeza (não pula com `finally` — mostrar); `__exit__` sem os três parâmetros; esquecer o `finally` no `contextmanager` (`yield` sem `try`); fechar o recurso duas vezes.
