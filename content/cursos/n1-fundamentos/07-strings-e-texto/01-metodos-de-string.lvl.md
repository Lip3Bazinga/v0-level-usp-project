---
slug: n1-m7-01-metodos-de-string
titulo: Métodos de string
descricao: upper, lower, strip, replace, find, startswith, count e a imutabilidade das strings.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Aplicar os métodos mais usados de string e encadear chamadas
- Explicar por que os métodos devolvem uma nova string em vez de alterar a original
- Normalizar entradas do usuário (espaços, maiúsculas) antes de comparar
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Strings são imutáveis: `texto.upper()` devolve outra string; `lower`, `strip`, `replace`, `find` (−1 se não achar), `startswith`/`endswith`, `count`, `isdigit`, `title`, `capitalize`; encadear (`entrada.strip().lower()`); indexação e fatias também valem para strings; comparar entradas normalizadas (`"  SIM " → "sim"`).

**Passos previstos.** Leitura (métodos) → Exercício: `normalizar(texto)` (strip + lower) e `eh_sim(resposta)` aceitando variações (`call`) → Exercício: `censurar(texto, palavra)` trocando por asteriscos do mesmo tamanho e `contar_ocorrencias(texto, trecho)` (`call`) → Quiz (3 perguntas: `texto.upper()` sem atribuir; `find` ausente; `strip` só tira espaços das pontas) → Exercício: validar um CPF só com dígitos e 11 caracteres após remover pontos e traço (`call`).

**Erros comuns a cobrir.** `texto.upper()` sem guardar o resultado; `texto[0] = "A"`; `find` vs `index` (exceção); `replace` achando que altera no lugar; `strip` esperando remover espaços internos.
