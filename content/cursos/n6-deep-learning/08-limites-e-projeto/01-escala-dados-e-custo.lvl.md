---
slug: n6-m8-01-escala-dados-e-custo
titulo: Escala, dados e custo
descricao: Leis de escala, o que muda do mini-GPT para um LLM (dados, parâmetros, GPUs, tempo), pré-treino vs ajuste fino vs RLHF, e o custo energético e financeiro.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 90
tempo_min: 35
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Estimar FLOPs e tempo de treino a partir de parâmetros e tokens (regra 6ND)
- Descrever as etapas pré-treino, ajuste fino supervisionado e aprendizado por reforço com feedback humano
- Discutir custo, energia e concentração de recursos como limitações práticas
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Lição de leitura com quiz e um exercício de estimativa: do mini-GPT (10⁵ parâmetros, 10⁵ tokens) a modelos de 10¹¹ parâmetros e 10¹³ tokens; `FLOPs ≈ 6 N D`; leis de escala (perda vs N, D); paralelismo e GPUs; pré-treino → SFT → RLHF/DPO em um parágrafo cada; dados: qualidade, deduplicação, direitos; custo em dólares e energia; por que o curso para no mini-GPT.

**Exercícios previstos.** `estimar_flops(n_params, n_tokens)` e `tempo_de_treino(flops, flops_por_segundo, eficiencia)` (`call` + `tolerance`); `comparar_escalas(modelos)` devolvendo razões (`call`); quiz de 5 perguntas.

**Erros comuns a cobrir.** Confundir parâmetros com tokens; achar que mais parâmetros sempre compensa; esquecer a eficiência de uso da GPU na estimativa.
