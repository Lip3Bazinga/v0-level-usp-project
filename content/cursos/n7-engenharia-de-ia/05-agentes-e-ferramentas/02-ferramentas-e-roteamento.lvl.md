---
slug: n7-m5-02-ferramentas-e-roteamento
titulo: Definir ferramentas e rotear chamadas
descricao: Esquemas de ferramentas (nome, descrição, parâmetros tipados), validação de argumentos, ferramentas compostas, permissões e o registro de ferramentas como catálogo.
dificuldade: avancado
tipo: guiada
runtime: python
bibliotecas: []
xp: 110
tempo_min: 45
publicada: false
projeto: false
solucao_apos_tentativas: 3
objetivos:
- Declarar ferramentas com esquema e gerar a descrição que vai no prompt automaticamente
- Validar argumentos antes de executar e devolver erros úteis ao modelo
- Organizar um catálogo de ferramentas com permissões (leitura vs escrita)
---

## Passo 1 · Leitura · Roteiro da lição

**O que a lição ensina.** Decorador `@ferramenta(descricao, parametros)` (reaproveita decoradores) que registra no catálogo e gera a documentação para o prompt; validação de tipos/intervalos; erros devolvidos como observação (o modelo tenta de novo); ferramentas de escrita exigem confirmação; idempotência; ferramentas que chamam outras.

**Exercícios previstos.** decorador `ferramenta` e `Catalogo.descrever()` (`expr`); `validar_argumentos(ferramenta, args)` (`call` + `raises`); `executar_com_permissao(catalogo, nome, args, permissoes)` (`expr` + `raises` para escrita sem permissão); `ferramenta_composta` (`expr`); quiz sobre idempotência.

**Erros comuns a cobrir.** Descrição vaga (o modelo escolhe a ferramenta errada); executar sem validar; ferramentas de escrita sem confirmação; nomes de parâmetros diferentes entre esquema e função.
