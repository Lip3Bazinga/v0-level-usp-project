import { type PipeTransform } from "@nestjs/common"
import type { ZodType } from "zod"
import { ValidationFailed } from "../errors/app-error"

/** Limita o tamanho da resposta de erro em payloads muito inválidos. */
const MAX_REPORTED_ISSUES = 20

/** Valida e normaliza a entrada com um schema Zod de `@levelusp/contracts`. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value)
    if (parsed.success) return parsed.data
    const issues = parsed.error.issues.slice(0, MAX_REPORTED_ISSUES).map((issue) => ({ path: issue.path.join("."), message: issue.message }))
    throw ValidationFailed(issues)
  }
}
