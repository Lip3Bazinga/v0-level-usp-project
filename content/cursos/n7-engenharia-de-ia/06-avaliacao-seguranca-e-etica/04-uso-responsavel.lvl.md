---
slug: n7-m6-04-uso-responsavel
titulo: 'Uso responsável: viés, alucinação, transparência e limites de uso'
descricao: Avaliar viés por grupo em respostas, comunicar incerteza e fontes, declarar o uso de IA, definir o que o sistema não deve fazer e documentar (model/system card).
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 35
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Medir disparidades nas respostas do sistema entre grupos e cenários
- Projetar mensagens que comunicam incerteza, fontes e os limites do sistema
- Escrever um system card com finalidade, dados, avaliação, riscos e mitigação
---

## Passo 1 · Leitura · Equidade contrafactual, limites de escopo e transparência

Dois alunos com **exatamente o mesmo histórico escolar e a mesma dúvida** nunca devem receber orientações ou decisões diferentes apenas porque seus nomes, gêneros ou cidades de origem diferem na mensagem. Na engenharia de sistemas com LLM, testamos essa propriedade com **avaliação contrafactual**: construímos um conjunto $P$ de pares $(a, b)$ idênticos em todos os fatos acadêmicos e distintos apenas no marcador demográfico, medindo a taxa de disparidade:

$$\Delta_{\text{contrafactual}} = \frac{1}{|P|} \sum_{(a, b) \in P} \mathbb{I}\!\left[f(a) \neq f(b)\right]$$

Além da equidade, o uso responsável em produção apoia-se em três compromissos:

1. **Limites claros de escopo com encaminhamento seguro:** o assistente da secretaria responde sobre regimento, calendário e trâmites acadêmicos; ele **não** deve dar conselhos médicos, psicológicos, jurídicos ou financeiros. Quando detecta esses temas, deve recusar e indicar o canal institucional humano adequado.
2. **Transparência com a pessoa usuária:** deixar claro que a resposta foi gerada por um assistente de IA, exibir as fontes consultadas e avisar explicitamente quando a confiança na recuperação for baixa, orientando a confirmação com a secretaria.
3. **Documentação em *System Card*:** todo sistema implantado deve ser acompanhado de um documento padronizado (*System Card*) declarando sua finalidade, os usos fora de escopo, os resultados de avaliação e os riscos conhecidos com suas respectivas mitigações.

## Passo 2 · Exercício · Teste contrafactual e detecção de pergunta fora de escopo

Implemente `teste_contrafactual(sistema, pares)` para medir disparidades entre pares demográficos equivalentes e `verificar_escopo(pergunta, temas_proibidos, canal_encaminhamento)` para recusar temas sensíveis indicando o atendimento humano.

### Instruções

1. Em `teste_contrafactual(sistema, pares)`:
   - Cada item de `pares` é um dicionário `{"id": str, "a": str, "b": str}`.
   - Para cada par, compare `sistema(par["a"])` com `sistema(par["b"])`. Se os retornos forem diferentes, adicione `par["id"]` à lista `divergencias`.
   - Devolva `{"total_pares": len(pares), "divergencias": divergencias, "taxa_disparidade": float(len(divergencias) / len(pares)) if pares else 0.0}`.
2. Em `verificar_escopo(pergunta, temas_proibidos, canal_encaminhamento)`:
   - Se qualquer palavra de `temas_proibidos` (em minúsculas) aparecer em `pergunta.lower()`, retorne exatamente:
     `f"Fora de escopo da secretaria. Procure atendimento humano em: {canal_encaminhamento}."`
   - Caso contrário, retorne `"DENTRO_DO_ESCOPO"`.

### Código inicial

```python
def teste_contrafactual(sistema, pares):
    # Compare sistema(par["a"]) e sistema(par["b"]) para cada par e meça a taxa de disparidade
    pass


def verificar_escopo(pergunta, temas_proibidos, canal_encaminhamento):
    # Bloqueie temas proibidos indicando o canal_encaminhamento humano
    pass
```

### Solução

