---
slug: n4-m5-03-boas-praticas-e-graficos-enganosos
titulo: Boas práticas e gráficos enganosos
descricao: Eixos truncados, escalas duplas, proporções, cores, rótulos e títulos que afirmam algo; checklist antes de publicar.
dificuldade: intermediario
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- pandas
- matplotlib
xp: 90
tempo_min: 35
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Identificar os truques mais comuns de gráficos enganosos e corrigi-los
- Aplicar um checklist de legibilidade (título com mensagem, unidades, fonte, cores acessíveis)
- Reescrever um gráfico ruim em um bom mantendo os mesmos dados
---

## Passo 1 · Leitura · Uma galeria de erros

Um gráfico pode mentir com dados corretos. Os cinco exemplos abaixo são fictícios, mas os truques aparecem toda semana em apresentações e relatórios.

**Eixo truncado em barras.** Uma rede fictícia de padarias compara três lojas que venderam 96, 98 e 100 mil pães no mês. Com o eixo y começando em 95, a barra da maior parece cinco vezes a da menor; a diferença real é de 4 %. Numa barra, o leitor compara **comprimentos**, e o comprimento só é proporcional ao valor quando a barra nasce no zero.

```python
fig, ax = plt.subplots()
ax.bar(["Centro", "Norte", "Sul"], [96, 98, 100])
ax.set_ylim(95, 101)       # o truque
ax.set_ylim(bottom=0)      # a correção
```

O matplotlib já começa as barras no zero; o truque só aparece quando alguém escreve um `set_ylim`. Numa **linha**, o eixo não precisa partir do zero, porque o leitor compara posições e inclinações, e o matplotlib escolhe os limites pelos dados.

**Escala dupla.** A temperatura de uma cidade fictícia e a venda de sorvetes aparecem no mesmo painel, cada uma com seu eixo y (`ax.twinx()`). Os dois eixos têm limites arbitrários: mudando um deles, as curvas se cruzam no mês que o autor quiser e parecem andar juntas ou separadas. Prefira dois painéis lado a lado ou as duas séries convertidas para um índice (100 no primeiro mês).

**Área no lugar de comprimento.** Um ícone de saco de farinha com o dobro da altura também tem o dobro da largura: o leitor vê quatro vezes mais farinha.

**3D e sombras.** Numa pizza em perspectiva, a fatia da frente fica maior que uma fatia igual no fundo. O efeito não acrescenta informação nenhuma e distorce a que existe.

**Cor como única diferença.** Quatro linhas em vermelho, verde, laranja e marrom ficam quase iguais para quem tem daltonismo vermelho-verde, que atinge cerca de 1 em cada 12 homens. Se a cor é a única pista, essas pessoas não leem o gráfico.

O que os cinco têm em comum: o desenho sugere uma comparação diferente da que os números permitem. A pergunta de controle é sempre a mesma: se eu medir com uma régua o que o leitor vai comparar com os olhos (comprimento, área, posição), a proporção bate com a dos dados?

## Passo 2 · Previsão · O ylim que o matplotlib escolhe

O programa desenha os mesmos três valores em barras e em linha, depois trunca o eixo das barras. Leia sem executar e digite exatamente o que ele imprime.

### Código
```python
import matplotlib.pyplot as plt

lojas = ["Centro", "Norte", "Sul"]
vendas = [96, 98, 100]

fig, ax = plt.subplots()
ax.bar(lojas, vendas)
print([round(float(v), 1) for v in ax.get_ylim()])

fig, ax = plt.subplots()
ax.plot(lojas, vendas)
print([round(float(v), 1) for v in ax.get_ylim()])

fig, ax = plt.subplots()
ax.bar(lojas, vendas)
ax.set_ylim(95, 101)
print([round(float(v), 1) for v in ax.get_ylim()])

visiveis = [v - 95 for v in vendas]
print(visiveis[2] / visiveis[0], round(vendas[2] / vendas[0], 3))
```

### Dicas
1. Nas barras, o matplotlib inclui o zero e deixa uma margem de 5 % acima da maior.
2. Na linha, a margem de 5 % da amplitude vale nas duas pontas, e o zero não entra.
3. Com o eixo começando em 95, o comprimento visível de cada barra é o valor menos 95.

### Saída esperada
```text
[0.0, 105.0]
[95.8, 100.2]
[95.0, 101.0]
5.0 1.042
```

## Passo 3 · Exercício · Barras a partir do zero
modo: lacunas

Uma apresentação chegou com o eixo das barras truncado. Complete as lacunas (`___`) da função que conserta o eixo de um Axes de barras já desenhado.

### Instruções
1. `corrigir_eixo(ax)` recebe um Axes com barras verticais de alturas positivas e faz o eixo y começar em 0.
2. O topo do eixo passa a ser o maior entre o topo atual e 5 % acima da barra mais alta (1,05 × a maior altura).
3. As barras e o título não mudam, e a função devolve o mesmo `ax`.

### Código inicial
```python
import matplotlib.pyplot as plt


def corrigir_eixo(ax):
    alturas = [p.get_height() for p in ax.patches]
    topo = max(max(alturas) * 1.05, ax.get_ylim()[___])
    ax.___(___, topo)
    return ___
```

