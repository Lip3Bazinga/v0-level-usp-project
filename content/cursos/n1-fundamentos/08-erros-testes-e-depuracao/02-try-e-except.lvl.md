---
slug: n1-m8-02-try-e-except
titulo: try e except
descricao: 'Tratar erros previsíveis sem derrubar o programa: except específico, else, finally e validação robusta de entrada.'
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
- Envolver código arriscado em try/except e capturar exceções específicas
- Usar else e finally e explicar quando cada bloco executa
- Repetir a leitura de uma entrada até ela ser válida usando try/except dentro de um laço
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `try/except ValueError` para conversões; vários `except`; por que `except:` nu esconde bugs; `else` (rodou sem erro) e `finally` (sempre); `as e` para ler a mensagem; o padrão de leitura robusta (`while True` + `try` + `break`); levantar erro de propósito com `raise ValueError("...")` como aperitivo (Nível 2 aprofunda).

**Passos previstos.** Leitura (try/except) → Exercício: `para_inteiro(texto)` devolvendo o número ou `None` (`call` + `source uses try` + `source catches ValueError`) → Exercício: `dividir_seguro(a, b)` tratando `ZeroDivisionError` (`call` + `catches`) → Leitura (else, finally, raise) → Exercício: ler uma idade até ser um inteiro entre 0 e 120, com mensagens exatas (`io` com `stdin` com entradas inválidas) → Quiz (3 perguntas: ordem dos blocos; `except:` nu; quando `finally` roda).

**Erros comuns a cobrir.** `except:` nu engolindo `KeyboardInterrupt` e bugs; `try` em volta do programa inteiro; `except Exception` quando o enunciado pede específico; esquecer o `break` no padrão de validação; colocar no `try` código que não falha.
