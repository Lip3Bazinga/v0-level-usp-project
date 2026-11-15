---
slug: n7-m5-04-falhas-de-agentes-e-guardrails
titulo: Falhas de agentes e guardrails
descricao: Taxonomia de falhas (loops, ações destrutivas, alucinação de ferramenta, custo descontrolado), guardrails de entrada e saída, orçamento, confirmação humana e testes de agentes.
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Classificar falhas de agentes em um rastro e aplicar o guardrail adequado
- Implementar orçamento (passos, tokens, tempo) e confirmação humana para ações sensíveis
- Escrever testes de agentes com cenários fixos e ferramentas simuladas
---

## Passo 1 · Leitura · O que dá errado com agentes em produção e como cercá-los

Dar ferramentas a um modelo de linguagem multiplica tanto sua utilidade quanto sua superfície de falha. Em produção, as falhas de um agente raramente aparecem como um `SyntaxError`: elas surgem como **comportamentos emergentes** ao longo do rastro de execução:

1. **Alucinação de ferramenta (`"ferramenta_alucinada"`):** o agente inventa um nome de função que não existe no catálogo (ex.: `deletar_dividas()`).
2. **Ação não autorizada (`"acao_nao_autorizada"`):** o agente tenta acionar uma ferramenta de escrita sem permissão ou sem aprovação do usuário.
3. **Loop de repetição (`"loop"`):** o agente chama a mesma ferramenta com os mesmos argumentos seguidamente sem progredir.
4. **Orçamento estourado (`"orcamento_estourado"`):** a execução consome todos os passos ou tokens permitidos sem produzir uma resposta final.

Para cercar esses riscos, aplicamos **guardrails** em três pontos:

- **Controle de orçamento (`Orcamento`):** monitora simultaneamente o número de passos e o total acumulado de tokens, abortando com `OrcamentoEstourado` assim que qualquer teto é ultrapassado.
- **Humano no circuito (*human-in-the-loop*):** ferramentas de `"leitura"` executam diretamente, mas ferramentas de `"escrita"` exigem uma função explícita de confirmação (`confirmar_fn(nome, args)`) antes de alterar dados reais.
- **Métricas operacionais com custo por sucesso:** medir apenas a taxa de acerto esconde agentes que gastam 10 vezes mais tokens em loops parciais. Por isso acompanhamos o custo médio por tarefa concluída com sucesso:

$$\text{Custo médio por sucesso} = \frac{\sum_{i=1}^{N} C_i}{N_{\text{sucessos}}}$$

## Passo 2 · Previsão · Orçamento de passos e tokens em ação

Analise o código abaixo e determine o que será impresso quando o orçamento tem limite de `5` passos e `1000` tokens.

### Código

```python
max_passos = 5
max_tokens = 1000
passos = 0
tokens = 0
gastos_por_chamada = [350, 400, 300, 200]

parou_em = None
for i, g in enumerate(gastos_por_chamada, start=1):
    passos += 1
    tokens += g
    if passos > max_passos or tokens > max_tokens:
        parou_em = (passos, tokens)
        break

print("Parou em:", parou_em)
```

### Dicas

1. Some os valores de `gastos_por_chamada` passo a passo: `350`, `350 + 400 = 750`, `750 + 300 = 1050`.
2. Na 3ª chamada, `passos` ainda é `3 <= 5`, mas `tokens = 1050 > 1000`, disparando o `break`.

### Saída esperada

```text
Parou em: (3, 1050)
```

## Passo 3 · Exercício · Classificador de falhas em rastros e classe Orcamento

Implemente `classificar_rastro(rastro, ferramentas_validas, max_passos)` para diagnosticar o motivo de falha (ou sucesso) de uma execução e a classe `Orcamento(max_passos, max_tokens)` que levanta `OrcamentoEstourado`.

### Instruções