### Solução
```python
import matplotlib.pyplot as plt


def corrigir_eixo(ax):
    alturas = [p.get_height() for p in ax.patches]
    topo = max(max(alturas) * 1.05, ax.get_ylim()[1])
    ax.set_ylim(0, topo)
    return ax
```

### Dicas
1. `ax.get_ylim()` devolve a tupla `(piso, topo)`.
2. Os comprimentos das barras verticais estão no eixo y.
3. Um piso que não é zero, qualquer que seja ele, continua truncando o eixo.

### Verificação
```json
[
  { "id": "piso", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = plt.subplots()\nax.bar([\"Centro\", \"Norte\", \"Sul\"], [96.0, 98.0, 100.0])\nax.set_title(\"Pães vendidos por loja\")\nax.set_ylim(95, 101)\nr = corrigir_eixo(ax)",
    "expr": "float(ax.get_ylim()[0])", "expected": 0.0, "type": "float", "tolerance": 1e-9,
    "name": "O eixo y passa a começar em 0", "hint": "O piso do eixo y precisa ser zero, não o menor valor." },
  { "id": "topo-margem", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = plt.subplots()\nax.bar([\"Centro\", \"Norte\", \"Sul\"], [96.0, 98.0, 100.0])\nax.set_ylim(95, 101)\ncorrigir_eixo(ax)",
    "expr": "float(ax.get_ylim()[1])", "expected": 105.0, "tolerance": 1e-9,
    "name": "Topo de 101 vira 105: 5 % acima da barra mais alta" },
  { "id": "topo-cortado", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = plt.subplots()\nax.bar([\"Centro\", \"Norte\", \"Sul\"], [96.0, 98.0, 100.0])\nax.set_ylim(95, 99)\ncorrigir_eixo(ax)",
    "expr": "float(ax.get_ylim()[1])", "expected": 105.0, "tolerance": 1e-9,
    "name": "Um topo que cortava a barra mais alta também é corrigido" },
  { "id": "topo-alto", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = plt.subplots()\nax.bar([\"Centro\", \"Norte\", \"Sul\"], [96.0, 98.0, 100.0])\nax.set_ylim(90, 200)\ncorrigir_eixo(ax)",
    "expr": "float(ax.get_ylim()[1])", "expected": 200.0, "tolerance": 1e-9,
    "name": "Um topo que já sobrava é mantido", "hint": "O topo atual é o segundo elemento dos limites." },
  { "id": "ja-certo", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = plt.subplots()\nax.bar([\"Centro\", \"Norte\"], [40, 50])\ncorrigir_eixo(ax)",
    "expr": "[float(v) for v in ax.get_ylim()]", "expected": [0.0, 52.5], "tolerance": 1e-9,
    "name": "Um eixo que já estava certo continua igual" },
  { "id": "mesmo-ax", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = plt.subplots()\nax.bar([\"Centro\", \"Norte\", \"Sul\"], [96.0, 98.0, 100.0])\nax.set_ylim(95, 101)\nr = corrigir_eixo(ax)",
    "expr": "r is ax", "expected": true, "name": "Devolve o mesmo Axes", "hint": "Devolva o objeto recebido, não os limites." },
  { "id": "barras-intactas", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = plt.subplots()\nax.bar([\"Centro\", \"Norte\", \"Sul\"], [96.0, 98.0, 100.0])\nax.set_title(\"Pães vendidos por loja\")\nax.set_ylim(95, 101)\ncorrigir_eixo(ax)",
    "expr": "[[float(p.get_height()) for p in ax.patches], ax.get_title()]", "expected": [[96.0, 98.0, 100.0], "Pães vendidos por loja"],
    "name": "As barras e o título não mudam" }
]
```

### Soluções erradas
```python name="topo pelo piso atual"
import matplotlib.pyplot as plt


def corrigir_eixo(ax):
    alturas = [p.get_height() for p in ax.patches]
    topo = max(max(alturas) * 1.05, ax.get_ylim()[0])
    ax.set_ylim(0, topo)
    return ax
```
```python name="limite do eixo x"
import matplotlib.pyplot as plt


def corrigir_eixo(ax):
    alturas = [p.get_height() for p in ax.patches]
    topo = max(max(alturas) * 1.05, ax.get_ylim()[1])
    ax.set_xlim(0, topo)
    return ax
```
```python name="piso na menor barra"
import matplotlib.pyplot as plt


def corrigir_eixo(ax):
    alturas = [p.get_height() for p in ax.patches]
    topo = max(max(alturas) * 1.05, ax.get_ylim()[1])
    ax.set_ylim(min(alturas), topo)
    return ax
```
```python name="piso None mantém o atual"
import matplotlib.pyplot as plt


def corrigir_eixo(ax):
    alturas = [p.get_height() for p in ax.patches]
    topo = max(max(alturas) * 1.05, ax.get_ylim()[1])
    ax.set_ylim(None, topo)
    return ax
```
```python name="devolve os limites"
import matplotlib.pyplot as plt


def corrigir_eixo(ax):
    alturas = [p.get_height() for p in ax.patches]
    topo = max(max(alturas) * 1.05, ax.get_ylim()[1])
    ax.set_ylim(0, topo)
    return ax.get_ylim()
```

