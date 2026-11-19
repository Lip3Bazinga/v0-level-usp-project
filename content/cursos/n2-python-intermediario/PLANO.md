# Plano do Nível 2 — Python intermediário e engenharia de software

Plano de autoria do Nível 2 da trilha **Python: do zero à IA**. Cada lição
(`content/cursos/n2-python-intermediario/<módulo>/<NN>-<slug>.lvl.md`) nasceu com o frontmatter
completo e um único passo "Roteiro da lição" (o que ensinar, exercícios previstos, erros comuns).
Esse passo é **substituído** pelos passos reais. Formato dos arquivos: `content/README.md` (§3 e §4).
As regras gerais de voz e de uso dos recursos são as do `content/cursos/n1-fundamentos/PLANO.md`;
aqui ficam o que muda no Nível 2 e a sequência de passos de cada lição.

## Quem é o aluno

Concluiu o Nível 1: sabe variáveis, tipos, `if`, laços, listas, tuplas, dicionários, conjuntos,
compreensões, funções (parâmetros, retorno, escopo, docstring, `assert`), strings, `try/except`
básico e leitura de traceback. Não viu classes, módulos próprios, arquivos, geradores, decoradores,
tipagem, `unittest` nem git. Cada lição usa só o que o Nível 1 e as lições anteriores do Nível 2
ensinaram (a ordem é a dos módulos 1 a 7).

## Regras do nível

- **Passos por lição:** 5 a 8. Abre com uma Leitura que motiva o assunto com um problema concreto;
  fecha com um Quiz de 2 ou 3 perguntas. No meio, leituras curtas alternadas com prática.
- **Andaime:** o primeiro exercício de cada lição que estreia uma construção nova (classe,
  `@property`, `yield`, decorador, `with`, `TestCase`…) é `modo: lacunas` ou `modo: ordenar`; os
  seguintes são de código livre. Mini-projeto (m4-05) e projetos do nível (m7) têm só código livre.
- **Previsão:** pelo menos uma por lição em que a ordem de execução é o ponto (herança e `super`,
  `finally`, geradores, decoradores, closures, `__str__`/`__repr__`). Código determinístico, sem
  `input()`, sem erro, até 8 linhas de saída; nunca imprima `set` nem endereço de objeto
  (`<__main__.Conta object at 0x…>`).
- **Visualizador (`python visualizar`):** onde o estado muda linha a linha (atributos de instância,
  iteração com `next`, closure com contador). Até 20 linhas, sem `input()`, roda sem erro.
- **Mermaid:** `classDiagram` para hierarquias de classes (módulo 1) e `flowchart` para fluxo de
  exceções, de importação e do ciclo de TDD/git. No máximo 8 nós.
- **Exercícios:** pelo menos 2 soluções erradas por exercício, cada uma um erro que o aluno comete
  de verdade (as do roteiro em "Erros comuns" entram aqui). Todo checkpoint tem pelo menos um caso.
  O código inicial reprova. `name` em todo caso; `hint` não entrega a resposta; `reveal` fica falso.
  Verifique comportamento com `expr`/`call`/`io`/`unittest`; use `source` só para exigir a
  construção que é o assunto do passo (`defines_class`, `decorator`, `uses yield`, `catches`).
- **Leitura:** 200 caracteres no mínimo e 400 palavras no máximo, com um bloco de código
  ilustrativo. Mensagens de erro aparecem exatamente como o Python 3.14 as mostra.
- **Sem vídeo e sem imagem** (como no Nível 1). Sem marcadores de pendência no texto.
- **Frontmatter:** mantenha slug, título, `xp`, `tempo_min`, `dificuldade` e objetivos; troque só
  `publicada: false` por `publicada: true` quando a lição estiver verificada.

## O que o ambiente de correção permite

