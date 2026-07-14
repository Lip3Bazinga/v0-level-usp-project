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

## 4. Testes ocultos — como sua lição é corrigida

Os testes ocultos são código Python que roda **no servidor** contra a solução
do aluno. O aluno **nunca vê** esses testes — nem abrindo as ferramentas do
navegador.

### Formato simples (asserts)

```python
assert somar(2, 3) == 5, "somar(2, 3) deveria ser 5"
assert somar(-1, 1) == 0
```

- A mensagem depois da vírgula é o que o aluno vê quando erra — capriche nela.
- Cubra casos normais, casos-limite (lista vazia, zero, negativo) e erros
  esperados.

### Formato unittest (recomendado para projetos)

```python
import unittest

class TestProjeto(unittest.TestCase):
    def test_caso_normal(self):
        self.assertEqual(calcular_media([10, 8]), 9.0)

    def test_lista_vazia(self):
        self.assertEqual(calcular_media([]), 0.0)

    def test_erro_de_tipo(self):
        with self.assertRaises(TypeError):
            adicionar_aluno({}, "X", "não é lista")
```

O aluno recebe o nome do teste + mensagem de cada falha.

### Variáveis especiais disponíveis nos testes

- `_stdout` — tudo que o aluno imprimiu com `print()`.
  Ex.: `assert "Olá" in _stdout, "imprima a saudação"`
- `_source` — o código-fonte do aluno.
  Ex.: `assert "lambda" in _source, "use lambda nesta lição"`

### Boas práticas de correção

- Teste **comportamento**, não formatação exata (evite exigir espaços exatos).
- Sempre inclua mensagens de erro didáticas — elas são o feedback do aluno.
- Antes de publicar, resolva a lição você mesmo no IDE e clique em
  **Verificar Resposta** para conferir seus próprios testes.

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
3. **Passar no projeto final** — a última lição do curso, corrigida por testes
   unittest ocultos.

Cumprido tudo, o certificado **emite sozinho**, com código de verificação
público (ex.: `LU-3F9A7-C21D0`) que qualquer pessoa pode conferir em
`/certificado/CÓDIGO` — é isso que dá validade ao certificado fora da
plataforma.

### Sobre as questões da prova

Cada questão tem: enunciado, 4 alternativas, a alternativa correta e uma
**explicação** (mostrada ao aluno que erra, após entregar a prova). O gabarito
fica guardado de forma inacessível ao navegador do aluno — assim como os
testes ocultos.

> Hoje o banco de questões é gerenciado pela equipe técnica. Envie suas
> questões no formato: enunciado + 4 alternativas + correta + explicação.

---

## 8. Checklist antes de publicar

- [ ] Descrições do curso completas e capa enviada
- [ ] Lições em ordem, com módulos nomeados de forma consistente
- [ ] Toda lição de código tem: enunciado claro, código inicial, checkpoints
      com dicas e testes ocultos com mensagens didáticas
- [ ] Você resolveu e verificou cada lição no próprio IDE
- [ ] XP condizente com o esforço (teoria: 20 · exercício: 50–125 · projeto: 250+)
- [ ] Publicou as lições **e** o curso
