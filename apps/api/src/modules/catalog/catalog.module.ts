import { Module } from "@nestjs/common"
import { CoursesController } from "./courses.controller"
import { CoursesRepository } from "./courses.repository"
import { CoursesService } from "./courses.service"
import { LessonsController } from "./lessons.controller"
import { LessonsRepository } from "./lessons.repository"
import { LessonsService } from "./lessons.service"
import { ModulesController } from "./modules.controller"
import { ModulesRepository } from "./modules.repository"
import { ModulesService } from "./modules.service"

/** Catálogo: módulos, cursos (com matrícula) e lições (leitura e autoria). */
@Module({
  controllers: [ModulesController, CoursesController, LessonsController],
  providers: [ModulesRepository, ModulesService, CoursesRepository, CoursesService, LessonsRepository, LessonsService],
})
export class CatalogModule {}
