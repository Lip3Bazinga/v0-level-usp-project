import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common"
import { LIBRARY_MANIFEST } from "@levelusp/contracts"
import { LibraryRepository } from "./library.repository"

/**
 * Mantém `library_catalog` derivado do manifesto de bibliotecas (`LIBRARY_MANIFEST`, a fonte única): a cada
 * start da API insere o que falta e atualiza os dados de exibição. Uma biblioteca nova só chega ao catálogo
 * por PR no manifesto, nunca por escrita direta em produção.
 */
@Injectable()
export class LibraryCatalogSync implements OnApplicationBootstrap {
  private readonly logger = new Logger(LibraryCatalogSync.name)

  constructor(private readonly repo: LibraryRepository) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.sync()
    } catch (error) {
      // Um catálogo desatualizado não derruba a API: o próximo start tenta de novo.
      this.logger.error(`Não foi possível sincronizar o catálogo de bibliotecas: ${error instanceof Error ? error.name : "erro desconhecido"}`)
    }
  }

  /** Espelha o manifesto no catálogo (idempotente). */
  async sync(): Promise<void> {
    await this.repo.upsertManifest(LIBRARY_MANIFEST)
  }
}