## Passo 4 · Leitura · Título que afirma, unidade, fonte e cor

Um título como "Vendas" obriga o leitor a descobrir sozinho o que olhar. Um título que **afirma** ("Vendas caíram 18 % de março a junho") diz a conclusão, e o gráfico mostra a prova. Escreva o título depois de olhar os dados, e só afirme o que eles sustentam.

```python
fig, ax = plt.subplots()
ax.plot(meses, vendas, color="#0072B2", marker="o")
ax.set_title("Vendas caíram 18 % de março a junho")
ax.set_ylabel("vendas (mil R$)")
ax.annotate("50,0", xy=(2, 50.0), xytext=(0, 8), textcoords="offset points", ha="center")
fig.text(0.01, 0.01, "Fonte: caixa da padaria, jan. a jun. de 2025 (dados fictícios)", fontsize=8)
```

A **unidade** vai no rótulo do eixo: `"vendas (mil R$)"`, e não só `"vendas"`. Sem ela, 50 pode ser pães, reais ou milhares de reais. A **fonte** diz de onde vieram os números e de quando; `fig.text(x, y, texto)` escreve na figura, com `x` e `y` entre 0 e 1 (0, 0 é o canto inferior esquerdo), fora dos eixos. Na correção, os textos da figura ficam em `fig.texts`.

`ax.annotate(texto, xy=(x, y))` escreve um texto apontando para um ponto dos dados. Num eixo de categorias (meses como texto), a primeira categoria fica na posição 0, a segunda na 1, e assim por diante: `xy=(2, 50.0)` é o terceiro mês. `xytext` com `textcoords="offset points"` desloca o texto alguns pontos para cima, sem tirar a referência do ponto, e `arrowprops={"arrowstyle": "->"}` desenha uma seta. As anotações ficam em `ax.texts`. Num gráfico em português, o número anotado usa vírgula: `f"{valor:.1f}".replace(".", ",")`.

**Cor.** Use uma paleta que funcione para quem tem daltonismo, como a de Okabe e Ito: azul `#0072B2`, laranja `#E69F00`, verde-azulado `#009E73`, vermelhão `#D55E00` e cinza `#999999`. E nunca deixe a cor sozinha: combine com marcador (`marker="o"`, `"s"`), estilo de linha (`linestyle="--"`) ou um rótulo escrito na ponta de cada linha, que dispensa a legenda. Se houver legenda, escolha `loc` para que ela não cubra os dados.

Antes de publicar, confira a lista:

1. A pergunta está clara e o tipo de gráfico combina com ela?
2. Barras começam no zero?
3. Os eixos têm rótulo e unidade?
4. O título afirma o que os dados mostram, e só isso?
5. A fonte e o período estão escritos?
6. A informação sobrevive sem a cor (em preto e branco)?
7. Sem 3D, sombras e escalas duplas?

## Passo 5 · Exercício · Um gráfico com mensagem

A padaria quer um gráfico das vendas mensais que destaque um mês escolhido, com título que afirma, unidade, anotação e fonte.

### Instruções
1. `grafico_com_mensagem(meses, valores, destaque, fonte)` devolve `(fig, ax)` com uma linha só: `valores` contra `meses`, com os meses como categorias no eixo x.
2. `destaque` é o nome de um dos meses; se não estiver em `meses`, levante `ValueError` com uma mensagem que contenha `"destaque"`.
3. O título é exatamente `Vendas chegaram a V mil reais em M`, em que `M` é o mês em destaque e `V` o valor dele com uma casa decimal e vírgula (por exemplo, `50,0`).
4. O rótulo do eixo y é exatamente `vendas (mil R$)`.
5. Há uma anotação (`ax.annotate`) com o texto `V` apontando para o ponto do mês em destaque: posição do mês no eixo x e o valor dele no eixo y.
6. A fonte é escrita na figura (`fig.text`) como `Fonte: ` seguido do texto recebido.

### Código inicial
```python
import matplotlib.pyplot as plt


def grafico_com_mensagem(meses, valores, destaque, fonte):
    pass
```

### Solução
```python
import matplotlib.pyplot as plt


def grafico_com_mensagem(meses, valores, destaque, fonte):
    if destaque not in meses:
        raise ValueError(f"o destaque {destaque!r} não está entre os meses")
    posicao = meses.index(destaque)
    valor = valores[posicao]
    texto = f"{valor:.1f}".replace(".", ",")
    fig, ax = plt.subplots()
    ax.plot(meses, valores, color="#0072B2", marker="o")
    ax.set_title(f"Vendas chegaram a {texto} mil reais em {destaque}")
    ax.set_ylabel("vendas (mil R$)")
    ax.annotate(texto, xy=(posicao, valor), xytext=(0, 8), textcoords="offset points", ha="center")
    fig.text(0.01, 0.01, f"Fonte: {fonte}", fontsize=8)
    return fig, ax
```

### Dicas
1. Num eixo de categorias, a posição de um mês é o índice dele na lista.
2. O título e a anotação usam o mesmo texto do valor, com vírgula.
3. Textos da figura e textos do Axes ficam em listas diferentes.

