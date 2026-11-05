---
slug: n7-m6-04-uso-responsavel
titulo: 'Uso responsável: viés, alucinação, transparência e limites de uso'
descricao: Avaliar viés por grupo em respostas, comunicar incerteza e fontes, declarar o uso de IA, definir o que o sistema não deve fazer e documentar (model/system card).
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 90
tempo_min: 35
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Medir disparidades nas respostas do sistema entre grupos e cenários
- Projetar mensagens que comunicam incerteza, fontes e os limites do sistema
- Escrever um system card com finalidade, dados, avaliação, riscos e mitigação
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Retoma viés (Nível 5) e alucinação (Nível 6) no contexto de produto; testes contrafactuais (trocar nome/gênero na pergunta e comparar respostas); recusas e escopo (o assistente da secretaria não dá conselho médico); transparência (aviso de IA, citações, 'não sei'); registro de incidentes; o system card como entrega obrigatória do projeto.

**Exercícios previstos.** `teste_contrafactual(sistema, pares)` devolvendo disparidades (`expr`); `fora_de_escopo(cliente, pergunta, escopo)` (`expr`); `formatar_resposta_com_incerteza(resposta, confianca, fontes)` (`call`); `gerar_system_card(info)` (`call` com seções obrigatórias); quiz.

**Erros comuns a cobrir.** Teste de viés com um único par; recusa genérica sem encaminhar; esconder que é IA; system card sem riscos conhecidos.