1. Defina a exceção `OrcamentoEstourado(RuntimeError)` e a classe `Orcamento(max_passos, max_tokens)`:
   - Inicialize `self.max_passos = int(max_passos)`, `self.max_tokens = int(max_tokens)`, `self.passos = 0` e `self.tokens = 0`.
   - Em `registrar(self, tokens_gastos)`, incremente `self.passos += 1` e `self.tokens += int(tokens_gastos)`. Se `self.passos > self.max_passos` ou `self.tokens > self.max_tokens`, levante `OrcamentoEstourado("Limite excedido")`.
2. Implemente `classificar_rastro(rastro, ferramentas_validas, max_passos)` verificando nesta ordem de prioridade:
   - Se algum evento de ação (`ev.get("tipo") == "acao"`) tiver `ev.get("ferramenta") not in ferramentas_validas`, retorne `"ferramenta_alucinada"`.
   - Se algum evento tiver `ev.get("detalhe") == "nao_autorizado"`, retorne `"acao_nao_autorizada"`.
   - Se duas ações consecutivas tiverem o mesmo par `(ev.get("ferramenta"), ev.get("argumentos"))`, retorne `"loop"`.
   - Se o último evento for `ev.get("tipo") == "resposta"`, retorne `"sucesso"`.
   - Se `len(rastro) >= max_passos` ou não houver resposta final, retorne `"orcamento_estourado"`.

### Código inicial

```python
class OrcamentoEstourado(RuntimeError):
    pass


class Orcamento:
    def __init__(self, max_passos, max_tokens):
        # Inicialize limites e contadores
        pass

    def registrar(self, tokens_gastos):
        # Atualize contadores e levante OrcamentoEstourado se ultrapassar os limites
        pass


def classificar_rastro(rastro, ferramentas_validas, max_passos):
    # Classifique o rastro em ferramenta_alucinada, acao_nao_autorizada, loop, sucesso ou orcamento_estourado
    pass
```

### Solução

```python
class OrcamentoEstourado(RuntimeError):
    pass


class Orcamento:
    def __init__(self, max_passos, max_tokens):
        self.max_passos = int(max_passos)
        self.max_tokens = int(max_tokens)
        self.passos = 0
        self.tokens = 0

    def registrar(self, tokens_gastos):
        self.passos += 1
        self.tokens += int(tokens_gastos)
        if self.passos > self.max_passos or self.tokens > self.max_tokens:
            raise OrcamentoEstourado("Limite excedido")


def classificar_rastro(rastro, ferramentas_validas, max_passos):
    validas = set(ferramentas_validas)
    ultima_acao = None
    for ev in rastro:
        if ev.get("detalhe") == "nao_autorizado":
            return "acao_nao_autorizada"
        if ev.get("tipo") == "acao":
            nome = ev.get("ferramenta")
            if nome not in validas:
                return "ferramenta_alucinada"
            atual = (nome, ev.get("argumentos"))
            if atual == ultima_acao:
                return "loop"
            ultima_acao = atual
    if rastro and rastro[-1].get("tipo") == "resposta":
        return "sucesso"
    return "orcamento_estourado"
```

### Dicas

1. Em `Orcamento.registrar`, some `1` em `self.passos` e `tokens_gastos` em `self.tokens` antes de testar `if self.passos > self.max_passos or self.tokens > self.max_tokens:`.
2. Em `classificar_rastro`, verifique falhas ao longo dos eventos antes de checar se o último evento é `"resposta"`.

### Verificação