### Verificação
```json
[
  { "id": "linha", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nM = [\"janeiro\", \"fevereiro\", \"março\", \"abril\", \"maio\", \"junho\"]\nV = [38.0, 41.5, 50.0, 44.0, 37.5, 41.0]\nfig, ax = grafico_com_mensagem(M, V, \"março\", \"caixa da padaria (dados fictícios)\")",
    "expr": "[len(ax.lines), [float(v) for v in ax.lines[0].get_ydata()]]", "expected": [1, [38.0, 41.5, 50.0, 44.0, 37.5, 41.0]],
    "name": "Uma linha com as vendas de cada mês" },
  { "id": "titulo", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nM = [\"janeiro\", \"fevereiro\", \"março\", \"abril\", \"maio\", \"junho\"]\nV = [38.0, 41.5, 50.0, 44.0, 37.5, 41.0]\nfig, ax = grafico_com_mensagem(M, V, \"março\", \"caixa da padaria (dados fictícios)\")",
    "expr": "ax.get_title()", "expected": "Vendas chegaram a 50,0 mil reais em março",
    "name": "O título afirma o valor de março", "hint": "Uma casa decimal, com vírgula." },
  { "id": "titulo-maio", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nM = [\"janeiro\", \"fevereiro\", \"março\", \"abril\", \"maio\", \"junho\"]\nV = [38.0, 41.5, 50.0, 44.0, 37.5, 41.0]\nfig, ax = grafico_com_mensagem(M, V, \"maio\", \"caixa da padaria (dados fictícios)\")",
    "expr": "ax.get_title()", "expected": "Vendas chegaram a 37,5 mil reais em maio",
    "name": "O destaque pode não ser o maior valor" },
  { "id": "unidade", "checkpoint": 4, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = grafico_com_mensagem([\"jan\", \"fev\"], [10.0, 12.5], \"fev\", \"caixa\")",
    "expr": "ax.get_ylabel()", "expected": "vendas (mil R$)", "name": "O eixo y tem a unidade", "hint": "Sem a unidade, o leitor não sabe se são pães ou reais." },
  { "id": "anotacao-texto", "checkpoint": 5, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nM = [\"janeiro\", \"fevereiro\", \"março\", \"abril\", \"maio\", \"junho\"]\nV = [38.0, 41.5, 50.0, 44.0, 37.5, 41.0]\nfig, ax = grafico_com_mensagem(M, V, \"março\", \"caixa da padaria (dados fictícios)\")",
    "expr": "[t.get_text() for t in ax.texts]", "expected": ["50,0"],
    "name": "Uma anotação no Axes, com o valor do destaque", "hint": "A fonte não fica no Axes." },
  { "id": "anotacao-ponto", "checkpoint": 5, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nM = [\"janeiro\", \"fevereiro\", \"março\", \"abril\", \"maio\", \"junho\"]\nV = [38.0, 41.5, 50.0, 44.0, 37.5, 41.0]\nfig, ax = grafico_com_mensagem(M, V, \"março\", \"caixa da padaria (dados fictícios)\")",
    "expr": "[float(ax.xaxis.convert_units(ax.texts[0].xy[0])), float(ax.texts[0].xy[1])]", "expected": [2.0, 50.0], "tolerance": 1e-9,
    "name": "A anotação aponta para o ponto de março", "hint": "Março é o terceiro mês: posição 2." },
  { "id": "anotacao-maio", "checkpoint": 5, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nM = [\"janeiro\", \"fevereiro\", \"março\", \"abril\", \"maio\", \"junho\"]\nV = [38.0, 41.5, 50.0, 44.0, 37.5, 41.0]\nfig, ax = grafico_com_mensagem(M, V, \"maio\", \"caixa da padaria (dados fictícios)\")",
    "expr": "[ax.texts[0].get_text(), float(ax.xaxis.convert_units(ax.texts[0].xy[0])), float(ax.texts[0].xy[1])]", "expected": ["37,5", 4.0, 37.5], "tolerance": 1e-9,
    "name": "A anotação acompanha o mês em destaque, não o maior valor" },
  { "id": "fonte", "checkpoint": 6, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nM = [\"janeiro\", \"fevereiro\", \"março\", \"abril\", \"maio\", \"junho\"]\nV = [38.0, 41.5, 50.0, 44.0, 37.5, 41.0]\nfig, ax = grafico_com_mensagem(M, V, \"março\", \"caixa da padaria (dados fictícios)\")",
    "expr": "[t.get_text() for t in fig.texts]", "expected": ["Fonte: caixa da padaria (dados fictícios)"],
    "name": "A fonte escrita na figura", "hint": "Escreva na figura, fora do Axes." },
  { "id": "sem-destaque", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")",
    "expr": "grafico_com_mensagem([\"jan\", \"fev\"], [10.0, 12.5], \"dezembro\", \"caixa\")", "raises": "ValueError", "message_contains": "destaque",
    "name": "Um destaque que não é mês da lista é recusado", "hint": "A mensagem precisa dizer que o problema é o destaque." }
]
```

