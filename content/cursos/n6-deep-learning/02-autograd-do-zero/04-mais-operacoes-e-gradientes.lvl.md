---
slug: n6-m2-04-mais-operacoes-e-gradientes
titulo: 'Mais operações: tanh, exp, pow, divisão e relu'
descricao: Estender Valor com funções não lineares e suas derivadas, implementar divisão via pow, comparar tanh 'atômica' com tanh composta de exp.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Adicionar tanh, exp, pow, relu e divisão à classe Valor com _backward corretos
- Mostrar que uma operação composta e uma atômica dão o mesmo gradiente
- Implementar log e a perda logística com Valor
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Derivadas: `tanh` (1 − t²), `exp` (ela mesma), `pow` (k·x^(k−1)), `relu` (máscara), `log` (1/x); divisão como `a * b**-1`; `tanh` composta de `exp` dando o mesmo grad (teste do 'grafo mais longo, mesma matemática'); perda logística em escalares; estabilidade numérica de `log(0)`.

**Exercícios previstos.** Cada operação com teste de gradiente numérico (`expr` + `tolerance`); `tanh_composta(x)` vs `x.tanh()` (`expr`); `perda_logistica_valor(z, y)` (`expr`); `relu` em 0 com convenção definida (`expr`); quiz.

**Erros comuns a cobrir.** `pow` com expoente `Valor` (não suportado: documentar); derivada de `exp` recalculada em vez de reaproveitar a saída; `log` de negativo; `relu` propagando gradiente onde a saída é 0.
