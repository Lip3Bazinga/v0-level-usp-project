---
slug: n7-m5-03-memoria-e-estado
titulo: Memória e estado do agente
descricao: Memória de curto prazo (janela), resumo de conversas longas, memória de longo prazo com busca vetorial, estado estruturado da tarefa e persistência entre sessões.
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Implementar memória de curto prazo com janela e resumo automático
- Implementar memória de longo prazo com recuperação por similaridade
- Manter estado estruturado da tarefa (dicionário validado) e persisti-lo em JSON
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Histórico cresce → janela + resumo (o simulado resume); memória de longo prazo como índice de notas (reaproveita busca vetorial); estado da tarefa (formulário sendo preenchido ao longo da conversa); persistência JSON; privacidade da memória (gancho para LGPD: o que guardar e por quanto tempo).

**Exercícios previstos.** `MemoriaCurta(limite)` com `adicionar` e `contexto()` que resume quando estoura (`expr`); `MemoriaLonga` com `lembrar(texto)` e `recordar(consulta, k)` (`expr`); `EstadoDaTarefa` com campos obrigatórios e `faltantes()` (`expr`); `salvar/carregar` (`expr`); quiz.

**Erros comuns a cobrir.** Resumo que perde dados essenciais (ids, datas); memória de longo prazo sem fonte/tempo; estado em variável global; guardar dados sensíveis sem necessidade.
