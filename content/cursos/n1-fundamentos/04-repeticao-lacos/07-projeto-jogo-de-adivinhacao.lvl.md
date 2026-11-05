---
slug: n1-m4-07-projeto-jogo-de-adivinhacao
titulo: 'Mini-projeto: jogo de adivinhação'
descricao: O computador escolhe um número e você tenta acertar com dicas de maior ou menor, limite de tentativas e placar.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 150
tempo_min: 90
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Montar um jogo completo combinando while, if/elif/else, contadores e validação de entrada
- Separar a regra (avaliar um palpite) da interação (ler e imprimir)
- Usar o módulo random com semente fixa para obter resultados reproduzíveis
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Projeto integrador do módulo: `avaliar_palpite(palpite, segredo)` devolve `"maior"`, `"menor"` ou `"acertou"`; `random.randint` e `random.seed` (por que a semente torna o jogo testável); laço de tentativas com limite, contagem e mensagem final; validação de palpites fora do intervalo (não consomem tentativa); jogar de novo. Sobre a verificação: o segredo entra por `random.seed` definido no enunciado, então a saída é determinística.

**Passos previstos.** Leitura (regras e exemplos de partida) → Exercício: `avaliar_palpite` (`call`) → Exercício: laço de tentativas com `segredo` fixo e `io` em três partidas (acerta na 1ª, acerta na última, perde) → Exercício: validação de intervalo e contagem correta (`io`) → Exercício: versão final com `random.seed(42)` e `randint(1, 100)` (`io`; `source imports random`) → Quiz de revisão do módulo (3 perguntas).

**Erros comuns a cobrir.** Comparar `input()` (texto) com o número; contar tentativa inválida; `while` sem decrementar as tentativas; mensagem final fora do padrão; chamar `random.seed` dentro do laço.
