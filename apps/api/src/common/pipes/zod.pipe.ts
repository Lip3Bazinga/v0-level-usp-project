import { type PipeTransform } from "@nestjs/common"
import type { ZodType } from "zod"
import { AppError } from "../errors/app-error"

/** Valida e normaliza a entrada com um schema Zod de `@levelusp/contracts`. */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T>) {}

  transform(value: unknown): T {
    const parsed = this.schema.safeParse(value)
    if (parsed.success) return parsed.data
    const issues = parsed.error.issues.slice(0, 20).map((i) => ({ path: i.path.join("."), message: i.message }))
    throw new AppError(400, "VALIDATION", issues[0]?.message ?? "Dados inválidos.", issues)
  }
}
