# Diagramas PlantUML

Fontes PlantUML que complementam os diagramas Mermaid embutidos na documentação, para quando um formato UML mais formal agrega valor.

## Arquivos

| Arquivo | Diagrama |
|---------|----------|
| [`component-overview.puml`](./component-overview.puml) | Componentes do sistema (visão estática) |
| [`evaluation-sequence.puml`](./evaluation-sequence.puml) | Sequência de avaliação de código (com testes) |
| [`deployment.puml`](./deployment.puml) | Implantação (nós e artefatos) |

## Como renderizar

- **VS Code:** instale a extensão *PlantUML* (jebbs) e use `Alt+D` para pré-visualizar.
- **Servidor público:** cole o conteúdo em <https://www.plantuml.com/plantuml/uml/>.
- **CLI:** `plantuml docs/diagrams/*.puml` (gera PNG/SVG). Requer Java + Graphviz.

```bash
# Exemplo: gerar SVGs
plantuml -tsvg docs/diagrams/*.puml
```
