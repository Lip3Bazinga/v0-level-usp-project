import { Injectable } from "@nestjs/common"
import { and, asc, count, eq, isNotNull } from "drizzle-orm"
import { lessons, modules, type ModuleInsert } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"

@Injectable()
export class ModulesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  list() {
    return this.db.select().from(modules).orderBy(asc(modules.sortOrder), asc(modules.createdAt))
  }

  findById(id: string) {
    return this.db.query.modules.findFirst({ where: eq(modules.id, id) })
  }

  /** Lições PUBLICADAS por módulo. */
  publishedLessonCounts() {
    return this.db
      .select({ moduleId: lessons.moduleId, lessonCount: count() })
      .from(lessons)
      .where(and(eq(lessons.published, true), isNotNull(lessons.moduleId)))
      .groupBy(lessons.moduleId)
  }

  async insert(values: ModuleInsert) {
    return requireRow(await this.db.insert(modules).values(values).returning(), "modules")
  }

  async update(id: string, patch: Partial<ModuleInsert>) {
    const [module] = await this.db.update(modules).set(patch).where(eq(modules.id, id)).returning()
    return module
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db.delete(modules).where(eq(modules.id, id)).returning({ id: modules.id })
    return deleted.length > 0
  }
}
