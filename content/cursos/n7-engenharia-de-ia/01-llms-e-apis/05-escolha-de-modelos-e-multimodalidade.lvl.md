---
slug: n7-m1-05-escolha-de-modelos-e-multimodalidade
titulo: Escolha de modelos, multimodalidade e modelos abertos
descricao: Famílias de modelos, abertos vs fechados, rodar localmente (quantização), entrada de imagens e áudio, e um método para escolher por avaliação própria em vez de ranking.
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 80
tempo_min: 30
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Comparar modelos abertos e fechados em custo, privacidade, controle e qualidade
- Explicar quantização e os requisitos para rodar um modelo localmente
- Montar um procedimento de escolha baseado em um conjunto de avaliação próprio
---

## Passo 1 · Leitura · API comercial ou modelo próprio?

Há dois jeitos de colocar um LLM no seu sistema: **chamar a API** de um provedor, que roda um modelo fechado nos servidores dele, ou **hospedar um modelo de pesos abertos** (*open-weight*) na sua infraestrutura. Não há vencedor universal; cada critério puxa para um lado.

| Critério | API de modelo fechado | Modelo de pesos abertos hospedado por você |
|---|---|---|
| Custo | Nenhum custo fixo; paga por token. Barato com pouco volume. | GPU paga por hora, usada ou não. Compensa com volume alto e constante. |
| Privacidade | O texto sai da sua rede; depende de contrato, retenção de dados e base legal na LGPD. | O texto não sai da sua rede. |
| Controle | O provedor pode atualizar ou descontinuar o modelo; a resposta muda sem você mexer em nada. | Você congela a versão dos pesos pelo tempo que quiser. |
| Operação | Nada para manter. | Servidor de inferência, monitoramento, atualizações: é com você. |
| Qualidade | Os maiores modelos costumam estar aqui. | Varia muito; em tarefas estreitas e bem definidas, um modelo menor pode bastar. Só a sua avaliação diz. |

Dois cuidados de vocabulário. **Pesos abertos não é o mesmo que código aberto**: muitos modelos publicam os pesos, mas não os dados nem o código de treino, e a licença pode restringir o uso (comercial, número de usuários, finalidade). Leia a licença antes de construir em cima. E "auto-hospedado" resolve a privacidade só se o servidor for mesmo seu: um modelo aberto rodando na nuvem de terceiros volta a depender de contrato.

Um caso típico: a secretaria acadêmica quer resumir requerimentos que contêm CPF, notas e laudos médicos. A restrição de privacidade aqui é **eliminatória**, não uma preferência: nenhuma economia compensa mandar laudo para fora sem base legal. Isso já descarta opções antes de comparar qualquer número, e o passo 5 transforma essa ideia em código.

## Passo 2 · Leitura · Quanta memória um modelo precisa

Para rodar um modelo, os pesos precisam caber na memória da GPU. Cada parâmetro ocupa $\text{bits}/8$ bytes: 2 bytes em 16 bits (FP16/BF16), 1 byte em INT8, meio byte em INT4. Com $N$ bilhões de parâmetros e 1 GB $= 10^9$ bytes:

$$
M_{\text{pesos}} = \frac{N \cdot \text{bits}}{8}\ \text{GB}
$$

Um modelo de 8 bilhões ocupa 16 GB em 16 bits e 4 GB em 4 bits. **Quantizar** é guardar os pesos com menos bits depois do treino. Corta a memória e costuma acelerar a geração (que, como você viu na lição 01, é limitada pela leitura da memória), em troca de alguma perda de qualidade, que varia com o modelo, o método e a tarefa: meça na sua avaliação.

Os pesos não são tudo. Durante a geração, o modelo guarda chaves e valores da atenção de cada token já processado, o **KV cache** do Nível 6. Para um Transformer com $L$ camadas, dimensão $d$ e atenção multi-cabeça comum, cada token guarda um vetor $K$ e um $V$ de tamanho $d$ em cada camada:

