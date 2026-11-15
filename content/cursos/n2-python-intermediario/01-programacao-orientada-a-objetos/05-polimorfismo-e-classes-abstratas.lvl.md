---
slug: n2-m1-05-polimorfismo-e-classes-abstratas
titulo: Polimorfismo e classes abstratas
descricao: Interfaces implícitas (duck typing), classes abstratas com abc e o padrão 'estratégia' com objetos intercambiáveis.
dificuldade: intermediario
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Escrever código que funciona com qualquer objeto que tenha os métodos esperados (duck typing)
- Definir classes abstratas com ABC e @abstractmethod e explicar quando usá-las
- Substituir cadeias de if/elif por polimorfismo
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Polimorfismo: a mesma chamada, comportamentos diferentes; duck typing ("se nada como pato..."); `abc.ABC` e `@abstractmethod` para obrigar subclasses a implementar (instanciar a abstrata levanta `TypeError`); o padrão estratégia: `CalculadoraDeFrete` recebendo um objeto `Transportadora`; substituição de `if tipo == "pix" elif ...` por classes `Pagamento`.

**Exercícios previstos.** `Pagamento` abstrato com `cobrar(valor)` e três implementações (`expr` + `raises TypeError` ao instanciar a abstrata); `Notificador` com `enviar(mensagem)` em duas classes e função `notificar_todos(lista)` (`expr` com `expected_stdout`); refatorar função com `if/elif` por tipo em classes (`source defines_class` × 3 + `expr`); quiz sobre duck typing vs herança.

**Erros comuns a cobrir.** Esquecer de decorar o método abstrato; `isinstance` em cadeia dentro da função polimórfica (anula o polimorfismo); subclasse que não implementa o método abstrato (`TypeError` só na instanciação, não na definição); assinaturas diferentes entre implementações.
