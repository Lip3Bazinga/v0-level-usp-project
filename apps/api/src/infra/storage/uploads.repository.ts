import { Injectable } from "@nestjs/common"
import { and, eq } from "drizzle-orm"
import { uploads } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"

/** Registro de quem enviou cada imagem: só o dono pode usá-la no próprio perfil ou curso. */
@Injectable()
export class UploadsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  /** Registra o dono de um arquivo recém-gravado no volume. */
  async create(name: string, ownerId: string, sizeBytes: number): Promise<void> {
    await this.db.insert(uploads).values({ name, ownerId, bytes: sizeBytes })
  }

  /** Se `name` foi enviado por `ownerId` (impede usar a imagem de outra pessoa). */
  async isOwnedBy(name: string, ownerId: string): Promise<boolean> {
    const upload = await this.db.query.uploads.findFirst({ where: and(eq(uploads.name, name), eq(uploads.ownerId, ownerId)), columns: { name: true } })
    return Boolean(upload)
  }

  /** Apaga o registro só se for do dono; devolve se havia o que apagar. */
  async deleteOwned(name: string, ownerId: string): Promise<boolean> {
    const deleted = await this.db.delete(uploads).where(and(eq(uploads.name, name), eq(uploads.ownerId, ownerId))).returning({ name: uploads.name })
    return deleted.length > 0
  }
}