$$
M_{\text{KV}} = \frac{2 \cdot L \cdot d \cdot T \cdot \text{bits}_{\text{KV}}}{8 \cdot 10^9}\ \text{GB}
$$

onde $T$ é o número de tokens no contexto, somando todas as requisições atendidas ao mesmo tempo. Com $L = 32$, $d = 4096$ e 16 bits, 8 192 tokens ocupam cerca de 4,3 GB, mais que os pesos quantizados em 4 bits. Contextos longos e muitos usuários simultâneos fazem o KV cache dominar. (Variantes como *grouped-query attention* guardam menos cabeças de $K$ e $V$ e reduzem esse número; a fórmula acima é o caso sem essa otimização.)

Some ainda uma margem para ativações e buffers do servidor. Nesta lição, 10 %, uma aproximação:

$$
M_{\text{total}} = \left(M_{\text{pesos}} + M_{\text{KV}}\right) \cdot (1 + \text{margem})
$$

```python
# 8 bilhões de parâmetros em 4 bits, 32 camadas, d = 4096, contexto de 2048 tokens
# pesos: 4.0 GB   KV: 1.07 GB   total com 10 %: 5.58 GB  -> cabe numa GPU de 8 GB
# o mesmo modelo com contexto de 8192 tokens: 9.12 GB    -> não cabe
```

## Passo 3 · Exercício · Cabe na GPU?

Escreva três funções, todas em GB com 1 GB $= 10^9$ bytes.

- `memoria_pesos_gb(params_bi, bits)`: memória dos pesos de um modelo com `params_bi` bilhões de parâmetros guardados com `bits` bits cada.
- `memoria_kv_gb(camadas, d_modelo, tokens, bits_kv=16)`: memória do KV cache pela fórmula do passo anterior.
- `roda_local(modelo, bits, tokens, memoria_gb, margem=0.1)`: `modelo` é um dicionário com `"params_bi"`, `"camadas"` e `"d_modelo"`. Os pesos usam `bits`; o KV cache usa o padrão de 16 bits. Devolve `True` se pesos + KV, com a margem, cabem em `memoria_gb` (igual cabe).

Exemplo: `memoria_pesos_gb(8, 4)` é `4.0` e `memoria_kv_gb(32, 4096, 8192)` é `4.294967296`.

### Instruções
1. `memoria_pesos_gb` converte bits em bytes e bilhões de parâmetros em GB.
2. `memoria_kv_gb` conta K e V, em todas as camadas, para todos os tokens.
3. `roda_local` soma pesos e KV cache, aplica a margem sobre o total e compara com a memória disponível.

### Código inicial
```python
def memoria_pesos_gb(params_bi, bits):
    pass


def memoria_kv_gb(camadas, d_modelo, tokens, bits_kv=16):
    pass


def roda_local(modelo, bits, tokens, memoria_gb, margem=0.1):
    pass
```

### Solução
```python
def memoria_pesos_gb(params_bi, bits):
    return params_bi * bits / 8


def memoria_kv_gb(camadas, d_modelo, tokens, bits_kv=16):
    return 2 * camadas * d_modelo * tokens * bits_kv / 8 / 1e9


def roda_local(modelo, bits, tokens, memoria_gb, margem=0.1):
    pesos = memoria_pesos_gb(modelo["params_bi"], bits)
    kv = memoria_kv_gb(modelo["camadas"], modelo["d_modelo"], tokens)
    return (pesos + kv) * (1 + margem) <= memoria_gb
```

### Dicas
1. Bilhões de parâmetros vezes bytes por parâmetro já dá GB, porque 1 GB são $10^9$ bytes.
2. O 2 da fórmula do KV cache vem de guardar K **e** V.
3. A margem cobre o total, não só os pesos.

