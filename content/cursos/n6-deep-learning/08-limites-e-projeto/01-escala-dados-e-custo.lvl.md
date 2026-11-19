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
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Estimar FLOPs e tempo de treino a partir de parâmetros e tokens (regra 6ND)
- Descrever as etapas pré-treino, ajuste fino supervisionado e aprendizado por reforço com feedback humano
- Discutir custo, energia e concentração de recursos como limitações práticas
---

## Passo 1 · Leitura · Do mini-GPT a um modelo grande

O mini-GPT do módulo anterior tem 15 008 parâmetros e treinou com 600 lotes de 256 tokens. Um modelo de linguagem grande tem as mesmas peças: embeddings, blocos com atenção e MLP, uma projeção para o vocabulário. O que muda é a escala, e a escala se lê em potências de 10. As duas colunas da direita são hipotéticas.

| | mini-GPT do curso | modelo médio | modelo grande |
|---|---|---|---|
| parâmetros ($N$) | $10^4$ | $10^8$ a $10^9$ | $10^{11}$ |
| tokens de treino ($D$) | $10^5$ | $10^{10}$ a $10^{11}$ | $10^{13}$ |
| contexto | $16$ | $10^3$ | $10^5$ |

Para comparar treinos tão diferentes, conta-se **operações de ponto flutuante** (FLOPs): cada soma ou multiplicação de dois números vale uma. A estimativa usual do custo de um treino é

$$C \approx 6ND$$

O 6 vem de uma conta por parâmetro e por token. No forward, cada peso de uma matriz entra em uma multiplicação e em uma soma: 2 FLOPs. O backward custa perto do dobro do forward, porque faz um produto para o gradiente dos pesos e outro para o gradiente da entrada: 4 FLOPs. A regra ignora a atenção, as normalizações e a softmax, e por isso serve para a ordem de grandeza, não para o terceiro algarismo.

Dá para conferir a regra com o que você já mediu. Um passo do mini-GPT processa 16 sequências de 16 tokens:

```python
n_params = 15_008
tokens_por_passo = 16 * 16                 # lote 16, contexto 16
flops_por_passo = 6 * n_params * tokens_por_passo
print(flops_por_passo)                     # 23052288
print(flops_por_passo / 6.5e-3)            # ~3,5e9 FLOPs por segundo
```

São 23 milhões de FLOPs por passo. O passo levou 6,5 ms no executor, o que dá 3,5 GFLOP/s, perto dos 4 a 6 GFLOP/s que o produto de matrizes atinge na mesma máquina. A estimativa e a medida concordam.

Dois cuidados com as letras. $N$ conta parâmetros e $D$ conta **tokens processados**: não é o tamanho do vocabulário, e um texto visto em duas épocas conta duas vezes. E a velocidade nominal de uma máquina não é a velocidade do treino: parte do tempo vai para ler dados, copiar memória e esperar. A fração aproveitada é a **eficiência**, um número entre 0 e 1 que divide a velocidade útil.

## Passo 2 · Previsão · 6ND do mini-GPT

O código estima o treino completo do mini-GPT: 600 passos, cada um com 16 sequências de 16 tokens, numa máquina que faz 4 GFLOP/s com eficiência 1. Faça a conta em potências de 10 antes de executar: quantos tokens o treino processa, quantos bilhões de FLOPs isso custa e quantos segundos leva.

### Código

```python
n_params = 15_008
tokens = 600 * 16 * 16
flops = 6 * n_params * tokens

print(tokens)
print(round(flops / 1e9, 1))
print(round(flops / 4e9, 1))
```

### Dicas

1. $600 \times 256 = 153\,600$ tokens: perto de $1{,}5 \cdot 10^5$.
2. $6 \times 15\,008 \approx 9 \cdot 10^4$. Multiplique pelos tokens e leia o resultado em bilhões ($10^9$).
3. O tempo é o custo dividido pela velocidade: os bilhões de FLOPs divididos por 4.

### Saída esperada

```text
153600
13.8
3.5
```

## Passo 3 · Exercício · Estimar o custo
modo: lacunas

Complete as duas funções da estimativa.

`estimar_flops(n_params, n_tokens)` devolve o custo do treino pela regra $6ND$. `tempo_de_treino(flops, flops_por_segundo, eficiencia)` devolve o tempo em segundos: o custo dividido pela velocidade **útil**, que é a velocidade nominal multiplicada pela eficiência. A eficiência é uma fração maior que 0 e no máximo 1; qualquer valor fora disso levanta `ValueError`.

### Instruções

1. `estimar_flops`: 6 FLOPs por parâmetro e por token processado.
2. `tempo_de_treino`: recuse a eficiência fora de $(0, 1]$ e divida o custo pela velocidade útil.

### Código inicial

```python
def estimar_flops(n_params, n_tokens):
    return ___ * n_params * ___


def tempo_de_treino(flops, flops_por_segundo, eficiencia):
    if ___:
        raise ValueError("a eficiência fica acima de 0 e vai até 1")
    return flops / (___)


if __name__ == "__main__":
    flops = estimar_flops(15_008, 600 * 256)
    print(flops, round(tempo_de_treino(flops, 4e9, 1.0), 2))
```