```python
def teste_contrafactual(sistema, pares):
    total = len(pares)
    if total == 0:
        return {"total_pares": 0, "divergencias": [], "taxa_disparidade": 0.0}
    divergencias = []
    for par in pares:
        if sistema(par["a"]) != sistema(par["b"]):
            divergencias.append(par["id"])
    return {
        "total_pares": int(total),
        "divergencias": divergencias,
        "taxa_disparidade": float(len(divergencias) / total),
    }


def verificar_escopo(pergunta, temas_proibidos, canal_encaminhamento):
    p_low = pergunta.lower()
    if any(t.lower() in p_low for t in temas_proibidos):
        return f"Fora de escopo da secretaria. Procure atendimento humano em: {canal_encaminhamento}."
    return "DENTRO_DO_ESCOPO"
```

### Dicas

1. Em `teste_contrafactual`, mantenha a ordem original dos `"id"`s em `divergencias`.
2. Em `verificar_escopo`, converta tanto a pergunta quanto cada tema proibido para `.lower()`.

### Verificação

```json
[
  {
    "id": "contrafactual-detecta-disparidade",
    "name": "Identifica exatamente os pares em que a resposta muda por atributo demográfico",
    "checkpoint": 1,
    "kind": "expr",
    "setup": "pares = [{'id': 'p1', 'a': 'Aluno Joao pede bolsa', 'b': 'Aluna Maria pede bolsa'}, {'id': 'p2', 'a': 'Prazo de matricula', 'b': 'Prazo de matricula'}]",
    "expr": "[teste_contrafactual(lambda txt: 'aprovado' if 'Joao' in txt else 'analise', pares), teste_contrafactual(lambda txt: 'orientacao padrao', pares)]",
    "expected": [
      {
        "total_pares": 2,
        "divergencias": ["p1"],
        "taxa_disparidade": 0.5
      },
      {
        "total_pares": 2,
        "divergencias": [],
        "taxa_disparidade": 0.0
      }
    ]
  },
  {
    "id": "escopo-encaminhamento",
    "name": "Encaminha perguntas médicas/jurídicas e aprova dúvidas acadêmicas",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "[verificar_escopo('Qual remedio tomar para febre?', ['remedio', 'processo judicial'], 'UBAS USP'), verificar_escopo('Como trancar disciplina?', ['remedio', 'processo judicial'], 'UBAS USP')]",
    "expected": [
      "Fora de escopo da secretaria. Procure atendimento humano em: UBAS USP.",
      "DENTRO_DO_ESCOPO"
    ]
  }
]
```

### Soluções erradas

```python name="Executa apenas o lado A do par contrafactual sem comparar com B"
def teste_contrafactual(sistema, pares):
    return {"total_pares": len(pares), "divergencias": [], "taxa_disparidade": 0.0}


def verificar_escopo(pergunta, temas_proibidos, canal_encaminhamento):
    if any(t.lower() in pergunta.lower() for t in temas_proibidos):
        return f"Fora de escopo da secretaria. Procure atendimento humano em: {canal_encaminhamento}."
    return "DENTRO_DO_ESCOPO"
```

```python name="Recusa pergunta fora de escopo sem informar o canal de encaminhamento humano"
def teste_contrafactual(sistema, pares):
    div = [p["id"] for p in pares if sistema(p["a"]) != sistema(p["b"])]
    return {"total_pares": len(pares), "divergencias": div, "taxa_disparidade": float(len(div) / len(pares))}


def verificar_escopo(pergunta, temas_proibidos, canal_encaminhamento):
    if any(t.lower() in pergunta.lower() for t in temas_proibidos):
        return "Recusado."
    return "DENTRO_DO_ESCOPO"
```

## Passo 3 · Exercício · Resposta transparente e gerador de System Card

Implemente `formatar_com_transparencia(resposta, confianca, fontes)` para apresentar respostas com aviso de IA, fontes e alerta de baixa confiança, e `gerar_system_card(info)` para gerar a documentação obrigatória do sistema em Markdown.

### Instruções

1. Em `formatar_com_transparencia(resposta, confianca, fontes)`:
   - Comece com a linha `f"[Assistente de IA] {resposta.strip()}"`.
   - Adicione a linha de fontes: se `fontes` não estiver vazia, use `f"Fontes: {', '.join(fontes)}"`; se estiver vazia, use `"Fontes: nenhuma"`.
   - Se `confianca < 0.7`, adicione uma terceira linha: `"Aviso: confianca baixa, confirme na secretaria."`.
   - Junte as linhas com `"\n"` e retorne a string.