```json
[
  {
    "id": "classifica-cinco-cenarios",
    "name": "Identifica ferramenta alucinada, ação não autorizada, loop, orçamento estourado e sucesso",
    "checkpoint": 2,
    "kind": "expr",
    "setup": "v = {'buscar', 'calcular'}",
    "expr": "[classificar_rastro([{'tipo': 'acao', 'ferramenta': 'inventada', 'argumentos': {}}], v, 3), classificar_rastro([{'tipo': 'erro', 'detalhe': 'nao_autorizado'}], v, 3), classificar_rastro([{'tipo': 'acao', 'ferramenta': 'buscar', 'argumentos': {'q': 'x'}}, {'tipo': 'acao', 'ferramenta': 'buscar', 'argumentos': {'q': 'x'}}], v, 5), classificar_rastro([{'tipo': 'acao', 'ferramenta': 'buscar', 'argumentos': {'q': 'x'}}], v, 1), classificar_rastro([{'tipo': 'acao', 'ferramenta': 'buscar', 'argumentos': {'q': 'x'}}, {'tipo': 'resposta', 'conteudo': 'ok'}], v, 5)]",
    "expected": [
      "ferramenta_alucinada",
      "acao_nao_autorizada",
      "loop",
      "orcamento_estourado",
      "sucesso"
    ]
  },
  {
    "id": "orcamento-estoura-por-tokens",
    "name": "Levanta OrcamentoEstourado quando o limite de tokens é excedido",
    "checkpoint": 1,
    "kind": "expr",
    "setup": "orc = Orcamento(max_passos=5, max_tokens=500); orc.registrar(300)",
    "expr": "orc.registrar(250)",
    "raises": "OrcamentoEstourado"
  }
]
```

### Soluções erradas

```python name="Verifica apenas max_passos e ignora o limite de tokens em Orcamento"
class OrcamentoEstourado(RuntimeError):
    pass


class Orcamento:
    def __init__(self, max_passos, max_tokens):
        self.max_passos = int(max_passos)
        self.passos = 0

    def registrar(self, tokens_gastos):
        self.passos += 1
        if self.passos > self.max_passos:
            raise OrcamentoEstourado("Passos")


def classificar_rastro(rastro, ferramentas_validas, max_passos):
    return "sucesso"
```

```python name="Não detecta loop quando o rastro termina com uma resposta"
class OrcamentoEstourado(RuntimeError):
    pass


class Orcamento:
    def __init__(self, max_passos, max_tokens):
        self.max_passos = int(max_passos)
        self.max_tokens = int(max_tokens)
        self.passos = 0
        self.tokens = 0

    def registrar(self, tokens_gastos):
        self.passos += 1
        self.tokens += int(tokens_gastos)
        if self.passos > self.max_passos or self.tokens > self.max_tokens:
            raise OrcamentoEstourado("Limite")


def classificar_rastro(rastro, ferramentas_validas, max_passos):
    if rastro and rastro[-1].get("tipo") == "resposta":
        return "sucesso"
    return "orcamento_estourado"
```

## Passo 4 · Exercício · Guardrail de confirmação humana

Implemente `executar_com_confirmacao(catalogo, nome, args, confirmar_fn)` para exigir aprovação explícita antes de executar qualquer ferramenta marcada com permissão `"escrita"`.

### Instruções

1. `catalogo` é um dicionário que mapeia `nome` para `{"func": callable, "permissao": "leitura" | "escrita"}`. Se `nome not in catalogo`, levante `KeyError(nome)`.
2. Se `item["permissao"] == "leitura"`, execute `res = item["func"](**args)` diretamente (sem chamar `confirmar_fn`) e devolva `{"executado": True, "resultado": res}`.
3. Se `item["permissao"] == "escrita"`, chame `aprovado = bool(confirmar_fn(nome, args))`:
   - Se `aprovado` for `True`, execute `res = item["func"](**args)` e devolva `{"executado": True, "resultado": res}`.
   - Se `aprovado` for `False`, **não** execute `item["func"]` e devolva `{"executado": False, "motivo": "Acao cancelada pelo usuario."}`.

### Código inicial

```python
def executar_com_confirmacao(catalogo, nome, args, confirmar_fn):
    # Execute direto para leitura; peça confirmação antes de executar escrita
    pass
```

### Solução

```python
def executar_com_confirmacao(catalogo, nome, args, confirmar_fn):
    if nome not in catalogo:
        raise KeyError(nome)
    item = catalogo[nome]
    if item["permissao"] == "escrita":
        if not confirmar_fn(nome, args):
            return {"executado": False, "motivo": "Acao cancelada pelo usuario."}
    res = item["func"](**args)
    return {"executado": True, "resultado": res}
```

### Dicas

1. Só chame `confirmar_fn(nome, args)` quando `item["permissao"] == "escrita"`.
2. Se `confirmar_fn` retornar `False`, retorne imediatamente sem invocar `item["func"](**args)`.

