---
slug: n7-m2-01-principios-de-prompting
titulo: 'Princípios: instruções claras, contexto, formato e exemplos'
descricao: 'O que faz um prompt funcionar: papel, tarefa, contexto, restrições, formato de saída, exemplos (few-shot) e delimitadores; testar variações com o cliente simulado.'
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Estruturar prompts com papel, tarefa, contexto, restrições e formato
- Usar exemplos (few-shot) e delimitadores para tarefas de classificação e extração
- Comparar variações de prompt em um conjunto pequeno de casos e medir a diferença
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Anatomia do prompt; especificidade (o que, para quem, em que formato, com que tamanho); delimitadores (`<texto>`, três aspas) para separar instrução de dados; few-shot com exemplos balanceados; o simulado responde melhor a prompts que seguem a estrutura (regras explícitas no módulo, documentadas), permitindo verificação determinística; sempre medir (acurácia em 20 casos).

**Exercícios previstos.** `montar_prompt(papel, tarefa, contexto, restricoes, formato)` (`call` comparando a estrutura); `classificar_sentimento(cliente, textos, exemplos)` com acurácia ≥ limiar nos casos fornecidos (`expr`); `comparar_prompts(cliente, variantes, casos)` devolvendo a melhor (`expr`); quiz sobre delimitadores.

**Erros comuns a cobrir.** Instrução e dados misturados (o texto de entrada 'vira' instrução); exemplos todos de uma classe; pedir 'resuma' sem tamanho nem público; mudar o prompt sem medir.
