# BRIEF do Nível 6 — o mínimo para escrever uma lição

Leia **só** este arquivo, a seção do seu módulo no `PLANO.md` (mais "Regras de verificação" e "Mensagens reais" quando precisar) e as lições já prontas do seu módulo. Não leia o `content/README.md`, outros níveis nem outros módulos. Estilo de referência: `01-neuronios-e-perceptron/04-forward-pass-em-numpy.lvl.md`.

## Formato `.lvl.md`

- **Frontmatter:** mantenha tudo (slug, título, xp, objetivos); só troque `publicada: false` por `publicada: true` quando o verify passar. `bibliotecas` é só `- numpy` em todo o nível (perfil `dados`). Não renomeie arquivos nem slugs.
- **Passos:** `## Passo N · Leitura|Previsão|Exercício|Quiz · Título`, na ordem e com os tipos do PLANO (7 ou 8 por lição; projeto 8).
- **Leitura:** prosa de 250 a 350 palavras, pelo menos um bloco ` ```python ` ilustrativo, KaTeX com `$…$`/`$$…$$`, mensagens de erro reais em ` ```text ` (tabela do PLANO, sem traceback). Diagrama: bloco ` ```mermaid ` (`flowchart`, até ~8 nós, rótulos com símbolos entre aspas). Visualizador: bloco ` ```python visualizar ` (até 60 linhas, numpy ou Python puro, sem `input()`, nunca a solução).
- **Previsão:** `### Código` (bloco python determinístico, até 20 linhas de saída), `### Dicas`, `### Saída esperada` (bloco `text`; o verify gera e confere). Imprima `.shape`, `.tolist()` ou `round(float(x), 4)`; nunca arrays crus nem sorteio que não se prevê lendo.
- **Exercício:** linha `modo: lacunas` ou `modo: ordenar` logo abaixo do título (código livre não tem a linha), enunciado, e as seções:
  - `### Instruções`: lista numerada; cada item é um checkpoint (`"checkpoint": N` nos casos);
  - `### Código inicial`: bloco python (precisa **reprovar**); arquivos extras com ` ```python path=rede.py ` ou ` ```text path=nomes.txt `; não existe no `ordenar`;
  - `### Solução`: mesmos arquivos (os de apoio repetidos por inteiro);
  - `### Dicas`: até 3, apontam o caminho sem dar o código;
  - `### Verificação`: bloco `json` com a lista de casos, um por linha;
  - `### Soluções erradas`: **pelo menos 5** blocos ` ```python name="defeito em poucas palavras" `, cada um com **um** defeito real; a errada só repete o arquivo que tem o defeito (use `path=` se não for o principal).
  - `lacunas`: código inicial com `___`; a solução é idêntica fora das lacunas; as erradas são erros que cabem nas lacunas.
  - `ordenar`: sem código inicial; `### Solução` e `### Distratores` (bloco python, uma linha por distrator), depois Verificação e Soluções erradas.
- **Quiz:** 3 blocos `### Pergunta` de cenário (código, números de treino ou decisão), 4 alternativas `- [ ]`/`- [x]` com exatamente uma correta, e uma linha `> explicação` dizendo por que cada distrator falha. Varie a posição da correta.

## Tipos de caso (o N6 usa quase só `expr`)

```json
{"id": "ce-uniforme", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "entropia_cruzada(np.zeros((4, 10)), np.array([0, 3, 9, 5]))", "expected": 2.302585092994046, "tolerance": 1e-12, "name": "Logits iguais com 10 classes: a perda é ln 10", "hint": "Com logits iguais, cada classe tem probabilidade 1/10."}
{"id": "vertical", "checkpoint": 2, "kind": "expr", "setup": "import numpy as np", "expr": "fronteira(np.array([1.0, 0.0]), -0.5, 0.0, 1.0)", "raises": "ValueError", "name": "w[1] = 0 levanta ValueError"}
{"id": "exemplo", "checkpoint": 4, "kind": "call", "function": "f", "args": [2.0, -3.0], "expected": [-8.0, 6.0], "type": "tuple", "tolerance": 1e-12, "name": "…", "hint": "…"}
{"id": "sem-for", "checkpoint": 1, "kind": "source", "rule": {"type": "not_uses", "construct": "for", "function": "conv2d_rapida"}, "name": "Sem laço sobre as posições"}
```