2. Em `gerar_system_card(info)`:
   - Verifique se todas as 5 chaves obrigatórias `("nome", "finalidade", "fora_de_escopo", "metricas", "riscos_e_mitigacoes")` estão presentes em `info` e possuem valor não vazio (`str(info.get(c, "")).strip() != ""`). Se alguma faltar ou estiver vazia, levante `ValueError(f"Secao obrigatoria ausente: {c}")`.
   - Devolva o documento Markdown no formato exato:
     ```text
     # System Card: {nome}
     ## Finalidade
     {finalidade}
     ## Uso fora de escopo
     {fora_de_escopo}
     ## Metricas de avaliacao
     {metricas}
     ## Riscos e mitigacoes
     {riscos_e_mitigacoes}
     ```

### Código inicial

```python
SECOES_OBRIGATORIAS = (
    "nome",
    "finalidade",
    "fora_de_escopo",
    "metricas",
    "riscos_e_mitigacoes",
)


def formatar_com_transparencia(resposta, confianca, fontes):
    # Formate com prefixo [Assistente de IA], linha de Fontes e aviso quando confianca < 0.7
    pass


def gerar_system_card(info):
    # Valide as 5 seções obrigatórias e devolva o System Card em Markdown
    pass
```

### Solução

```python
SECOES_OBRIGATORIAS = (
    "nome",
    "finalidade",
    "fora_de_escopo",
    "metricas",
    "riscos_e_mitigacoes",
)


def formatar_com_transparencia(resposta, confianca, fontes):
    linhas = [f"[Assistente de IA] {resposta.strip()}"]
    if fontes:
        linhas.append(f"Fontes: {', '.join(fontes)}")
    else:
        linhas.append("Fontes: nenhuma")
    if confianca < 0.7:
        linhas.append("Aviso: confianca baixa, confirme na secretaria.")
    return "\n".join(linhas)


def gerar_system_card(info):
    for secao in SECOES_OBRIGATORIAS:
        if secao not in info or str(info[secao]).strip() == "":
            raise ValueError(f"Secao obrigatoria ausente: {secao}")
    return (
        f"# System Card: {info['nome']}\n"
        f"## Finalidade\n{info['finalidade']}\n"
        f"## Uso fora de escopo\n{info['fora_de_escopo']}\n"
        f"## Metricas de avaliacao\n{info['metricas']}\n"
        f"## Riscos e mitigacoes\n{info['riscos_e_mitigacoes']}"
    )
```

### Dicas

1. Em `formatar_com_transparencia`, inclua `"Aviso: confianca baixa, confirme na secretaria."` somente quando `confianca < 0.7`.
2. Em `gerar_system_card`, valide todas as chaves de `SECOES_OBRIGATORIAS` com `str(info[secao]).strip() == ""` antes de montar o texto.

### Verificação

```json
[
  {
    "id": "transparencia-alta-e-baixa-confianca",
    "name": "Exibe prefixo de IA, fontes e adiciona aviso apenas quando a confiança é menor que 0.7",
    "checkpoint": 1,
    "kind": "expr",
    "expr": "[formatar_com_transparencia('Prazo 15 dias.', 0.85, ['Art. 12']), formatar_com_transparencia('Prazo incerto.', 0.5, [])]",
    "expected": [
      "[Assistente de IA] Prazo 15 dias.\nFontes: Art. 12",
      "[Assistente de IA] Prazo incerto.\nFontes: nenhuma\nAviso: confianca baixa, confirme na secretaria."
    ]
  },
  {
    "id": "system-card-completo",
    "name": "Gera o System Card completo com as 5 seções obrigatórias",
    "checkpoint": 2,
    "kind": "call",
    "function": "gerar_system_card",
    "args": [
      {
        "nome": "Assistente da Secretaria",
        "finalidade": "Tirar duvidas sobre o regimento e calendario.",
        "fora_de_escopo": "Pareceres medicos, juridicos ou financeiros.",
        "metricas": "Recall@3 = 0.92, Fidelidade = 0.95.",
        "riscos_e_mitigacoes": "Alucinacao mitigada por limiar e citacao obrigatoria."
      }
    ],
    "expected": "# System Card: Assistente da Secretaria\n## Finalidade\nTirar duvidas sobre o regimento e calendario.\n## Uso fora de escopo\nPareceres medicos, juridicos ou financeiros.\n## Metricas de avaliacao\nRecall@3 = 0.92, Fidelidade = 0.95.\n## Riscos e mitigacoes\nAlucinacao mitigada por limiar e citacao obrigatoria."
  },
  {
    "id": "system-card-rejeita-sem-riscos",
    "name": "Levanta ValueError quando falta a seção de riscos e mitigações",
    "checkpoint": 2,
    "kind": "expr",
    "expr": "gerar_system_card({'nome': 'Bot', 'finalidade': 'f', 'fora_de_escopo': 'e', 'metricas': 'm'})",
    "raises": "ValueError"
  }
]
```

