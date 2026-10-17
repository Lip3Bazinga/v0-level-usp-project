import { type PipeTransform } from "@nestjs/common"
import { NotFound } from "../errors/app-error"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** IDs inválidos respondem 404 (não vazam detalhes de validação). */
export class UuidPipe implements PipeTransform<unknown, string> {
  transform(value: unknown): string {
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) throw NotFound()
    return value.toLowerCase()
  }
}
