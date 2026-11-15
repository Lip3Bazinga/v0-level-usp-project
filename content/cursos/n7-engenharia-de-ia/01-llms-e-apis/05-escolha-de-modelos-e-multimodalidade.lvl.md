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

## Passo 1 · Leitura · Pesos abertos, quantização e multimodalidade

Ao projetar um sistema com IA, uma das decisões mais importantes é escolher entre **consumir um modelo fechado via API** ou **hospedar um modelo de pesos abertos (*open-weight*) em infraestrutura própria**. Não existe um vencedor universal; a escolha depende das restrições do seu projeto:

| Critério | Modelos fechados (API comercial) | Modelos de pesos abertos (auto-hospedados) |
|---|---|---|
| **Custo inicial vs escala** | Zero custo fixo; paga-se por token consumido (`US\$` por milhão). | Exige GPU dedicada (custo por hora), mas o custo marginal por token em alto volume é baixo. |
| **Privacidade e LGPD** | Dados trafegam para terceiros (exige contrato de não retenção e anonimização). | Os dados não saem da rede da instituição (ideal para prontuários ou documentos sigilosos). |
| **Controle e estabilidade** | O provedor pode atualizar ou descontinuar o modelo com aviso prévio. | Você congela exatamente os pesos e a versão do servidor pelo tempo que quiser. |
| **Qualidade de ponta** | Modelos gigantes de fronteira costumam liderar em raciocínio complexo. | Modelos de 7B a 70B parâmetros empatam ou superam modelos maiores em tarefas específicas e bem definidas. |

Para rodar um modelo localmente em uma GPU, precisamos calcular quanta memória de vídeo (**VRAM**) ele exige. Cada parâmetro armazenado em ponto flutuante de 16 bits (FP16/BF16) ocupa $2$ bytes ($16 / 8$). A técnica de **quantização** reduz a precisão dos pesos após o treino — por exemplo, para inteiros de 8 bits (INT8, $1$ byte por parâmetro) ou 4 bits (INT4, $0{,}5$ byte por parâmetro) —, cortando o uso de memória em até $4\times$ com perda mínima de qualidade.

Além dos pesos da rede, a GPU precisa reservar espaço para o **cache de contexto (*KV cache*)** e ativações intermediárias. Uma regra de engenharia segura adiciona $20\%$ de margem sobre o tamanho dos pesos:

$$\text{Memória (GB)} = \frac{N_{\text{parâmetros (bilhões)}} \cdot \text{bits}}{8} \times 1{,}2$$

Assim, um modelo de $8$ bilhões de parâmetros em 16 bits exige $\frac{8 \times 16}{8} \times 1{,}2 = 19{,}2\text{ GB}$, enquanto quantizado em 4 bits exige apenas $\frac{8 \times 4}{8} \times 1{,}2 = 4{,}8\text{ GB}$ — cabendo com folga em uma GPU doméstica ou estação de trabalho universitária.

Outro eixo de decisão é a **multimodalidade**. Modelos multimodais recebem imagens (divididas em *patches* visuais que são projetados no mesmo espaço dos embeddings de texto) e áudio. Um documento escaneado em alta resolução pode equivaler a mais de $1\,000$ tokens de entrada. Por isso, se o documento já for um PDF digital com texto selecionável, extrair o texto antes é muito mais barato e rápido do que enviar páginas inteiras como imagem.

Por fim, como escolher entre tantas opções? **Nunca escolha um modelo apenas por um ranking público (*leaderboard*) geral.** Rankings públicos sofrem de contaminação de dados de treino e medem perguntas genéricas em inglês, não o seu domínio. O método profissional é simples: construa um **conjunto próprio de avaliação com pelo menos 30 exemplos reais** da sua tarefa (por exemplo, 30 dúvidas reais de alunos da USP), defina os pesos dos seus critérios (qualidade na tarefa, privacidade, velocidade, custo) e meça cada candidato empiricamente.

