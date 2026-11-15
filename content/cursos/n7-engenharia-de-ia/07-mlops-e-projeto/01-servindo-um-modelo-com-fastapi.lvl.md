---
slug: n7-m7-01-servindo-um-modelo-com-fastapi
titulo: Servindo um modelo com FastAPI
descricao: 'Da função ao endpoint: rotas, validação do corpo, carregamento do modelo na inicialização, respostas de erro, documentação automática e testes com TestClient; no sandbox, um mini-roteador simulado com a mesma forma.'
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
- Estruturar um serviço de predição (carregar modelo uma vez, validar entrada, prever, responder JSON com erros padronizados)
- Escrever os handlers como funções puras testáveis e registrá-los em um roteador
- Descrever como rodar com uvicorn, documentar com OpenAPI e containerizar com Docker
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** FastAPI não está no sandbox: a lição mostra o código real (`@app.post("/prever")`, modelos de entrada, `HTTPException`, `lifespan`, `TestClient`) e os exercícios usam `miniapi.py` (fornecido) com a mesma forma (`app.post(rota)(handler)`, `app.chamar(metodo, rota, corpo)`); handler `prever(corpo: dict) -> dict` com validação e códigos de erro; carregar o modelo (scikit-learn em `joblib`/`pickle` — com aviso de segurança) uma vez; `/saude` e `/versao`; Docker em um `Dockerfile` de 8 linhas mostrado.

**Exercícios previstos.** `validar_entrada(corpo, esquema)` (`call` + `raises`); `handler_prever(modelo)` devolvendo função que responde `{"classe", "probabilidade", "versao"}` (`expr` via `miniapi`); `handler_saude` e `handler_versao` (`expr`); `tratar_erros(handler)` padronizando respostas 4xx/5xx (`expr`); quiz sobre `lifespan`, uvicorn e Docker.

**Erros comuns a cobrir.** Carregar o modelo a cada requisição; `pickle` de fonte não confiável; devolver stack trace ao cliente; endpoint sem validação de tipos.