### Verificação

```json
[
  {
    "id": "confirmacao-leitura-vs-escrita",
    "name": "Executa leitura sem confirmar, executa escrita aprovada e bloqueia escrita recusada",
    "checkpoint": 3,
    "kind": "expr",
    "setup": "efeitos = []; cat = {'ver': {'permissao': 'leitura', 'func': lambda ra: f'Dados {ra}'}, 'trancar': {'permissao': 'escrita', 'func': lambda ra: (efeitos.append(ra), f'Trancado {ra}')[1]}}",
    "expr": "[executar_com_confirmacao(cat, 'ver', {'ra': '1'}, lambda n, a: (_ for _ in ()).throw(RuntimeError('nao devia chamar'))), executar_com_confirmacao(cat, 'trancar', {'ra': '2'}, lambda n, a: False), executar_com_confirmacao(cat, 'trancar', {'ra': '3'}, lambda n, a: True), efeitos]",
    "expected": [
      {
        "executado": true,
        "resultado": "Dados 1"
      },
      {
        "executado": false,
        "motivo": "Acao cancelada pelo usuario."
      },
      {
        "executado": true,
        "resultado": "Trancado 3"
      },
      ["3"]
    ]
  }
]
```

### Soluções erradas

```python name="Executa a função de escrita antes de verificar a confirmação"
def executar_com_confirmacao(catalogo, nome, args, confirmar_fn):
    item = catalogo[nome]
    res = item["func"](**args)
    if item["permissao"] == "escrita" and not confirmar_fn(nome, args):
        return {"executado": False, "motivo": "Acao cancelada pelo usuario."}
    return {"executado": True, "resultado": res}
```

```python name="Pede confirmação também para ferramentas de leitura"
def executar_com_confirmacao(catalogo, nome, args, confirmar_fn):
    item = catalogo[nome]
    if not confirmar_fn(nome, args):
        return {"executado": False, "motivo": "Acao cancelada pelo usuario."}
    return {"executado": True, "resultado": item["func"](**args)}
```

## Passo 5 · Exercício · Suíte unittest para o agente da secretaria

A função `executar_agente_secretaria(roteiro, confirmar_fn, max_passos=3)` executa um agente com duas ferramentas (`"consultar_prazo"` de leitura e `"cancelar_matricula"` de escrita). Escreva a suíte `TestAgenteSecretaria(unittest.TestCase)` com pelo menos 3 testes cobrindo execução normal, parada por `max_passos` e bloqueio de escrita sem confirmação.

### Instruções

1. Escreva um método `test_consulta_normal(self)` verificando que um roteiro com `[("acao", "consultar_prazo", {}), ("resposta", "Prazo 15/05", {})]` retorna `"Prazo 15/05"`.
2. Escreva um método `test_para_no_limite_de_passos(self)` verificando que um roteiro com 4 ações de leitura seguidas e `max_passos=2` retorna `"Limite de passos atingido."`.
3. Escreva um método `test_escrita_exige_confirmacao(self)` verificando que `[("acao", "cancelar_matricula", {"ra": "123"})]` retorna `"Acao cancelada pelo usuario."` quando `confirmar_fn` devolve `False` (e confirma que quando `confirmar_fn` devolve `True` a escrita prossegue até a resposta final).

### Código inicial

```python
import unittest


def executar_agente_secretaria(roteiro, confirmar_fn, max_passos=3):
    passos = 0
    for tipo, nome_ou_texto, args in roteiro:
        passos += 1
        if passos > max_passos:
            return "Limite de passos atingido."
        if tipo == "resposta":
            return nome_ou_texto
        if nome_ou_texto == "cancelar_matricula":
            if not confirmar_fn(nome_ou_texto, args):
                return "Acao cancelada pelo usuario."
    return "Limite de passos atingido."


class TestAgenteSecretaria(unittest.TestCase):
    # Escreva pelo menos 3 métodos test_... cobrindo consulta normal,
    # limite max_passos e exigência de confirmação para cancelar_matricula.
    pass


if __name__ == "__main__":
    unittest.main()
```