### Verificação
```json
[
  { "id": "pesos-16", "checkpoint": 1, "kind": "call", "function": "memoria_pesos_gb", "args": [8, 16], "expected": 16.0, "tolerance": 1e-9,
    "name": "8 bilhões em 16 bits ocupam 16 GB", "hint": "16 bits são 2 bytes." },
  { "id": "pesos-4", "checkpoint": 1, "kind": "call", "function": "memoria_pesos_gb", "args": [7, 4], "expected": 3.5, "tolerance": 1e-9,
    "name": "7 bilhões em 4 bits ocupam 3,5 GB" },
  { "id": "pesos-70", "checkpoint": 1, "kind": "call", "function": "memoria_pesos_gb", "args": [70, 8], "expected": 70.0, "tolerance": 1e-9,
    "name": "70 bilhões em 8 bits ocupam 70 GB" },
  { "id": "kv-8192", "checkpoint": 2, "kind": "call", "function": "memoria_kv_gb", "args": [32, 4096, 8192], "expected": 4.294967296, "tolerance": 1e-6,
    "name": "KV cache de 8192 tokens, 32 camadas, d = 4096", "hint": "Conte K e V, e use 1 GB = 10^9 bytes." },
  { "id": "kv-8bits", "checkpoint": 2, "kind": "call", "function": "memoria_kv_gb", "args": [32, 4096, 2048], "kwargs": { "bits_kv": 8 },
    "expected": 0.536870912, "tolerance": 1e-6, "name": "KV cache em 8 bits" },
  { "id": "kv-grande", "checkpoint": 2, "kind": "call", "function": "memoria_kv_gb", "args": [80, 8192, 4096], "expected": 10.73741824, "tolerance": 1e-6,
    "name": "KV cache de um modelo maior" },
  { "id": "cabe-curto", "checkpoint": 3, "kind": "call", "function": "roda_local",
    "args": [{ "params_bi": 8, "camadas": 32, "d_modelo": 4096 }, 4, 2048, 8.0], "expected": true,
    "name": "8B em 4 bits com contexto de 2048 cabe em 8 GB" },
  { "id": "nao-cabe-longo", "checkpoint": 3, "kind": "call", "function": "roda_local",
    "args": [{ "params_bi": 8, "camadas": 32, "d_modelo": 4096 }, 4, 8192, 8.0], "expected": false,
    "name": "O mesmo modelo com contexto de 8192 não cabe em 8 GB", "hint": "O KV cache também ocupa a GPU." },
  { "id": "margem-total", "checkpoint": 3, "kind": "call", "function": "roda_local",
    "args": [{ "params_bi": 8, "camadas": 32, "d_modelo": 4096 }, 8, 8192, 13.5], "expected": false,
    "name": "A margem incide sobre pesos e KV juntos", "hint": "Multiplique a soma pela margem." },
  { "id": "margem-total-cabe", "checkpoint": 3, "kind": "call", "function": "roda_local",
    "args": [{ "params_bi": 8, "camadas": 32, "d_modelo": 4096 }, 8, 8192, 13.6], "expected": true,
    "name": "Com um pouco mais de memória, cabe" },
  { "id": "sem-margem", "checkpoint": 3, "kind": "call", "function": "roda_local",
    "args": [{ "params_bi": 8, "camadas": 32, "d_modelo": 4096 }, 4, 8192, 8.3], "kwargs": { "margem": 0.0 }, "expected": true,
    "name": "Respeita a margem recebida" },
  { "id": "16-bits", "checkpoint": 3, "kind": "call", "function": "roda_local",
    "args": [{ "params_bi": 8, "camadas": 32, "d_modelo": 4096 }, 16, 2048, 24.0], "expected": true,
    "name": "8B em 16 bits com contexto curto cabe em 24 GB" }
]
```

