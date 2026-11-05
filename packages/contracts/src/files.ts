import { z } from "zod"

/**
 * Arquivos de projeto e checkpoints: primitivas compartilhadas por lições e
 * passos. Ficam num módulo próprio para que `lessons.ts` e `steps.ts` não se
 * importem mutuamente (um ciclo de valores quebraria a avaliação do bundle).
 * `lessons.ts` reexporta tudo isto, então o resto do código importa dali.
 */

/** Arquivo de entrada executado pelo corretor e pelo botão Executar. */
export const DEFAULT_ENTRY_FILE = "main.py"

/** Arquivo de um projeto multi-arquivo. Pastas são implícitas pelo path. */
export interface ProjectFile {
  path: string
  content: string
}

/** Caminho relativo seguro: sem "..", sem barra inicial, só .py/.txt/.csv/.json/.md. */
export const projectPathSchema = z
  .string()
  .min(1)
  .max(200)
  .regex(/^(?!\/)(?!.*\.\.)[A-Za-z0-9_\-./]+\.(py|txt|csv|json|md)$/, "Caminho de arquivo inválido")

export const projectFileSchema = z.object({
  path: projectPathSchema,
  // NUL não existe em código-fonte de verdade e o PostgreSQL recusa \u0000 em jsonb (viraria 500).
  content: z.string().max(100_000).refine((content) => !content.includes("\u0000"), "O arquivo contém um caractere nulo (\\0)."),
})
export const projectFilesSchema = z
  .array(projectFileSchema)
  .min(1)
  .max(30)
  .refine((files) => files.reduce((totalLength, file) => totalLength + file.content.length, 0) <= 300_000, "Projeto grande demais")

export const checkpointSchema = z.object({
  id: z.number().int(),
  instruction: z.string().max(2000),
  hint: z.string().max(2000).optional(),
})
/** Etapa guiada de uma lição prática: instrução exibida ao aluno e dica opcional. */
export type Checkpoint = z.infer<typeof checkpointSchema>