### Solução

```python
import unittest


def executar_agente_secretaria(roteiro, confirmar_fn, max_passos=3):
    passos = 0
    for tipo, nome_ou_texto, args in roteiro:
        passos += 1
        if passos > max_passos:
            return "Limite de passos atingido."
        if tipo == "resposta":
            return nome_ou_texto
        if nome_ou_texto == "cancelar_matricula":
            if not confirmar_fn(nome_ou_texto, args):
                return "Acao cancelada pelo usuario."
    return "Limite de passos atingido."


class TestAgenteSecretaria(unittest.TestCase):
    def test_consulta_normal(self):
        roteiro = [
            ("acao", "consultar_prazo", {}),
            ("resposta", "Prazo 15/05", {}),
        ]
        res = executar_agente_secretaria(roteiro, lambda n, a: False, max_passos=3)
        self.assertEqual(res, "Prazo 15/05")

    def test_para_no_limite_de_passos(self):
        roteiro = [
            ("acao", "consultar_prazo", {}),
            ("acao", "consultar_prazo", {}),
            ("acao", "consultar_prazo", {}),
            ("resposta", "Tarde demais", {}),
        ]
        res = executar_agente_secretaria(roteiro, lambda n, a: True, max_passos=2)
        self.assertEqual(res, "Limite de passos atingido.")

    def test_escrita_exige_confirmacao(self):
        roteiro = [
            ("acao", "cancelar_matricula", {"ra": "123"}),
            ("resposta", "Matricula cancelada", {}),
        ]
        recusado = executar_agente_secretaria(roteiro, lambda n, a: False, max_passos=3)
        self.assertEqual(recusado, "Acao cancelada pelo usuario.")
        aprovado = executar_agente_secretaria(roteiro, lambda n, a: True, max_passos=3)
        self.assertEqual(aprovado, "Matricula cancelada")


if __name__ == "__main__":
    unittest.main()
```

### Dicas

1. Em `test_para_no_limite_de_passos`, passe um `roteiro` com mais itens do que `max_passos` (terminando numa `"resposta"`) para garantir que um mutante que ignora `max_passos` falhe no seu teste!
2. Em `test_escrita_exige_confirmacao`, teste tanto `confirmar_fn` retornando `False` quanto retornando `True`.

### Verificação

```json
[
  {
    "id": "suite-agente-referencia",
    "name": "Sua suíte passa na implementação correta com pelo menos 3 testes",
    "checkpoint": 1,
    "kind": "unittest",
    "test_class": "TestAgenteSecretaria",
    "expect": "pass",
    "min_tests": 3
  },
  {
    "id": "detecta-mutante-sem-max-passos",
    "name": "Detecta regressão quando max_passos é ignorado",
    "checkpoint": 2,
    "kind": "unittest",
    "test_class": "TestAgenteSecretaria",
    "target": "executar_agente_secretaria",
    "implementation": "def executar_agente_secretaria(roteiro, confirmar_fn, max_passos=3):\n    for tipo, nome_ou_texto, args in roteiro:\n        if tipo == 'resposta':\n            return nome_ou_texto\n        if nome_ou_texto == 'cancelar_matricula' and not confirmar_fn(nome_ou_texto, args):\n            return 'Acao cancelada pelo usuario.'\n    return 'Limite de passos atingido.'\n",
    "expect": "fail"
  },
  {
    "id": "detecta-mutante-sem-confirmacao",
    "name": "Detecta regressão quando cancelar_matricula não consulta confirmar_fn",
    "checkpoint": 3,
    "kind": "unittest",
    "test_class": "TestAgenteSecretaria",
    "target": "executar_agente_secretaria",
    "implementation": "def executar_agente_secretaria(roteiro, confirmar_fn, max_passos=3):\n    passos = 0\n    for tipo, nome_ou_texto, args in roteiro:\n        passos += 1\n        if passos > max_passos:\n            return 'Limite de passos atingido.'\n        if tipo == 'resposta':\n            return nome_ou_texto\n    return 'Limite de passos atingido.'\n",
    "expect": "fail"
  }
]
```

