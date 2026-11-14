import { Injectable } from "@nestjs/common"
import { eq } from "drizzle-orm"
import { contentAssets, type ContentAssetRow } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"

/** Imagens do conteúdo gravadas pela importação do pacote. */
@Injectable()
export class ContentAssetsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Asset pelo caminho exato (`<curso>/<módulo>/<arquivo>`), ou `undefined`. */
  async findByPath(assetPath: string): Promise<ContentAssetRow | undefined> {
    const [asset] = await this.db.select().from(contentAssets).where(eq(contentAssets.path, assetPath)).limit(1)
    return asset
  }
}