### Soluções erradas

```python name="Omite o aviso de baixa confiança quando confianca < 0.7"
def formatar_com_transparencia(resposta, confianca, fontes):
    f_str = ", ".join(fontes) if fontes else "nenhuma"
    return f"[Assistente de IA] {resposta.strip()}\nFontes: {f_str}"


def gerar_system_card(info):
    return f"# System Card: {info.get('nome', '')}"
```

```python name="Gera o System Card mesmo quando faltam seções obrigatórias como riscos_e_mitigacoes"
def formatar_com_transparencia(resposta, confianca, fontes):
    linhas = [
        f"[Assistente de IA] {resposta.strip()}",
        f"Fontes: {', '.join(fontes) if fontes else 'nenhuma'}",
    ]
    if confianca < 0.7:
        linhas.append("Aviso: confianca baixa, confirme na secretaria.")
    return "\n".join(linhas)


def gerar_system_card(info):
    return (
        f"# System Card: {info.get('nome', '')}\n"
        f"## Finalidade\n{info.get('finalidade', '')}\n"
        f"## Uso fora de escopo\n{info.get('fora_de_escopo', '')}\n"
        f"## Metricas de avaliacao\n{info.get('metricas', '')}\n"
        f"## Riscos e mitigacoes\n{info.get('riscos_e_mitigacoes', '')}"
    )
```

## Passo 4 · Quiz · Testes contrafactuais, transparência e System Card

### Pergunta

O que caracteriza um **par contrafactual** em um teste de equidade para um assistente de atendimento?

- [ ] Duas perguntas sobre temas completamente diferentes (uma sobre matrícula e outra sobre estágio).
- [x] Duas entradas com exatamente a mesma situação acadêmica e os mesmos fatos relevantes, diferindo apenas em atributos demográficos (como nome, gênero ou origem), nas quais o sistema deve produzir a mesma decisão e qualidade de orientação.
- [ ] Uma pergunta em português e outra em código binário.
- [ ] Duas chamadas feitas com temperaturas diferentes.

> Ao manter todos os fatos do mérito constantes e variar apenas o marcador demográfico, qualquer divergência sistemática na decisão revela viés indevido.

### Pergunta

Por que um assistente institucional baseado em LLM deve identificar-se claramente como IA, exibir as fontes consultadas e sinalizar quando sua confiança na resposta é baixa?

- [ ] Para gastar mais caracteres na resposta.
- [x] Para que a pessoa usuária saiba que está interagindo com um sistema automatizado, possa conferir os artigos originais citados e procure confirmação humana quando a evidência recuperada for fraca.
- [ ] Porque navegadores web bloqueiam textos que não começam com colchetes.
- [ ] Para dispensar a etapa de avaliação offline.

> Textos gerados por LLMs soam fluentes e confiantes mesmo quando imprecisos; transparência e citações calibram a confiança do usuário e evitam decisões baseadas em alucinações.

### Pergunta

Qual é o papel da seção de **Uso fora de escopo** e de **Riscos e mitigações** em um *System Card*?

- [ ] Servir apenas como propaganda comercial das qualidades do modelo.
- [x] Documentar explicitamente para quais tarefas o sistema não foi projetado nem validado, quais modos de falha conhecidos ainda existem e quais guardrails foram implementados para contê-los.
- [ ] Substituir os testes automatizados do repositório.
- [ ] Esconder limitações técnicas para evitar revisões.

> Um *System Card* honesto evita que o sistema seja reutilizado em contextos inadequados (como triagem médica ou parecer jurídico) e registra claramente suas fronteiras de segurança.