### Soluções erradas
```python name="usa bits como se fossem bytes"
def memoria_pesos_gb(params_bi, bits):
    return params_bi * bits


def memoria_kv_gb(camadas, d_modelo, tokens, bits_kv=16):
    return 2 * camadas * d_modelo * tokens * bits_kv / 8 / 1e9


def roda_local(modelo, bits, tokens, memoria_gb, margem=0.1):
    pesos = memoria_pesos_gb(modelo["params_bi"], bits)
    kv = memoria_kv_gb(modelo["camadas"], modelo["d_modelo"], tokens)
    return (pesos + kv) * (1 + margem) <= memoria_gb
```
```python name="KV cache sem o fator 2"
def memoria_pesos_gb(params_bi, bits):
    return params_bi * bits / 8


def memoria_kv_gb(camadas, d_modelo, tokens, bits_kv=16):
    return camadas * d_modelo * tokens * bits_kv / 8 / 1e9


def roda_local(modelo, bits, tokens, memoria_gb, margem=0.1):
    pesos = memoria_pesos_gb(modelo["params_bi"], bits)
    kv = memoria_kv_gb(modelo["camadas"], modelo["d_modelo"], tokens)
    return (pesos + kv) * (1 + margem) <= memoria_gb
```
```python name="GB de 1024 ao cubo"
def memoria_pesos_gb(params_bi, bits):
    return params_bi * bits / 8


def memoria_kv_gb(camadas, d_modelo, tokens, bits_kv=16):
    return 2 * camadas * d_modelo * tokens * bits_kv / 8 / 1024 ** 3


def roda_local(modelo, bits, tokens, memoria_gb, margem=0.1):
    pesos = memoria_pesos_gb(modelo["params_bi"], bits)
    kv = memoria_kv_gb(modelo["camadas"], modelo["d_modelo"], tokens)
    return (pesos + kv) * (1 + margem) <= memoria_gb
```
```python name="esquece o KV cache"
def memoria_pesos_gb(params_bi, bits):
    return params_bi * bits / 8


def memoria_kv_gb(camadas, d_modelo, tokens, bits_kv=16):
    return 2 * camadas * d_modelo * tokens * bits_kv / 8 / 1e9


def roda_local(modelo, bits, tokens, memoria_gb, margem=0.1):
    pesos = memoria_pesos_gb(modelo["params_bi"], bits)
    return pesos * (1 + margem) <= memoria_gb
```
```python name="margem só sobre os pesos"
def memoria_pesos_gb(params_bi, bits):
    return params_bi * bits / 8


def memoria_kv_gb(camadas, d_modelo, tokens, bits_kv=16):
    return 2 * camadas * d_modelo * tokens * bits_kv / 8 / 1e9


def roda_local(modelo, bits, tokens, memoria_gb, margem=0.1):
    pesos = memoria_pesos_gb(modelo["params_bi"], bits)
    kv = memoria_kv_gb(modelo["camadas"], modelo["d_modelo"], tokens)
    return pesos * (1 + margem) + kv <= memoria_gb
```
```python name="KV cache com os bits dos pesos"
def memoria_pesos_gb(params_bi, bits):
    return params_bi * bits / 8


def memoria_kv_gb(camadas, d_modelo, tokens, bits_kv=16):
    return 2 * camadas * d_modelo * tokens * bits_kv / 8 / 1e9


def roda_local(modelo, bits, tokens, memoria_gb, margem=0.1):
    pesos = memoria_pesos_gb(modelo["params_bi"], bits)
    kv = memoria_kv_gb(modelo["camadas"], modelo["d_modelo"], tokens, bits)
    return (pesos + kv) * (1 + margem) <= memoria_gb
```

## Passo 4 · Leitura · Imagens também são tokens, e o ranking não é o seu problema

#### Multimodalidade

Modelos multimodais aceitam imagem e áudio junto com o texto. A imagem passa por um codificador visual que a divide em pedaços (*patches*) e transforma cada um num vetor que entra na mesma sequência dos tokens de texto. Consequência prática: **uma imagem consome janela de contexto, tempo de prefill e dinheiro**, e quanto maior a resolução, mais tokens. Antes de mandar a página escaneada de um requerimento, pergunte se o PDF tem texto selecionável: extrair o texto e mandar só ele costuma ser muito mais barato e mais preciso. Áudio segue a mesma lógica: ou vira tokens de áudio, ou passa antes por transcrição.