### Solução

```python
def estimar_flops(n_params, n_tokens):
    return 6 * n_params * n_tokens


def tempo_de_treino(flops, flops_por_segundo, eficiencia):
    if eficiencia <= 0 or eficiencia > 1:
        raise ValueError("a eficiência fica acima de 0 e vai até 1")
    return flops / (flops_por_segundo * eficiencia)


if __name__ == "__main__":
    flops = estimar_flops(15_008, 600 * 256)
    print(flops, round(tempo_de_treino(flops, 4e9, 1.0), 2))
```

### Dicas

1. O custo cresce com os parâmetros **e** com os tokens: as duas grandezas entram no produto.
2. Eficiência 0,5 significa metade da velocidade nominal, e portanto o dobro do tempo.
3. A eficiência 1 é válida; a eficiência 0 não é, porque o treino nunca terminaria.

### Verificação

```json
[
  {"id": "flops-um-passo", "checkpoint": 1, "kind": "call", "function": "estimar_flops", "args": [15008, 256], "expected": 23052288, "name": "Um passo do mini-GPT: 15 008 parâmetros e 256 tokens", "hint": "6 × 15 008 × 256."},
  {"id": "flops-treino", "checkpoint": 1, "kind": "call", "function": "estimar_flops", "args": [15008, 153600], "expected": 13831372800, "name": "O treino de 600 passos do mini-GPT"},
  {"id": "flops-pequeno", "checkpoint": 1, "kind": "call", "function": "estimar_flops", "args": [3, 5], "expected": 90, "name": "3 parâmetros e 5 tokens custam 90 FLOPs", "hint": "Parâmetros e tokens são grandezas diferentes: as duas entram na conta, uma vez cada."},
  {"id": "flops-escala", "checkpoint": 1, "kind": "call", "function": "estimar_flops", "args": [1000000, 100000000], "expected": 600000000000000, "name": "10⁶ parâmetros e 10⁸ tokens: 6 · 10¹⁴ FLOPs"},
  {"id": "tempo-mini-gpt", "checkpoint": 2, "kind": "call", "function": "tempo_de_treino", "args": [13831372800, 4000000000.0, 1.0], "expected": 3.4578432, "tolerance": 1e-09, "name": "O treino do mini-GPT a 4 GFLOP/s com eficiência 1"},
  {"id": "tempo-metade", "checkpoint": 2, "kind": "call", "function": "tempo_de_treino", "args": [600000000000000, 1000000000000.0, 0.5], "expected": 1200.0, "tolerance": 1e-09, "name": "Eficiência 0,5 dobra o tempo", "hint": "A eficiência reduz a velocidade, não o tempo."},
  {"id": "tempo-um-quarto", "checkpoint": 2, "kind": "call", "function": "tempo_de_treino", "args": [1000000000000.0, 1000000000.0, 0.25], "expected": 4000.0, "tolerance": 1e-09, "name": "Eficiência 0,25 quadruplica o tempo"},
  {"id": "eficiencia-um", "checkpoint": 2, "kind": "expr", "expr": "tempo_de_treino(100.0, 50.0, 1)", "expected": 2.0, "tolerance": 1e-12, "name": "Eficiência 1 é aceita", "hint": "O intervalo válido inclui o 1."},
  {"id": "eficiencia-zero", "checkpoint": 2, "kind": "expr", "expr": "tempo_de_treino(100.0, 50.0, 0)", "raises": "ValueError", "name": "Eficiência 0 levanta ValueError", "hint": "Confira a eficiência antes de dividir."},
  {"id": "eficiencia-negativa", "checkpoint": 2, "kind": "expr", "expr": "tempo_de_treino(100.0, 50.0, -0.2)", "raises": "ValueError", "name": "Eficiência negativa levanta ValueError"},
  {"id": "eficiencia-acima", "checkpoint": 2, "kind": "expr", "expr": "tempo_de_treino(100.0, 50.0, 1.5)", "raises": "ValueError", "name": "Eficiência acima de 1 levanta ValueError"}
]
```

### Soluções erradas

```python name="só o forward: fator 2 no lugar de 6"
def estimar_flops(n_params, n_tokens):
    return 2 * n_params * n_tokens


def tempo_de_treino(flops, flops_por_segundo, eficiencia):
    if eficiencia <= 0 or eficiencia > 1:
        raise ValueError("a eficiência fica acima de 0 e vai até 1")
    return flops / (flops_por_segundo * eficiencia)


if __name__ == "__main__":
    flops = estimar_flops(15_008, 600 * 256)
    print(flops, round(tempo_de_treino(flops, 4e9, 1.0), 2))
```

```python name="sem o fator 6"
def estimar_flops(n_params, n_tokens):
    return 1 * n_params * n_tokens


def tempo_de_treino(flops, flops_por_segundo, eficiencia):
    if eficiencia <= 0 or eficiencia > 1:
        raise ValueError("a eficiência fica acima de 0 e vai até 1")
    return flops / (flops_por_segundo * eficiencia)


if __name__ == "__main__":
    flops = estimar_flops(15_008, 600 * 256)
    print(flops, round(tempo_de_treino(flops, 4e9, 1.0), 2))
```

