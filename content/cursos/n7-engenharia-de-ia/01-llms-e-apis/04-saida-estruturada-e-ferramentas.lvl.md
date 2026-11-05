---
slug: n7-m1-04-saida-estruturada-e-ferramentas
titulo: Saída estruturada e chamadas de ferramentas
descricao: Pedir JSON ao modelo, validar com schema, repetir em caso de JSON inválido, e o mecanismo de function calling (declarar ferramentas, interpretar a chamada, devolver o resultado).
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 120
tempo_min: 50
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Extrair dados estruturados de texto com saída JSON validada por schema e reparo em falha
- Declarar ferramentas com esquema de parâmetros e executar a chamada que o modelo solicita
- Encadear uma chamada de ferramenta com a resposta final ao usuário
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Prompt com formato explícito + `json.loads` + validação manual de schema (tipos, obrigatórios, enums) — `pydantic` não disponível: escreve-se `validar(obj, schema)`; reparo (reenviar com o erro); function calling: lista de ferramentas com nome, descrição e parâmetros; o simulado devolve `tool_calls` quando a pergunta casa com uma ferramenta; executar e devolver `tool` role; segurança: nunca executar código vindo do modelo (gancho para injection).

**Exercícios previstos.** `extrair_pedido(texto, cliente)` devolvendo dicionário validado (`expr`); `validar(obj, schema)` levantando `ErroDeSchema` (`call` + `raises`); `executar_com_reparo(cliente, prompt, schema, tentativas)` (`expr`); `rotear_ferramenta(resposta, ferramentas)` executando a função certa com os argumentos (`expr`); `ciclo_de_ferramenta(cliente, pergunta, ferramentas)` (`expr`); quiz.

**Erros comuns a cobrir.** `eval` na saída do modelo; aceitar JSON com campos extras não validados; executar ferramenta com argumentos não validados; loop infinito de reparo.