## Passo 2 · Exercício · Memória local e matriz de decisão ponderada

Vamos implementar três funções que apoiam o dimensionamento de hardware e a escolha objetiva de modelos:

1. `memoria_necessaria(n_params_bi, bits)`: aplica a fórmula $\frac{N \cdot \text{bits}}{8} \times 1{,}2$ e devolve o total em GB (`float`).
2. `roda_local(n_params_bi, bits, memoria_gb)`: retorna `True` se `memoria_necessaria(n_params_bi, bits) <= memoria_gb` e `False` caso contrário.
3. `pontuar_opcoes(opcoes, pesos)`: recebe uma lista `opcoes` onde cada item é `{"nome": str, "metricas": dict[str, float]}` e um dicionário `pesos` (`dict[str, float]`). Para cada opção, calcula a soma ponderada $\sum_{c} \text{metricas}[c] \cdot \text{pesos}[c]$ (arredondada com `round(nota, 6)`) e retorna uma lista de tuplas `(nome, nota)` ordenada da **maior para a menor nota** (em caso de empate na nota, ordene pelo `nome` em ordem alfabética).

### Instruções

1. Implemente `memoria_necessaria(n_params_bi, bits)` retornando `(n_params_bi * bits / 8.0) * 1.2`.
2. Implemente `roda_local(n_params_bi, bits, memoria_gb)` comparando a memória necessária com `memoria_gb`.
3. Implemente `pontuar_opcoes(opcoes, pesos)` calculando a nota ponderada de cada modelo e ordenando por `(-nota, nome)`.

### Código inicial

```python path=main.py
def memoria_necessaria(n_params_bi, bits):
    # Calcule os GB necessários incluindo os 20% de margem para KV cache
    pass


def roda_local(n_params_bi, bits, memoria_gb):
    # Verifique se o modelo cabe na memória disponível
    pass


def pontuar_opcoes(opcoes, pesos):
    # Calcule a nota ponderada de cada opção e ordene da maior para a menor
    pass


if __name__ == "__main__":
    print("8B em 4 bits (GB):", memoria_necessaria(8, 4))
    print("Cabe em 8 GB?", roda_local(8, 4, 8.0))
    candidatos = [
        {"nome": "local-8b-q4", "metricas": {"qualidade": 0.82, "privacidade": 1.0, "velocidade": 0.9}},
        {"nome": "api-grande", "metricas": {"qualidade": 0.95, "privacidade": 0.4, "velocidade": 0.7}},
    ]
    pesos_sec = {"qualidade": 0.4, "privacidade": 0.4, "velocidade": 0.2}
    print(pontuar_opcoes(candidatos, pesos_sec))
```

### Solução

```python path=main.py
def memoria_necessaria(n_params_bi, bits):
    return float((n_params_bi * bits / 8.0) * 1.2)


def roda_local(n_params_bi, bits, memoria_gb):
    return memoria_necessaria(n_params_bi, bits) <= memoria_gb


def pontuar_opcoes(opcoes, pesos):
    resultado = []
    for opcao in opcoes:
        metricas = opcao["metricas"]
        nota = 0.0
        for criterio, peso in pesos.items():
            nota += metricas.get(criterio, 0.0) * peso
        resultado.append((opcao["nome"], round(float(nota), 6)))
    resultado.sort(key=lambda item: (-item[1], item[0]))
    return resultado


if __name__ == "__main__":
    print("8B em 4 bits (GB):", memoria_necessaria(8, 4))
    print("Cabe em 8 GB?", roda_local(8, 4, 8.0))
    candidatos = [
        {"nome": "local-8b-q4", "metricas": {"qualidade": 0.82, "privacidade": 1.0, "velocidade": 0.9}},
        {"nome": "api-grande", "metricas": {"qualidade": 0.95, "privacidade": 0.4, "velocidade": 0.7}},
    ]
    pesos_sec = {"qualidade": 0.4, "privacidade": 0.4, "velocidade": 0.2}
    print(pontuar_opcoes(candidatos, pesos_sec))
```

