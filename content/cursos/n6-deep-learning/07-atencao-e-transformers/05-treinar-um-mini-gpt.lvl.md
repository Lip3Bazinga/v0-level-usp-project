---
slug: n6-m7-05-treinar-um-mini-gpt
titulo: Treinar um mini-GPT em numpy
descricao: 'Juntar tudo: dados (texto em português fornecido), lotes de contexto, perda de próximo token, treino com Adam e clipping, curvas de treino/validação e os limites de tempo do sandbox.'
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
xp: 150
tempo_min: 60
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Montar o pipeline de treino de um modelo de linguagem (lotes de contexto e alvo deslocado)
- Treinar um mini-GPT de 2 blocos em numpy até a perda de validação cair abaixo do limiar
- Interpretar as curvas e ajustar contexto, dimensão e taxa dentro de um orçamento de tempo
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Texto de treino (contos em domínio público, fornecido, ~200 KB) tokenizado por caractere ou BPE pequeno; `gerar_lote(dados, T, B, semente)` com alvo deslocado; perda média de próximo token; treino em numpy com modelo pequeno (d = 64, 2 blocos, T = 32) e orçamento de ~2 minutos no sandbox; validação; comparação com bigrama e MLP de linguagem; checkpoint em `npz`; passo opcional: o mesmo modelo em PyTorch na GPU do Colab (não verificado).

**Exercícios previstos.** `gerar_lote(dados, T, B, semente)` (`call` shapes e alinhamento); `perda_proximo_token(logits, alvos)` (`call` + `tolerance`); `treinar_gpt(config)` com perda de validação < limiar em semente fixa e tempo limitado (`call`); `comparar_modelos(resultados)` (`call`); `salvar_checkpoint/carregar_checkpoint` (`expr`); quiz sobre contexto e custo.

**Erros comuns a cobrir.** Alvo não deslocado (modelo aprende a copiar); lotes só do início do texto; taxa de Adam alta demais sem warmup; avaliar perda de validação com dropout ativo; estourar o tempo com modelo grande.
