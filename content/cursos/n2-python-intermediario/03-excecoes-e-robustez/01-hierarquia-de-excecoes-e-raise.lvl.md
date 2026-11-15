---
slug: n2-m3-01-hierarquia-de-excecoes-e-raise
titulo: Hierarquia de exceções e raise
descricao: A árvore de exceções do Python, capturar por família, relançar e levantar erros com mensagens úteis.
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
- Navegar a hierarquia (BaseException, Exception, LookupError, ValueError...) e capturar pela classe certa
- Levantar exceções com raise e mensagens que ajudam quem chama
- Relançar com raise e encadear com raise ... from
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** A árvore (`LookupError` cobre `KeyError` e `IndexError`; `ArithmeticError` cobre `ZeroDivisionError`); por que capturar `Exception` e não `BaseException`; `raise ValueError(f"idade inválida: {idade}")`; validar na entrada da função ("fail fast"); `raise` nu para relançar; `raise X from e` e a mensagem "The above exception was the direct cause"; `try/except/else`.

**Exercícios previstos.** `validar_cpf(texto)` levantando `ValueError` com mensagem específica (`expr` + `raises` + `message_contains`); `buscar_configuracao(d, chave)` convertendo `KeyError` em `ValueError` com `raise ... from` (`expr` com `raises ValueError`; exceções próprias ficam para a próxima lição); função que captura `LookupError` para tratar lista e dicionário com um só `except` (`call` + `source catches LookupError`); quiz sobre a árvore.

**Erros comuns a cobrir.** `except Exception` engolindo tudo e seguindo; `raise Exception("...")` genérico; validar tarde demais; `raise e` perdendo o traceback original em vez de `raise`.