O `main.py` do aluno roda num CPython 3.14 isolado (WASI): **sem rede, sem `pip`, sem `subprocess`,
sem `git`, sem `pytest`, sem threads**. A biblioteca padrão pura está disponível (`dataclasses`,
`abc`, `json`, `csv`, `pathlib`, `logging`, `itertools`, `functools`, `collections`, `datetime`,
`argparse`, `unittest`, `typing`, `contextlib`, `re`, `math`, `random`). Arquivos podem ser lidos e
escritos na pasta do projeto; arquivos de dados entram no passo como blocos `text path=…`.

Consequências para as lições:

- **pip e ambientes virtuais (m2-05), git (m6-05, m6-06):** não há como executar os comandos. A
  lição é feita de leituras com os comandos e suas saídas, quizzes, e exercícios em Python que
  **modelam** o conceito (por exemplo: interpretar um `requirements.txt`, comparar versões, simular
  o grafo de commits com dicionários, resolver um conflito de merge em texto).
- **pytest (m6-04):** não está instalado. Ensine a sintaxe na leitura (`assert` simples, funções
  `test_*`, `pytest.raises`, `parametrize`) e pratique TDD com funções `test_*` de `assert` puro e
  com `unittest`; os casos `unittest` da plataforma corrigem suítes `TestCase`.
- **Linha de comando (m2-04):** `argparse` funciona passando a lista de argumentos
  (`parser.parse_args(["--n", "3"])`); nunca dependa de `sys.argv` real.
- **Módulos e pacotes (m2-01, m2-02):** o projeto do passo pode ter vários arquivos
  (`python path=utilitarios.py`, `python path=loja/__init__.py`); o aluno edita o `main.py` e, nos
  passos indicados, os outros arquivos.
- **logging (m3-04):** a saída vai para `stderr` por padrão; para corrigir com `io`, configure o
  handler em `sys.stdout`, ou verifique com `expr` o que um handler em memória recebeu.
- **Datas e acaso:** nada de `datetime.now()` nem `random` sem semente em passo verificado.
- **Type hints (m6-01):** não há `mypy`. Verifique `__annotations__` com `expr` e o comportamento.

## Sequência de passos por lição

Sequência como foi escrita e verificada (`pnpm content:verify --curso n2-python-intermediario`). Exercício sem modo indicado é de código livre.

### Programação orientada a objetos

- **n2-m1-01-classes-e-objetos**: Leitura *Dados e funções soltos* → Leitura *self e objetos independentes* → Exercício (lacunas) *Complete a classe Aluno* → Previsão *Quem é quem* → Exercício *Retângulos* → Leitura *Atributo de classe e atributo de instância* → Exercício *Contador de cliques* → Quiz *Classes e objetos*
- **n2-m1-02-metodos-e-str-repr**: Leitura *Métodos que conversam entre si* → Previsão *Como um objeto aparece* → Leitura *__str__ para pessoas, __repr__ para quem programa* → Exercício (lacunas) *Conta bancária* → Exercício *Produto com as duas representações* → Leitura *Atributos de classe: constantes e contadores* → Exercício *Pedidos numerados* → Quiz *Métodos e representações*
- **n2-m1-03-encapsulamento-e-properties**: Leitura *Quem protege o saldo?* → Leitura *@property: um método que se lê como atributo* → Previsão *Quem passa pelo setter* → Leitura *Setter com validação* → Exercício (lacunas) *Temperatura* → Exercício *Saldo protegido* → Exercício *Idade validada* → Quiz *Encapsulamento*
- **n2-m1-04-heranca-e-super**: Leitura *Duas classes quase iguais* → Leitura *Sobrescrever e estender com super()* → Exercício (lacunas) *Gerente com bônus* → Previsão *Quem roda primeiro* → Exercício *Formas geométricas* → Leitura *isinstance, a ordem de busca e quando não herdar* → Exercício *Veículos e garagem* → Quiz *Herança*
- **n2-m1-05-polimorfismo-e-classes-abstratas**: Leitura *A cadeia de if que só cresce* → Previsão *A mesma chamada, quatro respostas* → Exercício *Notificadores* → Leitura *Classes abstratas* → Exercício (lacunas) *Formas de pagamento* → Exercício *Frete sem if* → Quiz *Polimorfismo*
- **n2-m1-06-dataclasses**: Leitura *Classes que só guardam dados* → Previsão *O que o @dataclass escreveu* → Leitura *frozen e order* → Exercício (lacunas) *Ponto congelado* → Exercício *Lista de chamada por nota* → Leitura *Listas como padrão e validação* → Exercício *Tarefas com etiquetas* → Quiz *Dataclasses*
- **n2-m1-07-metodos-especiais**: Leitura *O que está por trás de len, == e <* → Previsão *Quem o Python chama* → Exercício (lacunas) *Dinheiro em centavos* → Leitura *Objetos que se comportam como coleção* → Exercício *Baralho* → Leitura *Operadores aritméticos* → Exercício *Vetor2D* → Quiz *Métodos especiais*

