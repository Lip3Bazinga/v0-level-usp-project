import { Module } from "@nestjs/common"
import { ContentAssetsController } from "./content-assets.controller"
import { ContentAssetsRepository } from "./content-assets.repository"
import { ContentAssetsService } from "./content-assets.service"
import { ContentController } from "./content.controller"
import { ContentService } from "./content.service"

/** Importação administrativa do pacote de conteúdo (cursos, módulos, lições, passos, provas, trilhas e imagens) e a rota pública das imagens. */
@Module({ controllers: [ContentController, ContentAssetsController], providers: [ContentService, ContentAssetsRepository, ContentAssetsService] })
export class ContentModule {}
