---
slug: n1-m7-03-split-e-join
titulo: split, join e linhas
descricao: 'Quebrar texto em partes e juntar de novo: palavras, campos separados por vírgula e linhas de um texto.'
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Separar strings com split (espaços, vírgulas, separadores arbitrários) e juntar com join
- Processar um texto com várias linhas usando splitlines e laços
- Converter uma linha de valores separados por vírgula em números e calcular com eles
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `split()` sem argumento (espaços múltiplos) e com separador; `join` é método do separador (`", ".join(lista)`), só aceita strings; `splitlines`; linhas em formato CSV simples (`nome,idade,cidade`) convertidas em lista de registros; `rsplit`/`partition` como curiosidade; reverter a ordem das palavras.

**Passos previstos.** Leitura (split e join) → Exercício: `inverter_palavras(frase)` e `iniciais(nome_completo)` (`call`) → Exercício: a partir de um texto CSV de várias linhas (dado numa variável), calcular a média de idades e o nome mais longo (`variable`) → Quiz (3 perguntas: `"a,b".split(",")`; `join` com números; `split()` vs `split(" ")`) → Exercício: `para_csv(registros)` que monta linhas separadas por `;` a partir de uma lista de tuplas (`call`).

**Erros comuns a cobrir.** `lista.join(",")` (ordem invertida); `join` com inteiros (`TypeError`); `split(" ")` gerando strings vazias com espaços duplos; esquecer de remover o `\n` ao processar linhas.