```python name="parâmetros no lugar dos tokens"
def estimar_flops(n_params, n_tokens):
    return 6 * n_params * n_params


def tempo_de_treino(flops, flops_por_segundo, eficiencia):
    if eficiencia <= 0 or eficiencia > 1:
        raise ValueError("a eficiência fica acima de 0 e vai até 1")
    return flops / (flops_por_segundo * eficiencia)


if __name__ == "__main__":
    flops = estimar_flops(15_008, 600 * 256)
    print(flops, round(tempo_de_treino(flops, 4e9, 1.0), 2))
```

```python name="eficiência multiplicando o tempo"
def estimar_flops(n_params, n_tokens):
    return 6 * n_params * n_tokens


def tempo_de_treino(flops, flops_por_segundo, eficiencia):
    if eficiencia <= 0 or eficiencia > 1:
        raise ValueError("a eficiência fica acima de 0 e vai até 1")
    return flops / (flops_por_segundo / eficiencia)


if __name__ == "__main__":
    flops = estimar_flops(15_008, 600 * 256)
    print(flops, round(tempo_de_treino(flops, 4e9, 1.0), 2))
```

```python name="eficiência ignorada"
def estimar_flops(n_params, n_tokens):
    return 6 * n_params * n_tokens


def tempo_de_treino(flops, flops_por_segundo, eficiencia):
    if eficiencia <= 0 or eficiencia > 1:
        raise ValueError("a eficiência fica acima de 0 e vai até 1")
    return flops / (flops_por_segundo)


if __name__ == "__main__":
    flops = estimar_flops(15_008, 600 * 256)
    print(flops, round(tempo_de_treino(flops, 4e9, 1.0), 2))
```

```python name="validação aceita a eficiência 0"
def estimar_flops(n_params, n_tokens):
    return 6 * n_params * n_tokens


def tempo_de_treino(flops, flops_por_segundo, eficiencia):
    if eficiencia < 0 or eficiencia > 1:
        raise ValueError("a eficiência fica acima de 0 e vai até 1")
    return flops / (flops_por_segundo * eficiencia)


if __name__ == "__main__":
    flops = estimar_flops(15_008, 600 * 256)
    print(flops, round(tempo_de_treino(flops, 4e9, 1.0), 2))
```

```python name="validação recusa a eficiência 1"
def estimar_flops(n_params, n_tokens):
    return 6 * n_params * n_tokens


def tempo_de_treino(flops, flops_por_segundo, eficiencia):
    if eficiencia <= 0 or eficiencia >= 1:
        raise ValueError("a eficiência fica acima de 0 e vai até 1")
    return flops / (flops_por_segundo * eficiencia)


if __name__ == "__main__":
    flops = estimar_flops(15_008, 600 * 256)
    print(flops, round(tempo_de_treino(flops, 4e9, 1.0), 2))
```

```python name="validação sem o limite superior"
def estimar_flops(n_params, n_tokens):
    return 6 * n_params * n_tokens


def tempo_de_treino(flops, flops_por_segundo, eficiencia):
    if eficiencia <= 0:
        raise ValueError("a eficiência fica acima de 0 e vai até 1")
    return flops / (flops_por_segundo * eficiencia)


if __name__ == "__main__":
    flops = estimar_flops(15_008, 600 * 256)
    print(flops, round(tempo_de_treino(flops, 4e9, 1.0), 2))
```

## Passo 4 · Leitura · Leis de escala e as etapas

Aumentar o modelo e os dados melhora a perda, e melhora de um jeito regular. Em faixas largas de tamanho, a perda de validação cai como uma **lei de potência**: uma parte que não some ($L_\infty$, a incerteza do próprio texto) mais uma parte que encolhe com o tamanho.

$$L(N) \approx L_\infty + a\,N^{-\alpha} \qquad L(D) \approx L_\infty + b\,D^{-\beta}$$

Os expoentes são pequenos, e isso tem uma consequência dura: cada multiplicação por 10 em $N$ corta a parte redutível pelo mesmo fator. O bloco usa constantes inventadas para mostrar a forma da curva.

```python
L_inf, a, alfa = 1.5, 20.0, 0.3            # valores hipotéticos
for expoente in (6, 7, 8, 9):
    N = 10 ** expoente
    print(expoente, round(L_inf + a * N ** -alfa, 3))
# 6 1.817 / 7 1.659 / 8 1.58 / 9 1.54
```

Com $\alpha = 0{,}3$, dez vezes mais parâmetros cortam a parte redutível pela metade ($10^{-0{,}3} \approx 0{,}5$). O ganho de cada passo é menor que o do anterior, e o custo é dez vezes maior. As duas leis valem juntas: um modelo grande com poucos tokens por parâmetro decora o treino, e um modelo pequeno com dados de sobra para de melhorar. Por isso $N$ e $D$ crescem em conjunto.

O treino de um modelo grande tem três etapas, com custos muito diferentes.

**Pré-treino.** É o que você fez no módulo 7: prever o próximo token em muito texto, sem rótulos. Quase todo o custo $6ND$ está aqui. O resultado é um modelo que continua textos, não um que responde perguntas.

