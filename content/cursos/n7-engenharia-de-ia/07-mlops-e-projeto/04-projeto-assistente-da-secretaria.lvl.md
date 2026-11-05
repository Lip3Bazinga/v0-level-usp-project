---
slug: n7-m7-04-projeto-assistente-da-secretaria
titulo: 'Projeto final: assistente de atendimento da secretaria'
descricao: Construa um assistente que responde dúvidas de alunos com RAG sobre regimento, calendário e FAQ, usa ferramentas (prazos, protocolos), passa por avaliação e testes adversariais, respeita a LGPD e é servido por uma API, com system card.
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 300
tempo_min: 240
publicada: false
projeto: true
solucao_apos_tentativas: 3
objetivos:
- Integrar RAG híbrido, agente com ferramentas, guardrails e memória em um sistema único e testado
- Atingir metas de avaliação (recall de recuperação, fidelidade, taxa de sucesso adversarial) no conjunto fornecido
- Servir o assistente por uma API com validação, mascaramento de dados pessoais e logs estruturados
- Entregar um system card gerado pelo código com finalidade, avaliação, riscos e mitigação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Projeto exigido para o certificado e para a trilha. Material fornecido: corpus da secretaria (regimento, calendário, FAQ, ~40 documentos), 60 perguntas de avaliação com trechos e respostas de referência, 20 ataques adversariais, o cliente simulado e o `miniapi`. Módulos e funções exigidas: `indexacao.py` (`construir_indice(documentos) -> Indice` híbrido com BM25 + vetorial + RRF), `assistente.py` (`Assistente.responder(pergunta, sessao) -> Resposta` com citações, recusa fora de escopo e memória de sessão), `ferramentas.py` (`calcular_prazo`, `abrir_protocolo` com confirmação, `consultar_calendario`), `seguranca.py` (`isolar_dados`, `validar_saida`, `mascarar_dados_pessoais`), `avaliacao.py` (`avaliar(assistente, conjunto) -> Relatorio` com recall@3 ≥ 0,8, fidelidade ≥ 0,9, ataques bem-sucedidos ≤ 10 %), `api.py` (handlers `/perguntar`, `/saude`, `/versao` com logs estruturados) e `system_card.py` (`gerar(relatorio) -> str`). Testes `unittest` com cenários (mínimo 10).

**Passos previstos.** Leitura (especificação, material, metas e critérios) → índice híbrido (`expr` com recall@3) → assistente com citações e recusa (`expr`) → ferramentas e confirmação (`expr` + `raises`) → segurança (`expr` com a suíte adversarial) → avaliação completa (`expr` + `tolerance`) → API (`expr` via `miniapi`) → testes (`unittest`) → system card (`call` com `match: contains`) → quiz de autoavaliação.

**Erros comuns a cobrir.** Índice só vetorial falhando em códigos de disciplina; agente com ferramenta de escrita acessível a conteúdo recuperado; logs com dados pessoais sem mascarar; avaliação rodada com perguntas usadas para ajustar o prompt; system card sem os resultados adversariais.
