---
slug: n1-m9-01-gerenciador-de-tarefas
titulo: 'Projeto final: gerenciador de tarefas em modo texto'
descricao: 'Monte um gerenciador de tarefas completo: adicionar, listar, concluir, remover, buscar, priorizar e gerar relatório, com funções testáveis e um menu interativo.'
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 300
tempo_min: 240
publicada: true
projeto: true
solucao_apos_tentativas: 3
objetivos:
- Projetar um programa com estado (lista de dicionários) manipulado por funções puras e testáveis
- Implementar um menu interativo com validação de entrada e mensagens exatas
- Aplicar listas, dicionários, funções, strings, laços, condicionais e try/except em um único programa
- Entregar um programa que passa em todos os casos de verificação (funções e interação completa)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O projeto que fecha o nível e é exigido para o certificado. O aluno constrói, em passos verificados, um gerenciador de tarefas em modo texto cujo estado é uma lista de dicionários (`{"id", "titulo", "prioridade", "concluida"}`). Funções exigidas por nome e assinatura (a especificação completa está em `PLANO.md`): `criar_tarefa(tarefas, titulo, prioridade)`, `listar(tarefas, apenas_pendentes=False)`, `concluir(tarefas, id_tarefa)`, `remover(tarefas, id_tarefa)`, `buscar(tarefas, termo)`, `ordenar_por_prioridade(tarefas)`, `relatorio(tarefas)` e `executar()` com o menu.

**Passos previstos.** Leitura (especificação, exemplos de sessão completa e critérios) → Exercício: estrutura de dados e `criar_tarefa` com ids sequenciais e validação de prioridade (`call` + `expr`) → Exercício: `listar` e `concluir`/`remover` com ids inexistentes devolvendo `False` (`call`) → Exercício: `buscar` insensível a maiúsculas e `ordenar_por_prioridade` com desempate por id (`call`) → Exercício: `relatorio` com o layout exato (`call` comparando a string devolvida) → Exercício: menu `executar()` com `io` em quatro sessões (fluxo feliz, opção inválida, id inexistente, sair sem tarefas) → Quiz final de autoavaliação (3 perguntas sobre decisões de projeto).

**Erros comuns a cobrir.** Guardar o estado em variável global alterada dentro das funções (as funções devem receber `tarefas`); ids reaproveitados após remoção; busca sensível a maiúsculas; relatório com formatação diferente; menu que não repete após opção inválida; `int(input())` sem try/except.
