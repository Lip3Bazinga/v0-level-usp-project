---
slug: n2-m4-03-json
titulo: 'JSON: dados estruturados'
descricao: Serializar e desserializar com json.dumps, loads, dump e load; tipos suportados e indentação.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Converter entre dicionários/listas e texto JSON com dumps/loads e arquivos com dump/load
- Mapear os tipos do JSON para os do Python e tratar o que não é serializável
- Persistir o estado de um programa em um arquivo JSON e recarregá-lo
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** JSON como formato universal (APIs, configurações); `dumps`/`loads`, `dump`/`load`; `indent=2`, `ensure_ascii=False`; tipos (dict, list, str, int, float, bool, None) e o que não serializa (datas, objetos, conjuntos) — `default=` e conversão manual; validação do que foi carregado (chaves obrigatórias); padrão carregar-alterar-salvar.

**Exercícios previstos.** `salvar_tarefas(caminho, tarefas)`/`carregar_tarefas(caminho)` com `ensure_ascii=False` (`expr` lendo o arquivo e checando acentos); `para_json(objeto)` para uma dataclass via `asdict` (`call`); `mesclar_configuracoes(padrao, caminho)` com fallback quando o arquivo não existe (`expr`); quiz sobre `dumps` vs `dump` e sobre `None` ↔ `null`.

**Erros comuns a cobrir.** `json.dump(obj)` sem o arquivo; aspas simples no texto JSON (`JSONDecodeError`); conjuntos e datas (`TypeError: not JSON serializable`); ler o arquivo e não tratar vazio/corrompido.