**Ajuste fino supervisionado.** O mesmo modelo continua treinando, com a mesma perda, em exemplos escritos no formato desejado: uma instrução seguida de uma boa resposta. São ordens de grandeza menos tokens. O modelo não aprende a língua de novo; ele aprende o formato e o tom.

**Ajuste por preferências.** Pessoas comparam pares de respostas e indicam a melhor. Essas comparações viram um sinal de treino que empurra o modelo para as respostas preferidas. A etapa muda o comportamento com poucos dados e traz um risco próprio: o modelo aprende o que agrada aos avaliadores, o que nem sempre coincide com o que é correto.

## Passo 5 · Exercício · Comparar escalas

Uma tabela de modelos fica mais fácil de ler em razões do que em números absolutos. Cada modelo é um dicionário com as chaves `"nome"`, `"parametros"` e `"tokens"` (os tokens de treino).

Escreva `tokens_por_parametro(modelo)`, que devolve quantos tokens de treino o modelo viu para cada parâmetro, e `comparar_escalas(modelos)`, que devolve uma lista nova com um dicionário por modelo, na mesma ordem, com as chaves:

- `"nome"`: o nome do modelo;
- `"parametros"`: os parâmetros do modelo divididos pelos do **primeiro** da lista;
- `"tokens"`: os tokens divididos pelos do primeiro;
- `"flops"`: o custo $6ND$ do modelo dividido pelo custo do primeiro.

As razões são `float`. A lista vazia devolve a lista vazia, e os dicionários recebidos não são alterados.

### Instruções

1. `tokens_por_parametro`: tokens de treino divididos pelos parâmetros.
2. `comparar_escalas`: para cada modelo, as razões de parâmetros, de tokens e de FLOPs contra o primeiro da lista.

### Código inicial

```python
def tokens_por_parametro(modelo):
    # tokens de treino divididos pelos parâmetros
    pass


def comparar_escalas(modelos):
    # uma linha por modelo, com as razões contra o primeiro da lista
    pass


if __name__ == "__main__":
    modelos = [
        {"nome": "pequeno", "parametros": 10 ** 8, "tokens": 10 ** 10},
        {"nome": "grande", "parametros": 10 ** 11, "tokens": 10 ** 13},
    ]
    print(comparar_escalas(modelos))
    print(tokens_por_parametro(modelos[0]))
```

### Solução

```python
def tokens_por_parametro(modelo):
    return modelo["tokens"] / modelo["parametros"]


def comparar_escalas(modelos):
    if not modelos:
        return []
    base = modelos[0]
    flops_base = 6 * base["parametros"] * base["tokens"]
    linhas = []
    for modelo in modelos:
        flops = 6 * modelo["parametros"] * modelo["tokens"]
        linhas.append({
            "nome": modelo["nome"],
            "parametros": modelo["parametros"] / base["parametros"],
            "tokens": modelo["tokens"] / base["tokens"],
            "flops": flops / flops_base,
        })
    return linhas


if __name__ == "__main__":
    modelos = [
        {"nome": "pequeno", "parametros": 10 ** 8, "tokens": 10 ** 10},
        {"nome": "grande", "parametros": 10 ** 11, "tokens": 10 ** 13},
    ]
    for linha in comparar_escalas(modelos):
        print(linha)
    print(tokens_por_parametro(modelos[0]))
```

### Dicas

1. O primeiro modelo comparado com ele mesmo dá 1.0 nas três razões.
2. O custo é um produto: a razão de FLOPs é a razão de parâmetros vezes a razão de tokens.
3. Monte dicionários novos; escrever nos recebidos muda a tabela de quem chamou.

### Verificação

