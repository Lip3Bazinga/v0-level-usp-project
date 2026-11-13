import { Body, Controller, HttpCode, Post } from "@nestjs/common"
import { ApiTags } from "@nestjs/swagger"
import { contentBundleSchema, type ContentBundle, type ContentImportSummary } from "@levelusp/contracts"
import { CurrentUser, Roles } from "@/common/decorators/auth.decorators"
import type { AuthUser } from "@/common/http/request"
import { ZodPipe } from "@/common/pipes/zod.pipe"
import { ContentService } from "./content.service"

/** Caminho (com o prefixo global) da importação: o bootstrap dá a ele um limite de corpo maior. */
export const CONTENT_IMPORT_PATH = "/api/admin/content/import"

@ApiTags("admin")
@Roles("admin")
@Controller("admin/content")
export class ContentController {
  constructor(private readonly content: ContentService) {}

  /** Importa o pacote compilado (formato 2). Corpo de até 20 MB (ver `bootstrap.ts`). */
  @HttpCode(200)
  @Post("import")
  importBundle(@CurrentUser() actor: AuthUser, @Body(new ZodPipe(contentBundleSchema)) body: ContentBundle): Promise<ContentImportSummary> {
    return this.content.importBundle(actor, body)
  }
}
