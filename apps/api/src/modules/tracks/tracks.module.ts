import { Module } from "@nestjs/common"
import { TracksController } from "./tracks.controller"
import { TracksRepository } from "./tracks.repository"
import { TracksService } from "./tracks.service"

/** Trilhas: sequência de cursos (níveis) com a situação do aluno e o certificado da trilha. */
@Module({ controllers: [TracksController], providers: [TracksRepository, TracksService] })
export class TracksModule {}