```json
[
  {"id": "tokens-por-parametro", "checkpoint": 1, "kind": "call", "function": "tokens_por_parametro", "args": [{"nome": "a", "parametros": 200, "tokens": 5000}], "expected": 25.0, "tolerance": 1e-12, "name": "5 000 tokens e 200 parâmetros: 25 tokens por parâmetro"},
  {"id": "tokens-por-parametro-fracao", "checkpoint": 1, "kind": "call", "function": "tokens_por_parametro", "args": [{"nome": "b", "parametros": 1000000000, "tokens": 100000000}], "expected": 0.1, "tolerance": 1e-12, "name": "Mais parâmetros que tokens: 0,1 token por parâmetro", "hint": "A razão pode ficar abaixo de 1: use a divisão real."},
  {"id": "nomes", "checkpoint": 2, "kind": "expr", "setup": "_M = [{\"nome\": \"pequeno\", \"parametros\": 10 ** 8, \"tokens\": 10 ** 10}, {\"nome\": \"medio\", \"parametros\": 10 ** 9, \"tokens\": 10 ** 11}, {\"nome\": \"grande\", \"parametros\": 10 ** 11, \"tokens\": 10 ** 13}]\n_R = comparar_escalas(_M)", "expr": "[r[\"nome\"] for r in _R]", "expected": ["pequeno", "medio", "grande"], "name": "Uma linha por modelo, na ordem recebida"},
  {"id": "chaves", "checkpoint": 2, "kind": "expr", "setup": "_M = [{\"nome\": \"pequeno\", \"parametros\": 10 ** 8, \"tokens\": 10 ** 10}, {\"nome\": \"medio\", \"parametros\": 10 ** 9, \"tokens\": 10 ** 11}, {\"nome\": \"grande\", \"parametros\": 10 ** 11, \"tokens\": 10 ** 13}]\n_R = comparar_escalas(_M)", "expr": "[sorted(r) for r in _R]", "expected": [["flops", "nome", "parametros", "tokens"], ["flops", "nome", "parametros", "tokens"], ["flops", "nome", "parametros", "tokens"]], "name": "Cada linha tem as quatro chaves do enunciado"},
  {"id": "primeiro", "checkpoint": 2, "kind": "expr", "setup": "_M = [{\"nome\": \"pequeno\", \"parametros\": 10 ** 8, \"tokens\": 10 ** 10}, {\"nome\": \"medio\", \"parametros\": 10 ** 9, \"tokens\": 10 ** 11}, {\"nome\": \"grande\", \"parametros\": 10 ** 11, \"tokens\": 10 ** 13}]\n_R = comparar_escalas(_M)", "expr": "[_R[0][\"parametros\"], _R[0][\"tokens\"], _R[0][\"flops\"]]", "expected": [1.0, 1.0, 1.0], "tolerance": 1e-12, "name": "O primeiro modelo tem razão 1 em tudo"},
  {"id": "razoes-parametros", "checkpoint": 2, "kind": "expr", "setup": "_M = [{\"nome\": \"pequeno\", \"parametros\": 10 ** 8, \"tokens\": 10 ** 10}, {\"nome\": \"medio\", \"parametros\": 10 ** 9, \"tokens\": 10 ** 11}, {\"nome\": \"grande\", \"parametros\": 10 ** 11, \"tokens\": 10 ** 13}]\n_R = comparar_escalas(_M)", "expr": "[r[\"parametros\"] for r in _R]", "expected": [1.0, 10.0, 1000.0], "tolerance": 1e-09, "name": "Razões de parâmetros contra o primeiro", "hint": "O terceiro é comparado com o primeiro, não com o segundo."},
  {"id": "razoes-tokens", "checkpoint": 2, "kind": "expr", "setup": "_M = [{\"nome\": \"pequeno\", \"parametros\": 10 ** 8, \"tokens\": 10 ** 10}, {\"nome\": \"medio\", \"parametros\": 10 ** 9, \"tokens\": 10 ** 11}, {\"nome\": \"grande\", \"parametros\": 10 ** 11, \"tokens\": 10 ** 13}]\n_R = comparar_escalas(_M)", "expr": "[r[\"tokens\"] for r in _R]", "expected": [1.0, 10.0, 1000.0], "tolerance": 1e-09, "name": "Razões de tokens contra o primeiro"},
  {"id": "razoes-flops", "checkpoint": 2, "kind": "expr", "setup": "_M = [{\"nome\": \"pequeno\", \"parametros\": 10 ** 8, \"tokens\": 10 ** 10}, {\"nome\": \"medio\", \"parametros\": 10 ** 9, \"tokens\": 10 ** 11}, {\"nome\": \"grande\", \"parametros\": 10 ** 11, \"tokens\": 10 ** 13}]\n_R = comparar_escalas(_M)", "expr": "[r[\"flops\"] for r in _R]", "expected": [1.0, 100.0, 1000000.0], "tolerance": 1e-06, "name": "Razões de FLOPs: 10 vezes em N e em D custam 100 vezes", "hint": "O custo é 6ND: as razões se multiplicam."},
  {"id": "flops-produto", "checkpoint": 2, "kind": "expr", "setup": "_R = comparar_escalas([{\"nome\": \"a\", \"parametros\": 100, \"tokens\": 1000}, {\"nome\": \"b\", \"parametros\": 300, \"tokens\": 5000}])", "expr": "[_R[1][\"parametros\"], _R[1][\"tokens\"], _R[1][\"flops\"]]", "expected": [3.0, 5.0, 15.0], "tolerance": 1e-09, "name": "3 vezes os parâmetros e 5 vezes os tokens: 15 vezes os FLOPs"},
  {"id": "primeiro-e-o-maior", "checkpoint": 2, "kind": "expr", "setup": "_M = [{\"nome\": \"grande\", \"parametros\": 4000, \"tokens\": 80000}, {\"nome\": \"medio\", \"parametros\": 1000, \"tokens\": 40000}, {\"nome\": \"pequeno\", \"parametros\": 100, \"tokens\": 1000}]\n_R = comparar_escalas(_M)", "expr": "[[r[\"parametros\"], r[\"tokens\"], r[\"flops\"]] for r in _R]", "expected": [[1.0, 1.0, 1.0], [0.25, 0.5, 0.125], [0.025, 0.0125, 0.0003125]], "tolerance": 1e-12, "name": "Com o maior modelo na frente, as razões ficam abaixo de 1", "hint": "A referência é sempre o primeiro da lista, seja ele o maior ou o menor."},
  {"id": "um-modelo", "checkpoint": 2, "kind": "expr", "expr": "[[r[\"nome\"], r[\"flops\"]] for r in comparar_escalas([{\"nome\": \"x\", \"parametros\": 7, \"tokens\": 9}])]", "expected": [["x", 1.0]], "name": "Uma lista com um modelo só"},
  {"id": "lista-vazia", "checkpoint": 2, "kind": "call", "function": "comparar_escalas", "args": [[]], "expected": [], "name": "A lista vazia devolve a lista vazia"},
  {"id": "entrada-intacta", "checkpoint": 2, "kind": "expr", "setup": "_M = [{\"nome\": \"pequeno\", \"parametros\": 10 ** 8, \"tokens\": 10 ** 10}, {\"nome\": \"medio\", \"parametros\": 10 ** 9, \"tokens\": 10 ** 11}, {\"nome\": \"grande\", \"parametros\": 10 ** 11, \"tokens\": 10 ** 13}]\n_R = comparar_escalas(_M)", "expr": "_M", "expected": [{"nome": "pequeno", "parametros": 100000000, "tokens": 10000000000}, {"nome": "medio", "parametros": 1000000000, "tokens": 100000000000}, {"nome": "grande", "parametros": 100000000000, "tokens": 10000000000000}], "name": "Os dicionários recebidos continuam como estavam", "hint": "Crie um dicionário novo para cada linha."}
]
```