#### Escolher com a sua avaliação

Rankings públicos (*leaderboards*) medem tarefas genéricas, muitas vezes em inglês, e alguns itens deles podem ter vazado para os dados de treino dos modelos, o que infla a nota. Eles servem para montar uma lista curta, não para decidir. A decisão vem de um **conjunto de avaliação próprio**: algumas dezenas de casos reais da sua tarefa (requerimentos de verdade, anonimizados, com a resposta certa conferida por quem entende do assunto), incluindo os casos difíceis. Cada candidato roda o conjunto inteiro e você mede a taxa de acerto.

Com as medidas na mão, a escolha tem duas etapas:

1. **Requisitos eliminatórios.** Quem não atinge o mínimo sai, sem compensação: privacidade abaixo do exigido, qualidade abaixo do aceitável.
2. **Nota ponderada** entre os que sobraram, com pesos que refletem a prioridade do projeto:

$$
\text{nota} = \frac{\sum_c p_c \cdot m_c}{\sum_c p_c}
$$

Dividir pela soma dos pesos deixa a nota na escala das métricas (de 0 a 1), seja qual for a escala dos pesos. Se um requisito virar só um peso, um modelo muito bom em tudo pode "comprar" a violação de uma regra que não admite exceção.

## Passo 5 · Exercício · Ranquear candidatos com a sua avaliação

Escreva `ranquear(candidatos, pesos, minimos)`. Cada candidato é um dicionário:

```python
{"nome": "local-8b", "acertos": [True, True, False, ...], "privacidade": 1.0, "velocidade": 0.8}
```

`acertos` é o resultado do candidato em cada caso do seu conjunto de avaliação; `privacidade` e `velocidade` já vêm em notas de 0 a 1 (maior é melhor).

1. Calcule as métricas: `"qualidade"` é a fração de acertos; `"privacidade"` e `"velocidade"` vêm do dicionário.
2. Elimine quem tem alguma métrica **abaixo** do mínimo em `minimos` (`{"privacidade": 0.5}`); igual ao mínimo fica.
3. Para os que ficam, a nota é a média ponderada de `pesos` (os pesos podem não somar 1), arredondada com `round(nota, 4)`.
4. Devolva a lista de tuplas `(nome, nota)` da maior para a menor nota; empate, pelo nome em ordem alfabética.

### Instruções
1. Calcule a qualidade como fração de acertos no conjunto de avaliação.
2. Elimine os candidatos abaixo de qualquer mínimo, mantendo quem fica exatamente no mínimo.
3. Calcule a nota como média ponderada, dividindo pela soma dos pesos, com 4 casas.
4. Ordene da maior nota para a menor, desempatando pelo nome.

### Código inicial
```python
def ranquear(candidatos, pesos, minimos):
    pass
```

### Solução
```python
def metricas_de(candidato):
    acertos = candidato["acertos"]
    return {
        "qualidade": sum(acertos) / len(acertos),
        "privacidade": candidato["privacidade"],
        "velocidade": candidato["velocidade"],
    }


def ranquear(candidatos, pesos, minimos):
    total_pesos = sum(pesos.values())
    resultado = []
    for candidato in candidatos:
        metricas = metricas_de(candidato)
        if any(metricas[criterio] < minimo for criterio, minimo in minimos.items()):
            continue
        nota = sum(peso * metricas[criterio] for criterio, peso in pesos.items()) / total_pesos
        resultado.append((candidato["nome"], round(nota, 4)))
    resultado.sort(key=lambda par: (-par[1], par[0]))
    return resultado
```

### Dicas
1. `sum` numa lista de booleanos conta os `True`.
2. `any(...)` com um gerador responde "algum critério ficou abaixo do mínimo?".
3. A chave de ordenação `(-nota, nome)` resolve as duas ordens de uma vez.

