---
slug: n7-m6-02-prompt-injection-e-defesas
titulo: Prompt injection e defesas
descricao: 'Injeção direta e indireta (via documentos e ferramentas), exfiltração de dados, jailbreaks; defesas em camadas: separação de privilégios, validação, sandbox de ferramentas, detecção e testes adversariais.'
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 130
tempo_min: 55
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Reproduzir ataques de injeção direta e indireta no sistema RAG/agente simulado
- Implementar defesas em camadas (privilégio mínimo das ferramentas, validação de saída, isolamento de dados, detecção)
- Montar uma suíte de testes adversariais e medir a taxa de sucesso dos ataques antes e depois
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** O problema estrutural (instrução e dado no mesmo canal); ataques: 'ignore as instruções', instruções escondidas em documentos indexados (o simulado obedece a instruções em trechos recuperados quando o prompt não as isola), exfiltração via ferramenta de envio, jailbreaks; defesas: delimitar e rotular dados como não confiáveis, privilégio mínimo (ferramentas de escrita fora do alcance de conteúdo externo), validação de saída (sem URLs/dados sensíveis não solicitados), detecção por regras e por classificador, confirmação humana; não existe defesa perfeita — reduzir impacto.

**Exercícios previstos.** `ataque_indireto(rag, documento_malicioso)` demonstrando o problema (`expr` esperando o comportamento inseguro na versão sem defesa); `isolar_dados(trechos)` com rótulos e instruções no sistema (`call`); `politica_de_ferramentas(contexto)` restringindo escrita (`expr`); `validar_saida(resposta, politica)` (`call`); `suite_adversarial(sistema, ataques)` devolvendo taxa de sucesso < limiar após defesas (`expr`); quiz.

**Erros comuns a cobrir.** Confiar em 'instrução no system prompt' como única defesa; filtrar só palavras-chave; dar ao agente ferramentas que ele não precisa; não testar com documentos maliciosos no índice.
