---
slug: n1-m8-03-assert-e-testes-simples
titulo: assert e testes simples
descricao: Escrever uma função de testes com assert, escolher casos de borda e usar os testes para guiar a implementação.
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
- Escrever funções de teste com assert cobrindo casos típicos, de borda e inválidos
- Interpretar uma falha de assert e localizar o defeito na função testada
- Implementar uma função a partir dos testes dados (test-first)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Retomada do `assert` do módulo 6 com método: lista de casos antes de codar; borda (vazio, 0, 1, negativo, repetido); mensagem no assert; um `testar_x()` por função; rodar os testes no fim do arquivo; o que é um teste que "mata" um bug (introduzir um defeito de propósito e ver o assert pegar). Preparação para `unittest` no Nível 2 e para a verificação da plataforma (que é exatamente isso em escala).

**Passos previstos.** Leitura (método) → Exercício: implementar `media(lista)` para passar nos seis asserts do enunciado, incluindo lista vazia devolvendo `None` (`call`) → Exercício: escrever `testar_eh_palindromo()` com casos exigidos; verificação `expr` executa a função com a implementação correta (deve passar) e com duas versões defeituosas injetadas no `setup` (deve lançar `AssertionError`) → Quiz (3 perguntas) → Exercício: encontrar o bug em `contar_vogais` usando os testes fornecidos e corrigir (`call`).

**Erros comuns a cobrir.** Testar só o caso feliz; assert que compara float sem `round`; esquecer de chamar a função de teste; assert com tupla; testes que dependem da ordem de um dicionário/conjunto.
