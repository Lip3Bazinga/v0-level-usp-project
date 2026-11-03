import { Injectable } from "@nestjs/common"
import { and, asc, count, eq, isNotNull } from "drizzle-orm"
import { lessons, modules, type ModuleInsert } from "@levelusp/db"
import { requireRow } from "@/common/database/rows"
import { InjectDb, type Database } from "@/infra/database/database.module"
import type { ModuleRow } from "@levelusp/db"

/** Lições publicadas de um módulo (`moduleId` só é null se o filtro mudar). */
export interface ModuleLessonCountRow {
  moduleId: string | null
  lessonCount: number
}

@Injectable()
export class ModulesRepository {
  constructor(@InjectDb() private readonly db: Database) {}

  list(): Promise<ModuleRow[]> {
    return this.db.select().from(modules).orderBy(asc(modules.sortOrder), asc(modules.createdAt))
  }

  findById(id: string): Promise<ModuleRow | undefined> {
    return this.db.query.modules.findFirst({ where: eq(modules.id, id) })
  }

  /** Lições PUBLICADAS por módulo. */
  listPublishedLessonCounts(): Promise<ModuleLessonCountRow[]> {
    return this.db
      .select({ moduleId: lessons.moduleId, lessonCount: count() })
      .from(lessons)
      .where(and(eq(lessons.published, true), isNotNull(lessons.moduleId)))
      .groupBy(lessons.moduleId)
  }

  async create(values: ModuleInsert): Promise<ModuleRow> {
    return requireRow(await this.db.insert(modules).values(values).returning(), "modules")
  }

  async update(id: string, patch: Partial<ModuleInsert>): Promise<ModuleRow | undefined> {
    const [module] = await this.db.update(modules).set(patch).where(eq(modules.id, id)).returning()
    return module
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db.delete(modules).where(eq(modules.id, id)).returning({ id: modules.id })
    return deleted.length > 0
  }
}
