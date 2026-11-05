---
slug: n1-m7-05-projeto-analisador-de-texto
titulo: 'Mini-projeto: analisador de texto'
descricao: Um programa que lê um texto e produz um relatório com estatísticas, palavras mais comuns e busca de termos.
dificuldade: iniciante
tipo: guiada
runtime: python
bibliotecas: []
xp: 150
tempo_min: 90
publicada: true
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Combinar funções de string, dicionários, ordenação e formatação em um programa completo
- Produzir um relatório com layout exato a partir de um texto de entrada
- Testar cada função isoladamente antes de montar o programa principal
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Projeto integrador dos módulos 5 a 7: `estatisticas(texto)` (caracteres, palavras, linhas, frases); `top_palavras(texto, n)` com desempate alfabético; `buscar(texto, termo)` devolvendo os números das linhas; `relatorio(texto)` montando a saída formatada; programa principal lendo o texto até uma linha `FIM`. Reforço da ideia "função pequena + teste antes de juntar".

**Passos previstos.** Leitura (especificação e exemplo completo de entrada/saída) → Exercício: `estatisticas` (`call`) → Exercício: `top_palavras` com desempate (`call`) → Exercício: `buscar` (`call`) → Exercício: programa principal (`io` em dois textos) → Quiz de revisão do módulo (3 perguntas).

**Erros comuns a cobrir.** Contar linha vazia como frase; desempate não determinístico (`sorted` só por frequência); busca sensível a maiúsculas quando o enunciado pede insensível; relatório com espaços a mais (o `io` usa `trimmed` por linha, mas o layout interno precisa bater).
