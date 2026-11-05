---
slug: n7-m7-02-empacotamento-e-versionamento-de-modelos
titulo: Empacotamento, versionamento e reprodutibilidade
descricao: Serializar pipelines (joblib), registrar versão, dados, código e métricas (model registry simples), hashes e ambientes fixados, e a regra 'o mesmo pré-processamento em treino e produção'.
dificuldade: avancado
tipo: guiada
runtime: python-dados
bibliotecas:
- numpy
- scikit-learn
xp: 100
tempo_min: 40
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Serializar e carregar um pipeline do scikit-learn com metadados de versão
- Implementar um registro simples de modelos (versão, hash, métricas, data) em JSON
- Garantir reprodutibilidade (sementes, versões de bibliotecas, hash dos dados)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Reaproveita o pipeline do Nível 5; `joblib.dump/load` (disponível via scikit-learn) com dicionário de metadados; hash SHA-256 do arquivo e dos dados de treino; registro em JSON com promoção (`staging` → `producao`); fixar versões (`requirements.txt`) e sementes; o mesmo `Pipeline` em treino e serviço elimina a divergência de pré-processamento; rollback.

**Exercícios previstos.** `salvar_modelo(pipeline, caminho, metadados)` e `carregar_modelo` com verificação de hash (`expr` + `raises` quando o arquivo foi alterado); classe `Registro` com `registrar`, `promover`, `atual(ambiente)` (`expr`); `hash_dos_dados(X, y)` (`call`); `verificar_reprodutibilidade(treinar, semente)` (`call`); quiz.

**Erros comuns a cobrir.** Salvar só o modelo sem o pré-processamento; promover sem métricas registradas; versão no nome do arquivo apenas; dependências não fixadas.