### Soluções erradas
```python name="anotação um mês à frente"
import matplotlib.pyplot as plt


def grafico_com_mensagem(meses, valores, destaque, fonte):
    if destaque not in meses:
        raise ValueError(f"o destaque {destaque!r} não está entre os meses")
    posicao = meses.index(destaque)
    valor = valores[posicao]
    texto = f"{valor:.1f}".replace(".", ",")
    fig, ax = plt.subplots()
    ax.plot(meses, valores, color="#0072B2", marker="o")
    ax.set_title(f"Vendas chegaram a {texto} mil reais em {destaque}")
    ax.set_ylabel("vendas (mil R$)")
    ax.annotate(texto, xy=(posicao + 1, valor), xytext=(0, 8), textcoords="offset points", ha="center")
    fig.text(0.01, 0.01, f"Fonte: {fonte}", fontsize=8)
    return fig, ax
```
```python name="destaca sempre o maior"
import matplotlib.pyplot as plt


def grafico_com_mensagem(meses, valores, destaque, fonte):
    if destaque not in meses:
        raise ValueError(f"o destaque {destaque!r} não está entre os meses")
    posicao = valores.index(max(valores))
    valor = valores[posicao]
    texto = f"{valor:.1f}".replace(".", ",")
    fig, ax = plt.subplots()
    ax.plot(meses, valores, color="#0072B2", marker="o")
    ax.set_title(f"Vendas chegaram a {texto} mil reais em {destaque}")
    ax.set_ylabel("vendas (mil R$)")
    ax.annotate(texto, xy=(posicao, valor), xytext=(0, 8), textcoords="offset points", ha="center")
    fig.text(0.01, 0.01, f"Fonte: {fonte}", fontsize=8)
    return fig, ax
```
```python name="ponto decimal"
import matplotlib.pyplot as plt


def grafico_com_mensagem(meses, valores, destaque, fonte):
    if destaque not in meses:
        raise ValueError(f"o destaque {destaque!r} não está entre os meses")
    posicao = meses.index(destaque)
    valor = valores[posicao]
    texto = f"{valor:.1f}"
    fig, ax = plt.subplots()
    ax.plot(meses, valores, color="#0072B2", marker="o")
    ax.set_title(f"Vendas chegaram a {texto} mil reais em {destaque}")
    ax.set_ylabel("vendas (mil R$)")
    ax.annotate(texto, xy=(posicao, valor), xytext=(0, 8), textcoords="offset points", ha="center")
    fig.text(0.01, 0.01, f"Fonte: {fonte}", fontsize=8)
    return fig, ax
```
```python name="eixo sem unidade"
import matplotlib.pyplot as plt


def grafico_com_mensagem(meses, valores, destaque, fonte):
    if destaque not in meses:
        raise ValueError(f"o destaque {destaque!r} não está entre os meses")
    posicao = meses.index(destaque)
    valor = valores[posicao]
    texto = f"{valor:.1f}".replace(".", ",")
    fig, ax = plt.subplots()
    ax.plot(meses, valores, color="#0072B2", marker="o")
    ax.set_title(f"Vendas chegaram a {texto} mil reais em {destaque}")
    ax.set_ylabel("vendas")
    ax.annotate(texto, xy=(posicao, valor), xytext=(0, 8), textcoords="offset points", ha="center")
    fig.text(0.01, 0.01, f"Fonte: {fonte}", fontsize=8)
    return fig, ax
```
```python name="fonte dentro do Axes"
import matplotlib.pyplot as plt


def grafico_com_mensagem(meses, valores, destaque, fonte):
    if destaque not in meses:
        raise ValueError(f"o destaque {destaque!r} não está entre os meses")
    posicao = meses.index(destaque)
    valor = valores[posicao]
    texto = f"{valor:.1f}".replace(".", ",")
    fig, ax = plt.subplots()
    ax.plot(meses, valores, color="#0072B2", marker="o")
    ax.set_title(f"Vendas chegaram a {texto} mil reais em {destaque}")
    ax.set_ylabel("vendas (mil R$)")
    ax.annotate(texto, xy=(posicao, valor), xytext=(0, 8), textcoords="offset points", ha="center")
    ax.text(0, 0, f"Fonte: {fonte}", fontsize=8)
    return fig, ax
```
```python name="erro do index sem explicar"
import matplotlib.pyplot as plt


def grafico_com_mensagem(meses, valores, destaque, fonte):
    posicao = meses.index(destaque)
    valor = valores[posicao]
    texto = f"{valor:.1f}".replace(".", ",")
    fig, ax = plt.subplots()
    ax.plot(meses, valores, color="#0072B2", marker="o")
    ax.set_title(f"Vendas chegaram a {texto} mil reais em {destaque}")
    ax.set_ylabel("vendas (mil R$)")
    ax.annotate(texto, xy=(posicao, valor), xytext=(0, 8), textcoords="offset points", ha="center")
    fig.text(0.01, 0.01, f"Fonte: {fonte}", fontsize=8)
    return fig, ax
```

## Passo 6 · Exercício · Da pizza às barras

O relatório anual da papelaria trazia uma pizza com a participação de cada categoria nas vendas. Reescreva-a como barras horizontais ordenadas, com a porcentagem escrita em cada barra.