### Dicas

1. Não se esqueça do fator `1.2` em `memoria_necessaria` para cobrir o *KV cache* e ativações.
2. Para ordenar da maior nota para a menor e desempatar pelo nome em ordem crescente, use `key=lambda item: (-item[1], item[0])`.

### Verificação

```json
[
  {
    "id": "mem-8b-4bit",
    "name": "Calcula memória para 8B parâmetros em 4 bits com margem de 20%",
    "checkpoint": 1,
    "kind": "call",
    "function": "memoria_necessaria",
    "args": [8, 4],
    "expected": 4.8,
    "tolerance": 1e-6
  },
  {
    "id": "mem-70b-16bit",
    "name": "Calcula memória para 70B parâmetros em 16 bits",
    "checkpoint": 1,
    "kind": "call",
    "function": "memoria_necessaria",
    "args": [70, 16],
    "expected": 168.0,
    "tolerance": 1e-6
  },
  {
    "id": "roda-local-16gb",
    "name": "Verifica se modelo 7B cabe em GPU de 16 GB em 16 bits vs 4 bits",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[roda_local(7, 16, 16.0), roda_local(7, 4, 16.0)]",
    "expected": [false, true]
  },
  {
    "id": "pontua-ordena",
    "name": "Ordena opções pela nota ponderada decrescente",
    "checkpoint": 3,
    "kind": "call",
    "function": "pontuar_opcoes",
    "args": [
      [
        {"nome": "api-externa", "metricas": {"qualidade": 0.95, "privacidade": 0.2}},
        {"nome": "local-aberto", "metricas": {"qualidade": 0.85, "privacidade": 1.0}}
      ],
      {"qualidade": 0.5, "privacidade": 0.5}
    ],
    "expected": [
      ["local-aberto", 0.925],
      ["api-externa", 0.575]
    ]
  },
  {
    "id": "pontua-desempate",
    "name": "Desempata opções com mesma nota por ordem alfabética do nome",
    "checkpoint": 3,
    "kind": "call",
    "function": "pontuar_opcoes",
    "args": [
      [
        {"nome": "modelo-b", "metricas": {"qualidade": 0.8}},
        {"nome": "modelo-a", "metricas": {"qualidade": 0.8}}
      ],
      {"qualidade": 1.0}
    ],
    "expected": [
      ["modelo-a", 0.8],
      ["modelo-b", 0.8]
    ]
  }
]
```

### Soluções erradas

```python name="Esquece a margem de 20% do cache KV ao calcular a memória"
def memoria_necessaria(n_params_bi, bits):
    return float(n_params_bi * bits / 8.0)


def roda_local(n_params_bi, bits, memoria_gb):
    return memoria_necessaria(n_params_bi, bits) <= memoria_gb


def pontuar_opcoes(opcoes, pesos):
    resultado = []
    for opcao in opcoes:
        nota = sum(opcao["metricas"].get(c, 0.0) * p for c, p in pesos.items())
        resultado.append((opcao["nome"], round(float(nota), 6)))
    resultado.sort(key=lambda item: (-item[1], item[0]))
    return resultado
```

```python name="Ordena em ordem crescente de nota em vez de decrescente"
def memoria_necessaria(n_params_bi, bits):
    return float((n_params_bi * bits / 8.0) * 1.2)


def roda_local(n_params_bi, bits, memoria_gb):
    return memoria_necessaria(n_params_bi, bits) <= memoria_gb


def pontuar_opcoes(opcoes, pesos):
    resultado = []
    for opcao in opcoes:
        nota = sum(opcao["metricas"].get(c, 0.0) * p for c, p in pesos.items())
        resultado.append((opcao["nome"], round(float(nota), 6)))
    resultado.sort(key=lambda item: (item[1], item[0]))
    return resultado
```