- `expr`: `setup` (até 20 000 caracteres, importa numpy, monta dados e referências com prefixo `_`) + `expr` (até 2 000) que devolve **tipo nativo** (`float`, `bool`, listas; use `.tolist()`, `bool(np.allclose(...))`, `list(a.shape)`). Objetos do aluno nunca são comparados direto (`v.dado`, não `v`).
- `call`: só funções puras com argumentos JSON. `source`: só para cobrar o "como" que é o assunto (`not_uses` com `for`/`while`/`list_comprehension`, `not_calls`, `calls`, `defines_class`…).
- Todo caso tem `id`, `checkpoint`, `name` (o que é conferido, em pt-BR) e, quando ajuda, `hint` que orienta sem entregar. 6 a 12 casos por exercício (projeto: ≥ 16), um comportamento por caso, com bordas.
- O `expected` literal é calculado **rodando a solução no executor** (não no seu Python local nem de cabeça).

## Convenções do nível

- **numpy do zero:** nada de PyTorch, scipy, sklearn, matplotlib (não existem no perfil `dados`). Módulo 2 é Python puro (`Valor`).
- **Sementes:** `rng = np.random.default_rng(semente)` criado uma vez; parâmetros sorteados no `setup` e passados por argumento. Quando o aluno sorteia, o enunciado fixa a ordem dos sorteios e os casos comparam formas e estatísticas (5 erros padrão), não valores.
- **Tolerâncias:** literais e 1 a 5 passos em lote cheio a `1e-10`/`1e-12`; referência no `setup` com `np.allclose(..., atol=1e-12)`; checagem numérica em `float64`, `h = 1e-5`, erro relativo por array `< 1e-7` (`< 1e-6` por entrada com LayerNorm/softmax), devolvendo booleanos por array; pesos `float16` embutidos comparam a `1e-3`.
- **Com sorteio no treino, compare propriedades:** perda abaixo de limiar com folga ≥ 20 %, acurácia com piso 5 pontos abaixo do medido, `bool(perda_final < perda_inicial / 2)`.
- **Orçamento:** ~2 s por lote (todos os casos de um passo somados); limite duro de 10 s. Tamanhos máximos por tipo de rede: regra 7 do PLANO. Treino longo só na narrativa, com números medidos.
- **Classes do aluno:** os casos só usam nomes que o enunciado define; teste estado com duas instâncias independentes.
- **Injeção de dependência:** a função recebe o que usa; o caso passa uma versão com defeito plantado no `setup`. Não troque funções do aluno por atribuição.
- **Dados:** gerados ou escritos para o curso (`digitos.py`, `nomes.txt`, `corpus.py`, `fabulas.txt`, `pesos_gpt.txt`); cada arquivo até ~60 000 caracteres; nada real (pessoas, empresas, produtos, textos de terceiros). Arquivo de apoio que outra lição já criou: copie de lá, idêntico.
- **Texto:** pt-BR, sem exclamações, exemplos neutros (sem USP, IME, marcas). Custo ensinado por contagem de operações, nunca por tempo medido em caso.

## Verificação (obrigatória antes de reportar)

Cada agente usa o **seu** diretório de rascunho `R` (fora do repositório, por exemplo `$TEMP/n6-<módulo>`). A cópia mínima evita gerar as Previsões dos outros cursos. Na raiz do repositório:

```bash
pnpm -s content:check 2>&1 | tail -5
python .claude-transfer/copia-minima.py . "$R" n6-deep-learning      # refaça a cada verify
cd apps/api && RUNNER_URL=http://127.0.0.1:8081 RUNNER_TOKEN=dev-runner-token-0123456789abcdef \
  pnpm -s content:verify --content "$R/content" --licao <slug> 2>&1 | tail -25
pnpm -s content:metrics --curso n6-deep-learning 2>&1 | grep -i "<slug>\|suspeitas"
```

