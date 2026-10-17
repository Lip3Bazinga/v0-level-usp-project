import { Injectable } from "@nestjs/common"
import type { Module, ModuleInput, ModuleUpdateInput } from "@levelusp/contracts"
import type { ModuleInsert } from "@levelusp/db"
import { NotFound } from "@/common/errors/app-error"
import type { AuthUser } from "@/common/http/request"
import { buildPatch, type PatchMapping } from "@/common/mapping/patch"
import { AuditService } from "../audit/audit.service"
import { toModule } from "./catalog.mapper"
import { ModulesRepository } from "./modules.repository"

const MODULE_PATCH: PatchMapping<ModuleUpdateInput, ModuleInsert> = {
  title: (title) => ({ title }),
  description: (description) => ({ description }),
  icon: (icon) => ({ icon }),
  color: (color) => ({ color }),
  sort_order: (sortOrder) => ({ sortOrder }),
}

@Injectable()
export class ModulesService {
  constructor(
    private readonly repo: ModulesRepository,
    private readonly audit: AuditService,
  ) {}

  async list(): Promise<Module[]> {
    return (await this.repo.list()).map(toModule)
  }

  /** Lições publicadas por id de módulo. */
  async lessonCounts(): Promise<Record<string, number>> {
    const counts: Record<string, number> = {}
    for (const { moduleId, lessonCount } of await this.repo.publishedLessonCounts()) {
      if (moduleId) counts[moduleId] = lessonCount
    }
    return counts
  }

  async create(actor: AuthUser, input: ModuleInput): Promise<Module> {
    const module = await this.repo.insert({
      title: input.title,
      description: input.description,
      icon: input.icon,
      color: input.color,
      sortOrder: input.sort_order,
    })
    await this.audit.log(actor, "module.create", `module:${module.id}`, { title: module.title })
    return toModule(module)
  }

  async update(actor: AuthUser, id: string, input: ModuleUpdateInput): Promise<Module> {
    const patch = buildPatch(input, MODULE_PATCH)
    const module = Object.keys(patch).length ? await this.repo.update(id, patch) : await this.repo.findById(id)
    if (!module) throw NotFound("Módulo")
    await this.audit.log(actor, "module.update", `module:${id}`, { fields: Object.keys(input) })
    return toModule(module)
  }

  async remove(actor: AuthUser, id: string): Promise<void> {
    if (!(await this.repo.delete(id))) throw NotFound("Módulo")
    await this.audit.log(actor, "module.delete", `module:${id}`, {}, "warning")
  }
}