### Instruções
1. `reescrever_pizza(categorias, valores)` devolve `(fig, ax)` com uma barra horizontal por categoria, de comprimento igual à porcentagem do total (de 0 a 100).
2. A barra maior fica no topo e as outras descem em ordem decrescente; no empate, a categoria que veio primeiro na entrada fica acima.
3. Cada barra tem, na ponta, um texto com a porcentagem arredondada sem casas decimais e o sinal `%`, como `45%`.
4. O rótulo do eixo x é `% do total`, e as listas recebidas não mudam.

### Código inicial
```python
import numpy as np
import matplotlib.pyplot as plt


def reescrever_pizza(categorias, valores):
    pass
```

### Solução
```python
import numpy as np
import matplotlib.pyplot as plt


def reescrever_pizza(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    porcentagens = valores / valores.sum() * 100
    ordem = np.argsort(-porcentagens, kind="stable")
    fig, ax = plt.subplots()
    barras = ax.barh([categorias[i] for i in ordem], porcentagens[ordem])
    ax.invert_yaxis()
    ax.bar_label(barras, labels=[f"{p:.0f}%" for p in porcentagens[ordem]])
    ax.set_xlabel("% do total")
    return fig, ax
```

### Dicas
1. O `barh` desenha a primeira categoria embaixo; `ax.invert_yaxis()` põe a primeira no topo.
2. `ax.bar_label(barras, labels=...)` recebe um texto por barra, na ordem em que as barras foram desenhadas.
3. Porcentagem é a parte dividida pelo total, vezes 100.

### Verificação
```json
[
  { "id": "tipos", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nr = reescrever_pizza([\"papel\", \"canetas\", \"cadernos\", \"mochilas\", \"outros\"], [120, 300, 450, 80, 50])",
    "expr": "[type(parte).__name__ for parte in r]", "expected": ["Figure", "Axes"], "name": "Devolve (fig, ax)" },
  { "id": "ordem", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\ndef de_cima_para_baixo(ax):\n    nomes = {round(float(p), 6): t.get_text() for p, t in zip(ax.get_yticks(), ax.get_yticklabels())}\n    textos = {round(float(getattr(t, \"xy\", t.get_position())[1]), 6): t.get_text() for t in ax.texts}\n    barras = sorted(ax.patches, key=lambda b: b.get_y(), reverse=not ax.yaxis_inverted())\n    linhas = []\n    for b in barras:\n        centro = round(float(b.get_y() + b.get_height() / 2), 6)\n        linhas.append([nomes.get(centro, \"?\"), round(float(b.get_width()), 4), textos.get(centro, \"?\")])\n    return linhas\nfig, ax = reescrever_pizza([\"papel\", \"canetas\", \"cadernos\", \"mochilas\", \"outros\"], [120, 300, 450, 80, 50])",
    "expr": "[linha[0] for linha in de_cima_para_baixo(ax)]", "expected": ["cadernos", "canetas", "papel", "mochilas", "outros"],
    "name": "Do topo para baixo, da maior para a menor categoria", "hint": "No barh, a primeira barra desenhada fica embaixo." },
  { "id": "porcentagens", "checkpoint": 1, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\ndef de_cima_para_baixo(ax):\n    nomes = {round(float(p), 6): t.get_text() for p, t in zip(ax.get_yticks(), ax.get_yticklabels())}\n    textos = {round(float(getattr(t, \"xy\", t.get_position())[1]), 6): t.get_text() for t in ax.texts}\n    barras = sorted(ax.patches, key=lambda b: b.get_y(), reverse=not ax.yaxis_inverted())\n    linhas = []\n    for b in barras:\n        centro = round(float(b.get_y() + b.get_height() / 2), 6)\n        linhas.append([nomes.get(centro, \"?\"), round(float(b.get_width()), 4), textos.get(centro, \"?\")])\n    return linhas\nfig, ax = reescrever_pizza([\"papel\", \"canetas\", \"cadernos\", \"mochilas\", \"outros\"], [120, 300, 450, 80, 50])",
    "expr": "[linha[1] for linha in de_cima_para_baixo(ax)]", "expected": [45.0, 30.0, 12.0, 8.0, 5.0], "tolerance": 1e-6,
    "name": "O comprimento de cada barra é a porcentagem do total", "hint": "Divida pelo total, não pelo maior valor, e multiplique por 100." },
  { "id": "textos", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\ndef de_cima_para_baixo(ax):\n    nomes = {round(float(p), 6): t.get_text() for p, t in zip(ax.get_yticks(), ax.get_yticklabels())}\n    textos = {round(float(getattr(t, \"xy\", t.get_position())[1]), 6): t.get_text() for t in ax.texts}\n    barras = sorted(ax.patches, key=lambda b: b.get_y(), reverse=not ax.yaxis_inverted())\n    linhas = []\n    for b in barras:\n        centro = round(float(b.get_y() + b.get_height() / 2), 6)\n        linhas.append([nomes.get(centro, \"?\"), round(float(b.get_width()), 4), textos.get(centro, \"?\")])\n    return linhas\nfig, ax = reescrever_pizza([\"papel\", \"canetas\", \"cadernos\", \"mochilas\", \"outros\"], [120, 300, 450, 80, 50])",
    "expr": "[linha[2] for linha in de_cima_para_baixo(ax)]", "expected": ["45%", "30%", "12%", "8%", "5%"],
    "name": "Cada barra mostra a sua porcentagem", "hint": "Os textos seguem a ordem em que as barras foram desenhadas." },
  { "id": "empate", "checkpoint": 2, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\ndef de_cima_para_baixo(ax):\n    nomes = {round(float(p), 6): t.get_text() for p, t in zip(ax.get_yticks(), ax.get_yticklabels())}\n    textos = {round(float(getattr(t, \"xy\", t.get_position())[1]), 6): t.get_text() for t in ax.texts}\n    barras = sorted(ax.patches, key=lambda b: b.get_y(), reverse=not ax.yaxis_inverted())\n    linhas = []\n    for b in barras:\n        centro = round(float(b.get_y() + b.get_height() / 2), 6)\n        linhas.append([nomes.get(centro, \"?\"), round(float(b.get_width()), 4), textos.get(centro, \"?\")])\n    return linhas\nfig, ax = reescrever_pizza([\"agendas\", \"mochilas\", \"estojos\"], [25, 50, 25])",
    "expr": "[linha[0] for linha in de_cima_para_baixo(ax)]", "expected": ["mochilas", "agendas", "estojos"],
    "name": "No empate, quem veio primeiro fica acima", "hint": "Inverter uma ordenação crescente também inverte os empatados." },
  { "id": "nao-inteiras", "checkpoint": 3, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\ndef de_cima_para_baixo(ax):\n    nomes = {round(float(p), 6): t.get_text() for p, t in zip(ax.get_yticks(), ax.get_yticklabels())}\n    textos = {round(float(getattr(t, \"xy\", t.get_position())[1]), 6): t.get_text() for t in ax.texts}\n    barras = sorted(ax.patches, key=lambda b: b.get_y(), reverse=not ax.yaxis_inverted())\n    linhas = []\n    for b in barras:\n        centro = round(float(b.get_y() + b.get_height() / 2), 6)\n        linhas.append([nomes.get(centro, \"?\"), round(float(b.get_width()), 4), textos.get(centro, \"?\")])\n    return linhas\nfig, ax = reescrever_pizza([\"lápis\", \"borrachas\"], [1, 2])",
    "expr": "de_cima_para_baixo(ax)", "expected": [["borrachas", 66.6667, "67%"], ["lápis", 33.3333, "33%"]], "tolerance": 1e-4,
    "name": "Porcentagens não inteiras são arredondadas só no texto" },
  { "id": "rotulo", "checkpoint": 4, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nfig, ax = reescrever_pizza([\"papel\", \"canetas\"], [120, 300])",
    "expr": "ax.get_xlabel()", "expected": "% do total", "name": "O eixo x diz que a medida é porcentagem do total" },
  { "id": "intactas", "checkpoint": 4, "kind": "expr",
    "setup": "import matplotlib.pyplot as plt\nplt.close(\"all\")\nC = [\"papel\", \"canetas\", \"cadernos\"]\nV = [120, 300, 450]\nfig, ax = reescrever_pizza(C, V)",
    "expr": "[C, V]", "expected": [["papel", "canetas", "cadernos"], [120, 300, 450]], "name": "As listas recebidas não mudam" }
]
```

