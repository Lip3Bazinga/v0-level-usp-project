import { Module } from "@nestjs/common"
import { ContentController } from "./content.controller"
import { ContentService } from "./content.service"

/** Importação administrativa do pacote de conteúdo (cursos, módulos, lições, passos, provas e trilhas). */
@Module({ controllers: [ContentController], providers: [ContentService] })
export class ContentModule {}
