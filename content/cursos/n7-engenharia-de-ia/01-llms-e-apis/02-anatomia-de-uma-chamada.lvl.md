---
slug: n7-m1-02-anatomia-de-uma-chamada
titulo: Anatomia de uma chamada de API (com cliente simulado)
descricao: Mensagens e papéis (system, user, assistant), histórico, parâmetros, o objeto de resposta e uso de tokens; o módulo llm_simulado que reproduz a interface e como trocá-lo pelo real.
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
- Montar listas de mensagens com papéis e manter o histórico de uma conversa
- Ler o objeto de resposta (conteúdo, motivo de parada, uso de tokens) do cliente simulado
- Encapsular o cliente em uma classe própria para trocar o provedor sem mudar o resto do código
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O arquivo `llm_simulado.py` (fornecido como arquivo do exercício) expõe `ClienteLLM.completar(mensagens, **params) -> Resposta` com comportamento determinístico baseado em regras (ecoa instruções, responde a padrões, conta tokens); papéis e o papel do `system`; histórico crescente e truncamento; `finish_reason`; `usage`; a classe `Assistente` que encapsula o cliente e registra uso; onde entra a chave de API no cliente real (variável de ambiente, nunca no código — gancho para segurança).

**Exercícios previstos.** `montar_mensagens(sistema, historico, pergunta)` (`call`); `conversar(cliente, mensagens)` devolvendo texto e acumulando uso (`expr` com o simulado no `setup`); classe `Assistente` com `perguntar` e `custo_acumulado` (`expr`); `truncar_historico(mensagens, limite)` preservando o `system` (`call`); quiz sobre papéis.

**Erros comuns a cobrir.** Esquecer o histórico (o modelo 'não lembra'); truncar a mensagem de sistema; chave de API no código; tratar a resposta como string sem checar `finish_reason`.