### Soluções erradas

```python name="razões contra o maior modelo"
def tokens_por_parametro(modelo):
    return modelo["tokens"] / modelo["parametros"]


def comparar_escalas(modelos):
    if not modelos:
        return []
    base = max(modelos, key=lambda m: m["parametros"])
    flops_base = 6 * base["parametros"] * base["tokens"]
    linhas = []
    for modelo in modelos:
        flops = 6 * modelo["parametros"] * modelo["tokens"]
        linhas.append({
            "nome": modelo["nome"],
            "parametros": modelo["parametros"] / base["parametros"],
            "tokens": modelo["tokens"] / base["tokens"],
            "flops": flops / flops_base,
        })
    return linhas


if __name__ == "__main__":
    modelos = [
        {"nome": "pequeno", "parametros": 10 ** 8, "tokens": 10 ** 10},
        {"nome": "grande", "parametros": 10 ** 11, "tokens": 10 ** 13},
    ]
    for linha in comparar_escalas(modelos):
        print(linha)
    print(tokens_por_parametro(modelos[0]))
```

```python name="razões contra o último da lista"
def tokens_por_parametro(modelo):
    return modelo["tokens"] / modelo["parametros"]


def comparar_escalas(modelos):
    if not modelos:
        return []
    base = modelos[-1]
    flops_base = 6 * base["parametros"] * base["tokens"]
    linhas = []
    for modelo in modelos:
        flops = 6 * modelo["parametros"] * modelo["tokens"]
        linhas.append({
            "nome": modelo["nome"],
            "parametros": modelo["parametros"] / base["parametros"],
            "tokens": modelo["tokens"] / base["tokens"],
            "flops": flops / flops_base,
        })
    return linhas


if __name__ == "__main__":
    modelos = [
        {"nome": "pequeno", "parametros": 10 ** 8, "tokens": 10 ** 10},
        {"nome": "grande", "parametros": 10 ** 11, "tokens": 10 ** 13},
    ]
    for linha in comparar_escalas(modelos):
        print(linha)
    print(tokens_por_parametro(modelos[0]))
```

```python name="razões contra o modelo anterior"
def tokens_por_parametro(modelo):
    return modelo["tokens"] / modelo["parametros"]


def comparar_escalas(modelos):
    if not modelos:
        return []
    linhas = []
    base = modelos[0]
    for modelo in modelos:
        linhas.append({
            "nome": modelo["nome"],
            "parametros": modelo["parametros"] / base["parametros"],
            "tokens": modelo["tokens"] / base["tokens"],
            "flops": (modelo["parametros"] * modelo["tokens"]) / (base["parametros"] * base["tokens"]),
        })
        base = modelo
    return linhas
```

```python name="razão de FLOPs igual à de parâmetros"
def tokens_por_parametro(modelo):
    return modelo["tokens"] / modelo["parametros"]


def comparar_escalas(modelos):
    if not modelos:
        return []
    base = modelos[0]
    flops_base = 6 * base["parametros"] * base["tokens"]
    linhas = []
    for modelo in modelos:
        flops = 6 * modelo["parametros"] * modelo["tokens"]
        linhas.append({
            "nome": modelo["nome"],
            "parametros": modelo["parametros"] / base["parametros"],
            "tokens": modelo["tokens"] / base["tokens"],
            "flops": modelo["parametros"] / base["parametros"],
        })
    return linhas


if __name__ == "__main__":
    modelos = [
        {"nome": "pequeno", "parametros": 10 ** 8, "tokens": 10 ** 10},
        {"nome": "grande", "parametros": 10 ** 11, "tokens": 10 ** 13},
    ]
    for linha in comparar_escalas(modelos):
        print(linha)
    print(tokens_por_parametro(modelos[0]))
```

