# Guia do Professor — Criando Conteúdo no LevelUSP

Este guia é para **professores e criadores de conteúdo**. Você não precisa
saber programar a plataforma — apenas Python e vontade de ensinar. 🙂

---

## 1. Seu acesso

1. Crie sua conta normalmente e, no seu perfil, solicite acesso de professor
   ("Quero ensinar"). Um administrador aprova a solicitação.
2. Aprovado, você passa a ver a área **/teacher**, com seus cursos e lições.

---

## 2. Criando um curso

1. Na área do professor, clique em **Novo curso**.
2. Preencha:
   - **Título e descrição curta** — aparecem no catálogo.
   - **Descrição longa** — a página do curso; aceita Markdown (negrito, listas…).
   - **Nível** — iniciante, intermediário ou avançado.
   - **Tags e horas estimadas** — ajudam o aluno a escolher.
   - **Imagem de capa** — salve o curso primeiro, depois envie a imagem.
3. O curso nasce como **rascunho**. Publique só quando as lições estiverem prontas.

---

## 3. Criando lições

Cada lição pertence a um **módulo** (ex.: "Módulo 1 · Fundamentos") — módulos
agrupam lições na página do curso e no dashboard do aluno.

### Lição teórica
Só leitura, sem código. Escreva o conteúdo no **editor de texto rico** (títulos,
negrito, listas, imagens, blocos de código ilustrativos). Use para conceitos,
introduções de módulo e boas práticas.

### Lição de questionário
Múltipla escolha, sem IDE. No editor, escolha **❓ Questionário** em *Tipo de
aula* — surge a aba **Questões**. Para cada pergunta você define:

- **Enunciado** da questão.
- **Alternativas** (mínimo 2) — clique no círculo à esquerda para marcar a
  correta.
- **Explicação** (opcional) — aparece para o aluno depois da correção,
  independentemente de ele ter acertado.

Em *Configurações* você define a **nota mínima** (padrão 70%). O aluno pode
refazer quantas vezes quiser; o XP é creditado uma única vez, quando ele atinge
a nota. O campo **Conteúdo** continua disponível: use para um texto curto de
contexto antes das perguntas.

> **Segurança:** o gabarito e as explicações ficam numa tabela protegida do
> banco e **nunca são enviados ao navegador do aluno**. A correção acontece
> apenas no servidor — mesmo modelo dos casos de teste e da prova final.

### Lição de código
O aluno programa num IDE com Python de verdade no navegador. Você define:

- **Enunciado** (Markdown) — a teoria + o que o aluno deve fazer.
- **Código inicial** — o esqueleto que o aluno recebe (funções com `pass`,
  comentários guiando o que implementar).
- **Checkpoints** — passos com **dicas** que o aluno pode revelar se travar.
- **Testes ocultos** — como a plataforma corrige (seção 4).
- **XP** — recompensa por concluir (sugestão: 50–125; projeto final: 250–300).
- **Bibliotecas** — se a lição usa numpy, pandas etc., selecione do catálogo.

---

## 4. Casos de teste — como sua lição é corrigida

Na aba **Testes** do editor de lição você cadastra **casos de teste**. Quando o
aluno clica em **Verificar Resposta**, o código dele roda num ambiente isolado
(WebAssembly, sem internet nem acesso ao servidor) e a plataforma compara o
resultado com o que você definiu. O aluno **nunca vê** o valor esperado — nem
pelas ferramentas do navegador — a menos que você marque "mostrar o esperado".

| Tipo de caso | Use quando… | Exemplo |
|---|---|---|
| **Chamar função** | o aluno escreve uma função | `somar(2, 3)` deve retornar `5` |
| **Entrada e saída** | o programa usa `input()`/`print()` | entrada `3\n4` → saída `7` |
| **Valor de variável** | o aluno deve criar variáveis | `linguagem` deve ser `"Python"` (tipo `str`) |
| **Estrutura do código** | você quer exigir/proibir uma construção | "use lambda", "não use `sum()`", "defina a classe `Conta`" |
| **Legado** | gabaritos antigos em `assert`/`unittest` | só para conteúdo migrado — converta quando puder |

Dicas:

- Valores são escritos em JSON: `true`/`false`/`null` (não `True`/`None`),
  aspas duplas em textos, listas `[1, 2]`.
- Para números com casas decimais, informe uma **tolerância** (ex.: `0.001`).
- Para diferenciar `3` de `3.0` ou lista de tupla, preencha o **tipo Python**.
- O campo **dica** aparece para o aluno quando o caso falha — capriche nela.
- A **prévia** ao lado de cada caso mostra exatamente a mensagem que o aluno verá.
- Cubra casos normais, casos-limite (lista vazia, zero, negativo) e erros.
- Uma lição de código só pode ser **publicada** se tiver ao menos um caso.

### Por que não usamos mais `assert` direto?

No formato antigo, os testes rodavam junto com o código do aluno, e um aluno
mal-intencionado conseguia ler o gabarito ou forjar a aprovação. Com casos
declarativos, a comparação é feita fora do ambiente do aluno. Casos "legados"
continuam funcionando, mas a correção é marcada como mais fraca.

### Boas práticas de correção

- Teste **comportamento**, não formatação exata (o modo "trimmed" ignora
  espaços no fim das linhas).
- Antes de publicar, resolva a lição você mesmo no IDE e clique em
  **Verificar Resposta**.

---

## 5. Projetos multi-arquivo

Uma lição pode ter vários arquivos iniciais (ex.: `main.py` + `utils/texto.py`).
O aluno vê a árvore no explorador do IDE e pode criar/renomear arquivos.
Os imports entre arquivos funcionam normalmente (`from utils.texto import ...`).

---

## 6. Catálogo de bibliotecas

As lições só podem usar bibliotecas do **catálogo** aprovado (numpy, pandas,
matplotlib…). Precisa de uma que não está lá? Na área do professor, envie uma
**solicitação de biblioteca** com o caso de uso — um administrador revisa e,
aprovando, ela entra no catálogo para todos.

---

## 7. Prova final e certificação

Cursos com certificação têm três requisitos para o aluno:

1. **Concluir todas as lições** (incluindo o projeto final);
2. **Passar na prova teórica** — múltipla escolha, corrigida automaticamente
   (nota mínima 70%, 45 minutos, novas tentativas após 1h);
3. **Passar no projeto final** — a última lição do curso, corrigida pelos
   casos de teste.

Cumprido tudo, o certificado **emite sozinho**, com código de verificação
público (ex.: `LVL-7K2M-Q9XP`) que qualquer pessoa pode conferir em
`/certificado/CÓDIGO` — é isso que dá validade ao certificado fora da
plataforma.

### Sobre as questões da prova

Cada questão tem: enunciado, 4 alternativas, a alternativa correta e uma
**explicação** (mostrada ao aluno que erra, após entregar a prova). O gabarito
fica guardado de forma inacessível ao navegador do aluno — assim como os
casos de teste.

> O banco de questões é gerenciado no painel de administração
> (**Admin → Questões da prova**): enunciado, de 2 a 8 alternativas, a correta
> e a explicação.

---

## 8. Checklist antes de publicar

- [ ] Descrições do curso completas e capa enviada
- [ ] Lições em ordem, com módulos nomeados de forma consistente
- [ ] Toda lição de código tem: enunciado claro, código inicial, checkpoints
      com dicas e casos de teste com dicas didáticas
- [ ] Você resolveu e verificou cada lição no próprio IDE
- [ ] XP condizente com o esforço (teoria: 20 · exercício: 50–125 · projeto: 250+)
- [ ] Publicou as lições **e** o curso
