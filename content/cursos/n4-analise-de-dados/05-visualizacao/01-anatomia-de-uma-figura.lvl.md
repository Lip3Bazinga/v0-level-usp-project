---
slug: n4-m5-01-anatomia-de-uma-figura
titulo: Anatomia de uma figura
descricao: Figure, Axes, a interface orientada a objetos, título, rótulos, legenda, limites, ticks, salvar em PNG e o backend sem tela.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- matplotlib
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar figuras com plt.subplots e usar a interface de Axes (ax.plot, ax.set_title, ax.set_xlabel)
- Configurar legenda, limites, ticks e grade, e salvar a figura
- Explicar a diferença entre a interface pyplot e a orientada a objetos
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** `fig, ax = plt.subplots(figsize=...)`; `ax.plot(x, y, label=...)`, `set_title`, `set_xlabel/ylabel`, `legend`, `set_xlim`, `set_xticks`, `grid`, `savefig`; `matplotlib.use("agg")` (como o sandbox roda); por que a plataforma verifica propriedades (`ax.get_title()`, número de linhas, dados das linhas) e não pixels; estilo mínimo e legível.

**Exercícios previstos.** `grafico_de_linha(x, y)` devolvendo `fig, ax` com título e rótulos exatos (`expr` conferindo `ax.get_title()`, `ax.get_xlabel()`, `len(ax.lines)`); `duas_series(x, y1, y2)` com legenda (`expr` conferindo `ax.get_legend().get_texts()`); `salvar(fig, caminho)` (`expr` conferindo o arquivo); quiz sobre Figure vs Axes.

**Erros comuns a cobrir.** `plt.title` depois de criar outro Axes (vai para o errado); `legend()` sem `label`; `plt.show()` no sandbox (inócuo, explicar); esquecer `savefig` antes de `close`.
