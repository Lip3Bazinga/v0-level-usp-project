import { Injectable } from "@nestjs/common"
import type { Module, ModuleInput, ModuleUpdateInput } from "@levelusp/contracts"
import { NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { AuditService } from "../audit/audit.service"
import { toModule } from "./catalog.mapper"
import { ModulesRepository } from "./modules.repository"

@Injectable()
export class ModulesService {
  constructor(
    private readonly repo: ModulesRepository,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<Module[]> {
    return (await this.repo.list()).map(toModule)
  }

  async lessonCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    for (const r of await this.repo.publishedLessonCounts()) if (r.moduleId) counts[r.moduleId] = r.n
    return counts
  }

  async create(actor: AuthUser, input: ModuleInput): Promise<Module> {
    const row = await this.repo.insert({
      title: input.title,
      description: input.description,
      icon: input.icon,
      color: input.color,
      sortOrder: input.sort_order,
    })
    await this.audit.log(actor, "module.create", `module:${row.id}`, { title: row.title })
    return toModule(row)
  }

  async update(actor: AuthUser, id: string, input: ModuleUpdateInput): Promise<Module> {
    const patch = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.sort_order !== undefined ? { sortOrder: input.sort_order } : {}),
    }
    const row = Object.keys(patch).length ? await this.repo.update(id, patch) : await this.repo.findById(id)
    if (!row) throw NotFound("Módulo")
    await this.audit.log(actor, "module.update", `module:${id}`, { fields: Object.keys(input) })
    return toModule(row)
  }

  async remove(actor: AuthUser, id: string): Promise<void> {
    if (!(await this.repo.delete(id))) throw NotFound("Módulo")
    await this.audit.log(actor, "module.delete", `module:${id}`, {}, "warning")
  }
}
