---
slug: n2-m2-05-pip-e-ambientes-virtuais
titulo: pip, ambientes virtuais e dependências
descricao: Instalar pacotes de terceiros, isolar projetos com venv e registrar dependências em requirements.txt.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 80
tempo_min: 30
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Criar e ativar um ambiente virtual com venv no Windows, Linux e macOS
- Instalar, listar e remover pacotes com pip e congelar versões em requirements.txt
- Explicar por que cada projeto deve ter seu próprio ambiente
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Lição de leitura com quiz (não há rede no ambiente de verificação): o que é o PyPI; `python -m venv .venv` e ativação por sistema; `pip install`, `pip list`, `pip freeze > requirements.txt`, `pip install -r`; versionamento semântico e fixar versões; `.gitignore` do `.venv`; o que são `uv`/`poetry` em um parágrafo. Inclui um roteiro passo a passo para o aluno repetir no próprio computador.

**Exercícios previstos.** Quiz de 5 perguntas (comando para criar o venv; por que não instalar global; o que `freeze` gera; como reinstalar em outra máquina; o que significa `requests==2.32.3`); exercício leve: a partir de uma saída de `pip freeze` fornecida, escrever `dependencias_fixas(texto)` que devolve um dicionário nome → versão (`call`).

**Erros comuns a cobrir.** Ativar o venv e abrir outro terminal sem ativar; instalar com `sudo pip`; commitar o `.venv`; `requirements.txt` sem versões; usar `pip` de outro Python (`python -m pip` como regra).