## Passo 3 · Quiz · Escolha de modelos, quantização e multimodalidade

### Pergunta

Qual é o efeito principal de quantizar um modelo de 16 bits (FP16) para 4 bits (INT4) para inferência local?

- [ ] Quadruplica o número de camadas de atenção do modelo.
- [x] Reduz em cerca de $4\times$ a memória necessária para armazenar os pesos na GPU, com pequena perda de precisão.
- [ ] Transforma um modelo somente de texto em um modelo multimodal de áudio e vídeo.
- [ ] Elimina completamente a necessidade de memória para o *KV cache*.

> Ao representar cada peso com 4 bits ($0{,}5$ byte) em vez de 16 bits ($2$ bytes), os pesos ocupam um quarto da VRAM original, viabilizando a execução em GPUs menores.

### Pergunta

Um hospital universitário precisa analisar prontuários médicos com dados sensíveis que, por norma interna e conformidade com a LGPD, não podem sair da rede local da instituição. Qual abordagem arquitetural atende a essa restrição?

- [ ] Enviar os prontuários brutos para uma API pública gratuita na nuvem.
- [x] Executar um modelo de pesos abertos (*open-weight*) auto-hospedado em servidores internos da própria instituição.
- [ ] Aumentar a `temperature` da chamada para criptografar os tokens.
- [ ] Usar apenas `max_tokens = 10` na API externa.

> Auto-hospedar um modelo de pesos abertos dentro da infraestrutura local garante que nenhum texto de entrada ou saída trafegue para servidores de terceiros.

### Pergunta

Por que calcular a memória de GPU apenas multiplicando $N_{\text{parâmetros}} \times \text{bytes por parâmetro}$ costuma falhar ao colocar o modelo para atender chamadas reais?

- [ ] Porque os pesos dobram de tamanho a cada segundo de execução.
- [x] Porque além dos pesos estáticos, a GPU precisa alocar memória dinâmica para o *KV cache* da janela de contexto e para as ativações da chamada.
- [ ] Porque o interpretador Python exige exatamente 100 GB de VRAM para importar `json`.
- [ ] Porque modelos quantizados não usam memória RAM nem VRAM.

> O *KV cache* cresce proporcionalmente ao tamanho do contexto e ao número de requisições simultâneas. Sem reservar uma margem adicional (tipicamente $\ge 20\%$), o servidor sofre erro de falta de memória (*Out Of Memory*) assim que recebe prompts longos.

### Pergunta

Como modelos de linguagem multimodais processam uma imagem enviada junto com a pergunta do usuário?

- [ ] Eles ignoram a imagem e leem apenas o nome do arquivo `.png`.
- [x] Um codificador visual divide a imagem em regiões (*patches*) e as projeta em vetores (tokens visuais) que entram na sequência do Transformer, consumindo espaço da janela de contexto e orçamento de tokens.
- [ ] Imagens têm custo zero de processamento e nunca contam como tokens.
- [ ] A imagem substitui os pesos da rede neural durante o *prefill*.

> Entradas visuais são convertidas em centenas ou milhares de tokens de embedding que participam da atenção junto com os tokens de texto, impactando diretamente o TTFT e o custo da chamada.

### Pergunta

Qual é o método mais confiável para escolher entre três modelos candidatos para o assistente da secretaria acadêmica da USP?

- [ ] Escolher o primeiro colocado em um ranking público de charadas matemáticas em inglês.
- [ ] Escolher sempre o modelo com o maior número de parâmetros, independentemente da latência.
- [x] Montar um conjunto próprio de avaliação com exemplos representativos da secretaria (ex.: 30 casos reais) e medir qualidade, latência e custo de cada modelo nesse conjunto.
- [ ] Escolher o modelo pelo tamanho do nome comercial.

> A avaliação no próprio domínio (em português, com os documentos, formatos e casos de borda reais da sua aplicação) é o único indicador fiel do desempenho que seus usuários encontrarão em produção.