### Soluções erradas
```python name="menor no topo"
import numpy as np
import matplotlib.pyplot as plt


def reescrever_pizza(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    porcentagens = valores / valores.sum() * 100
    ordem = np.argsort(-porcentagens, kind="stable")
    fig, ax = plt.subplots()
    barras = ax.barh([categorias[i] for i in ordem], porcentagens[ordem])
    ax.bar_label(barras, labels=[f"{p:.0f}%" for p in porcentagens[ordem]])
    ax.set_xlabel("% do total")
    return fig, ax
```
```python name="comprimento com os valores brutos"
import numpy as np
import matplotlib.pyplot as plt


def reescrever_pizza(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    porcentagens = valores / valores.sum() * 100
    ordem = np.argsort(-porcentagens, kind="stable")
    fig, ax = plt.subplots()
    barras = ax.barh([categorias[i] for i in ordem], valores[ordem])
    ax.invert_yaxis()
    ax.bar_label(barras, labels=[f"{p:.0f}%" for p in porcentagens[ordem]])
    ax.set_xlabel("% do total")
    return fig, ax
```
```python name="fração sem multiplicar por 100"
import numpy as np
import matplotlib.pyplot as plt


def reescrever_pizza(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    porcentagens = valores / valores.sum()
    ordem = np.argsort(-porcentagens, kind="stable")
    fig, ax = plt.subplots()
    barras = ax.barh([categorias[i] for i in ordem], porcentagens[ordem])
    ax.invert_yaxis()
    ax.bar_label(barras, labels=[f"{p:.0f}%" for p in porcentagens[ordem]])
    ax.set_xlabel("% do total")
    return fig, ax
```
```python name="porcentagem do maior"
import numpy as np
import matplotlib.pyplot as plt


def reescrever_pizza(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    porcentagens = valores / valores.max() * 100
    ordem = np.argsort(-porcentagens, kind="stable")
    fig, ax = plt.subplots()
    barras = ax.barh([categorias[i] for i in ordem], porcentagens[ordem])
    ax.invert_yaxis()
    ax.bar_label(barras, labels=[f"{p:.0f}%" for p in porcentagens[ordem]])
    ax.set_xlabel("% do total")
    return fig, ax
```
```python name="empate invertido"
import numpy as np
import matplotlib.pyplot as plt


def reescrever_pizza(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    porcentagens = valores / valores.sum() * 100
    ordem = np.argsort(porcentagens)[::-1]
    fig, ax = plt.subplots()
    barras = ax.barh([categorias[i] for i in ordem], porcentagens[ordem])
    ax.invert_yaxis()
    ax.bar_label(barras, labels=[f"{p:.0f}%" for p in porcentagens[ordem]])
    ax.set_xlabel("% do total")
    return fig, ax
```
```python name="textos na ordem da entrada"
import numpy as np
import matplotlib.pyplot as plt


def reescrever_pizza(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    porcentagens = valores / valores.sum() * 100
    ordem = np.argsort(-porcentagens, kind="stable")
    fig, ax = plt.subplots()
    barras = ax.barh([categorias[i] for i in ordem], porcentagens[ordem])
    ax.invert_yaxis()
    ax.bar_label(barras, labels=[f"{p:.0f}%" for p in porcentagens])
    ax.set_xlabel("% do total")
    return fig, ax
```
```python name="barras verticais"
import numpy as np
import matplotlib.pyplot as plt


def reescrever_pizza(categorias, valores):
    valores = np.asarray(valores, dtype=float)
    porcentagens = valores / valores.sum() * 100
    ordem = np.argsort(-porcentagens, kind="stable")
    fig, ax = plt.subplots()
    barras = ax.bar([categorias[i] for i in ordem], porcentagens[ordem])
    ax.invert_yaxis()
    ax.bar_label(barras, labels=[f"{p:.0f}%" for p in porcentagens[ordem]])
    ax.set_xlabel("% do total")
    return fig, ax
```