```python name="razão de FLOPs somando as duas razões"
def tokens_por_parametro(modelo):
    return modelo["tokens"] / modelo["parametros"]


def comparar_escalas(modelos):
    if not modelos:
        return []
    base = modelos[0]
    flops_base = 6 * base["parametros"] * base["tokens"]
    linhas = []
    for modelo in modelos:
        flops = 6 * modelo["parametros"] * modelo["tokens"]
        linhas.append({
            "nome": modelo["nome"],
            "parametros": modelo["parametros"] / base["parametros"],
            "tokens": modelo["tokens"] / base["tokens"],
            "flops": modelo["parametros"] / base["parametros"] + modelo["tokens"] / base["tokens"],
        })
    return linhas


if __name__ == "__main__":
    modelos = [
        {"nome": "pequeno", "parametros": 10 ** 8, "tokens": 10 ** 10},
        {"nome": "grande", "parametros": 10 ** 11, "tokens": 10 ** 13},
    ]
    for linha in comparar_escalas(modelos):
        print(linha)
    print(tokens_por_parametro(modelos[0]))
```

```python name="tokens por parâmetro invertido"
def tokens_por_parametro(modelo):
    return modelo["parametros"] / modelo["tokens"]


def comparar_escalas(modelos):
    if not modelos:
        return []
    base = modelos[0]
    flops_base = 6 * base["parametros"] * base["tokens"]
    linhas = []
    for modelo in modelos:
        flops = 6 * modelo["parametros"] * modelo["tokens"]
        linhas.append({
            "nome": modelo["nome"],
            "parametros": modelo["parametros"] / base["parametros"],
            "tokens": modelo["tokens"] / base["tokens"],
            "flops": flops / flops_base,
        })
    return linhas


if __name__ == "__main__":
    modelos = [
        {"nome": "pequeno", "parametros": 10 ** 8, "tokens": 10 ** 10},
        {"nome": "grande", "parametros": 10 ** 11, "tokens": 10 ** 13},
    ]
    for linha in comparar_escalas(modelos):
        print(linha)
    print(tokens_por_parametro(modelos[0]))
```

```python name="divisão inteira nas razões"
def tokens_por_parametro(modelo):
    return modelo["tokens"] // modelo["parametros"]


def comparar_escalas(modelos):
    if not modelos:
        return []
    base = modelos[0]
    flops_base = 6 * base["parametros"] * base["tokens"]
    linhas = []
    for modelo in modelos:
        flops = 6 * modelo["parametros"] * modelo["tokens"]
        linhas.append({
            "nome": modelo["nome"],
            "parametros": modelo["parametros"] // base["parametros"],
            "tokens": modelo["tokens"] // base["tokens"],
            "flops": flops // flops_base,
        })
    return linhas


if __name__ == "__main__":
    modelos = [
        {"nome": "pequeno", "parametros": 10 ** 8, "tokens": 10 ** 10},
        {"nome": "grande", "parametros": 10 ** 11, "tokens": 10 ** 13},
    ]
    for linha in comparar_escalas(modelos):
        print(linha)
    print(tokens_por_parametro(modelos[0]))
```

```python name="altera os dicionários recebidos"
def tokens_por_parametro(modelo):
    return modelo["tokens"] / modelo["parametros"]


def comparar_escalas(modelos):
    if not modelos:
        return []
    n_base, d_base = modelos[0]["parametros"], modelos[0]["tokens"]
    for modelo in modelos:
        n, d = modelo["parametros"], modelo["tokens"]
        modelo["parametros"] = n / n_base
        modelo["tokens"] = d / d_base
        modelo["flops"] = (n * d) / (n_base * d_base)
    return modelos
```

```python name="lista vazia levanta IndexError"
def tokens_por_parametro(modelo):
    return modelo["tokens"] / modelo["parametros"]


def comparar_escalas(modelos):
    base = modelos[0]
    flops_base = 6 * base["parametros"] * base["tokens"]
    linhas = []
    for modelo in modelos:
        flops = 6 * modelo["parametros"] * modelo["tokens"]
        linhas.append({
            "nome": modelo["nome"],
            "parametros": modelo["parametros"] / base["parametros"],
            "tokens": modelo["tokens"] / base["tokens"],
            "flops": flops / flops_base,
        })
    return linhas


if __name__ == "__main__":
    modelos = [
        {"nome": "pequeno", "parametros": 10 ** 8, "tokens": 10 ** 10},
        {"nome": "grande", "parametros": 10 ** 11, "tokens": 10 ** 13},
    ]
    for linha in comparar_escalas(modelos):
        print(linha)
    print(tokens_por_parametro(modelos[0]))
```

## Passo 6 · Leitura · Dados, energia e concentração

A regra $6ND$ trata os tokens como se fossem todos iguais. Não são, e boa parte do trabalho de um treino grande acontece antes do primeiro passo de gradiente.

**Qualidade.** O modelo aprende a continuar o texto que recebe, com os erros, as repetições e os vícios desse texto. Dez vezes mais tokens de texto ruim não equivalem a dez vezes mais dados.

**Deduplicação.** Textos repetidos gastam FLOPs sem ensinar nada de novo e favorecem a memorização literal. Repetição entre treino e validação é pior: a perda de validação passa a medir memória, o mesmo vazamento que o Nível 5 ensinou a evitar.