### Soluções erradas

```python name="Testa apenas o caminho feliz sem verificar max_passos nem confirmação"
import unittest


class TestAgenteSecretaria(unittest.TestCase):
    def test_um(self):
        self.assertEqual(
            executar_agente_secretaria([("resposta", "ok", {})], lambda n, a: True),
            "ok",
        )

    def test_dois(self):
        self.assertEqual(
            executar_agente_secretaria([("resposta", "oi", {})], lambda n, a: True),
            "oi",
        )

    def test_tres(self):
        self.assertEqual(
            executar_agente_secretaria([("resposta", "fim", {})], lambda n, a: True),
            "fim",
        )
```

```python name="Não testa a recusa de confirmar_fn para ações de escrita"
import unittest


class TestAgenteSecretaria(unittest.TestCase):
    def test_normal(self):
        self.assertEqual(
            executar_agente_secretaria([("resposta", "ok", {})], lambda n, a: True),
            "ok",
        )

    def test_limite(self):
        roteiro = [("acao", "consultar_prazo", {}), ("acao", "consultar_prazo", {}), ("resposta", "ok", {})]
        self.assertEqual(
            executar_agente_secretaria(roteiro, lambda n, a: True, max_passos=1),
            "Limite de passos atingido.",
        )

    def test_escrita_aprovada(self):
        roteiro = [("acao", "cancelar_matricula", {"ra": "1"}), ("resposta", "feito", {})]
        self.assertEqual(
            executar_agente_secretaria(roteiro, lambda n, a: True, max_passos=3),
            "feito",
        )
```

## Passo 6 · Quiz · Guardrails, confirmação e testes de agentes

### Pergunta

Por que aplicar um filtro de segurança apenas na pergunta inicial do usuário é insuficiente para proteger um agente com ferramentas?

- [ ] Porque perguntas iniciais nunca contêm texto.
- [x] Porque o agente pode entrar em loop, alucinar parâmetros inválidos ou ler instruções maliciosas vindas de documentos externos durante os passos intermediários do loop ReAct.
- [ ] Porque filtros de entrada impedem o cálculo de embeddings.
- [ ] Porque o modelo não lê a pergunta inicial.

> Em um agente, cada passo intermediário pode ler novos dados e decidir novas chamadas de ferramentas; por isso os guardrails precisam atuar também no orçamento, na autorização de cada ferramenta e na validação de saída.

### Pergunta

Durante o desenvolvimento local, um programador passou `confirmar_fn=lambda nome, args: True` como valor padrão da função do agente e esqueceu essa configuração ao publicar em produção. Qual é a consequência?

- [ ] As ferramentas de leitura deixam de funcionar.
- [x] O guardrail de confirmação humana é silenciosamente neutralizado, permitindo que o agente execute ações destrutivas de escrita sem nenhuma aprovação do usuário.
- [ ] O consumo de tokens cai para zero.
- [ ] O banco de dados passa a operar em modo somente leitura.

> Funções de confirmação nunca devem ter um padrão permissivo (`lambda *a: True`) no código de produção: na ausência de confirmação explícita, o padrão seguro é negar (`False`).

### Pergunta

Por que a suíte de testes automatizados (`unittest`) de um agente em CI/CD deve usar planejadores roteirizados e ferramentas simuladas (*mocks*/*stubs*) em vez de chamar a API de um LLM real na nuvem a cada commit?

- [ ] Porque o módulo `unittest` do Python bloqueia conexões de rede.
- [x] Porque testes de regressão de infraestrutura do agente (limites de passos, permissões, confirmação e tratamento de erros) precisam ser rápidos, gratuitos e 100% determinísticos.
- [ ] Porque modelos reais não conseguem gerar JSON.
- [ ] Para evitar testar os casos de falha.

> Isolar a lógica do loop e dos guardrails com clientes determinísticos garante que qualquer regressão de segurança quebre o build imediatamente, sem falsos positivos por variação estocástica.