### Verificação
```json
[
  { "id": "ponderada", "checkpoint": 3, "kind": "call", "function": "ranquear",
    "args": [[{ "nome": "api-grande", "acertos": [true, true, true, true, true, true, true, true, true, false], "privacidade": 0.3, "velocidade": 0.6 },
      { "nome": "local-8b", "acertos": [true, true, true, true, true, true, true, false, false, false], "privacidade": 1.0, "velocidade": 0.8 },
      { "nome": "api-mini", "acertos": [true, true, true, true, true, true, false, false, false, false], "privacidade": 0.3, "velocidade": 1.0 }],
      { "qualidade": 2, "privacidade": 1, "velocidade": 1 }, {}],
    "expected": [["local-8b", 0.8], ["api-grande", 0.675], ["api-mini", 0.625]],
    "name": "Nota ponderada com pesos que não somam 1", "hint": "Divida pela soma dos pesos." },
  { "id": "qualidade-fracao", "checkpoint": 1, "kind": "call", "function": "ranquear",
    "args": [[{ "nome": "api-grande", "acertos": [true, true, true, true, true, true, true, true, true, false], "privacidade": 0.3, "velocidade": 0.6 },
      { "nome": "local-8b", "acertos": [true, true, true, true, true, true, true, false, false, false], "privacidade": 1.0, "velocidade": 0.8 }],
      { "qualidade": 1 }, {}],
    "expected": [["api-grande", 0.9], ["local-8b", 0.7]],
    "name": "Qualidade é a fração de acertos", "hint": "Divida os acertos pelo tamanho do conjunto." },
  { "id": "elimina", "checkpoint": 2, "kind": "call", "function": "ranquear",
    "args": [[{ "nome": "api-grande", "acertos": [true, true, true, true, true, true, true, true, true, false], "privacidade": 0.3, "velocidade": 0.6 },
      { "nome": "local-8b", "acertos": [true, true, true, true, true, true, true, false, false, false], "privacidade": 1.0, "velocidade": 0.8 },
      { "nome": "api-mini", "acertos": [true, true, true, true, true, true, false, false, false, false], "privacidade": 0.3, "velocidade": 1.0 }],
      { "qualidade": 2, "privacidade": 1, "velocidade": 1 }, { "privacidade": 0.5 }],
    "expected": [["local-8b", 0.8]], "name": "Privacidade mínima elimina, não só pesa" },
  { "id": "minimo-igual", "checkpoint": 2, "kind": "call", "function": "ranquear",
    "args": [[{ "nome": "api-grande", "acertos": [true, true, true, true, true, true, true, true, true, false], "privacidade": 0.3, "velocidade": 0.6 },
      { "nome": "local-8b", "acertos": [true, true, true, true, true, true, true, false, false, false], "privacidade": 1.0, "velocidade": 0.8 },
      { "nome": "api-mini", "acertos": [true, true, true, true, true, true, false, false, false, false], "privacidade": 0.3, "velocidade": 1.0 }],
      { "qualidade": 0.5, "privacidade": 0.25, "velocidade": 0.25 }, { "qualidade": 0.7 }],
    "expected": [["local-8b", 0.8], ["api-grande", 0.675]], "name": "Quem fica exatamente no mínimo continua",
    "hint": "Elimine só quem fica abaixo do mínimo." },
  { "id": "empate", "checkpoint": 4, "kind": "call", "function": "ranquear",
    "args": [[{ "nome": "modelo-b", "acertos": [true, false], "privacidade": 1.0, "velocidade": 0.5 },
      { "nome": "modelo-a", "acertos": [false, true], "privacidade": 1.0, "velocidade": 0.5 }],
      { "qualidade": 1, "velocidade": 1 }, {}],
    "expected": [["modelo-a", 0.5], ["modelo-b", 0.5]], "name": "Empate na nota: ordem alfabética" },
  { "id": "ninguem", "checkpoint": 2, "kind": "call", "function": "ranquear",
    "args": [[{ "nome": "api-mini", "acertos": [true, false, false, false], "privacidade": 0.3, "velocidade": 1.0 }],
      { "qualidade": 1 }, { "qualidade": 0.5 }],
    "expected": [], "name": "Se ninguém atende aos mínimos, a lista fica vazia" }
]
```