### Módulos, pacotes e biblioteca padrão

- **n2-m2-01-import-e-modulos-proprios**: Leitura *Um programa em vários arquivos* → Exercício (lacunas) *Três jeitos de importar* → Previsão *O que roda quando você importa* → Leitura *O que o import faz de verdade* → Exercício *Tire as funções do main* → Leitura *Biblioteca ou programa: o guarda __main__* → Exercício *Proteja o módulo de estatísticas* → Quiz *Módulos sem tropeço*
- **n2-m2-02-pacotes**: Leitura *Quando os módulos viram muitos* → Exercício (lacunas) *Importe do pacote loja* → Leitura *O que vai no __init__.py* → Exercício *Monte a vitrine do pacote* → Leitura *Absoluta ou relativa* → Exercício *Conserte o pacote escola* → Leitura *A cara de um projeto Python* → Quiz *Pacotes*
- **n2-m2-03-biblioteca-padrao-essencial**: Leitura *Antes de escrever, procure na biblioteca* → Exercício (lacunas) *Prazos com datetime* → Exercício *Sorteio de equipes que dá para repetir* → Leitura *collections: estruturas sob medida* → Exercício *Contar e agrupar* → Previsão *itertools conta por você* → Exercício *Senhas, duplas e totais* → Quiz *Qual ferramenta?*
- **n2-m2-04-linha-de-comando-e-argumentos**: Leitura *Programas que recebem argumentos* → Exercício (lacunas) *Um somador de terminal* → Leitura *argparse: argumentos com nome, tipo e ajuda* → Previsão *O que o argparse entrega* → Exercício *Conversor de temperatura com argparse* → Exercício *Separe a lógica da linha de comando* → Quiz *Linha de comando*
- **n2-m2-05-pip-e-ambientes-virtuais**: Leitura *Um projeto, um ambiente* → Leitura *Criar, ativar e usar o venv* → Quiz *O ambiente certo* → Leitura *pip e requirements.txt* → Exercício *Leia a saída do pip freeze* → Exercício *Compare versões como o pip* → Quiz *Dependências*

### Exceções e robustez

- **n2-m3-01-hierarquia-de-excecoes-e-raise**: Leitura *Exceções são classes* → Exercício (lacunas) *Um except para chave e posição* → Leitura *raise com mensagem que ajuda* → Exercício *validar_cpf(texto)* → Leitura *Relançar e encadear* → Previsão *Quem imprime o quê* → Exercício *ler_inteiro(config, chave)* → Quiz *A árvore e o raise*
- **n2-m3-02-excecoes-proprias**: Leitura *Quando ValueError não basta* → Exercício (lacunas) *A hierarquia do banco* → Leitura *Exceções que carregam dados* → Previsão *Qual except pega* → Exercício *Estoque com erros que explicam* → Exercício *Processar uma fila de pedidos* → Quiz *Suas exceções*
- **n2-m3-03-finally-e-context-managers**: Leitura *Limpeza que não pode falhar* → Previsão *return, exceção e finally* → Leitura *O protocolo do with* → Exercício (lacunas) *Sessao que sempre fecha* → Exercício *Transacao que desfaz* → Leitura *contextmanager: o with numa função* → Exercício *cronometro com contextmanager* → Quiz *Limpeza garantida*
- **n2-m3-04-logging**: Leitura *Do print ao logging* → Previsão *Quais mensagens passam* → Exercício (lacunas) *Fechamento do caixa com níveis* → Leitura *Registrar exceções* → Exercício *Importar pedidos sem parar no erro* → Exercício *Tarefas noturnas com traceback* → Quiz *Níveis e configuração*