**Direitos de uso.** Um texto estar acessível não significa que pode ser usado para treino. Licença, autoria e dados pessoais restringem o que entra no corpus, e é por isso que este curso usa textos gerados e escritos para ele.

O custo também se mede em energia. Em ordem de grandeza, a energia é o número de FLOPs multiplicado pelos joules gastos em cada um:

$$E \approx C \cdot \frac{\text{potência}}{\text{FLOPs por segundo}}$$

```python
flops = 6 * 10 ** 11 * 10 ** 13            # modelo grande hipotético: 6e24
joules_por_flop = 500 / 1e14               # acelerador hipotético: 500 W, 1e14 FLOP/s
energia = flops * joules_por_flop          # 3e13 J
print(energia / 3.6e6)                     # ~8,3 milhões de kWh
print(flops / (10_000 * 1e14 * 0.5) / 86_400)   # ~139 dias em 10 000 aceleradores
```

Com um acelerador só, o mesmo treino levaria $6 \cdot 10^{10}$ segundos, perto de dois mil anos. Com dez mil deles e eficiência 0,5, leva 139 dias e consome a energia de milhões de quilowatts-hora, sem contar refrigeração nem os treinos que deram errado antes. Os números são hipotéticos; a ordem de grandeza é o que importa.

Daí vem a **concentração**. Treinar um modelo de $10^{11}$ parâmetros exige milhares de aceleradores, energia e uma equipe para mantê-los, e poucas organizações reúnem as três coisas. Quem não reúne trabalha com modelos menores, com ajuste fino de modelos já treinados ou com o uso de modelos prontos, que é o assunto do Nível 7.

O mini-GPT fica 14 ordens de grandeza abaixo em FLOPs e contém as mesmas ideias. É por isso que o curso para nele: o que falta para chegar a um modelo grande é escala e engenharia, não outro conceito.

## Passo 7 · Quiz · Custo e escala

### Pergunta

Uma equipe planeja treinar um modelo de $10^9$ parâmetros com $10^{11}$ tokens. Quatro pessoas estimam o custo do treino. Qual estimativa segue a regra do curso?

- [ ] $2 \cdot 10^{20}$ FLOPs
- [x] $6 \cdot 10^{20}$ FLOPs
- [ ] $6 \cdot 10^{18}$ FLOPs
- [ ] $10^{20}$ FLOPs

> $6ND = 6 \cdot 10^9 \cdot 10^{11} = 6 \cdot 10^{20}$. O fator 2 conta só o forward e deixa o backward de fora. $6 \cdot 10^{18}$ sai de $6N^2$, que troca os tokens pelos parâmetros. $10^{20}$ é o produto $ND$ sem as 6 operações por parâmetro e por token.

### Pergunta

O treino custa $6 \cdot 10^{20}$ FLOPs. O conjunto de máquinas disponível faz, no papel, $10^{15}$ FLOPs por segundo, e a eficiência medida em treinos anteriores foi 0,4. Quanto tempo o treino deve levar?

- [ ] $6 \cdot 10^5$ s, perto de 7 dias
- [ ] $2{,}4 \cdot 10^5$ s, perto de 3 dias
- [x] $1{,}5 \cdot 10^6$ s, perto de 17 dias
- [ ] $1{,}5 \cdot 10^5$ s, perto de 2 dias

> A velocidade útil é $0{,}4 \cdot 10^{15} = 4 \cdot 10^{14}$ FLOP/s, e $6 \cdot 10^{20} / 4 \cdot 10^{14} = 1{,}5 \cdot 10^6$ s. $6 \cdot 10^5$ s ignora a eficiência e usa a velocidade nominal. $2{,}4 \cdot 10^5$ s multiplica o tempo pela eficiência, como se perder velocidade encurtasse o treino. $1{,}5 \cdot 10^5$ s tem a conta certa com uma potência de 10 a menos.

### Pergunta

Três modelos foram treinados com os mesmos $10^8$ tokens:

| parâmetros | perda de treino | perda de validação |
|---|---|---|
| $10^7$ | 2,30 | 2,34 |
| $10^8$ | 1,95 | 2,21 |
| $10^9$ | 1,20 | 2,45 |

O orçamento permite mais um treino. Qual decisão os números sustentam?

- [ ] Treinar um modelo de $10^{10}$ parâmetros com os mesmos dados, porque a perda de treino continua caindo.
- [ ] Repetir o modelo de $10^9$ parâmetros por mais épocas sobre os mesmos tokens.
- [ ] Voltar ao modelo de $10^7$ parâmetros, que tem a menor diferença entre treino e validação.
- [x] Aumentar os dados antes de aumentar o modelo: o de $10^9$ tem 0,1 token por parâmetro e já piorou na validação.

> A validação melhorou de $10^7$ para $10^8$ e piorou em $10^9$, enquanto o treino despencou: com 0,1 token por parâmetro, o modelo decora. As duas leis de escala valem juntas, e o que falta é $D$. Um modelo ainda maior com os mesmos dados decora mais. Mais épocas sobre os mesmos tokens repetem o que já foi decorado. O modelo de $10^7$ tem a menor diferença, mas a validação dele (2,34) é pior que a do de $10^8$ (2,21).