### Soluções erradas
```python name="sem requisitos eliminatórios"
def metricas_de(candidato):
    acertos = candidato["acertos"]
    return {
        "qualidade": sum(acertos) / len(acertos),
        "privacidade": candidato["privacidade"],
        "velocidade": candidato["velocidade"],
    }


def ranquear(candidatos, pesos, minimos):
    total_pesos = sum(pesos.values())
    resultado = []
    for candidato in candidatos:
        metricas = metricas_de(candidato)
        nota = sum(peso * metricas[criterio] for criterio, peso in pesos.items()) / total_pesos
        resultado.append((candidato["nome"], round(nota, 4)))
    resultado.sort(key=lambda par: (-par[1], par[0]))
    return resultado
```
```python name="não divide pela soma dos pesos"
def metricas_de(candidato):
    acertos = candidato["acertos"]
    return {
        "qualidade": sum(acertos) / len(acertos),
        "privacidade": candidato["privacidade"],
        "velocidade": candidato["velocidade"],
    }


def ranquear(candidatos, pesos, minimos):
    resultado = []
    for candidato in candidatos:
        metricas = metricas_de(candidato)
        if any(metricas[criterio] < minimo for criterio, minimo in minimos.items()):
            continue
        nota = sum(peso * metricas[criterio] for criterio, peso in pesos.items())
        resultado.append((candidato["nome"], round(nota, 4)))
    resultado.sort(key=lambda par: (-par[1], par[0]))
    return resultado
```
```python name="qualidade como número de acertos"
def metricas_de(candidato):
    return {
        "qualidade": sum(candidato["acertos"]),
        "privacidade": candidato["privacidade"],
        "velocidade": candidato["velocidade"],
    }


def ranquear(candidatos, pesos, minimos):
    total_pesos = sum(pesos.values())
    resultado = []
    for candidato in candidatos:
        metricas = metricas_de(candidato)
        if any(metricas[criterio] < minimo for criterio, minimo in minimos.items()):
            continue
        nota = sum(peso * metricas[criterio] for criterio, peso in pesos.items()) / total_pesos
        resultado.append((candidato["nome"], round(nota, 4)))
    resultado.sort(key=lambda par: (-par[1], par[0]))
    return resultado
```
```python name="elimina também quem fica no mínimo"
def metricas_de(candidato):
    acertos = candidato["acertos"]
    return {
        "qualidade": sum(acertos) / len(acertos),
        "privacidade": candidato["privacidade"],
        "velocidade": candidato["velocidade"],
    }


def ranquear(candidatos, pesos, minimos):
    total_pesos = sum(pesos.values())
    resultado = []
    for candidato in candidatos:
        metricas = metricas_de(candidato)
        if any(metricas[criterio] <= minimo for criterio, minimo in minimos.items()):
            continue
        nota = sum(peso * metricas[criterio] for criterio, peso in pesos.items()) / total_pesos
        resultado.append((candidato["nome"], round(nota, 4)))
    resultado.sort(key=lambda par: (-par[1], par[0]))
    return resultado
```
```python name="ordena só pela nota"
def metricas_de(candidato):
    acertos = candidato["acertos"]
    return {
        "qualidade": sum(acertos) / len(acertos),
        "privacidade": candidato["privacidade"],
        "velocidade": candidato["velocidade"],
    }


def ranquear(candidatos, pesos, minimos):
    total_pesos = sum(pesos.values())
    resultado = []
    for candidato in candidatos:
        metricas = metricas_de(candidato)
        if any(metricas[criterio] < minimo for criterio, minimo in minimos.items()):
            continue
        nota = sum(peso * metricas[criterio] for criterio, peso in pesos.items()) / total_pesos
        resultado.append((candidato["nome"], round(nota, 4)))
    resultado.sort(key=lambda par: par[1], reverse=True)
    return resultado
```
```python name="ordem crescente de nota"
def metricas_de(candidato):
    acertos = candidato["acertos"]
    return {
        "qualidade": sum(acertos) / len(acertos),
        "privacidade": candidato["privacidade"],
        "velocidade": candidato["velocidade"],
    }


def ranquear(candidatos, pesos, minimos):
    total_pesos = sum(pesos.values())
    resultado = []
    for candidato in candidatos:
        metricas = metricas_de(candidato)
        if any(metricas[criterio] < minimo for criterio, minimo in minimos.items()):
            continue
        nota = sum(peso * metricas[criterio] for criterio, peso in pesos.items()) / total_pesos
        resultado.append((candidato["nome"], round(nota, 4)))
    resultado.sort(key=lambda par: (par[1], par[0]))
    return resultado
```

