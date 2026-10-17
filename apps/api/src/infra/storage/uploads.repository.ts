import { Injectable } from "@nestjs/common"
import { and, eq } from "drizzle-orm"
import { uploads } from "@levelusp/db"
import { InjectDb, type Database } from "@/infra/database/database.module"

@Injectable()
export class UploadsRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  async insert(name: string, ownerId: string, sizeBytes: number): Promise<void> {
    await this.db.insert(uploads).values({ name, ownerId, bytes: sizeBytes })
  }

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