- Um verify por vez por agente. Passou = `TODOS OS PASSOS VERIFICADOS`, com cada passo `solução=aprovada inicial=reprovado erradas=N/N reprovadas`.
- Para calcular esperados ou medir tempo, mande código ao executor: `POST http://127.0.0.1:8081/v1/run` com `Authorization: Bearer <token>` e corpo `{"files":[{"path":"main.py","content":"…"}],"entry":"main.py","probes":[{"id":"run:a","kind":"run","stdin":""}],"limits":{"timeoutMs":10000,"memoryMb":128},"runtime":"python-dados","libraries":["numpy"]}`; a saída vem em `observations[0].stdout`. Faça um script de rascunho em `R` para isso.
- Errada aprovada: o caso que devia pegá-la falta ou é fraco; acrescente o caso (não enfraqueça a errada). Confira que cada errada cai pelo motivo do nome.
- Não rode `content:build`, lint, suítes de teste nem verify do curso inteiro. Não faça `git commit`.

## Armadilhas já registradas

- `np.repeat(np.arange(10), n)`, `np.bincount` e contagens de `np.unique` saem `int32`; `rng.integers` sai `int64` e precisa de `.astype(np.intp)` antes de `np.repeat`.
- Nenhum `RuntimeWarning` e `np.seterr` não funciona: `np.exp(710.0)` é `inf`, `np.log(0)` é `-inf`, `inf - inf` é `nan`, tudo em silêncio. `nan < x` é `False` (o caso reprova, como deve). O `math` do Python levanta erro.
- Viés `(d_out, 1)` com `n == d_out` não dá erro e soma errado. `float(a)` com `a` de forma `(1,)` é `TypeError`.
- `d[idx] += 1.0` com índices repetidos conta uma vez; use `np.add.at` (backward de embedding e `col2im`).
- Máscara causal com `np.where(mascara, -np.inf, S)`; multiplicar por `-inf` ou linha inteira de `-inf` dá `nan`.
- Checagem numérica: pesos e entradas de uma normal (inteiros pequenos zeram pré-ativações e a ReLU quebra a diferença central); redes de até ~100 parâmetros e 8 exemplos.
- Módulos do aluno são reimportados em cada caso; arquivos escritos num caso não existem no seguinte.
- Recursão: limite 1 000; grafos `Valor` dos casos com menos de ~500 nós de profundidade.
- `math.log(0.0)` no Python 3.14: `ValueError: expected a positive input, got 0.0`.
- Um `Valor` devolvido numa `expr` vira `{"$repr": …}` e nunca bate: devolva tipos nativos.
- Previsão não imprime mensagem longa de exceção: `except ValueError: print("ValueError")`.
- Não compare pesos depois de muitas épocas com mini-lotes, nem amostras de um modelo treinado pelo aluno.
- Duas lições não podem ser verificadas no mesmo diretório de rascunho ao mesmo tempo.
- O bloco `if __name__ == "__main__":` do `main.py` só roda no caso `io` (e no Executar do aluno); nos casos `call`, `variable`, `expr` e `unittest` o arquivo é carregado como o módulo `main` e o bloco é pulado. O treino pode ficar ali com o número de passos da aula; o que os casos verificam (funções, classes, constantes) fica fora do bloco, e o que só existe dentro dele pede um caso `io` (com o limite de 10 s) ou o `setup` de um `expr`.
- Otimizador pronto: `adam.py` com `Adam(taxa)` e `passo(params, grads)` recebendo **listas planas** de arrays, atualizados no lugar (copie o bloco de `04-mlp-em-numpy/02-classificador-de-digitos.lvl.md`).
- Com a fila do executor disputada, um pedido pode estourar 120 s (`o executor não respondeu`): é fila, não conteúdo; rode de novo.

## Relatório do agente (só isto)

Uma tabela de até 10 linhas, sem texto antes ou depois:

| lição | passos | exercícios | verify | problemas |
|---|---|---|---|---|
| n6-mX-NN | 8 | 3 | ok | – ou uma frase (marque **suspeita** se algo ficou frágil) |