## Passo 6 · Quiz · Escolha de modelos, quantização e multimodalidade

### Pergunta
Um modelo de 8 bilhões de parâmetros em 16 bits não cabe na GPU de 12 GB do laboratório. Qual opção resolve, e a que custo?
- [ ] Reduzir `max_tokens` para 50: os pesos encolhem junto com a resposta.
- [x] Quantizar os pesos para 4 bits (cerca de 4 GB de pesos), aceitando uma possível perda de qualidade que precisa ser medida na sua avaliação.
- [ ] Quantizar para 4 bits, o que mantém a qualidade idêntica em qualquer tarefa.
- [ ] Usar `temperature = 0`, que dispensa o KV cache.
> Quantização corta a memória dos pesos de 16 GB para 4 GB, mas não é de graça: a perda de qualidade varia com o modelo e a tarefa. `max_tokens` e temperatura não mudam o tamanho dos pesos.

### Pergunta
O modelo do laboratório cabe com folga atendendo uma pessoa com contexto curto, mas dá falta de memória quando 20 alunos usam ao mesmo tempo com documentos longos. Por quê?
- [ ] Os pesos são copiados uma vez por usuário.
- [x] O KV cache cresce com o total de tokens em contexto, somando todas as requisições simultâneas.
- [ ] A quantização deixa de valer com mais de um usuário.
- [ ] Documentos longos aumentam o número de parâmetros do modelo.
> Os pesos são compartilhados; o KV cache não. Ele cresce linearmente com os tokens de cada conversa ativa, e com contextos longos passa facilmente do tamanho dos pesos quantizados.

### Pergunta
A secretaria precisa extrair dados de 5 000 requerimentos em PDF gerados pelo sistema, com texto selecionável. Qual abordagem tende a ser mais barata e mais precisa?
- [ ] Converter cada página em imagem de alta resolução e mandar a um modelo multimodal.
- [x] Extrair o texto do PDF com uma biblioteca e mandar só o texto ao modelo.
- [ ] Mandar imagem e texto juntos, para garantir.
- [ ] Imagens não contam tokens, então tanto faz.
> Imagens viram muitos tokens e passam por mais uma etapa sujeita a erro (ler a imagem). Com texto disponível, mandar o texto custa menos e evita erros de leitura; o multimodal fica para documentos escaneados, fotos e tabelas desenhadas.

### Pergunta
Um modelo lidera o ranking público geral, mas no conjunto de 40 requerimentos reais da secretaria acerta 70 %, contra 85 % de um modelo menor. O que fazer?
- [ ] Ficar com o líder do ranking: ele foi avaliado em muito mais perguntas.
- [x] Dar mais peso ao resultado no seu conjunto, que mede a sua tarefa, e investigar onde o líder errou antes de decidir.
- [ ] Descartar os dois e escolher o de maior número de parâmetros.
- [ ] Repetir a avaliação até o líder do ranking ganhar.
> O ranking mede tarefas genéricas e pode estar inflado por contaminação dos dados de treino. Uma avaliação pequena mas representativa da sua tarefa responde à pergunta que importa; olhar os erros mostra se a diferença é real ou um acaso de poucos casos.
