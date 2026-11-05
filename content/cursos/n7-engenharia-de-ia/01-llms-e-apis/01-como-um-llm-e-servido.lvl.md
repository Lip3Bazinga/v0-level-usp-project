---
slug: n7-m1-01-como-um-llm-e-servido
titulo: 'Como um LLM é servido: tokens, contexto, custo e latência'
descricao: 'O que acontece entre o seu texto e a resposta: tokenização, janela de contexto, prefill e decodificação, preço por token, latência e os botões (temperatura, max_tokens, stop).'
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 35
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Estimar tokens, custo e latência de uma chamada a partir do texto e dos parâmetros
- Explicar janela de contexto, prefill vs decodificação e o efeito de max_tokens e temperatura
- Comparar modelos por custo, qualidade e latência para um caso de uso
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Ponte com o Nível 6: o modelo servido é o mini-GPT em escala; tokenização (regra prática de tokens por palavra em português); contexto como limite duro; prefill (paralelo) vs geração (token a token) e por que o tempo cresce com a saída; preços por milhão de tokens de entrada/saída; parâmetros (`temperature`, `top_p`, `max_tokens`, `stop`); cache de prompt; modelos pequenos vs grandes.

**Exercícios previstos.** `estimar_tokens(texto)` com a regra fornecida (`call` + `tolerance`); `estimar_custo(tokens_entrada, tokens_saida, preco)` (`call`); `cabe_no_contexto(mensagens, limite, reserva_para_saida)` (`call`); `escolher_modelo(requisitos, catalogo)` (`call`); quiz sobre temperatura e `max_tokens`.

**Erros comuns a cobrir.** Contar palavras como tokens; esquecer a reserva para a saída no contexto; achar que temperatura 0 garante determinismo; comparar modelos só por preço.