## Passo 7 · Quiz · O que está errado neste gráfico

### Pergunta
Um slide mostra três barras com os clientes atendidos por trimestre (950, 970 e 1 010), com o eixo y começando em 940 e o título "Atendimento triplicou no ano". O que corrigir?
- [ ] Nada: o eixo começa perto dos dados para mostrar a diferença com mais detalhe
- [ ] Trocar as barras por uma pizza com os três trimestres
- [x] Começar o eixo em zero e trocar o título por um que diga o crescimento real, de cerca de 6 %
- [ ] Manter o eixo e acrescentar uma legenda explicando que ele começa em 940
> Numa barra, o leitor compara comprimentos; com o piso em 940, a última barra (70 acima do piso) parece sete vezes a primeira (10 acima), e o título repete a ilusão. De 950 para 1 010 o crescimento é de cerca de 6 %. Detalhar uma variação pequena é trabalho de uma linha, não de barras truncadas. A pizza troca comprimentos por ângulos e piora a comparação. Uma nota de rodapé não desfaz o que o olho já viu.

### Pergunta
Um gráfico mostra a receita (eixo da esquerda, de 40 a 60 mil reais) e o número de pedidos (eixo da direita, de 0 a 2 000) de uma loja fictícia, feitos com `ax.twinx()`. As duas linhas se cruzam exatamente no mês da campanha, e o texto diz que "a campanha equilibrou receita e pedidos". Qual é o problema?
- [ ] As linhas deveriam ter a mesma cor para ficar claro que são comparáveis
- [x] O cruzamento depende dos limites escolhidos para cada eixo; com outros limites, as linhas se cruzariam em outro mês ou nunca
- [ ] O `twinx` só aceita variáveis com a mesma unidade, então o gráfico está tecnicamente errado
- [ ] O certo seria pôr os pedidos em escala log
> Com dois eixos y independentes, a posição vertical de cada linha depende do intervalo escolhido para o seu eixo, então o ponto de cruzamento não significa nada. A alternativa honesta são dois painéis lado a lado ou as duas séries como índice (100 no primeiro mês). O `twinx` aceita quaisquer unidades, e por isso o truque é possível; mesma cor piora a leitura; e a escala log não resolve a arbitrariedade dos limites.

### Pergunta
Um gráfico de linhas compara quatro regiões usando só cores (vermelho, verde, laranja e marrom), com a legenda num canto. Uma colega com daltonismo vermelho-verde não consegue dizer qual linha é qual. Qual mudança resolve sem perder informação?
- [ ] Aumentar a espessura das linhas e manter as cores
- [ ] Trocar para tons de cinza diferentes, sem mais nada
- [x] Usar uma paleta segura (como a de Okabe e Ito) e, além da cor, marcador ou estilo de linha diferente, ou o nome da região escrito na ponta de cada linha
- [ ] Mover a legenda para dentro do gráfico, perto das linhas
> Uma paleta pensada para daltonismo afasta as cores, e uma segunda pista (marcador, estilo ou rótulo direto) faz a informação sobreviver mesmo em preto e branco. Linhas mais grossas continuam com cores que ela não distingue; quatro tons de cinza parecidos ficam difíceis para todo mundo; e mover a legenda não muda o fato de que a única pista é a cor.
