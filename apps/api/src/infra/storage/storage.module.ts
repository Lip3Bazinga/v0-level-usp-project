import { Global, Module } from "@nestjs/common"
import { StorageController } from "./storage.controller"
import { StorageService } from "./storage.service"
import { UploadsRepository } from "./uploads.repository"

@Global()
@Module({ controllers: [StorageController], providers: [UploadsRepository, StorageService], exports: [StorageService] })
export class StorageModule {}