### Arquivos e dados

- **n2-m4-01-ler-e-escrever-texto**: Leitura *Dados que sobrevivem ao programa* → Previsão *w apaga, a anexa* → Exercício (lacunas) *Salvar e carregar uma lista* → Leitura *Linha a linha, e o arquivo que não existe* → Exercício *Contar a lista de presença* → Exercício *Livro de ocorrências* → Quiz *Modos e with*
- **n2-m4-02-csv**: Leitura *Por que não basta um split* → Previsão *reader, aspas e DictReader* → Exercício (lacunas) *Total por categoria* → Leitura *Escrever CSV com DictWriter* → Exercício *Relatório de notas para o Excel* → Exercício *Filtrar um CSV* → Quiz *CSV sem surpresas*
- **n2-m4-03-json**: Leitura *Um formato que todo programa entende* → Previsão *Ida e volta* → Exercício (lacunas) *Salvar e carregar as tarefas* → Leitura *O que não vira JSON* → Exercício *Eventos do calendário* → Leitura *Carregar, alterar, salvar* → Exercício *Configurações com valores padrão* → Quiz *JSON na prática*
- **n2-m4-04-pathlib-e-sistema-de-arquivos**: Leitura *Caminhos como objetos* → Previsão *As partes de um caminho* → Leitura *Listar, criar, mover e apagar* → Exercício (ordenar) *Fotos por extensão* → Exercício *Organizar a pasta de downloads* → Exercício *Renomear fotos em lote* → Quiz *Caminhos sem tropeço*
- **n2-m4-05-mini-projeto-agenda-persistente**: Leitura *A especificação da agenda* → Exercício *Contato e Agenda* → Exercício *Buscar e remover* → Exercício *Salvar e carregar em JSON* → Exercício *Exportar e importar CSV* → Exercício *O laço de comandos* → Quiz *Revisão do módulo*

### Iteradores, geradores e decoradores

- **n2-m5-01-protocolo-de-iteracao**: Leitura *O que o for faz por baixo* → Previsão *O iterador que já andou* → Leitura *Iterável e iterador na sua classe* → Exercício (lacunas) *A classe Contagem* → Exercício *Fila que pode ser percorrida de novo* → Exercício *Um iterador que nunca acaba* → Quiz *Iteráveis e iteradores*
- **n2-m5-02-geradores**: Leitura *Uma função que pausa* → Previsão *Quando o corpo roda* → Exercício (lacunas) *Pares e Fibonacci sob demanda* → Leitura *Pipeline de geradores* → Exercício *ler_registros: um CSV sob demanda* → Exercício *Filtrar e somar em linha de produção* → Quiz *Geradores*
- **n2-m5-03-expressoes-geradoras-e-itertools**: Leitura *Um gerador em uma linha* → Previsão *any, next e um gerador que se gasta* → Exercício (lacunas) *Somas e perguntas sem lista* → Leitura *A caixa de ferramentas itertools* → Exercício *O primeiro que serve* → Exercício *Extrato, variações e sequências* → Quiz *Geradores em uma linha*
- **n2-m5-04-funcoes-de-ordem-superior-e-closures**: Leitura *Funções que fabricam funções* → Previsão *Duas fábricas, dois estados* → Exercício (lacunas) *Fábricas de funções* → Leitura *nonlocal: mudar o que foi capturado* → Exercício *Contador e média acumulada* → Exercício *O laço que captura e o partial* → Quiz *Closures*
- **n2-m5-05-decoradores**: Leitura *Embrulhar uma função* → Previsão *Quando cada parte roda* → Exercício (lacunas) *registrar com functools.wraps* → Leitura *Decoradores com parâmetros* → Exercício *tentar_novamente(vezes)* → Exercício *memoizar: lembrar resultados* → Quiz *Decoradores*
- **n2-m5-06-args-kwargs-e-assinaturas**: Leitura *Quantos argumentos?* → Previsão *Quem recebe o quê* → Exercício (ordenar) *media com quantas notas vierem* → Exercício *montar_url com **parametros* → Leitura *Repassar argumentos e forçar nomes* → Exercício *aplicar_em_lote e criar_usuario* → Quiz *Assinaturas*

