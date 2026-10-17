import { Module } from "@nestjs/common"
import { NotificationsModule } from "../notifications/notifications.module"
import { LibraryController } from "./library.controller"
import { LibraryRepository } from "./library.repository"
import { LibraryService } from "./library.service"

@Module({ imports: [NotificationsModule], controllers: [LibraryController], providers: [LibraryRepository, LibraryService] })
export class LibraryModule {}