### Tipagem, testes, git e estilo

- **n2-m6-01-type-hints**: Leitura *O que é notas?* → Previsão *A anotação não converte nada* → Exercício (lacunas) *Anote quatro funções* → Leitura *Quando pode faltar: int | None* → Exercício *Buscar e tratar o None* → Leitura *O mypy no terminal* → Exercício *O mypy reclamou do carrinho* → Quiz *Lendo o mypy*
- **n2-m6-02-pep-8-e-codigo-limpo**: Leitura *Código é lido mais vezes do que escrito* → Exercício *Renomeie no padrão* → Leitura *Uma função, uma tarefa* → Exercício *Quebre a função f* → Previsão *is None ou == None?* → Exercício *Dê nome aos números mágicos* → Leitura *Formatador e linter* → Quiz *Estilo*
- **n2-m6-03-unittest**: Leitura *Do assert solto ao unittest* → Exercício (lacunas) *Sua primeira suíte* → Exercício *Testes que pegam defeitos no CPF* → Leitura *setUp e um teste por comportamento* → Previsão *Quando o setUp roda* → Exercício *A suíte da conta bancária* → Exercício *O teste que passa por engano* → Quiz *Asserções*
- **n2-m6-04-pytest-e-tdd**: Leitura *pytest: testes sem classe* → Leitura *parametrize e fixtures* → Exercício *Converta a suíte para o estilo pytest* → Leitura *O ciclo vermelho, verde, refatora* → Exercício *Vermelho: os testes do carrinho primeiro* → Exercício *Verde: faça os testes passarem* → Exercício *Refatore: os cupons numa tabela* → Quiz *pytest e TDD*
- **n2-m6-05-git-basico**: Leitura *agenda_final_v2_agora_vai.py* → Leitura *O ciclo básico, passo a passo* → Exercício *Simule o git status* → Leitura *Ignorar, desfazer e explicar* → Exercício *O que o .gitignore ignora* → Exercício *Revise a mensagem de commit* → Quiz *O ciclo do git*
- **n2-m6-06-git-colaborativo**: Leitura *Branches: trabalhar sem quebrar a main* → Exercício *O grafo de commits* → Leitura *Quando as duas branches mudam a mesma linha* → Exercício *Resolva o conflito* → Leitura *GitHub, pull requests e revisão* → Exercício *O PR pode entrar na main?* → Quiz *Trabalho em equipe*

### Projetos do nível

- **n2-m7-01-projeto-biblioteca**: Leitura *O que você vai construir* → Previsão *Contas com datas* → Exercício *Modelos e erros* → Exercício *Cadastro e empréstimo* → Exercício *Devolução e relatório de atrasos* → Exercício *Salvar e carregar o acervo* → Exercício *A suíte de testes* → Quiz *Autoavaliação*
- **n2-m7-02-projeto-analisador-de-logs**: Leitura *O que você vai construir* → Previsão *Um gerador que se gasta* → Exercício *A entrada: parsear e os geradores* → Exercício *As agregações* → Exercício *Cronômetro, resumo e exportações* → Exercício *A linha de comando* → Exercício *A suíte de testes* → Quiz *Autoavaliação*

